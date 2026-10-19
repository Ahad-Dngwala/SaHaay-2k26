const mongoose = require("mongoose");

const gpsLogSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
  },
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Emergency",
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
    required: true,
  },
  speed: {
    type: Number,
    default: 0,
  },
  heading: {
    type: Number,
    default: 0,
  },
  accuracy: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes for faster queries and time-based lookups
gpsLogSchema.index({ driverId: 1, createdAt: -1 });
gpsLogSchema.index({ emergencyId: 1, createdAt: -1 });
gpsLogSchema.index({ createdAt: -1 });

// TTL index to auto-delete logs older than 30 days
gpsLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model("GpsLog", gpsLogSchema);
