package org.sahaay.citizen;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

/**
 * Automatically resumes crash monitoring upon system reboot if user had armed it.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
            boolean wasArmed = prefs.getBoolean("crash_monitor_armed", false);
            String mode = prefs.getString("crash_mode", "IMPACT");

            if (wasArmed) {
                Log.i(TAG, "Re-arming SaHaay Crash Guard on system boot in mode: " + mode);
                Intent serviceIntent = new Intent(context, CrashMonitorService.class);
                serviceIntent.setAction(CrashMonitorService.ACTION_START);
                serviceIntent.putExtra(CrashMonitorService.EXTRA_MODE, mode);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
        }
    }
}
