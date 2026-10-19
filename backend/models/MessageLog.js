const mongoose = require("mongoose");

const messageLogSchema = new mongoose.Schema({
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Emergency",
    index: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  from: {
    type: String,
    enum: ["system", "driver", "user", "admin"],
    required: true,
  },
  to: {
    type: String,
    enum: ["system", "driver", "user", "admin"],
    required: true,
  },
  channel: {
    type: String,
    enum: ["sms", "socket", "push", "voice", "whatsapp", "email"],
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["sent", "delivered", "failed", "read"],
    default: "sent",
  },
  provider: {
    type: String, // "twilio", "firebase", "socket.io", etc.
    default: null,
  },
  providerId: {
    type: String, // Message SID, Push notification ID, etc.
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for fast queries
messageLogSchema.index({ emergencyId: 1, createdAt: -1 });
messageLogSchema.index({ driverId: 1, createdAt: -1 });
messageLogSchema.index({ channel: 1, createdAt: -1 });
messageLogSchema.index({ status: 1, createdAt: -1 });
messageLogSchema.index({ createdAt: -1 });

// TTL index - delete logs older than 90 days (compliance retention)
messageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model("MessageLog", messageLogSchema);
