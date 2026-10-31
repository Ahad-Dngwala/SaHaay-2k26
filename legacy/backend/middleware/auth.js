const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const Driver = require("../models/Driver");
const User = require("../models/User");

/**
 * Verify JWT token and attach user/driver to request
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.headers["x-access-token"] || req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Authentication required.",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
};

/**
 * Verify driver token and attach driver document
 */
exports.verifyDriver = async (req, res, next) => {
  try {
    // First verify token using the same logic as verifyToken
    const token = req.headers.authorization?.split(" ")[1] || req.headers["x-access-token"] || req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Please login.",
      });
    }

    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
        });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token. Please login again.",
        });
      }
      throw error;
    }

    // Attach user info to request
    req.user = decoded;

    // Check if role is driver
    if (req.user.role !== "driver" && !req.user.driverId) {
      console.error(`❌ Driver verification failed: role=${req.user.role}, driverId=${req.user.driverId}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Driver authentication required. Current role: ${req.user.role || 'none'}`,
      });
    }

    // Fetch driver document - use driverId if present, otherwise use id
    const driverId = req.user.driverId || req.user.id;
    const driver = await Driver.findById(driverId);

    if (!driver) {
      console.error(`❌ Driver not found: driverId=${driverId}`);
      return res.status(404).json({
        success: false,
        message: `Driver not found with ID: ${driverId}`,
      });
    }

    // Verify driver is trying to access their own resources (if driverId provided in request)
    const requestedDriverId = req.body.driverId || req.params.driverId;

    if (requestedDriverId && requestedDriverId !== driverId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own resources.",
      });
    }

    // Always use driverId from token (ignore driverId from body for security)
    if (req.body.driverId) {
      delete req.body.driverId; // Remove from body, use token's driverId
    }

    // Attach driver to request
    req.driver = driver;
    req.driverId = driverId;

    next();
  } catch (error) {
    console.error("❌ Driver verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Driver authentication error",
      error: error.message,
    });
  }
};

/**
 * Verify user token
 */
exports.verifyUser = async (req, res, next) => {
  try {
    await exports.verifyToken(req, res, async () => {
      if (req.user.role !== "user") {
        return res.status(403).json({
          success: false,
          message: "Access denied. User authentication required.",
        });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      req.userDoc = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "User authentication error",
      error: error.message,
    });
  }
};

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Expiration time (default: 7d)
 * @returns {string} JWT token
 */
exports.generateToken = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};
