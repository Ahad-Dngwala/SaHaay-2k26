package org.sahaay.driver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "DriverSmsReceiver";
    public static String lastReceivedMessage = "";
    public static String lastReceivedSender = "";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null || pdus.length == 0) return;

        String format = bundle.getString("format");
        StringBuilder fullMessage = new StringBuilder();
        String sender = "";

        for (Object pdu : pdus) {
            SmsMessage message;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                message = SmsMessage.createFromPdu((byte[]) pdu, format);
            } else {
                message = SmsMessage.createFromPdu((byte[]) pdu);
            }

            if (message != null) {
                if (sender.isEmpty()) {
                    sender = message.getDisplayOriginatingAddress();
                }
                fullMessage.append(message.getMessageBody());
            }
        }

        String body = fullMessage.toString().trim();
        Log.i(TAG, "Driver SMS Received from " + sender + ": " + body);

        if (body.startsWith("S1|") || body.startsWith("A1|") || body.startsWith("T1|") ||
            body.startsWith("O1|") || body.startsWith("D1|") || body.startsWith("X1|")) {
            lastReceivedMessage = body;
            lastReceivedSender = sender;

            // Deliver to Driver webview
            MainActivity.onSmsPacketReceived(sender, body);

            // If in Gateway mode and received citizen SOS (S1) or telemetry (D1), forward to server
            if (SaHaayDriverBridge.isGatewayModeEnabled() && (body.startsWith("S1|") || body.startsWith("D1|"))) {
                new ForwardSmsHttpTask(context, sender, body).execute();
            }
        }
    }
}

