const TrafficAuthority = require("../models/TrafficAuthority");
const { haversineDistance } = require("../utils/haversine");
const messageLogger = require("../utils/messageLogger");
const eventLogger = require("../utils/eventLogger");

/**
 * Extract checkpoints from route steps
 * Takes every Nth step as a checkpoint (default: every 3rd step)
 * @param {Array} steps - Route steps from Google Maps Directions
 * @param {number} checkpointInterval - Take every Nth step (default: 3)
 * @returns {Array} Array of checkpoints with location and name
 */
exports.extractCheckpoints = (steps, checkpointInterval = 3) => {
  if (!steps || steps.length === 0) {
    return [];
  }

  const checkpoints = [];

  // Take every Nth step as checkpoint
  for (let i = 0; i < steps.length; i += checkpointInterval) {
    const step = steps[i];
    
    // Try to extract checkpoint name from HTML instructions
    let checkpointName = "Route Checkpoint";
    if (step.instruction) {
      // Remove HTML tags and extract meaningful name
      checkpointName = step.instruction
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/Continue|Turn|Head|Drive/g, "") // Remove common verbs
        .trim()
        .substring(0, 50) || `Checkpoint ${Math.floor(i / checkpointInterval) + 1}`;
    } else if (step.html_instructions) {
      checkpointName = step.html_instructions
        .replace(/<[^>]*>/g, "")
        .replace(/Continue|Turn|Head|Drive/g, "")
        .trim()
        .substring(0, 50) || `Checkpoint ${Math.floor(i / checkpointInterval) + 1}`;
    } else {
      checkpointName = `Checkpoint ${Math.floor(i / checkpointInterval) + 1}`;
    }

    checkpoints.push({
      checkpointIndex: Math.floor(i / checkpointInterval) + 1,
      name: checkpointName,
      lat: step.startLocation?.lat || step.start_location?.lat,
      lng: step.startLocation?.lng || step.start_location?.lng,
      distance: step.distance?.value || step.distance, // in meters
      duration: step.duration?.value || step.duration, // in seconds
      instruction: step.instruction || step.html_instructions || "",
    });
  }

  return checkpoints;
};

/**
 * Find nearest traffic authority for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object|null>} Traffic authority or null
 */
exports.findNearestTrafficAuthority = async (lat, lng) => {
  try {
    // First, try to find by radius if coordinates exist
    const authorities = await TrafficAuthority.find({
      isActive: true,
      ...(lat && lng ? {
        lat: { $exists: true, $ne: null },
        lng: { $exists: true, $ne: null },
      } : {}),
    }).lean();

    if (authorities.length === 0) {
      return null;
    }

    // Calculate distance to each authority and find nearest
    let nearestAuthority = null;
    let minDistance = Infinity;

    for (const authority of authorities) {
      if (authority.lat && authority.lng) {
        const distance = haversineDistance(lat, lng, authority.lat, authority.lng);
        
        // Check if within radius
        if (distance <= (authority.radius || 5000)) {
          if (distance < minDistance) {
            minDistance = distance;
            nearestAuthority = authority;
          }
        }
      }
    }

    // If no authority found by radius, return first active one as fallback
    if (!nearestAuthority && authorities.length > 0) {
      nearestAuthority = authorities[0];
    }

    return nearestAuthority;
  } catch (error) {
    console.error("❌ Find traffic authority error:", error);
    return null;
  }
};

/**
 * Send traffic notification email for a checkpoint
 * @param {Object} checkpoint - Checkpoint details
 * @param {Object} emergency - Emergency details
 * @param {Object} driver - Driver details
 * @param {Object} eta - ETA information
 * @returns {Promise<Object>} Email send result
 */
