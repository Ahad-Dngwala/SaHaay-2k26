const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");

// Login (user or driver)
router.post("/login", authController.login);

// Register user
router.post("/register", authController.register);

// Get user profile by phone
router.get("/profile/:phone", authController.getProfile);

// Get current logged-in user/driver profile (requires token)
router.get("/me", verifyToken, authController.getCurrentProfile);

module.exports = router;
