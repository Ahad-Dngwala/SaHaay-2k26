const Assignment = require("../models/Assignment");
const Driver = require("../models/Driver");
const Emergency = require("../models/Emergency");
const EmergencyMetrics = require("../models/EmergencyMetrics");
const geo = require("../services/geo.service");
const sms = require("../services/sms.service");
const routing = require("../services/routing.service");
const dispatch = require("../services/dispatch.service");
const eventLogger = require("../utils/eventLogger");
const messageLogger = require("../utils/messageLogger");
const trafficNotification = require("../services/trafficNotification.service");

// Get io instance from global or app locals
const getIO = () => {
  return global.io || null;
};

/**
 * Register a new driver
 */
exports.register = async (req, res) => {
  try {
    const { name, phone, vehicleNo } = req.body;

    if (!name || !phone || !vehicleNo) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and vehicle number are required",
      });
    }

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [{ phone }, { vehicleNo: vehicleNo.toUpperCase() }],
    });

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: "Driver with this phone or vehicle number already exists",
      });
    }

    const driver = await Driver.create({
      name,
      phone,
      vehicleNo: vehicleNo.toUpperCase(),
      status: "offline",
    });

    res.status(201).json({
      success: true,
      message: "Driver registered successfully",
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleNo: driver.vehicleNo,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error("❌ Driver registration error:", error);
    res.status(500).json({
      success: false,
      message: "Driver registration failed",
      error: error.message,
    });
  }
};

/**
 * Update driver location (with rate limiting)
 */
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, emergencyId } = req.body;

    // Use driverId from auth middleware (set by verifyDriver)
    const actualDriverId = req.driverId;

    if (!actualDriverId || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: "Driver ID, latitude, and longitude are required",
      });
    }

    const driver = await geo.updateDriverLocation(actualDriverId, lat, lng);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Emit location update via WebSocket (improved room management)
    const io = getIO();
    if (io) {
      // Emit to driver's own room
      io.to(`driver:${actualDriverId}`).emit(`driver:${actualDriverId}:location`, {
        driverId: actualDriverId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });

      // If tracking an emergency, emit to emergency room
      if (emergencyId) {
        io.to(`emergency:${emergencyId}`).emit(`track:${emergencyId}`, {
          driverId: actualDriverId,
          lat,
          lng,
          timestamp: new Date().toISOString(),
        });

        // Log WebSocket message
        await messageLogger.logMessage({
          emergencyId,
          driverId: actualDriverId,
          from: "driver",
          to: "user",
          channel: "socket",
          message: `Driver location updated: ${lat}, ${lng}`,
          status: "sent",
        });
      }
    }

    res.json({
      success: true,
      message: "Location updated",
      driver: {
        id: driver._id,
        lat: driver.lat,
        lng: driver.lng,
        lastSeen: driver.lastSeen,
      },
    });
  } catch (error) {
    console.error("❌ Update location error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: error.message,
    });
  }
};

/**
 * Update driver status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Get driverId from JWT token (set by verifyDriver middleware)
    const driverId = req.driverId;

    if (!driverId || !status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["available", "busy", "offline"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { status },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Emit status update via WebSocket
    const io = getIO();
    if (io) {
      io.emit(`driver:${driverId}:status`, {
        status,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Status updated",
      driver: {
        id: driver._id,
        status: driver.status,
      },
    });
  } catch (error) {
    console.error("❌ Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

/**
 * Accept emergency assignment
 */
