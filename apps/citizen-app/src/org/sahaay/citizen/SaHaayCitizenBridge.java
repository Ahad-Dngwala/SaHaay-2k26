package org.sahaay.citizen;

import android.content.Context;
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
