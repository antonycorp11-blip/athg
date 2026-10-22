package com.athg.gravador;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;

/** Controles e QR. A captura continua no serviço quando o jogo vem para frente. */
public final class MainActivity extends Activity {
    private static final int SCREEN_REQUEST = 10;
    private static final int AUDIO_REQUEST = 11;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView status;
    private TextView roomText;
    private ImageView qr;
    private Button record;
    private String previousRoom = "";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(11, 18, 32));
        getWindow().setNavigationBarColor(Color.rgb(11, 18, 32));
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.rgb(11, 18, 32));
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(20);
        box.setPadding(pad, pad, pad, pad);
        scroll.addView(box);
        TextView title = label("ATHG Gravador", 26, Color.WHITE);
        box.addView(title);
        box.addView(label("Tablet: tela + som do jogo. iPhone: câmera + voz. Retorno pelo fone Bluetooth conectado ao tablet.", 15, 0xffb8c4d5));
        status = label("Preparando…", 16, 0xff60d6a6);
        box.addView(status);
        Button overlay = button("1. Permitir câmera flutuante", () -> requestOverlay());
        box.addView(overlay);
        box.addView(label("2. Leia este QR no iPhone e toque em Iniciar câmera", 16, Color.WHITE));
        qr = new ImageView(this);
        LinearLayout.LayoutParams qp = new LinearLayout.LayoutParams(dp(220), dp(220));
        qp.gravity = Gravity.CENTER_HORIZONTAL;
        qp.topMargin = dp(12);
        qp.bottomMargin = dp(12);
        box.addView(qr, qp);
        roomText = label("Aguardando sala…", 12, 0xff9aabc1);
        box.addView(roomText);
        box.addView(label("Cenas", 16, Color.WHITE));
        LinearLayout scenes = new LinearLayout(this);
        scenes.setOrientation(LinearLayout.HORIZONTAL);
        scenes.addView(sceneButton("1 Rosto", "face"), new LinearLayout.LayoutParams(0, dp(52), 1));
        scenes.addView(sceneButton("2 Jogo + rosto", "game-face"), new LinearLayout.LayoutParams(0, dp(52), 1));
        scenes.addView(sceneButton("3 Só jogo", "game"), new LinearLayout.LayoutParams(0, dp(52), 1));
        box.addView(scenes);
        box.addView(button("Formato do rosto: alternar", () -> FaceOverlay.get(this).nextShape()));
        record = button("3. Gravar tela e jogo", this::begin);
        box.addView(record);
        box.addView(button("Abrir gravações", () -> {
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "video/*");
            try { startActivity(i); } catch (Exception e) { toast("Abra Filmes › ATHG Gravações no gerenciador de arquivos."); }
        }));
        box.addView(label("Deixe o tablet na orientação do jogo antes de tocar em Gravar. Durante a gravação, abra o jogo. Arraste a câmera para mover e use dois dedos para mudar o tamanho. As cenas também mudam pelo iPhone. Pare pela notificação ATHG. O áudio do tablet nunca usa o microfone do tablet.", 13, 0xff9aabc1));
        setContentView(scroll);
        tick.run();
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (status == null) return;
            FaceOverlay face = FaceOverlay.get(MainActivity.this);
            if (Settings.canDrawOverlays(MainActivity.this)) face.show();
            String room = face.roomUrl();
            if (!room.equals(previousRoom)) {
                previousRoom = room;
                roomText.setText(room.isEmpty() ? "Conectando à sala…" : room);
                if (!room.isEmpty()) makeQr(room);
            }
            boolean active = CaptureService.isRecording();
            record.setText(active ? "■ Parar gravação" : "● Gravar tela e jogo");
            String msg = active ? "Gravando " + CaptureService.elapsedText() : face.linkStatus();
            status.setText(msg);
            handler.postDelayed(this, 1000);
        }
    };

    @Override public void onDestroy() {
        handler.removeCallbacks(tick);
        status = null;
        super.onDestroy();
    }

    private void requestOverlay() {
        if (Settings.canDrawOverlays(this)) { FaceOverlay.get(this).show(); return; }
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
        startActivity(i);
    }

    private void begin() {
        if (CaptureService.isRecording()) { CaptureService.stop(this); return; }
        if (!Settings.canDrawOverlays(this)) { requestOverlay(); toast("Permita a janela flutuante e volte ao app."); return; }
        FaceOverlay.get(this).show();
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_REQUEST);
            return;
        }
        MediaProjectionManager manager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
        startActivityForResult(manager.createScreenCaptureIntent(), SCREEN_REQUEST);
    }

    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] grants) {
        super.onRequestPermissionsResult(request, permissions, grants);
        if (request == AUDIO_REQUEST && grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) begin();
        else toast("A captura do áudio interno precisa da permissão de áudio.");
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != SCREEN_REQUEST || result != RESULT_OK || data == null) return;
        Intent i = new Intent(this, CaptureService.class);
        i.setAction(CaptureService.ACTION_START);
        i.putExtra(CaptureService.EXTRA_RESULT, result);
        i.putExtra(CaptureService.EXTRA_DATA, data);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i);
        toast("Gravação iniciando. Abra o jogo.");
    }

    private void makeQr(String content) {
        try {
            BitMatrix bits = new MultiFormatWriter().encode(content, BarcodeFormat.QR_CODE, 320, 320);
            Bitmap image = Bitmap.createBitmap(320, 320, Bitmap.Config.ARGB_8888);
            for (int y = 0; y < 320; y++) for (int x = 0; x < 320; x++) image.setPixel(x, y, bits.get(x, y) ? Color.BLACK : Color.WHITE);
            qr.setImageBitmap(image);
        } catch (Exception e) { roomText.setText(content); }
    }

    private TextView label(String value, int size, int color) {
        TextView v = new TextView(this);
        v.setText(value); v.setTextSize(size); v.setTextColor(color);
        v.setPadding(0, dp(8), 0, dp(8));
        return v;
    }
    private Button button(String value, Runnable action) {
        Button b = new Button(this);
        b.setText(value); b.setAllCaps(false); b.setOnClickListener(v -> action.run());
        return b;
    }
    private Button sceneButton(String value, String key) {
        Button b = button(value, () -> FaceOverlay.get(this).setScene(key));
        b.setTextSize(11);
        return b;
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
}
