package org.sahaay.citizen;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private static MainActivity instance;
    private WebView webView;

    public static void onSmsPacketReceived(final String sender, final String packet) {
        if (instance != null && instance.webView != null) {
            instance.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    String escapedPacket = packet.replace("'", "\\'");
                    String escapedSender = sender.replace("'", "\\'");
                    instance.webView.evaluateJavascript(
                        "window.__onSmsReceived && window.__onSmsReceived('" + escapedSender + "', '" + escapedPacket + "');",
                        null
                    );
                }
            });
        }
    }

    public void handleCrashAlertIntent(Intent intent) {
        if (intent != null && intent.hasExtra("crash_countdown") && webView != null) {
            int countdown = intent.getIntExtra("crash_countdown", 30);
            double peakG = intent.getDoubleExtra("peak_g", 0.0);
            webView.evaluateJavascript(
                "window.triggerCrashAlertModal && window.triggerCrashAlertModal(" + countdown + ", " + peakG + ");",
                null
            );
        }
    }

    private static class CitizenWebViewClient extends WebViewClient {
        private final MainActivity activity;

        CitizenWebViewClient(MainActivity activity) {
            this.activity = activity;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (activity != null) {
                activity.handleCrashAlertIntent(activity.getIntent());
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleCrashAlertIntent(intent);
    }

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    @SuppressWarnings("deprecation")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebViewClient(new CitizenWebViewClient(this));
        webView.setWebChromeClient(new WebChromeClient());

        SaHaayCitizenBridge bridge = new SaHaayCitizenBridge(this);
        webView.addJavascriptInterface(bridge, "SaHaayCitizenBridge");
        webView.addJavascriptInterface(bridge, "SaHaayNativeBridge");

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
