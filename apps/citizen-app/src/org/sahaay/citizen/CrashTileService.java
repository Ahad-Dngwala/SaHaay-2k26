package org.sahaay.citizen;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import android.util.Log;

/**
 * Android Quick Settings Tile to easily Arm / Disarm SaHaay Crash Guard.
 */
public class CrashTileService extends TileService {
    private static final String TAG = "CrashTileService";

    @Override
    public void onStartListening() {
        super.onStartListening();
        updateTileState();
    }

    @Override
    public void onClick() {
        super.onClick();
        SharedPreferences prefs = getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
        boolean currentlyArmed = prefs.getBoolean("crash_monitor_armed", false);
        boolean targetState = !currentlyArmed;

        Intent serviceIntent = new Intent(this, CrashMonitorService.class);
        if (targetState) {
            serviceIntent.setAction(CrashMonitorService.ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } else {
            serviceIntent.setAction(CrashMonitorService.ACTION_STOP);
            startService(serviceIntent);
        }

        prefs.edit().putBoolean("crash_monitor_armed", targetState).apply();
        updateTileState();
        Log.i(TAG, "Quick Settings tile clicked: targetState=" + targetState);
    }

    private void updateTileState() {
        Tile tile = getQsTile();
        if (tile == null) return;

        SharedPreferences prefs = getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
        boolean isArmed = prefs.getBoolean("crash_monitor_armed", false);

        tile.setState(isArmed ? Tile.STATE_ACTIVE : Tile.STATE_INACTIVE);
        tile.setLabel("Crash Guard");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tile.setSubtitle(isArmed ? "Armed" : "Disarmed");
        }
        tile.updateTile();
    }
}

