const express = require("express");
const router = express.Router();
const smsController = require("../controllers/sms.controller");

// Incoming SMS webhook (Twilio format)
router.post("/incoming", smsController.incoming);

// Test SMS endpoint
router.post("/test", smsController.test);

module.exports = router;
