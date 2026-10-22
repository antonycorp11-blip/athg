package com.athg.gravador;

import android.content.ContentValues;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.FileChannel;
import android.util.Log;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/** Só o PCM enviado pelo microfone do iPhone entra no WAV e no retorno do fone. */
public final class PhoneVoice {
    private static final int RATE = 48000;
    private final Context context;
    private final ExecutorService queue = Executors.newSingleThreadExecutor();
    private final AudioTrack monitor;
    private Uri uri;
    private ParcelFileDescriptor descriptor;
    private FileOutputStream stream;
    private long startMs;
    private long written;
    private int peak;
    private double sumSquares;
    private long sampleCount;
    private boolean firstChunk;

    PhoneVoice(Context context) {
        this.context = context;
        int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
        monitor = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .setAllowedCapturePolicy(AudioAttributes.ALLOW_CAPTURE_BY_NONE).build())
                .setAudioFormat(new AudioFormat.Builder().setSampleRate(RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT).build())
                .setTransferMode(AudioTrack.MODE_STREAM)
                .setBufferSizeInBytes(Math.max(min, RATE))
                .build();
        monitor.play();
    }

    void accept(byte[] pcm, double endMs) {
        if (pcm.length < 2 || pcm.length % 2 != 0) return;
        queue.execute(() -> {
            // Retorno no fone. Nunca lê o microfone do tablet.
            byte[] louder = pcm.clone();
            ByteBuffer audio = ByteBuffer.wrap(louder).order(ByteOrder.LITTLE_ENDIAN);
            for (int i = 0; i < louder.length; i += 2) {
                int value = Math.round(audio.getShort(i) * 2f);
                audio.putShort(i, (short) Math.max(Short.MIN_VALUE, Math.min(Short.MAX_VALUE, value)));
            }
            if (stream != null) try {
                // Alinha só o primeiro bloco. O relógio de entrega do JS oscila; os blocos
                // seguintes seguem o relógio das amostras, sem inserir cortes ou silêncio.
                if (firstChunk) {
                    long firstStart = Math.round(endMs - pcm.length / 2.0 / RATE * 1000);
                    long offset = Math.max(-250, Math.min(10_000, firstStart - startMs));
                    if (offset > 0) silence(offset * RATE / 1000 * 2);
                    firstChunk = false;
                }
                ByteBuffer source = ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN);
                for (int i = 0; i < pcm.length; i += 2) {
                    int value = source.getShort(i);
                    peak = Math.max(peak, Math.abs(value));
                    sumSquares += (double) value * value;
                    sampleCount++;
                }
                stream.write(pcm);
                written += pcm.length;
            } catch (Exception e) { Log.e("ATHG", "voice write", e); }
            monitor.write(louder, 0, louder.length, AudioTrack.WRITE_BLOCKING);
        });
    }

    void start(String name, long timeMs) {
        try {
            Future<?> previous = queue.submit(() -> closeInternal(0));
            previous.get();
            Future<?> started = queue.submit(() -> {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Audio.Media.DISPLAY_NAME, name + " - voz iPhone.wav");
                values.put(MediaStore.Audio.Media.MIME_TYPE, "audio/wav");
                values.put(MediaStore.Audio.Media.RELATIVE_PATH, "Music/ATHG Gravacoes");
                values.put(MediaStore.Audio.Media.IS_PENDING, 1);
                uri = context.getContentResolver().insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) return;
                try {
                    descriptor = context.getContentResolver().openFileDescriptor(uri, "rw");
                    if (descriptor == null) return;
                    stream = new FileOutputStream(descriptor.getFileDescriptor());
                    stream.write(header(0));
                    startMs = timeMs;
                    written = 0;
                    peak = 0;
                    sumSquares = 0;
                    sampleCount = 0;
                    firstChunk = true;
                } catch (Exception e) { Log.e("ATHG", "voice start", e); }
            });
            started.get();
        } catch (Exception ignored) { }
    }

    void finish(double seconds) {
        try { queue.submit(() -> closeInternal(seconds)).get(); }
        catch (Exception ignored) { }
    }

    private void silence(long bytes) throws Exception {
        byte[] blank = new byte[8192];
        while (bytes > 0) {
            int n = (int) Math.min(bytes, blank.length);
            stream.write(blank, 0, n);
            written += n;
            bytes -= n;
        }
    }

    private void closeInternal(double seconds) {
        if (stream == null) return;
        try {
            long wanted = Math.round(seconds * RATE) * 2;
            if (wanted > written) silence(wanted - written);
            FileChannel channel = stream.getChannel();
            if (seconds > 0) channel.truncate(44 + wanted);
            long length = Math.min(written, wanted > 0 ? wanted : written);
            channel.position(0);
            stream.write(header(length));
            stream.flush();
            if (peak > 0 && sampleCount > 0 && length > 0) {
                // Ganho pela energia média da voz, limitado para evitar amplificar ruído.
                double rms = Math.sqrt(sumSquares / sampleCount);
                double gain = Math.max(1.0, Math.min(8.0, 5500.0 / Math.max(1.0, rms)));
                byte[] block = new byte[96000];
                try (ParcelFileDescriptor readFd = context.getContentResolver().openFileDescriptor(uri, "r")) {
                    if (readFd != null) {
                        try (FileInputStream inputStream = new FileInputStream(readFd.getFileDescriptor())) {
                            FileChannel input = inputStream.getChannel();
                            for (long pos = 44; pos < 44 + length; pos += block.length) {
                                input.position(pos);
                                int count = input.read(ByteBuffer.wrap(block, 0, (int) Math.min(block.length, 44 + length - pos)));
                                if (count <= 0) break;
                                ByteBuffer samples = ByteBuffer.wrap(block).order(ByteOrder.LITTLE_ENDIAN);
                                for (int i = 0; i + 1 < count; i += 2) {
                                    double raised = samples.getShort(i) * gain;
                                    // Limitador suave: evita saturação nos picos de fala.
                                    double limited = 30000.0 * Math.tanh(raised / 30000.0);
                                    samples.putShort(i, (short) Math.round(limited));
                                }
                                channel.position(pos);
                                stream.write(block, 0, count);
                            }
                        }
                    }
                }
            }
            stream.close();
            descriptor.close();
            ContentValues published = new ContentValues();
            published.put(MediaStore.Audio.Media.IS_PENDING, 0);
            context.getContentResolver().update(uri, published, null, null);
        } catch (Exception e) { Log.e("ATHG", "voice finish", e); }
        stream = null; descriptor = null; uri = null;
    }

    private byte[] header(long data) {
        ByteBuffer b = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN);
        b.put(new byte[]{'R','I','F','F'}).putInt((int) (36 + data));
        b.put(new byte[]{'W','A','V','E','f','m','t',' '}).putInt(16).putShort((short) 1).putShort((short) 1);
        b.putInt(RATE).putInt(RATE * 2).putShort((short) 2).putShort((short) 16);
        b.put(new byte[]{'d','a','t','a'}).putInt((int) data);
        return b.array();
    }
}
