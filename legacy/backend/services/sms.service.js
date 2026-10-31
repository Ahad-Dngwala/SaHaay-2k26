const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, SMS_API_KEY, SMS_API_URL } = require("../config/env");
const twilio = require("twilio");

/**
 * Send SMS using Twilio (primary) or fallback SMS gateway
 * @param {string} to - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise<Object>} SMS send result
 */
exports.sendSMS = async (to, message) => {
  // Try Twilio first if configured
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    try {
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

      const result = await client.messages.create({
        body: message,
        from: TWILIO_PHONE_NUMBER,
        to: to,
      });

      console.log(`✅ SMS sent via Twilio to ${to}. SID: ${result.sid}`);
      return {
        success: true,
        provider: "twilio",
        messageId: result.sid,
        status: result.status,
      };
    } catch (error) {
      console.error("❌ Twilio SMS error:", error.message);
      // Fall through to alternative provider
    }
  }

  // Fallback to alternative SMS gateway if configured
  if (SMS_API_KEY && SMS_API_URL) {
    try {
      const axios = require("axios");
      const response = await axios.post(
        SMS_API_URL,
        {
          to,
          message,
          api_key: SMS_API_KEY,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`✅ SMS sent via alternative gateway to ${to}`);
      return {
        success: true,
        provider: "alternative",
        response: response.data,
      };
    } catch (error) {
      console.error("❌ Alternative SMS gateway error:", error.message);
    }
  }

  // If both fail, log and return failure
  console.warn("⚠️  SMS not sent - no SMS gateway configured or all providers failed");
  return {
    success: false,
    message: "SMS gateway not configured or failed",
  };
};

/**
 * Send emergency dispatch notification to driver
 * @param {string} driverPhone - Driver phone number
 * @param {Object} emergency - Emergency details
 * @returns {Promise<Object>} SMS send result
 */
exports.sendDispatchNotification = async (driverPhone, emergency) => {
  const message = `🚑 EMERGENCY ALERT\n\nLocation: ${emergency.lat}, ${emergency.lng}\nCaller: ${emergency.userPhone}\n\nPlease accept via app or reply ACCEPT.`;

  return await exports.sendSMS(driverPhone, message);
};

/**
 * Send emergency confirmation to user
 * @param {string} userPhone - User phone number
 * @param {Object} driver - Driver details
 * @param {Object} eta - ETA information
 * @returns {Promise<Object>} SMS send result
 */
exports.sendUserConfirmation = async (userPhone, driver, eta) => {
  const message = `✅ Ambulance dispatched!\n\nDriver: ${driver.name}\nVehicle: ${driver.vehicleNo}\nETA: ${eta.estimatedMinutes} minutes\n\nTrack your ambulance in the app.`;

  return await exports.sendSMS(userPhone, message);
};
