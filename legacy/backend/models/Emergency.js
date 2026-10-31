const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema({
  userPhone: {
    type: String,
    required: true,
    trim: true,
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["searching", "assigned", "reached", "enroute", "hospital", "failed", "completed"],
    default: "searching",
  },
  assignedDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null,
  },
  notes: {
    type: String,
    trim: true,
  },
  currentRadius: {
    type: Number,
    default: 500,
  },
  searchRadius: {
    type: Number,
    default: 500,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries
emergencySchema.index({ userPhone: 1 });
emergencySchema.index({ status: 1 });
emergencySchema.index({ lat: 1, lng: 1 });
emergencySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Emergency", emergencySchema);
