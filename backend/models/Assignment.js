const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Emergency",
    required: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "failed", "completed"],
    default: "pending",
  },
  reason: {
    type: String,
    trim: true,
  },
  rejectedAt: {
    type: Date,
  },
  acceptedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
assignmentSchema.index({ emergencyId: 1 });
assignmentSchema.index({ driverId: 1 });
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Assignment", assignmentSchema);
