package org.sahaay.citizen;

import android.util.Log;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class SosHttpTask implements Runnable {
    private static final String TAG = "SosHttpTask";
    private final double lat;
    private final double lon;

    public SosHttpTask(double lat, double lon) {
        this.lat = lat;
        this.lon = lon;
    }

    @Override
    public void run() {
        try {
            URL url = new URL("http://10.0.2.2:3000/sos");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            String payload = String.format("{\"lat\":%f,\"lon\":%f,\"flags\":1,\"sosUid\":\"crash-%d\"}",
                    lat, lon, System.currentTimeMillis());

            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes("UTF-8"));
            }

            int code = conn.getResponseCode();
            Log.i(TAG, "Auto-SOS dispatched HTTP response code: " + code);
        } catch (Exception e) {
            Log.e(TAG, "Failed to dispatch HTTP SOS: " + e.getMessage());
        }
    }
}

