const express = require("express");
const router = express.Router();
const emergencyController = require("../controllers/emergency.controller");
const { verifyToken } = require("../middleware/auth");

// Create emergency
router.post("/", emergencyController.createEmergency);

// Get emergency by ID (includes timeline, metrics, messages)
router.get("/:id", emergencyController.getEmergency);

// Get emergency timeline/events
router.get("/:id/timeline", emergencyController.getTimeline);

// Get emergencies by user phone
router.get("/user/:phone", emergencyController.getUserEmergencies);

// Update emergency status
router.patch("/:id/status", emergencyController.updateEmergencyStatus);

// Transfer emergency (re-dispatch)
router.post("/transfer", verifyToken, emergencyController.transfer);

// Real-time Chat
router.post("/:id/message", verifyToken, emergencyController.addMessage);

// Admin Monitoring (TODO: Add verifyAdmin middleware for production)
router.get("/admin/all", verifyToken, emergencyController.getAllEmergencies);
router.get("/admin/stats", verifyToken, emergencyController.getAdminStats);

module.exports = router;
