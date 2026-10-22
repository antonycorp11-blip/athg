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

    PhoneVoice(Context context) {
        this.context = context;
        int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
        monitor = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
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
            // Retorno mais audível no fone. Nunca lê o microfone do tablet.
            byte[] louder = pcm.clone();
            ByteBuffer audio = ByteBuffer.wrap(louder).order(ByteOrder.LITTLE_ENDIAN);
            for (int i = 0; i < louder.length; i += 2) {
                int value = Math.round(audio.getShort(i) * 8f);
                audio.putShort(i, (short) Math.max(Short.MIN_VALUE, Math.min(Short.MAX_VALUE, value)));
            }
            monitor.write(louder, 0, louder.length, AudioTrack.WRITE_NON_BLOCKING);
            if (stream == null) return;
            try {
                long chunkStart = Math.round(endMs - (pcm.length / 2.0 / RATE * 1000));
                long expected = startMs + written * 1000 / (RATE * 2);
                if (chunkStart > expected) silence((chunkStart - expected) * RATE / 1000 * 2);
                int skip = (int) Math.max(0, Math.min(pcm.length, (expected - chunkStart) * RATE / 1000 * 2));
                skip &= ~1;
                if (skip == pcm.length) return;
                ByteBuffer source = ByteBuffer.wrap(pcm).order(ByteOrder.LITTLE_ENDIAN);
                for (int i = skip; i < pcm.length; i += 2) peak = Math.max(peak, Math.abs((int) source.getShort(i)));
                stream.write(pcm, skip, pcm.length - skip);
                written += pcm.length - skip;
            } catch (Exception ignored) { }
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
                } catch (Exception ignored) { }
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
            if (peak > 0 && length > 0) {
                double gain = Math.min(Math.pow(10, 24.0 / 20), 29203.0 / peak);
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
                                    int raised = (int) Math.round(samples.getShort(i) * gain);
                                    samples.putShort(i, (short) Math.max(Short.MIN_VALUE, Math.min(Short.MAX_VALUE, raised)));
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
        } catch (Exception ignored) { }
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