exports.accept = async (req, res) => {
  try {
    const { emergencyId } = req.body;

    // Get driverId from JWT token (set by verifyDriver middleware)
    const driverId = req.driverId;

    if (!driverId || !emergencyId) {
      return res.status(400).json({
        success: false,
        message: "Emergency ID is required",
      });
    }

    // Check if assignment exists
    const assignment = await Assignment.findOne({
      driverId,
      emergencyId,
      status: "pending",
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "No pending assignment found",
      });
    }

    // Cancel auto-redispatch timer
    dispatch.cancelAutoRedispatch(emergencyId);

    // Update assignment status
    assignment.status = "accepted";
    assignment.acceptedAt = new Date();
    await assignment.save();

    // Log acceptance event
    await eventLogger.logEvent({
      emergencyId,
      type: "ACCEPTED",
      actor: "driver",
      actorId: driverId,
      actorModel: "Driver",
      message: "Driver accepted emergency assignment",
    });

    // Update emergency status and assign driver
    const emergency = await Emergency.findByIdAndUpdate(
      emergencyId,
      {
        status: "assigned",
        assignedDriverId: driverId,
      },
      { new: true }
    );

    // Update driver status to busy
    await Driver.findByIdAndUpdate(driverId, { status: "busy" });

    // Calculate response time (time from dispatch to acceptance)
    const assignmentCreatedAt = new Date(assignment.createdAt);
    const responseTime = Math.round((Date.now() - assignmentCreatedAt.getTime()) / 1000);
    await EmergencyMetrics.findOneAndUpdate(
      { emergencyId },
      { responseTime },
      { upsert: true }
    );

    // Reject all other pending assignments for this emergency
    const rejectedAssignments = await Assignment.updateMany(
      {
        emergencyId,
        driverId: { $ne: driverId },
        status: "pending",
      },
      {
        status: "rejected",
        rejectedAt: new Date(),
        reason: "Another driver accepted",
      }
    );

    // Log rejection events for other drivers
    if (rejectedAssignments.modifiedCount > 0) {
      const rejectedDrivers = await Assignment.find({
        emergencyId,
        status: "rejected",
        rejectedAt: { $gte: new Date(Date.now() - 5000) }, // Last 5 seconds
      }).select("driverId");

      for (const rejectedAssignment of rejectedDrivers) {
        await eventLogger.logEvent({
          emergencyId,
          type: "REJECTED",
          actor: "system",
          actorId: rejectedAssignment.driverId,
          actorModel: "Driver",
          message: "Assignment rejected - another driver accepted",
        });
      }
    }

    // Get ETA for user notification
    const driver = await Driver.findById(driverId);
    let eta = null;
    let route = null;
    let trafficNotifications = [];

    if (driver && emergency) {
      try {
        // Get route with steps for traffic notification
        route = await routing.getRoute(
          driver.lat,
          driver.lng,
          emergency.lat,
          emergency.lng
        );

        // Calculate ETA from route
        eta = {
          distance: route.distance,
          duration: route.duration,
          estimatedMinutes: Math.ceil(route.duration / 60),
          eta: new Date(Date.now() + route.duration * 1000).toISOString(),
        };

        // 🚨 TRAFFIC NOTIFICATION SYSTEM: Process route and send checkpoint emails
        if (route && route.steps && route.steps.length > 0) {
          try {
            trafficNotifications = await trafficNotification.processRouteAndNotify(
              route,
              emergency,
              driver,
              eta
            );
            console.log(`✅ Sent ${trafficNotifications.filter(n => n.success).length} traffic notifications`);
          } catch (trafficError) {
            console.error("⚠️  Traffic notification failed:", trafficError.message);
            // Don't fail the acceptance if traffic notification fails
          }
        }

        // Send SMS confirmation to user
        const smsResult = await sms.sendUserConfirmation(emergency.userPhone, driver, eta);

        // Log SMS message
        if (smsResult.success) {
          await messageLogger.logMessage({
            emergencyId,
            from: "system",
            to: "user",
            channel: "sms",
            message: `Ambulance dispatched! Driver: ${driver.name}, ETA: ${eta.estimatedMinutes} minutes`,
            status: "sent",
            provider: smsResult.provider || "unknown",
            providerId: smsResult.messageId || null,
          });
        }
      } catch (error) {
        console.error("⚠️  ETA calculation or SMS failed:", error.message);
      }
    }

    // Emit acceptance via WebSocket (improved room management)
    const io = getIO();
    if (io) {
      // 🚨 ROOT CAUSE #3 FIX: Emit status change to user FIRST
      io.to(`emergency:${emergencyId}`).emit(`emergency:${emergencyId}:status`, {
        status: "assigned",
        emergencyId,
        driverId,
        timestamp: new Date().toISOString(),
      });

      // Emit to emergency-specific room
      io.to(`emergency:${emergencyId}`).emit(`emergency:${emergencyId}:assigned`, {
        driverId,
        driver: {
          name: driver.name,
          vehicleNo: driver.vehicleNo,
          phone: driver.phone,
        },
        eta,
        timestamp: new Date().toISOString(),
      });

      // 🚨 SYNC: Notify all drivers that this emergency is taken
      io.to("drivers").emit("emergency:assigned", {
        emergencyId,
        driverId,
      });

      // Log WebSocket message
      await messageLogger.logMessage({
        emergencyId,
        driverId,
        from: "system",
        to: "user",
        channel: "socket",
        message: `Ambulance assigned: ${driver.name} (${driver.vehicleNo})`,
        status: "sent",
      });
    }

    res.json({
      success: true,
      message: "Ambulance assigned successfully",
      assignment: {
        id: assignment._id,
        status: assignment.status,
        acceptedAt: assignment.acceptedAt,
      },
      emergency: {
        id: emergency._id,
        status: emergency.status,
        assignedDriverId: emergency.assignedDriverId,
      },
      eta,
      trafficNotifications: {
        sent: trafficNotifications.filter(n => n.success).length,
        total: trafficNotifications.length,
        checkpoints: trafficNotifications.map(n => ({
          checkpoint: n.checkpoint,
          authority: n.authority,
          email: n.email,
          success: n.success,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Accept assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept assignment",
      error: error.message,
    });
  }
};

/**
 * Reject emergency assignment
 */
exports.reject = async (req, res) => {
  try {
    const { emergencyId, reason } = req.body;

    // Get driverId from JWT token (set by verifyDriver middleware)
    const actualDriverId = req.driverId;

    if (!actualDriverId || !emergencyId) {
      return res.status(400).json({
        success: false,
        message: "Emergency ID is required",
      });
    }

    const assignment = await Assignment.findOneAndUpdate(
      {
        driverId: actualDriverId,
        emergencyId,
        status: "pending",
      },
      {
        status: "rejected",
        rejectedAt: new Date(),
        reason: reason || "Driver rejected",
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "No pending assignment found",
      });
    }

    // Log rejection event
    await eventLogger.logEvent({
      emergencyId,
      type: "REJECTED",
      actor: "driver",
      actorId: actualDriverId,
      actorModel: "Driver",
      message: reason || "Driver rejected assignment",
    });

    // Update driver cancellation count
    await Driver.findByIdAndUpdate(
      actualDriverId,
      { $inc: { totalCancellations: 1 } }
    );

    res.json({
      success: true,
      message: "Assignment rejected",
      assignment,
    });
  } catch (error) {
    console.error("❌ Reject assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject assignment",
      error: error.message,
    });
  }
};

/**
 * Get current driver's assignments (uses JWT token)
 */
exports.getMyAssignments = async (req, res) => {
  try {
    // Get driverId from JWT token (set by verifyDriver middleware)
    const driverId = req.driverId;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID not found in token",
      });
    }

    const assignments = await Assignment.find({ driverId })
      .populate("emergencyId", "lat lng userPhone status address createdAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("❌ Get my assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get assignments",
      error: error.message,
    });
  }
};

