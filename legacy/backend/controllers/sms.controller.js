const Emergency = require("../models/Emergency");
const dispatch = require("../services/dispatch.service");

/**
 * Handle incoming SMS (Twilio webhook format)
 * Expected SMS format: "EMERGENCY#lat,lng" or "EMERGENCY#lat,lng#address"
 */
exports.incoming = async (req, res) => {
  try {
    const { From, Body } = req.body; // Twilio format
    // Alternative format support: { from, message } or { phone, text }

    const phone = From || req.body.from || req.body.phone;
    const messageBody = Body || req.body.message || req.body.text;

    if (!phone || !messageBody) {
      return res.status(400).send("Missing phone or message body");
    }

    // Parse SMS body: Expected format "EMERGENCY#lat,lng" or "EMERGENCY#lat,lng#address"
    const parts = messageBody.split("#");
    if (parts.length < 2) {
      return res.send("Invalid format. Send: EMERGENCY#lat,lng");
    }

    const [command, coords, address] = parts;

    if (command.trim().toUpperCase() !== "EMERGENCY") {
      return res.send("Invalid command. Send: EMERGENCY#lat,lng");
    }

    // Parse coordinates
    const coordParts = coords.split(",");
    if (coordParts.length !== 2) {
      return res.send("Invalid coordinates. Format: lat,lng");
    }

    const lat = parseFloat(coordParts[0].trim());
    const lng = parseFloat(coordParts[1].trim());

    if (isNaN(lat) || isNaN(lng)) {
      return res.send("Invalid coordinates. Must be numbers.");
    }

    // Validate coordinates range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.send("Coordinates out of range.");
    }

    // Create emergency
    const emergency = await Emergency.create({
      userPhone: phone,
      lat,
      lng,
      address: address || undefined,
      status: "searching",
    });

    // Start dispatch process
    await dispatch.start(emergency);

    // Return Twilio-compatible response
    res.set("Content-Type", "text/plain");
    res.send(
      `🚑 Emergency received! Ambulance is being dispatched to your location (${lat}, ${lng}). You will receive updates via SMS.`
    );
  } catch (error) {
    console.error("❌ SMS incoming error:", error);
    res.status(500).send("Error processing emergency request. Please try again.");
  }
};

/**
 * Test SMS endpoint
 */
exports.test = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Phone and message are required",
      });
    }

    const smsService = require("../services/sms.service");
    const result = await smsService.sendSMS(phone, message);

    res.json({
      success: result.success,
      message: result.success ? "SMS sent successfully" : "SMS failed",
      result,
    });
  } catch (error) {
    console.error("❌ Test SMS error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test SMS",
      error: error.message,
    });
  }
};
