package com.athg.gravador;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Base64;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;
import org.json.JSONObject;

/** A janela flutuante aparece sobre qualquer jogo e recebe somente câmera/voz do iPhone. */
public final class FaceOverlay {
    private static final String SITE = "https://athg.antonycorp11.workers.dev";
    private static FaceOverlay instance;
    public static synchronized FaceOverlay get(Context context) {
        if (instance == null) instance = new FaceOverlay(context.getApplicationContext());
        return instance;
    }

    private final Context context;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final WindowManager wm;
    private final PhoneVoice voice;
    private WindowManager.LayoutParams params;
    private WebView web;
    private volatile String roomUrl = "";
    private volatile String linkStatus = "Aguardando o iPhone";
    private String scene = "game-face";
    private String shape = "wide";
    private int miniX;
    private int miniY;
    private int miniWidth;
    private float lastTouchX;
    private float lastTouchY;
    private float pinchStart;
    private int pinchWidth;
    private boolean recording;
    private long startedAt;

    private FaceOverlay(Context context) {
        this.context = context;
        wm = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        voice = new PhoneVoice(context);
    }

    public String roomUrl() { return roomUrl; }
    public String linkStatus() { return linkStatus; }
    public PhoneVoice voice() { return voice; }

    public void show() {
        if (Looper.myLooper() != Looper.getMainLooper()) { main.post(this::show); return; }
        if (web != null || !Settings.canDrawOverlays(context)) return;
        int screenW = context.getResources().getDisplayMetrics().widthPixels;
        int width = Math.max(260, Math.round(screenW * .25f));
        params = new WindowManager.LayoutParams(width, width * 9 / 16,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = Math.max(0, screenW - width - 24);
        params.y = 80;
        miniX = params.x; miniY = params.y; miniWidth = width;
        web = new WebView(context);
        web.setBackgroundColor(0x00000000);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new Bridge(), "athgAndroid");
        web.setOnTouchListener((view, event) -> { touch(event); return false; });
        // O site já usa window.webkit.messageHandlers.athg para o Mac.
        // Cria o mesmo objeto antes de qualquer script da página executar.
        String shim = "window.webkit={messageHandlers:{athg:{postMessage:function(m){window.athgAndroid.postMessage(JSON.stringify(m))}}}};"
                + "window.__athgContexts=[];"
                + "if(window.AudioContext){const NativeAudioContext=window.AudioContext;"
                + "window.AudioContext=class extends NativeAudioContext{constructor(...a){super(...a);window.__athgContexts.push(this)}};"
                + "window.addEventListener('pointerdown',()=>window.__athgContexts.forEach(c=>c.resume()),true)};";
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(web, shim, Collections.singleton(SITE));
        }
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                return !request.getUrl().toString().startsWith(SITE + "/");
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                    view.evaluateJavascript(shim, null);
                    view.evaluateJavascript("localStorage.getItem('studio-room')", result -> {
                        String id = result.replace("\"", "");
                        if (id.matches("[0-9a-f]{24}")) roomUrl = SITE + "/cam/" + id;
                    });
                }
                sync();
            }
        });
        wm.addView(web, params);
        web.loadUrl(SITE + "/estudio-rosto");
    }

    public void recording(boolean on, long startedAt) {
        main.post(() -> { this.recording = on; this.startedAt = startedAt; sync(); });
    }

    public void setScene(String value) {
        main.post(() -> {
            if (!value.equals("face") && !value.equals("game-face") && !value.equals("game")) return;
            if (params == null || web == null) { scene = value; return; }
            if (!scene.equals("face")) { miniX = params.x; miniY = params.y; miniWidth = params.width; }
            scene = value;
            if (scene.equals("face")) {
                params.width = WindowManager.LayoutParams.MATCH_PARENT;
                params.height = WindowManager.LayoutParams.MATCH_PARENT;
                params.x = 0; params.y = 0;
            } else {
                params.width = miniWidth;
                params.height = shape.equals("wide") ? miniWidth * 9 / 16 : miniWidth;
                params.x = miniX; params.y = miniY;
            }
            params.alpha = scene.equals("game") ? .01f : 1f;
            if (scene.equals("game")) params.flags |= WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
            else params.flags &= ~WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE;
            wm.updateViewLayout(web, params);
            sync();
        });
    }

    public void nextShape() {
        main.post(() -> {
            shape = shape.equals("wide") ? "square" : shape.equals("square") ? "circle" : "wide";
            if (params != null && web != null && !scene.equals("face")) {
                params.height = shape.equals("wide") ? params.width * 9 / 16 : params.width;
                wm.updateViewLayout(web, params);
            }
            sync();
        });
    }

    private void sync() {
        if (web == null) return;
        String js = "window.athgFace&&window.athgFace.set({scene:'" + scene + "',shape:'" + shape + "',recording:" + recording
                + ",startedAt:" + (recording ? Long.toString(startedAt) : "null") + "})";
        web.evaluateJavascript(js, null);
    }

    private boolean touch(MotionEvent e) {
        if (params == null || web == null || scene.equals("face")) return false;
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                lastTouchX = e.getRawX(); lastTouchY = e.getRawY();
                return true;
            case MotionEvent.ACTION_POINTER_DOWN:
                if (e.getPointerCount() >= 2) {
                    pinchStart = distance(e); pinchWidth = params.width;
                }
                return true;
            case MotionEvent.ACTION_MOVE:
                if (e.getPointerCount() >= 2 && pinchStart > 0) {
                    int screenW = context.getResources().getDisplayMetrics().widthPixels;
                    params.width = Math.max(180, Math.min(Math.round(screenW * .7f), Math.round(pinchWidth * distance(e) / pinchStart)));
                    params.height = shape.equals("wide") ? params.width * 9 / 16 : params.width;
                    miniWidth = params.width;
                } else {
                    params.x += Math.round(e.getRawX() - lastTouchX);
                    params.y += Math.round(e.getRawY() - lastTouchY);
                    miniX = params.x; miniY = params.y;
                    lastTouchX = e.getRawX(); lastTouchY = e.getRawY();
                }
                wm.updateViewLayout(web, params);
                return true;
            case MotionEvent.ACTION_POINTER_UP:
                pinchStart = 0;
                lastTouchX = e.getRawX(); lastTouchY = e.getRawY();
                return true;
            default: return true;
        }
    }

    private float distance(MotionEvent e) {
        return (float) Math.hypot(e.getX(0) - e.getX(1), e.getY(0) - e.getY(1));
    }

    private void move(double dx, double dy) {
        if (params == null || web == null) return;
        params.x = Math.max(0, params.x + (int) dx);
        params.y = Math.max(0, params.y + (int) dy);
        wm.updateViewLayout(web, params);
    }

    private final class Bridge {
        @JavascriptInterface public void postMessage(String text) {
            try {
                JSONObject m = new JSONObject(text);
                String type = m.optString("type");
                if (type.equals("pcm")) {
                    byte[] pcm = Base64.decode(m.optString("data"), Base64.DEFAULT);
                    voice.accept(pcm, m.optDouble("end", System.currentTimeMillis()));
                    return;
                }
                main.post(() -> {
                    switch (type) {
                        case "room": roomUrl = m.optString("url"); break;
                        case "link":
                            String state = m.optString("status");
                            linkStatus = state.equals("connected") ? "iPhone conectado" : state.equals("waiting") ? "Aguardando o iPhone" : state;
                            break;
                        case "drag": break;
                        case "resize": break;
                        case "ctl":
                            JSONObject ctl = m.optJSONObject("msg");
                            if (ctl == null) break;
                            if (ctl.optString("t").equals("scene")) {
                                setScene(ctl.optString("scene", "game-face"));
                            }
                            if (ctl.optString("t").equals("rec-toggle")) {
                                if (CaptureService.isRecording()) CaptureService.stop(context);
                                else {
                                    Intent i = new Intent(context, MainActivity.class);
                                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                                    context.startActivity(i);
                                }
                            }
                            break;
                    }
                });
            } catch (Exception ignored) { }
        }
    }
}
