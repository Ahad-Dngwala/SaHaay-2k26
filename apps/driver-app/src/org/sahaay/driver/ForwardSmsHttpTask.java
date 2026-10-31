package org.sahaay.driver;

import android.content.Context;
import android.telephony.SmsManager;
import android.util.Log;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class ForwardSmsHttpTask implements Runnable {
    private static final String TAG = "ForwardSmsTask";
    private final Context context;
    private final String senderPhone;
    private final String smsToken;

    public ForwardSmsHttpTask(Context context, String senderPhone, String smsToken) {
        this.context = context;
        this.senderPhone = senderPhone;
        this.smsToken = smsToken;
    }

    public void execute() {
        new Thread(this).start();
    }

    @Override
    public void run() {
        HttpURLConnection conn = null;
        try {
            String serverUrl = SaHaayDriverBridge.getGatewayServerUrl();
            if (serverUrl == null || serverUrl.isEmpty()) {
                serverUrl = "http://10.0.2.2:4000";
            }
            if (serverUrl.endsWith("/")) {
                serverUrl = serverUrl.substring(0, serverUrl.length() - 1);
            }

            URL url = new URL(serverUrl + "/sms/inbound");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setDoOutput(true);
            conn.setConnectTimeout(6000);
            conn.setReadTimeout(6000);

            String jsonPayload = "{\"token\":\"" + smsToken.replace("\"", "\\\"") +
                                 "\",\"sender\":\"" + senderPhone.replace("\"", "\\\"") + "\"}";

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            int responseCode = conn.getResponseCode();
            Log.i(TAG, "Gateway forward HTTP response code: " + responseCode);

            if (responseCode >= 200 && responseCode < 300) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                    StringBuilder resp = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        resp.append(line);
                    }
                    String responseBody = resp.toString();
                    Log.i(TAG, "Gateway forward response: " + responseBody);

                    // If server provided an smsReply, send it back to citizen via GSM SMS!
                    if (responseBody.contains("\"smsReply\"")) {
                        int idx = responseBody.indexOf("\"smsReply\":\"");
                        if (idx >= 0) {
                            int end = responseBody.indexOf("\"", idx + 12);
                            if (end > idx) {
                                String reply = responseBody.substring(idx + 12, end);
                                if (!reply.isEmpty() && !senderPhone.isEmpty()) {
                                    SmsManager sms = SmsManager.getDefault();
                                    sms.sendTextMessage(senderPhone, null, reply, null, null);
                                    Log.i(TAG, "Relayed reply SMS back to " + senderPhone + ": " + reply);
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to relay SMS over HTTP: " + e.getMessage());
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
