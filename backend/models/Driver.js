const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  vehicleNo: {
    type: String,
    required: true,
    unique: true, // Creates index automatically
    trim: true,
    uppercase: true,
  },
  lat: {
    type: Number,
    default: 0,
  },
  lng: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["available", "busy", "offline"],
    default: "available",
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  // Trust & Rating System
  rating: {
    type: Number,
    default: 5.0,
    min: 0,
    max: 5,
  },
  totalTrips: {
    type: Number,
    default: 0,
  },
  totalCancellations: {
    type: Number,
    default: 0,
  },
  totalBreakdowns: {
    type: Number,
    default: 0,
  },
  kycVerified: {
    type: Boolean,
    default: false,
  },
  hospitalAffiliation: {
    type: String,
    trim: true,
    default: null,
  },
  trustScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
});

// Geospatial index for location queries
driverSchema.index({ lat: 1, lng: 1 });
driverSchema.index({ status: 1 });
// vehicleNo index is already created by unique: true, but we keep explicit index for compound queries if needed

module.exports = mongoose.model("Driver", driverSchema);
