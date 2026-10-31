package org.sahaay.citizen;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

public class SaHaayCitizenBridge {
    private final Context context;
    private final Handler mainHandler;

    public SaHaayCitizenBridge(Context context) {
        this.context = context;
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    @JavascriptInterface
    public void showToast(String message) {
        mainHandler.post(new ToastRunnable(context, message));
    }

    @JavascriptInterface
    public String getAppRole() {
        return "citizen";
    }

    @JavascriptInterface
    public void armCrashMonitor(boolean sustainedShakeMode) {
        Intent intent = new Intent(context, CrashMonitorService.class);
        intent.setAction(CrashMonitorService.ACTION_START);
        intent.putExtra(CrashMonitorService.EXTRA_MODE, sustainedShakeMode ? "SUSTAINED_SHAKE" : "IMPACT");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
        showToast("Crash Guard Armed (" + (sustainedShakeMode ? "Sustained Shake" : "Impact") + " Mode)");
    }

    @JavascriptInterface
    public void disarmCrashMonitor() {
        Intent intent = new Intent(context, CrashMonitorService.class);
        intent.setAction(CrashMonitorService.ACTION_STOP);
        context.startService(intent);
        showToast("Crash Guard Disarmed");
    }

    @JavascriptInterface
    public boolean isCrashMonitorArmed() {
        SharedPreferences prefs = context.getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
        return prefs.getBoolean("crash_monitor_armed", false);
    }

    @JavascriptInterface
    public void cancelCrashCountdown() {
        Intent intent = new Intent(context, CrashMonitorService.class);
        intent.setAction(CrashMonitorService.ACTION_CANCEL_COUNTDOWN);
        context.startService(intent);
    }

    @JavascriptInterface
    public void triggerTestCrash() {
        Intent intent = new Intent(context, CrashMonitorService.class);
        intent.setAction(CrashMonitorService.ACTION_TEST_CRASH);
        context.startService(intent);
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

    @JavascriptInterface
    public boolean sendSms(String phoneNumber, String message) {
        try {
            android.telephony.SmsManager sms = android.telephony.SmsManager.getDefault();
            sms.sendTextMessage(phoneNumber, null, message, null, null);
            showToast("SOS SMS sent via GSM");
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
