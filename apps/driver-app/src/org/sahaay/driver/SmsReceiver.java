package org.sahaay.driver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "DriverSmsReceiver";
    public static String lastReceivedMessage = "";
    public static String lastReceivedSender = "";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }

        SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (messages == null || messages.length == 0) return;

        StringBuilder fullMessage = new StringBuilder();
        String sender = "";

        for (SmsMessage message : messages) {
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
