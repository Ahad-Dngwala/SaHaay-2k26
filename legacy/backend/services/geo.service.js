const Driver = require("../models/Driver");
const { haversineDistance, isWithinRadius } = require("../utils/haversine");

/**
 * Find available drivers within a radius (using bounding box + haversine filter)
 * @param {number} lat - Latitude of emergency location
 * @param {number} lng - Longitude of emergency location
 * @param {number} radiusMeters - Search radius in meters (default: 1000m)
 * @returns {Promise<Array>} Array of drivers sorted by distance
 */
exports.findDrivers = async (lat, lng, radiusMeters = 1000) => {
  // Approximate degree offset for bounding box (1 degree ≈ 111km)
  // Add buffer for bounding box (use 1.5x radius for safety)
  const degreeOffset = (radiusMeters * 1.5) / 111000;

  // Find drivers in bounding box (fast MongoDB query)
  const drivers = await Driver.find({
    lat: { $gte: lat - degreeOffset, $lte: lat + degreeOffset },
    lng: { $gte: lng - degreeOffset, $lte: lng + degreeOffset },
    status: "available",
  });

  // Filter by actual haversine distance and add distance field
  const nearbyDrivers = drivers
    .map((driver) => ({
      driver: driver,
      distance: haversineDistance(lat, lng, driver.lat, driver.lng),
    }))
    .filter((item) => item.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance) // Sort by distance (nearest first)
    .map((item) => ({
      ...item.driver.toObject(),
      distance: Math.round(item.distance),
    }));

  return nearbyDrivers;
};

/**
 * Update driver location
 * @param {string} driverId - Driver ID
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Updated driver
 */
exports.updateDriverLocation = async (driverId, lat, lng) => {
  const driver = await Driver.findByIdAndUpdate(
    driverId,
    {
      lat,
      lng,
      lastSeen: new Date(),
    },
    { new: true }
  );

  return driver;
};

/**
 * Get driver's current location
 * @param {string} driverId - Driver ID
 * @returns {Promise<Object>} Driver with location
 */
exports.getDriverLocation = async (driverId) => {
  const driver = await Driver.findById(driverId).select("lat lng name vehicleNo status");
  return driver;
};
