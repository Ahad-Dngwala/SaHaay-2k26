const mongoose = require("mongoose");

const emergencyEventSchema = new mongoose.Schema({
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Emergency",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      "CREATED",
      "ASSIGNED",
      "ACCEPTED",
      "REJECTED",
      "TRANSFERRED",
      "ENROUTE",
      "REACHED",
      "HOSPITAL",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "REDISPATCHED",
    ],
    required: true,
  },
  actor: {
    type: String,
    enum: ["system", "driver", "user", "admin"],
    default: "system",
  },
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "actorModel",
    default: null,
  },
  actorModel: {
    type: String,
    enum: ["Driver", "User", null],
    default: null,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for fast queries
emergencyEventSchema.index({ emergencyId: 1, createdAt: -1 });
emergencyEventSchema.index({ type: 1, createdAt: -1 });
emergencyEventSchema.index({ actorId: 1, createdAt: -1 });

// Compound index for timeline queries
emergencyEventSchema.index({ emergencyId: 1, timestamp: 1 });

module.exports = mongoose.model("EmergencyEvent", emergencyEventSchema);
