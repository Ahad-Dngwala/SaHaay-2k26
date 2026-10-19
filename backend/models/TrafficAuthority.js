const mongoose = require("mongoose");

/**
 * Traffic Authority mapping model
 * Maps geographic areas/checkpoints to traffic authority email addresses
 */
const trafficAuthoritySchema = new mongoose.Schema({
  area: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  lat: {
    type: Number,
    required: false, // Optional: center point of area
  },
  lng: {
    type: Number,
    required: false,
  },
  radius: {
    type: Number,
    default: 5000, // Radius in meters (default 5km)
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  checkpointNames: [{
    type: String,
    trim: true,
  }], // Common checkpoint names in this area (e.g., ["Andheri Flyover", "WEH Junction"])
}, {
  timestamps: true,
});

// Index for location-based queries
trafficAuthoritySchema.index({ lat: 1, lng: 1 });
trafficAuthoritySchema.index({ area: 1, isActive: 1 });

module.exports = mongoose.model("TrafficAuthority", trafficAuthoritySchema);
