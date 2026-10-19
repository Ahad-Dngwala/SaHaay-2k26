const geo = require("./geo.service");
const Assignment = require("../models/Assignment");
const Emergency = require("../models/Emergency");
const Driver = require("../models/Driver");
const EmergencyMetrics = require("../models/EmergencyMetrics");
const eventLogger = require("../utils/eventLogger");
const messageLogger = require("../utils/messageLogger");
const smsService = require("./sms.service");

// Store active timers for cleanup
const activeTimers = new Map();

// Get io instance from global
const getIO = () => {
  return global.io || null;
};

/**
 * Start dispatch process for an emergency
 * Searches for drivers within 500m, then expands to 1km if none found
 * @param {Object} emergency - Emergency document
 * @returns {Promise<Object>} Dispatch result
 */
exports.start = async (emergency) => {
  try {
    const emergencyId = emergency._id.toString();
    const startTime = Date.now();

    // Log emergency creation event
    await eventLogger.logEvent({
      emergencyId,
      type: "CREATED",
      actor: "system",
      message: "Emergency created and dispatch initiated",
      metadata: { lat: emergency.lat, lng: emergency.lng, phone: emergency.userPhone },
    });

    // Initialize metrics
    await EmergencyMetrics.findOneAndUpdate(
      { emergencyId },
      { dispatchTime: 0, success: false },
      { upsert: true }
    );

    // Update emergency status to searching if not already
    const radius = emergency.searchRadius || 500;
    await Emergency.findByIdAndUpdate(emergencyId, {
      status: "searching",
      searchRadius: radius,
    });

    // Search within current radius (starts at 500m)
    let drivers = await geo.findDrivers(emergency.lat, emergency.lng, radius);

    // If no drivers found AND radius is still 500m, expand immediately to 1km
    if (drivers.length === 0 && radius === 500) {
      console.log(`⚠️  No drivers found within 500m. Expanding search to 1km immediately...`);
      await eventLogger.logEvent({
        emergencyId,
        type: "REDISPATCHED",
        actor: "system",
        message: "No drivers within 500m, expanding search radius to 1km",
      });
      await Emergency.findByIdAndUpdate(emergencyId, { searchRadius: 1000 });
      drivers = await geo.findDrivers(emergency.lat, emergency.lng, 1000);
    }

    if (drivers.length === 0) {
      // No drivers available even at 1km
      await Emergency.findByIdAndUpdate(emergencyId, {
        status: "failed",
      });

      await eventLogger.logEvent({
        emergencyId,
        type: "FAILED",
        actor: "system",
        message: "No drivers available within 1km",
      });

      const io = getIO();
      if (io) {
        io.to(`emergency:${emergencyId}`).emit(`emergency:${emergencyId}:failed`, {
          message: "No drivers available in your vicinity",
          emergencyId,
        });
      }

      return {
        success: false,
        message: "No drivers available in the area",
        drivers: [],
      };
    }

    // Emit dispatch request to drivers
    const io = getIO();
    if (io) {
      drivers.forEach(async (driver) => {
        io.to(`driver:${driver._id}`).emit(`driver:${driver._id}:request`, {
          emergencyId,
          lat: emergency.lat,
          lng: emergency.lng,
          userPhone: emergency.userPhone,
          distance: driver.distance,
        });

        // Log WebSocket messages
        await messageLogger.logMessage({
          emergencyId,
          driverId: driver._id,
          from: "system",
          to: "driver",
          channel: "socket",
          message: `Emergency dispatch request - ${driver.distance}m away (Radius: ${radius}m)`,
          status: "sent",
        });

        // Send SMS Backup
        try {
          await smsService.sendDispatchNotification(driver.phone, emergency);
        } catch (e) { }
      });
    }

    // Create pending assignments
    const assignments = await Promise.all(
      drivers.map((driver) =>
        Assignment.findOneAndUpdate(
          { emergencyId, driverId: driver._id },
          { status: "pending", createdAt: new Date() },
          { upsert: true, new: true }
        )
      )
    );

    // 🔥 AUTO-REDISPATCH TIMER (2 Minutes)
    if (activeTimers.has(emergencyId)) {
      clearTimeout(activeTimers.get(emergencyId));
    }

    const autoRedispatchTimer = setTimeout(async () => {
      try {
        const currentEmergency = await Emergency.findById(emergencyId);
        if (currentEmergency && currentEmergency.status === "searching") {
          const currentRadius = currentEmergency.searchRadius || 500;

          if (currentRadius < 1000) {
            console.log(`⏰ 2 minute timeout: Expanding radius to 1km for emergency ${emergencyId}`);
            await Emergency.findByIdAndUpdate(emergencyId, { searchRadius: 1000 });
            await exports.redispatch(emergencyId);
          } else {
            console.log(`⏰ 2 minute timeout: No drivers accepted even at 1km for ${emergencyId}`);
            await exports.failEmergency(emergencyId);
          }
        }
        activeTimers.delete(emergencyId);
      } catch (error) {
        activeTimers.delete(emergencyId);
      }
    }, 120000); // 2 minutes

    activeTimers.set(emergencyId, autoRedispatchTimer);

    return {
      success: true,
      message: `Dispatched to ${drivers.length} drivers`,
      drivers,
      assignments,
    };
  } catch (error) {
    console.error("❌ Dispatch error:", error);
    throw error;
  }
};

