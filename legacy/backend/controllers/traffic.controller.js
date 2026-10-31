const TrafficAuthority = require("../models/TrafficAuthority");

/**
 * Create/Update traffic authority
 */
exports.createOrUpdate = async (req, res) => {
  try {
    const { area, email, lat, lng, radius = 5000, checkpointNames = [] } = req.body;

    if (!area || !email) {
      return res.status(400).json({
        success: false,
        message: "Area and email are required",
      });
    }

    // Check if area already exists
    let authority = await TrafficAuthority.findOne({ area });

    if (authority) {
      // Update existing
      authority.email = email;
      if (lat) authority.lat = lat;
      if (lng) authority.lng = lng;
      if (radius) authority.radius = radius;
      if (checkpointNames.length > 0) authority.checkpointNames = checkpointNames;
      await authority.save();

      return res.json({
        success: true,
        message: "Traffic authority updated",
        authority,
      });
    } else {
      // Create new
      authority = await TrafficAuthority.create({
        area,
        email,
        lat,
        lng,
        radius,
        checkpointNames,
      });

      return res.status(201).json({
        success: true,
        message: "Traffic authority created",
        authority,
      });
    }
  } catch (error) {
    console.error("❌ Create/update traffic authority error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create/update traffic authority",
      error: error.message,
    });
  }
};

/**
 * Get all traffic authorities
 */
exports.getAll = async (req, res) => {
  try {
    const authorities = await TrafficAuthority.find({ isActive: true })
      .sort({ area: 1 })
      .lean();

    res.json({
      success: true,
      count: authorities.length,
      authorities,
    });
  } catch (error) {
    console.error("❌ Get traffic authorities error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get traffic authorities",
      error: error.message,
    });
  }
};

/**
 * Delete traffic authority
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const authority = await TrafficAuthority.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!authority) {
      return res.status(404).json({
        success: false,
        message: "Traffic authority not found",
      });
    }

    res.json({
      success: true,
      message: "Traffic authority deactivated",
      authority,
    });
  } catch (error) {
    console.error("❌ Delete traffic authority error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete traffic authority",
      error: error.message,
    });
  }
};
