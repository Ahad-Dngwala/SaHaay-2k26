const Emergency = require("../models/Emergency");
const dispatch = require("../services/dispatch.service");
const eventLogger = require("../utils/eventLogger");
const messageLogger = require("../utils/messageLogger");
const EmergencyMetrics = require("../models/EmergencyMetrics");

/**
 * Create a new emergency
 */
exports.createEmergency = async (req, res) => {
  try {
    const { lat, lng, phone, address, notes } = req.body;

    if (!lat || !lng || !phone) {
      return res.status(400).json({
        success: false,
        message: "Latitude, longitude, and phone are required",
      });
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates",
      });
    }

    // Create emergency
    const emergency = await Emergency.create({
      userPhone: phone,
      lat,
      lng,
      address,
      notes,
      status: "searching",
    });

    // Start dispatch process
    const dispatchResult = await dispatch.start(emergency);

    res.status(201).json({
      success: true,
      message: "Emergency created and dispatch initiated",
      emergency: {
        id: emergency._id,
        userPhone: emergency.userPhone,
        lat: emergency.lat,
        lng: emergency.lng,
        status: emergency.status,
        createdAt: emergency.createdAt,
      },
      dispatch: dispatchResult,
    });
  } catch (error) {
    console.error("❌ Create emergency error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create emergency",
      error: error.message,
    });
  }
};

/**
 * Get emergency by ID with timeline and metrics
 */
exports.getEmergency = async (req, res) => {
  try {
    const { id } = req.params;

    const emergency = await Emergency.findById(id)
      .populate("assignedDriverId", "name phone vehicleNo rating")
      .lean();

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    // Get timeline events
    const timeline = await eventLogger.getTimeline(id);

    // Get metrics
    const metrics = await EmergencyMetrics.findOne({ emergencyId: id }).lean();

    // Get communication history
    const messages = await messageLogger.getHistory(id);

    res.json({
      success: true,
      emergency,
      timeline,
      metrics,
      messages,
    });
  } catch (error) {
    console.error("❌ Get emergency error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get emergency",
      error: error.message,
    });
  }
};

/**
 * Get emergency timeline
 */
exports.getTimeline = async (req, res) => {
  try {
    const { id } = req.params;

    const emergency = await Emergency.findById(id);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    const timeline = await eventLogger.getTimeline(id);

    res.json({
      success: true,
      emergencyId: id,
      timeline,
      count: timeline.length,
    });
  } catch (error) {
    console.error("❌ Get timeline error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get timeline",
      error: error.message,
    });
  }
};

/**
 * Get emergencies by user phone
 */
exports.getUserEmergencies = async (req, res) => {
  try {
    const { phone } = req.params;

    const emergencies = await Emergency.find({ userPhone: phone })
      .populate("assignedDriverId", "name phone vehicleNo")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      count: emergencies.length,
      emergencies,
    });
  } catch (error) {
    console.error("❌ Get user emergencies error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get emergencies",
      error: error.message,
    });
  }
};

/**
 * Update emergency status
 */
exports.updateEmergencyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ["searching", "assigned", "reached", "enroute", "hospital", "failed", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const emergency = await Emergency.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    // Map status to event type
    const eventTypeMap = {
      searching: "CREATED",
      assigned: "ASSIGNED",
      enroute: "ENROUTE",
      hospital: "HOSPITAL",
      failed: "FAILED",
      completed: "COMPLETED",
    };

    // Log event
    await eventLogger.logEvent({
      emergencyId: id,
      type: eventTypeMap[status] || status.toUpperCase(),
      actor: req.user?.role || "system",
      actorId: req.user?.id || null,
      message: reason || `Emergency status updated to ${status}`,
      metadata: { status, reason },
    });

    // Update metrics if completed
    if (status === "completed") {
      const createdAt = new Date(emergency.createdAt);
      const totalTime = Math.round((Date.now() - createdAt.getTime()) / 1000);
      await EmergencyMetrics.findOneAndUpdate(
        { emergencyId: id },
        { success: true, totalTime },
        { upsert: true }
      );
    }

    // Emit status update via WebSocket (improved room management)
    const io = global.io || null;
    if (io) {
      io.to(`emergency:${id}`).emit(`emergency:${id}:status`, {
        status,
        emergencyId: id,
        timestamp: new Date().toISOString(),
      });

      // Log WebSocket message
      await messageLogger.logMessage({
        emergencyId: id,
        from: "system",
        to: "user",
        channel: "socket",
        message: `Emergency status updated to ${status}`,
        status: "sent",
      });
    }

    res.json({
      success: true,
      message: "Emergency status updated",
      emergency,
    });
  } catch (error) {
    console.error("❌ Update emergency status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update emergency status",
      error: error.message,
    });
  }
};

/**
 * Transfer emergency (re-dispatch)
 */
