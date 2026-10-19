const express = require("express");
const router = express.Router();
const driverController = require("../controllers/driver.controller");
const { verifyDriver } = require("../middleware/auth");
const { locationUpdateLimiter } = require("../middleware/rateLimiter");

// Public routes (no auth required)
router.post("/register", driverController.register);

// Protected routes (JWT required)
// Rate-limited location updates (3 seconds minimum between updates)
router.post("/location", verifyDriver, locationUpdateLimiter, driverController.updateLocation);

// Driver status updates (auth required)
router.post("/status", verifyDriver, driverController.updateStatus);

// Accept/reject assignments (auth required)
router.post("/accept", verifyDriver, driverController.accept);
router.post("/reject", verifyDriver, driverController.reject);

// Get current driver profile (auth required) - MUST be before /:driverId route
router.get("/me", verifyDriver, driverController.getCurrentDriverProfile);

// Get current driver's assignments (auth required - uses JWT token)
router.get("/me/assignments", verifyDriver, driverController.getMyAssignments);

// Get driver assignments by ID (auth required - for admin access)
router.get("/:driverId/assignments", verifyDriver, driverController.getAssignments);

// Admin: Get all drivers
router.get("/admin/all", verifyDriver, driverController.getAllDrivers);

// Get driver profile by ID (public) - MUST be last
router.get("/:driverId", driverController.getProfile);

module.exports = router;
