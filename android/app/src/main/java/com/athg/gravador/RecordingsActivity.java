package com.athg.gravador;

import android.app.Activity;
import android.Manifest;
import android.content.ContentUris;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.VideoView;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Biblioteca e reprodução conjunta do vídeo do jogo e da voz separada do iPhone. */
public final class RecordingsActivity extends Activity {
    private static final class Recording {
        String name;
        Uri video;
        Uri voice;
        long date;
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private VideoView video;
    private MediaPlayer voice;
    private SeekBar seek;
    private TextView selected;
    private Button play;
    private boolean ready;
    private boolean playing;
    private int pendingSeek;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xff0b1220);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(18), dp(12), dp(18), dp(24));
        scroll.addView(box);
        box.addView(text("Gravações ATHG", 24, Color.WHITE));
        box.addView(text("Toque em uma gravação para assistir ao vídeo com a voz do iPhone. O WAV continua separado para edição.", 14, 0xffb8c4d5));
        video = new VideoView(this);
        video.setBackgroundColor(Color.BLACK);
        box.addView(video, new LinearLayout.LayoutParams(-1, dp(230)));
        selected = text("Selecione uma gravação", 15, Color.WHITE);
        box.addView(selected);
        seek = new SeekBar(this);
        box.addView(seek);
        seek.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (fromUser && ready) pendingSeek = progress;
            }
            @Override public void onStartTrackingTouch(SeekBar bar) { }
            @Override public void onStopTrackingTouch(SeekBar bar) {
                if (!ready) return;
                video.seekTo(pendingSeek);
                if (voice != null) voice.seekTo(pendingSeek);
            }
        });
        play = new Button(this);
        play.setText("▶ Reproduzir vídeo + voz");
        play.setAllCaps(false);
        play.setOnClickListener(v -> toggle());
        box.addView(play);
        box.addView(text("Arquivos", 18, Color.WHITE));
        List<Recording> recordings = load();
        if (recordings.isEmpty()) box.addView(text("Nenhuma gravação encontrada ainda.", 14, 0xffb8c4d5));
        for (Recording item : recordings) {
            Button entry = new Button(this);
            entry.setAllCaps(false);
            entry.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
            entry.setText(item.name + (item.voice == null ? "\nVídeo · voz WAV indisponível" : "\nVídeo + voz iPhone"));
            entry.setOnClickListener(v -> open(item));
            box.addView(entry);
        }
        setContentView(scroll);
        handler.post(progressTick);
        // Permite ler também os arquivos do APK de teste anterior após reinstalação.
        if (recordings.isEmpty() && Build.VERSION.SDK_INT <= 32
                && checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, 7);
        }
    }

    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(request, permissions, grants);
        if (request == 7 && grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) recreate();
    }

    private List<Recording> load() {
        Map<String, Recording> byName = new HashMap<>();
        try (Cursor cursor = getContentResolver().query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                new String[]{MediaStore.Video.Media._ID, MediaStore.Video.Media.DISPLAY_NAME, MediaStore.Video.Media.DATE_ADDED},
                MediaStore.Video.Media.RELATIVE_PATH + " LIKE ?", new String[]{"Movies/ATHG Gravacoes/%"},
                MediaStore.Video.Media.DATE_ADDED + " DESC")) {
            if (cursor != null) while (cursor.moveToNext()) {
                String file = cursor.getString(1);
                if (file == null || !file.endsWith(" - video.mp4")) continue;
                Recording item = new Recording();
                item.name = file.substring(0, file.length() - " - video.mp4".length());
                item.video = ContentUris.withAppendedId(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cursor.getLong(0));
                item.date = cursor.getLong(2);
                byName.put(item.name, item);
            }
        } catch (Exception ignored) { }
        try (Cursor cursor = getContentResolver().query(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                new String[]{MediaStore.Audio.Media._ID, MediaStore.Audio.Media.DISPLAY_NAME},
                MediaStore.Audio.Media.RELATIVE_PATH + " LIKE ?", new String[]{"Music/ATHG Gravacoes/%"},
                MediaStore.Audio.Media.DATE_ADDED + " DESC")) {
            if (cursor != null) while (cursor.moveToNext()) {
                String file = cursor.getString(1);
                if (file == null || !file.endsWith(" - voz iPhone.wav")) continue;
                Recording item = byName.get(file.substring(0, file.length() - " - voz iPhone.wav".length()));
                if (item != null) item.voice = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, cursor.getLong(0));
            }
        } catch (Exception ignored) { }
        List<Recording> result = new ArrayList<>(byName.values());
        result.sort((a, b) -> Long.compare(b.date, a.date));
        return result;
    }

    private void open(Recording item) {
        pause();
        if (voice != null) { voice.release(); voice = null; }
        ready = false;
        selected.setText(item.name + " · carregando…");
        video.setVideoURI(item.video);
        if (item.voice != null) {
            try { voice = MediaPlayer.create(this, item.voice); } catch (Exception ignored) { }
        }
        video.setOnPreparedListener(player -> {
            ready = true;
            seek.setMax(Math.max(1, player.getDuration()));
            selected.setText(item.name + (voice == null ? " · só vídeo" : " · vídeo + voz iPhone"));
            video.seekTo(1);
        });
        video.setOnCompletionListener(player -> pause());
    }

    private void toggle() {
        if (!ready) return;
        if (playing) { pause(); return; }
        if (video.getCurrentPosition() >= video.getDuration() - 200) {
            video.seekTo(0);
            if (voice != null) voice.seekTo(0);
        }
        video.start();
        if (voice != null) voice.start();
        playing = true;
        play.setText("Ⅱ Pausar");
    }

    private void pause() {
        if (video != null && video.isPlaying()) video.pause();
        if (voice != null && voice.isPlaying()) voice.pause();
        playing = false;
        if (play != null) play.setText("▶ Reproduzir vídeo + voz");
    }

    private final Runnable progressTick = new Runnable() {
        @Override public void run() {
            if (ready && video != null && seek != null && !seek.isPressed()) seek.setProgress(video.getCurrentPosition());
            handler.postDelayed(this, 500);
        }
    };

    @Override public void onDestroy() {
        handler.removeCallbacks(progressTick);
        pause();
        if (voice != null) voice.release();
        if (video != null) video.stopPlayback();
        super.onDestroy();
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setPadding(0, dp(8), 0, dp(8));
        return view;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