exports.transfer = async (req, res) => {
  try {
    const { emergencyId, reason } = req.body;

    if (!emergencyId) {
      return res.status(400).json({
        success: false,
        message: "Emergency ID is required",
      });
    }

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    const previousDriverId = emergency.assignedDriverId;
    let newLat = emergency.lat;
    let newLng = emergency.lng;
    let locationSource = "original_emergency_location";

    // 🚨 PART 2: Use driver's CURRENT GPS location if ambulance breaks down mid-route
    const { useCurrentLocation = true } = req.body;
    if (useCurrentLocation && previousDriverId) {
      try {
        const GpsLog = require("../models/GpsLog");
        const Driver = require("../models/Driver");

        // Get driver's last GPS log for this emergency
        const lastGpsLog = await GpsLog.findOne({
          driverId: previousDriverId,
          emergencyId: emergencyId,
        })
          .sort({ createdAt: -1 })
          .lean();

        // If GPS log exists, use that location
        if (lastGpsLog && lastGpsLog.lat && lastGpsLog.lng) {
          newLat = lastGpsLog.lat;
          newLng = lastGpsLog.lng;
          locationSource = "driver_current_location";
          console.log(`📍 Transfer: Using driver's current GPS location (${newLat}, ${newLng}) from GpsLog`);
        } else {
          // Fallback: Use driver's current location from Driver model
          const driver = await Driver.findById(previousDriverId);
          if (driver && driver.lat && driver.lng) {
            newLat = driver.lat;
            newLng = driver.lng;
            locationSource = "driver_last_seen_location";
            console.log(`📍 Transfer: Using driver's last seen location (${newLat}, ${newLng}) from Driver model`);
          }
        }
      } catch (gpsError) {
        console.error("⚠️  Failed to get driver GPS location, using original emergency location:", gpsError.message);
      }
    }

    // Log transfer event with location source
    await eventLogger.logEvent({
      emergencyId,
      type: "TRANSFERRED",
      actor: req.user?.role || "system",
      actorId: req.user?.id || null,
      message: reason || "Emergency transfer requested",
      metadata: {
        reason,
        previousDriverId,
        originalLocation: { lat: emergency.lat, lng: emergency.lng },
        newLocation: { lat: newLat, lng: newLng },
        locationSource,
      },
    });

    // Update current assignment to failed
    const Assignment = require("../models/Assignment");
    await Assignment.updateMany(
      { emergencyId, status: { $in: ["pending", "accepted"] } },
      {
        status: "failed",
        reason: reason || "Emergency transfer requested",
      }
    );

    // Store original location before update
    const originalLat = emergency.lat;
    const originalLng = emergency.lng;

    // Update emergency location to current ambulance position ONLY if patient is on board (enroute)
    if (emergency.status === "enroute" && (newLat !== originalLat || newLng !== originalLng)) {
      emergency.lat = newLat;
      emergency.lng = newLng;
      emergency.notes = `${emergency.notes || ""}\n[TRANSFER-MID-ROUTE] ${reason || "No reason provided"} - Location updated to ambulance's current position: ${newLat}, ${newLng}`.trim();
      console.log(`✅ Emergency location updated to ambulance's current breakdown position (${newLat}, ${newLng}) because patient is on board.`);
    } else {
      console.log(`ℹ️  Transfer: Patient NOT on board, keeping original emergency location for re-dispatch.`);
    }

    // Reset emergency status
    emergency.status = "searching";
    emergency.assignedDriverId = null;
    await emergency.save();

    // Update metrics
    await EmergencyMetrics.findOneAndUpdate(
      { emergencyId },
      { $inc: { redispatchCount: 1 } },
      { upsert: true }
    );

    // Re-dispatch from new location (emergency already updated with new coordinates)
    const dispatchResult = await dispatch.redispatch(emergencyId);

    // 🚨 Notify user of transfer
    const io = global.io;
    if (io) {
      // Notify user
      io.to(`emergency:${emergencyId}`).emit(`emergency:${emergencyId}:status`, {
        status: "searching",
        message: "Transfer initiated. We are dispatching a new ambulance.",
        timestamp: new Date().toISOString(),
      });

      // 🚨 ROOT CAUSE #1 FIX: Notify all drivers that emergency is searching again
      io.to("drivers").emit("emergency:searching", {
        emergencyId: emergencyId.toString(),
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: "Emergency re-dispatched from ambulance's current location",
      location: {
        lat: newLat,
        lng: newLng,
        source: locationSource,
        originalLocation: {
          lat: originalLat,
          lng: originalLng,
        },
      },
      dispatch: dispatchResult,
    });
  } catch (error) {
    console.error("❌ Transfer emergency error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to transfer emergency",
      error: error.message,
    });
  }
};

/**
 * Add message to emergency chat
 */
exports.addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const { role, id: actorId } = req.user;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const emergency = await Emergency.findById(id);
    if (!emergency) {
      return res.status(404).json({ success: false, message: "Emergency not found" });
    }

    // Determine sender and receiver
    const from = role;
    const to = role === "user" ? "driver" : "user";

    // Log message
    await messageLogger.logMessage({
      emergencyId: id,
      driverId: role === "driver" ? actorId : emergency.assignedDriverId,
      userId: role === "user" ? actorId : null,
      from,
      to,
      channel: "socket",
      message,
    });

    // Emit via socket
    const io = global.io;
    if (io) {
      io.to(`emergency:${id}`).emit(`message:${id}`, {
        from,
        message,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: "Message sent" });
  } catch (error) {
    console.error("❌ Add message error:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

/**
 * Get all emergencies (Admin)
 */
exports.getAllEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.find()
      .populate("assignedDriverId", "name phone vehicleNo")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: emergencies.length,
      emergencies,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch emergencies" });
  }
};

/**
 * Get Admin Dashboard Stats
 */
exports.getAdminStats = async (req, res) => {
  try {
    const activeEmergencies = await Emergency.countDocuments({
      status: { $in: ["searching", "assigned", "reached", "enroute"] },
    });

    const Driver = require("../models/Driver");
    const availableDrivers = await Driver.countDocuments({ status: "available" });

    const metrics = await EmergencyMetrics.aggregate([
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: "$responseTime" },
          successRate: {
            $avg: { $cond: [{ $eq: ["$success", true] }, 100, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      metrics: {
        activeEmergencies,
        availableDrivers,
        avgResponseTime: metrics[0]?.avgResponseTime || 0,
        successRate: metrics[0]?.successRate || 0,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};
