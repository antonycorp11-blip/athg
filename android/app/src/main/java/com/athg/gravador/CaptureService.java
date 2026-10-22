package com.athg.gravador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Surface;
import android.view.WindowManager;
import java.nio.ByteBuffer;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** MediaProjection grava a tela; AudioPlaybackCapture grava somente o som interno permitido. */
public final class CaptureService extends Service {
    static final String ACTION_START = "com.athg.gravador.START";
    static final String ACTION_STOP = "com.athg.gravador.STOP";
    static final String EXTRA_RESULT = "result";
    static final String EXTRA_DATA = "data";
    private static final String CHANNEL = "athg_capture";
    private static volatile boolean recording;
    private static volatile long startedElapsed;
    private static volatile String error = "";
    private final Object muxLock = new Object();
    private volatile boolean running;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Runnable notificationTick = new Runnable() {
        @Override public void run() {
            if (!recording) return;
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(1, notification("Gravando " + elapsedText()));
            main.postDelayed(this, 1000);
        }
    };
    private MediaProjection projection;
    private VirtualDisplay display;
    private MediaCodec video;
    private MediaCodec audio;
    private AudioRecord playback;
    private Surface inputSurface;
    private MediaMuxer muxer;
    private ParcelFileDescriptor outputFd;
    private Uri outputUri;
    private Thread videoThread;
    private Thread audioThread;
    private int videoTrack = -1;
    private int audioTrack = -1;
    private boolean muxStarted;
    private long baseMonoUs;
    private long startWallMs;

