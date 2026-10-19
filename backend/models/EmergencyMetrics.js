const mongoose = require("mongoose");

const emergencyMetricsSchema = new mongoose.Schema({
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Emergency",
    required: true,
    unique: true,
    index: true,
  },
  dispatchTime: {
    type: Number, // seconds from emergency creation to first dispatch
    default: null,
  },
  responseTime: {
    type: Number, // seconds from dispatch to driver acceptance
    default: null,
  },
  travelTime: {
    type: Number, // seconds from acceptance to reaching location
    default: null,
  },
  totalTime: {
    type: Number, // seconds from creation to completion
    default: null,
  },
  success: {
    type: Boolean,
    default: false,
  },
  distanceKm: {
    type: Number, // distance traveled in kilometers
    default: null,
  },
  redispatchCount: {
    type: Number,
    default: 0,
  },
  cancellationReason: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// Indexes for analytics queries
emergencyMetricsSchema.index({ success: 1, createdAt: -1 });
emergencyMetricsSchema.index({ totalTime: 1 });
emergencyMetricsSchema.index({ createdAt: -1 });

module.exports = mongoose.model("EmergencyMetrics", emergencyMetricsSchema);
