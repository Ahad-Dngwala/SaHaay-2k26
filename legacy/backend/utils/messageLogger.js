const MessageLog = require("../models/MessageLog");

/**
 * Log communication message
 * @param {Object} params - Message parameters
 */
exports.logMessage = async ({
  emergencyId = null,
  driverId = null,
  userId = null,
  from,
  to,
  channel,
  message,
  status = "sent",
  provider = null,
  providerId = null,
  metadata = {},
}) => {
  try {
    await MessageLog.create({
      emergencyId,
      driverId,
      userId,
      from,
      to,
      channel,
      message,
      status,
      provider,
      providerId,
      metadata,
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error("❌ Message logging error:", error);
  }
};

/**
 * Get communication history for emergency
 * @param {string} emergencyId - Emergency ID
 * @returns {Promise<Array>} Message logs
 */
exports.getHistory = async (emergencyId) => {
  try {
    return await MessageLog.find({ emergencyId })
      .sort({ createdAt: 1 })
      .lean();
  } catch (error) {
    console.error("❌ Get message history error:", error);
    return [];
  }
};

module.exports = exports;
