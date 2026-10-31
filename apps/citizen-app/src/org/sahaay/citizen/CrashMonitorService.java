package org.sahaay.citizen;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

/**
 * Foreground service for real-time background crash detection.
 * Operates with screen off or app closed using a partial wake lock.
 */
public class CrashMonitorService extends Service implements SensorEventListener, CrashDetector.CrashListener, Runnable {
    private static final String TAG = "CrashMonitorService";
    private static final String CHANNEL_ID = "sahaay_crash_monitor_channel";
    private static final int NOTIF_ID_MONITOR = 1001;
    private static final int NOTIF_ID_COUNTDOWN = 1002;

    public static final String ACTION_START = "org.sahaay.citizen.START_MONITOR";
    public static final String ACTION_STOP = "org.sahaay.citizen.STOP_MONITOR";
    public static final String ACTION_CANCEL_COUNTDOWN = "org.sahaay.citizen.CANCEL_COUNTDOWN";
    public static final String ACTION_TEST_CRASH = "org.sahaay.citizen.TEST_CRASH";
    public static final String EXTRA_MODE = "extra_mode";

    private SensorManager sensorManager;
    private Sensor accelerometer;
    private PowerManager.WakeLock wakeLock;
    private CrashDetector crashDetector;
    private NotificationManager notificationManager;
    private Vibrator vibrator;
    private Handler mainHandler;

    private boolean isArmed = false;
    private boolean isCountingDown = false;
    private int remainingSeconds = 30;
    private double lastPeakG = 0.0;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        mainHandler = new Handler(Looper.getMainLooper());

        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        }

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SaHaay:CrashMonitorWakeLock");
        }

        crashDetector = new CrashDetector();
        crashDetector.addListener(this);

        createNotificationChannel();
    }

    @Override
    public void onCrashConfirmed(double peakG) {
        Log.w(TAG, "CRASH CONFIRMED: peakG=" + peakG);
        startSosCountdown(peakG);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(action)) {
            stopMonitoring();
            stopSelf();
            return START_NOT_STICKY;
        } else if (ACTION_CANCEL_COUNTDOWN.equals(action)) {
            cancelCountdown("Cancelled by user");
            return START_STICKY;
        } else if (ACTION_TEST_CRASH.equals(action)) {
            startSosCountdown(3.2);
            return START_STICKY;
        }

        String modeStr = intent != null ? intent.getStringExtra(EXTRA_MODE) : null;
        if ("SUSTAINED_SHAKE".equalsIgnoreCase(modeStr)) {
            crashDetector.setMode(CrashDetector.MODE_SUSTAINED_SHAKE);
        } else {
            crashDetector.setMode(CrashDetector.MODE_IMPACT);
        }

        startMonitoring();
        return START_STICKY;
    }

    private void startMonitoring() {
        if (isArmed) return;
        isArmed = true;

        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(24 * 60 * 60 * 1000L); // Max 24 hours
        }

        if (sensorManager != null && accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
        }

        String modeName = crashDetector.getMode() == CrashDetector.MODE_SUSTAINED_SHAKE ? "SUSTAINED_SHAKE" : "IMPACT";
        SharedPreferences prefs = getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
        prefs.edit().putBoolean("crash_monitor_armed", true)
                   .putString("crash_mode", modeName)
                   .apply();

        startForeground(NOTIF_ID_MONITOR, buildMonitoringNotification());
        Log.i(TAG, "Crash monitor armed in mode: " + modeName);
    }

    private void stopMonitoring() {
        if (!isArmed) return;
        isArmed = false;

        cancelCountdown("Monitor stopped");

        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }

        SharedPreferences prefs = getSharedPreferences("sahaay_prefs", Context.MODE_PRIVATE);
        prefs.edit().putBoolean("crash_monitor_armed", false).apply();

        stopForeground(true);
        Log.i(TAG, "Crash monitor disarmed");
    }

    private void startSosCountdown(double peakG) {
        if (isCountingDown) return;
        isCountingDown = true;
        remainingSeconds = 30;
        lastPeakG = peakG;

        triggerVibrationAlert();
        updateCountdownNotification(remainingSeconds, peakG);

        mainHandler.removeCallbacks(this);
        mainHandler.postDelayed(this, 1000);
    }

    @Override
    public void run() {
        if (!isCountingDown) return;
        remainingSeconds--;

        if (remainingSeconds <= 0) {
            isCountingDown = false;
            notificationManager.cancel(NOTIF_ID_COUNTDOWN);
            triggerAutoSos(lastPeakG);
        } else {
            updateCountdownNotification(remainingSeconds, lastPeakG);
            mainHandler.postDelayed(this, 1000);
        }
    }

    private void cancelCountdown(String reason) {
        if (!isCountingDown) return;
        isCountingDown = false;
        mainHandler.removeCallbacks(this);

        if (vibrator != null) {
            vibrator.cancel();
        }
        notificationManager.cancel(NOTIF_ID_COUNTDOWN);
        Log.i(TAG, "Countdown cancelled: " + reason);
    }

    private void triggerAutoSos(double peakG) {
        Log.e(TAG, "COUNTDOWN EXPIRED -> DISPATCHING AUTO-SOS (peakG=" + peakG + ")");
        double lat = 23.033;
        double lon = 72.560;

        try {
            LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (lm != null) {
                Location loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (loc == null) loc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                if (loc != null) {
                    lat = loc.getLatitude();
                    lon = loc.getLongitude();
                }
            }
        } catch (SecurityException ignored) {
        }

        new Thread(new SosHttpTask(lat, lon)).start();
    }

    private void triggerVibrationAlert() {
        if (vibrator != null && vibrator.hasVibrator()) {
            long[] pattern = {0, 500, 200, 500, 200, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "SaHaay Crash Monitor",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Background monitoring for vehicular crash impacts");
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private Notification buildMonitoringNotification() {
        Intent stopIntent = new Intent(this, CrashMonitorService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPi = PendingIntent.getService(this, 0, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);

        String modeName = crashDetector.getMode() == CrashDetector.MODE_SUSTAINED_SHAKE ? "SUSTAINED_SHAKE" : "IMPACT";
        return builder
                .setContentTitle("SaHaay Crash Guard Active")
                .setContentText("Monitoring in background (" + modeName + " mode)")
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .addAction(android.R.drawable.ic_delete, "Disarm", stopPi)
                .setOngoing(true)
                .build();
    }

    private void updateCountdownNotification(int seconds, double peakG) {
        Intent cancelIntent = new Intent(this, CrashMonitorService.class);
        cancelIntent.setAction(ACTION_CANCEL_COUNTDOWN);
        PendingIntent cancelPi = PendingIntent.getService(this, 1, cancelIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);

        Notification notif = builder
                .setContentTitle("CRASH DETECTED — SOS in " + seconds + "s")
                .setContentText(String.format("Impact peak: %.1fg. Tap CANCEL if you are safe.", peakG))
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "I'M SAFE / CANCEL", cancelPi)
                .setOngoing(true)
                .setPriority(Notification.PRIORITY_MAX)
                .build();

        notificationManager.notify(NOTIF_ID_COUNTDOWN, notif);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            crashDetector.onSample(event.values[0], event.values[1], event.values[2], System.currentTimeMillis());
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopMonitoring();
        super.onDestroy();
    }
}