exports.sendTrafficNotification = async (checkpoint, emergency, driver, eta) => {
  try {
    const authority = await exports.findNearestTrafficAuthority(checkpoint.lat, checkpoint.lng);

    if (!authority || !authority.email) {
      console.warn(`⚠️  No traffic authority found for checkpoint: ${checkpoint.name}`);
      return {
        success: false,
        message: "No traffic authority found for this checkpoint",
      };
    }

    // Calculate ETA to checkpoint
    const checkpointETA = Math.round(checkpoint.duration / 60); // minutes

    // Email content
    const subject = "🚑 Ambulance Approaching - Traffic Alert";
    const message = `
🚨 EMERGENCY AMBULANCE APPROACHING

Ambulance Details:
- Vehicle Number: ${driver.vehicleNo}
- Driver: ${driver.name}
- Emergency ID: ${emergency._id || emergency.id}

Checkpoint Information:
- Location: ${checkpoint.name}
- Coordinates: ${checkpoint.lat}, ${checkpoint.lng}
- Estimated Arrival: ${checkpointETA} minutes

Route Information:
- From: Emergency Location (${emergency.lat}, ${emergency.lng})
- Total ETA: ${eta?.estimatedMinutes || "N/A"} minutes

Please ensure clear passage for emergency vehicle.

---
This is an automated notification from Ambulance Dispatch System.
    `.trim();

    // Send email using email service
    const emailService = require("./email.service");
    const emailResult = await emailService.sendEmail(
      authority.email,
      subject,
      message
    );

    // Log the notification
    if (emailResult.success) {
      await messageLogger.logMessage({
        emergencyId: emergency._id || emergency.id,
        driverId: driver._id || driver.id,
        from: "system",
        to: "traffic_authority",
        channel: "email",
        message: `Traffic notification sent for ${checkpoint.name}`,
        status: "sent",
        provider: emailResult.provider || "unknown",
        providerId: emailResult.messageId || null,
        metadata: {
          checkpoint: checkpoint.name,
          authority: authority.area,
          email: authority.email,
          eta: checkpointETA,
        },
      });

      // Log event
      await eventLogger.logEvent({
        emergencyId: emergency._id || emergency.id,
        type: "ENROUTE",
        actor: "system",
        message: `Traffic notification sent to ${authority.area} for checkpoint: ${checkpoint.name}`,
        metadata: {
          checkpoint: checkpoint.name,
          authorityEmail: authority.email,
          eta: checkpointETA,
        },
      });
    }

    return {
      success: emailResult.success || false,
      authority: authority.area,
      email: authority.email,
      checkpoint: checkpoint.name,
      provider: emailResult.provider,
      messageId: emailResult.messageId,
    };
  } catch (error) {
    console.error("❌ Send traffic notification error:", error);
    return {
      success: false,
      message: "Failed to send traffic notification",
      error: error.message,
    };
  }
};

/**
 * Process route and send traffic notifications for all checkpoints
 * @param {Object} route - Route object from routing service
 * @param {Object} emergency - Emergency details
 * @param {Object} driver - Driver details
 * @param {Object} eta - ETA information
 * @returns {Promise<Array>} Array of notification results
 */
exports.processRouteAndNotify = async (route, emergency, driver, eta) => {
  try {
    if (!route || !route.steps || route.steps.length === 0) {
      console.warn("⚠️  No route steps available for traffic notification");
      return [];
    }

    // Extract checkpoints (every 3rd step)
    const checkpoints = exports.extractCheckpoints(route.steps, 3);

    if (checkpoints.length === 0) {
      console.warn("⚠️  No checkpoints extracted from route");
      return [];
    }

    console.log(`📍 Extracted ${checkpoints.length} checkpoints from route`);

    // Send notifications for each checkpoint
    const notificationResults = await Promise.all(
      checkpoints.map((checkpoint) =>
        exports.sendTrafficNotification(checkpoint, emergency, driver, eta)
      )
    );

    const successful = notificationResults.filter((r) => r.success).length;
    console.log(`✅ Sent ${successful}/${checkpoints.length} traffic notifications`);

    return notificationResults;
  } catch (error) {
    console.error("❌ Process route and notify error:", error);
    return [];
  }
};

module.exports = exports;