    public static boolean isRecording() { return recording; }
    public static String lastError() { return error; }
    public static String elapsedText() {
        long sec = recording ? (SystemClock.elapsedRealtime() - startedElapsed) / 1000 : 0;
        return String.format(Locale.ROOT, "%02d:%02d", sec / 60, sec % 60);
    }
    public static void stop(Context context) {
        Intent i = new Intent(context, CaptureService.class);
        i.setAction(ACTION_STOP);
        context.startService(i);
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onCreate() {
        super.onCreate();
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "ATHG Gravador", NotificationManager.IMPORTANCE_LOW));
    }

    @Override public int onStartCommand(Intent intent, int flags, int id) {
        if (intent == null) return START_NOT_STICKY;
        if (ACTION_STOP.equals(intent.getAction())) {
            new Thread(this::finish, "athg-stop").start();
            return START_NOT_STICKY;
        }
        if (!ACTION_START.equals(intent.getAction()) || running) return START_NOT_STICKY;
        Notification n = notification("Preparando a captura…");
        if (Build.VERSION.SDK_INT >= 29) startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        else startForeground(1, n);
        int result = intent.getIntExtra(EXTRA_RESULT, 0);
        Intent data = Build.VERSION.SDK_INT >= 33
                ? intent.getParcelableExtra(EXTRA_DATA, Intent.class)
                : intent.getParcelableExtra(EXTRA_DATA);
        new Thread(() -> start(result, data), "athg-start").start();
        return START_NOT_STICKY;
    }

    private Notification notification(String message) {
        Intent stop = new Intent(this, CaptureService.class).setAction(ACTION_STOP);
        PendingIntent action = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.presence_video_online)
                .setContentTitle("ATHG Gravador")
                .setContentText(message)
                .setOngoing(true)
                .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_pause, "Parar e salvar", action).build())
                .build();
    }

    private void start(int result, Intent data) {
        try {
            if (data == null || result != android.app.Activity.RESULT_OK) throw new IllegalStateException("Permissão de tela ausente");
            FaceOverlay.get(this).show();
            String name = "Gravacao " + new SimpleDateFormat("yyyy-MM-dd HH-mm-ss", Locale.ROOT).format(new Date());
            ContentValues values = new ContentValues();
            values.put(MediaStore.Video.Media.DISPLAY_NAME, name + " - video.mp4");
            values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
            values.put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/ATHG Gravacoes");
            values.put(MediaStore.Video.Media.IS_PENDING, 1);
            outputUri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
            if (outputUri == null) throw new IllegalStateException("Não foi possível criar o vídeo");
            outputFd = getContentResolver().openFileDescriptor(outputUri, "rw");
            if (outputFd == null) throw new IllegalStateException("Não foi possível abrir o vídeo");
            muxer = new MediaMuxer(outputFd.getFileDescriptor(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);

            MediaProjectionManager manager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
            projection = manager.getMediaProjection(result, data);
            if (projection == null) throw new IllegalStateException("A tela não autorizou a captura");
            projection.registerCallback(new MediaProjection.Callback() {
                @Override public void onStop() { new Thread(CaptureService.this::finish, "athg-revoke").start(); }
            }, new Handler(Looper.getMainLooper()));

            DisplayMetrics metrics = new DisplayMetrics();
            ((WindowManager) getSystemService(WINDOW_SERVICE)).getDefaultDisplay().getRealMetrics(metrics);
            double scale = Math.min(1.0, 1920.0 / Math.max(metrics.widthPixels, metrics.heightPixels));
            int width = Math.max(2, ((int) Math.round(metrics.widthPixels * scale) / 2) * 2);
            int height = Math.max(2, ((int) Math.round(metrics.heightPixels * scale) / 2) * 2);
            MediaFormat v = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height);
            v.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);
            v.setInteger(MediaFormat.KEY_BIT_RATE, 8_000_000);
            v.setInteger(MediaFormat.KEY_FRAME_RATE, 30);
            v.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 2);
            video = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC);
            video.configure(v, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
            inputSurface = video.createInputSurface();

            MediaFormat a = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, 48000, 2);
            a.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
            a.setInteger(MediaFormat.KEY_BIT_RATE, 192000);
            a.setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16384);
            audio = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC);
            audio.configure(a, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);

            AudioPlaybackCaptureConfiguration capture = new AudioPlaybackCaptureConfiguration.Builder(projection)
                    .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                    .addMatchingUsage(AudioAttributes.USAGE_GAME).build();
            int min = AudioRecord.getMinBufferSize(48000, AudioFormat.CHANNEL_IN_STEREO, AudioFormat.ENCODING_PCM_16BIT);
            playback = new AudioRecord.Builder().setAudioPlaybackCaptureConfig(capture)
                    .setAudioFormat(new AudioFormat.Builder().setSampleRate(48000)
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setChannelMask(AudioFormat.CHANNEL_IN_STEREO).build())
                    .setBufferSizeInBytes(Math.max(min, 32768)).build();
            if (playback.getState() != AudioRecord.STATE_INITIALIZED) throw new IllegalStateException("Áudio interno indisponível");

            baseMonoUs = System.nanoTime() / 1000;
            startWallMs = System.currentTimeMillis();
            FaceOverlay.get(this).voice().start(name, startWallMs);
            video.start(); audio.start(); playback.startRecording();
            display = projection.createVirtualDisplay("ATHG Gravador", width, height, metrics.densityDpi,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, inputSurface, null, null);
            running = true; recording = true; startedElapsed = SystemClock.elapsedRealtime(); error = "";
            FaceOverlay.get(this).recording(true, startWallMs);
            main.post(notificationTick);
            videoThread = new Thread(this::drainVideo, "athg-video");
            audioThread = new Thread(this::feedAudio, "athg-audio");
            videoThread.start(); audioThread.start();
        } catch (Exception e) {
            error = "Falha: " + e.getMessage();
            Log.e("ATHG", "start", e);
            finish();
        }
    }

    private void drainVideo() {
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        boolean eos = false;
        boolean signaled = false;
        try {
            while (!eos) {
                int index = video.dequeueOutputBuffer(info, 10000);
                if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    synchronized (muxLock) { videoTrack = muxer.addTrack(video.getOutputFormat()); startMuxer(); }
                } else if (index >= 0) {
                    ByteBuffer buffer = video.getOutputBuffer(index);
                    if (buffer != null && info.size > 0 && (info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0) {
                        info.presentationTimeUs = normalizeVideoPts(info.presentationTimeUs);
                        write(videoTrack, buffer, info);
                    }
                    eos = (info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0;
                    video.releaseOutputBuffer(index, false);
                }
                if (!running && !signaled) { video.signalEndOfInputStream(); signaled = true; }
            }
        } catch (Exception e) { Log.e("ATHG", "video", e); error = "Vídeo: " + e.getMessage(); }
    }

    private void feedAudio() {
        byte[] pcm = new byte[8192];
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        try {
            while (running) {
                int count = playback.read(pcm, 0, pcm.length, AudioRecord.READ_BLOCKING);
                if (count > 0) queueAudio(pcm, count, Math.max(0, System.nanoTime() / 1000 - baseMonoUs));
                drainAudio(info, false);
            }
            while (!queueAudio(pcm, 0, Math.max(0, System.nanoTime() / 1000 - baseMonoUs))) drainAudio(info, true);
            for (int i = 0; i < 100; i++) if (drainAudio(info, true)) break;
        } catch (Exception e) { Log.e("ATHG", "audio", e); error = "Áudio do jogo: " + e.getMessage(); }
    }

    private boolean queueAudio(byte[] pcm, int count, long pts) {
        int index = audio.dequeueInputBuffer(10000);
        if (index < 0) return false;
        ByteBuffer input = audio.getInputBuffer(index);
        if (input == null) return false;
        input.clear();
        input.put(pcm, 0, count);
        audio.queueInputBuffer(index, 0, count, pts, count == 0 ? MediaCodec.BUFFER_FLAG_END_OF_STREAM : 0);
        return true;
    }

    private boolean drainAudio(MediaCodec.BufferInfo info, boolean finalDrain) {
        int index = audio.dequeueOutputBuffer(info, finalDrain ? 100000 : 0);
        if (index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
            synchronized (muxLock) { audioTrack = muxer.addTrack(audio.getOutputFormat()); startMuxer(); }
        } else if (index >= 0) {
            ByteBuffer buffer = audio.getOutputBuffer(index);
            if (buffer != null && info.size > 0 && (info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0) write(audioTrack, buffer, info);
            boolean eos = (info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0;
            audio.releaseOutputBuffer(index, false);
            return eos;
        }
        return false;
    }

    private void startMuxer() {
        if (!muxStarted && videoTrack >= 0 && audioTrack >= 0) {
            muxer.start(); muxStarted = true;
            Bundle request = new Bundle();
            request.putInt(MediaCodec.PARAMETER_KEY_REQUEST_SYNC_FRAME, 0);
            video.setParameters(request);
        }
    }

    private void write(int track, ByteBuffer data, MediaCodec.BufferInfo info) {
        synchronized (muxLock) {
            if (!muxStarted || track < 0) return;
            data.position(info.offset);
            data.limit(info.offset + info.size);
            muxer.writeSampleData(track, data, info);
        }
    }

    private long normalizeVideoPts(long pts) {
        return pts > baseMonoUs - 1_000_000 ? Math.max(0, pts - baseMonoUs) : Math.max(0, pts);
    }

    private synchronized void finish() {
        if (!running && projection == null && muxer == null) { stopSelf(); return; }
        running = false; recording = false;
        main.removeCallbacks(notificationTick);
        FaceOverlay.get(this).recording(false, 0);
        try { if (playback != null && playback.getRecordingState() == AudioRecord.RECORDSTATE_RECORDING) playback.stop(); } catch (Exception ignored) { }
        try { if (videoThread != null) videoThread.join(5000); } catch (InterruptedException ignored) { }
        try { if (audioThread != null) audioThread.join(5000); } catch (InterruptedException ignored) { }
        try { FaceOverlay.get(this).voice().finish(Math.max(0, (System.currentTimeMillis() - startWallMs) / 1000.0)); } catch (Exception ignored) { }
        try { if (display != null) display.release(); } catch (Exception ignored) { }
        display = null;
        try { if (projection != null) projection.stop(); } catch (Exception ignored) { }
        projection = null;
        try { if (playback != null) playback.release(); } catch (Exception ignored) { }
        playback = null;
        try { if (video != null) { video.stop(); video.release(); } } catch (Exception ignored) { }
        video = null;
        try { if (audio != null) { audio.stop(); audio.release(); } } catch (Exception ignored) { }
        audio = null;
        try { if (inputSurface != null) inputSurface.release(); } catch (Exception ignored) { }
        inputSurface = null;
        try { if (muxer != null) { if (muxStarted) muxer.stop(); muxer.release(); } } catch (Exception e) { Log.e("ATHG", "muxer", e); }
        muxer = null;
        try { if (outputFd != null) outputFd.close(); } catch (Exception ignored) { }
        outputFd = null;
        if (outputUri != null) {
            if (muxStarted) {
                ContentValues done = new ContentValues(); done.put(MediaStore.Video.Media.IS_PENDING, 0);
                getContentResolver().update(outputUri, done, null, null);
            } else getContentResolver().delete(outputUri, null, null);
        }
        outputUri = null; muxStarted = false; videoTrack = -1; audioTrack = -1;
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override public void onDestroy() {
        if (running) new Thread(this::finish, "athg-destroy").start();
        super.onDestroy();
    }
}