/**
 * Re-dispatch an emergency (used for transfers)
 * @param {string} emergencyId - Emergency ID
 * @returns {Promise<Object>} Re-dispatch result
 */
exports.redispatch = async (emergencyId) => {
  try {
    const emergency = await Emergency.findById(emergencyId);

    if (!emergency) {
      throw new Error("Emergency not found");
    }

    // Log redispatch event
    await eventLogger.logEvent({
      emergencyId: emergencyId.toString(),
      type: "REDISPATCHED",
      actor: "system",
      message: "Emergency re-dispatched with expanded radius",
    });

    // Clear auto-redispatch timer if exists
    if (activeTimers.has(emergencyId.toString())) {
      clearTimeout(activeTimers.get(emergencyId.toString()));
      activeTimers.delete(emergencyId.toString());
    }

    // Reset emergency status
    emergency.status = "searching";
    emergency.assignedDriverId = null;
    await emergency.save();

    // Cancel existing pending assignments
    await Assignment.updateMany(
      {
        emergencyId,
        status: { $in: ["pending", "accepted"] },
      },
      {
        status: "failed",
        reason: "Re-dispatch initiated",
      }
    );

    // Update metrics
    await EmergencyMetrics.findOneAndUpdate(
      { emergencyId },
      { $inc: { redispatchCount: 1 } },
      { upsert: true }
    );

    // 🚨 ROOT CAUSE #1 FIX: Notify all drivers that emergency is searching again
    const io = getIO();
    if (io) {
      io.to("drivers").emit("emergency:searching", {
        emergencyId: emergencyId.toString(),
        timestamp: new Date().toISOString(),
      });
    }

    // Start new dispatch (will search with expanded radius automatically)
    return await exports.start(emergency);
  } catch (error) {
    console.error("❌ Re-dispatch error:", error);
    throw error;
  }
};

/**
 * Cancel auto-redispatch timer (when driver accepts)
 * @param {string} emergencyId - Emergency ID
 */
exports.cancelAutoRedispatch = (emergencyId) => {
  if (activeTimers.has(emergencyId.toString())) {
    clearTimeout(activeTimers.get(emergencyId.toString()));
    activeTimers.delete(emergencyId.toString());
    console.log(`✅ Auto-redispatch timer cancelled for emergency ${emergencyId}`);
  }
};

/**
 * Handle emergency failure (no drivers found)
 * @param {string} emergencyId 
 */
exports.failEmergency = async (emergencyId) => {
  await Emergency.findByIdAndUpdate(emergencyId, { status: "failed" });
  await eventLogger.logEvent({
    emergencyId,
    type: "FAILED",
    actor: "system",
    message: "Emergency failed: No drivers available after 1km expansion and timeout",
  });

  const io = getIO();
  if (io) {
    io.to(`emergency:${emergencyId}`).emit(`emergency:${emergencyId}:failed`, {
      message: "We're sorry, no ambulances are available at the moment.",
      emergencyId,
    });
  }
};
