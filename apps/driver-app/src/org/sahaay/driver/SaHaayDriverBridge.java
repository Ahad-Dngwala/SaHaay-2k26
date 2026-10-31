package org.sahaay.driver;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.telephony.SmsManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

public class SaHaayDriverBridge {
    private static Context appContext;
    private final Context context;
    private final Handler mainHandler;

    public SaHaayDriverBridge(Context context) {
        this.context = context;
        appContext = context.getApplicationContext();
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    @JavascriptInterface
    public void showToast(String message) {
        mainHandler.post(new ToastRunnable(context, message));
    }

    @JavascriptInterface
    public String getAppRole() {
        return "driver";
    }

    @JavascriptInterface
    public boolean sendSms(String phoneNumber, String message) {
        try {
            SmsManager sms = SmsManager.getDefault();
            sms.sendTextMessage(phoneNumber, null, message, null, null);
            showToast("Driver SMS Sent via GSM");
            return true;
        } catch (Exception e) {
            showToast("SMS send error: " + e.getMessage());
            return false;
        }
    }

    @JavascriptInterface
    public String getLastReceivedSms() {
        return SmsReceiver.lastReceivedMessage;
    }

    @JavascriptInterface
    public void setGatewayMode(boolean enabled, String serverUrl) {
        SharedPreferences prefs = context.getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean("gateway_mode_enabled", enabled)
            .putString("gateway_server_url", serverUrl)
            .apply();
        showToast("Gateway Mode " + (enabled ? "Enabled" : "Disabled"));
    }

    public static boolean isGatewayModeEnabled() {
        if (appContext == null) return false;
        SharedPreferences prefs = appContext.getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
        return prefs.getBoolean("gateway_mode_enabled", false);
    }

    public static String getGatewayServerUrl() {
        if (appContext == null) return "http://10.0.2.2:4000";
        SharedPreferences prefs = appContext.getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
        return prefs.getString("gateway_server_url", "http://10.0.2.2:4000");
    }

    @JavascriptInterface
    @SuppressWarnings("deprecation")
    public void vibrate(long milliseconds) {
        try {
            Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(milliseconds);
                }
            }
        } catch (Exception ignored) {
        }
    }

    public static class ToastRunnable implements Runnable {
        private final Context ctx;
        private final String msg;

        public ToastRunnable(Context ctx, String msg) {
            this.ctx = ctx;
            this.msg = msg;
        }

        @Override
        public void run() {
            Toast.makeText(ctx, msg, Toast.LENGTH_SHORT).show();
        }
    }
}
