const User = require("../models/User");
const Driver = require("../models/Driver");
const { generateToken } = require("../middleware/auth");

/**
 * Login user (phone-based)
 */
exports.login = async (req, res) => {
  try {
    const { phone, role = "user" } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Find user/driver based on role
    let user = null;
    let actualRole = role;

    if (role === "driver") {
      // For driver login, ONLY check Driver collection
      user = await Driver.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Driver not found. Please register as driver first.",
        });
      }
      actualRole = "driver"; // Force driver role
    } else {
      // For user login, check User collection
      user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found. Please register first.",
        });
      }
      actualRole = user.role || "user";
    }

    // Generate JWT token with correct role
    const tokenPayload = {
      id: user._id.toString(),
      phone: user.phone,
      role: actualRole,
      ...(actualRole === "driver" && { driverId: user._id.toString() }),
    };

    const token = generateToken(tokenPayload);

    // Prepare response data based on actual role
    const responseData = {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: actualRole,
      ...(actualRole === "driver" && {
        vehicleNo: user.vehicleNo,
        status: user.status,
        rating: user.rating,
        trustScore: user.trustScore,
        kycVerified: user.kycVerified,
      }),
    };

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: responseData,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { name, phone, role = "user" } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name and phone are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists",
      });
    }

    const user = await User.create({
      name,
      phone,
      role,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

/**
 * Get user profile (by phone)
 */
exports.getProfile = async (req, res) => {
  try {
    const { phone } = req.params;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};

/**
 * Get current user/driver profile (from token)
 */
exports.getCurrentProfile = async (req, res) => {
  try {
    const { id, role } = req.user;

    if (role === "driver") {
      const driver = await Driver.findById(id).select("-__v");
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: "Driver not found",
        });
      }

      return res.json({
        success: true,
        user: {
          id: driver._id,
          name: driver.name,
          phone: driver.phone,
          vehicleNo: driver.vehicleNo,
          role: "driver",
          lat: driver.lat,
          lng: driver.lng,
          status: driver.status,
          rating: driver.rating,
          totalTrips: driver.totalTrips,
          totalCancellations: driver.totalCancellations,
          totalBreakdowns: driver.totalBreakdowns,
          kycVerified: driver.kycVerified,
          hospitalAffiliation: driver.hospitalAffiliation,
          trustScore: driver.trustScore,
          lastSeen: driver.lastSeen,
          createdAt: driver.createdAt,
        },
      });
    } else {
      const user = await User.findById(id).select("-__v");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
        },
      });
    }
  } catch (error) {
    console.error("❌ Get current profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message,
    });
  }
};
