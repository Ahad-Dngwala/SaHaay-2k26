const EmergencyEvent = require("../models/EmergencyEvent");

/**
 * Log emergency event for audit trail
 * @param {Object} params - Event parameters
 */
exports.logEvent = async ({
  emergencyId,
  type,
  actor = "system",
  actorId = null,
  actorModel = null,
  message,
  metadata = {},
}) => {
  try {
    await EmergencyEvent.create({
      emergencyId,
      type,
      actor,
      actorId,
      actorModel,
      message,
      metadata,
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error("❌ Event logging error:", error);
  }
};

/**
 * Get emergency timeline
 * @param {string} emergencyId - Emergency ID
 * @returns {Promise<Array>} Timeline events
 */
exports.getTimeline = async (emergencyId) => {
  try {
    return await EmergencyEvent.find({ emergencyId })
      .sort({ createdAt: 1 })
      .lean();
  } catch (error) {
    console.error("❌ Get timeline error:", error);
    return [];
  }
};

module.exports = exports;