/**
 * Get driver assignments by ID (admin access)
 */
exports.getAssignments = async (req, res) => {
  try {
    const { driverId } = req.params;

    // If driverId in params, use it; otherwise use from token
    const actualDriverId = driverId || req.driverId;

    if (!actualDriverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required",
      });
    }

    const assignments = await Assignment.find({ driverId: actualDriverId })
      .populate("emergencyId", "lat lng userPhone status address createdAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    console.error("❌ Get assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get assignments",
      error: error.message,
    });
  }
};

/**
 * Get driver profile (with all details)
 */
exports.getProfile = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId).select("-__v");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Get driver statistics
    const Assignment = require("../models/Assignment");
    const stats = await Assignment.aggregate([
      { $match: { driverId: driver._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const assignmentStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      success: true,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleNo: driver.vehicleNo,
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
        updatedAt: driver.updatedAt,
      },
      statistics: {
        assignments: assignmentStats,
        totalTrips: driver.totalTrips,
        cancellationRate: driver.totalTrips > 0
          ? ((driver.totalCancellations / driver.totalTrips) * 100).toFixed(2) + "%"
          : "0%",
      },
    });
  } catch (error) {
    console.error("❌ Get driver profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get driver profile",
      error: error.message,
    });
  }
};

/**
 * Get current driver profile (from token)
 */
exports.getCurrentDriverProfile = async (req, res) => {
  try {
    const driverId = req.driverId || req.user.id;

    const driver = await Driver.findById(driverId).select("-__v");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Get driver statistics
    const Assignment = require("../models/Assignment");
    const totalAssignments = await Assignment.countDocuments({ driverId: driver._id });
    const pendingAssignments = await Assignment.countDocuments({
      driverId: driver._id,
      status: "pending"
    });
    const completedAssignments = await Assignment.countDocuments({
      driverId: driver._id,
      status: "completed"
    });

    res.json({
      success: true,
      driver: {
        id: driver._id,
        name: driver.name,
        phone: driver.phone,
        vehicleNo: driver.vehicleNo,
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
        updatedAt: driver.updatedAt,
      },
      statistics: {
        totalAssignments,
        pendingAssignments,
        completedAssignments,
        cancellationRate: driver.totalTrips > 0
          ? ((driver.totalCancellations / driver.totalTrips) * 100).toFixed(2) + "%"
          : "0%",
      },
    });
  } catch (error) {
    console.error("❌ Get current driver profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get driver profile",
      error: error.message,
    });
  }
};

/**
 * Get all drivers (Admin)
 */
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().select("-__v").sort({ name: 1 }).lean();
    res.json({
      success: true,
      count: drivers.length,
      drivers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch drivers" });
  }
};
