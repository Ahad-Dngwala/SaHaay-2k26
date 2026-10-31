package org.sahaay.citizen;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "SaHaaySmsReceiver";
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
        Log.i(TAG, "SMS Received from " + sender + ": " + body);

        // Check if message belongs to SaHaay protocol (S1, A1, T1, O1, D1, X1)
        if (body.startsWith("S1|") || body.startsWith("A1|") || body.startsWith("T1|") ||
            body.startsWith("O1|") || body.startsWith("D1|") || body.startsWith("X1|")) {
            lastReceivedMessage = body;
            lastReceivedSender = sender;

            // Deliver to active MainActivity WebView if running
            MainActivity.onSmsPacketReceived(sender, body);
        }
    }
}
