const { GOOGLE_MAPS_API_KEY } = require("../config/env");
const axios = require("axios");

/**
 * Get route from Google Maps Directions API
 * @param {number} originLat - Origin latitude
 * @param {number} originLng - Origin longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {Promise<Object>} Route information with distance and duration
 */
exports.getRoute = async (originLat, originLng, destLat, destLng) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("⚠️  Google Maps API key not configured. Using fallback calculation.");
    return exports.getRouteFallback(originLat, originLng, destLat, destLng);
  }

  try {
    const url = "https://maps.googleapis.com/maps/api/directions/json";
    const response = await axios.get(url, {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        key: GOOGLE_MAPS_API_KEY,
        mode: "driving",
        alternatives: false,
      },
    });

    if (response.data.status === "OK" && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.value, // in meters
        duration: leg.duration.value, // in seconds
        polyline: route.overview_polyline.points,
        steps: leg.steps.map((step) => ({
          instruction: step.html_instructions,
          html_instructions: step.html_instructions, // For traffic notification service
          distance: {
            value: step.distance.value,
            text: step.distance.text,
          },
          duration: {
            value: step.duration.value,
            text: step.duration.text,
          },
          startLocation: {
            lat: step.start_location.lat,
            lng: step.start_location.lng,
          },
          endLocation: {
            lat: step.end_location.lat,
            lng: step.end_location.lng,
          },
          start_location: step.start_location, // For traffic notification compatibility
          end_location: step.end_location,
        })),
      };
    } else {
      console.warn("⚠️  Google Maps API returned:", response.data.status);
      return exports.getRouteFallback(originLat, originLng, destLat, destLng);
    }
  } catch (error) {
    console.error("❌ Google Maps API error:", error.message);
    return exports.getRouteFallback(originLat, originLng, destLat, destLng);
  }
};

/**
 * Fallback route calculation using haversine distance
 * Assumes average ambulance speed of 60 km/h
 * @param {number} originLat - Origin latitude
 * @param {number} originLng - Origin longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @returns {Object} Estimated route information
 */
exports.getRouteFallback = async (originLat, originLng, destLat, destLng) => {
  const { haversineDistance } = require("../utils/haversine");

  const distanceMeters = haversineDistance(originLat, originLng, destLat, destLng);
  const avgSpeedKmh = 60; // Average ambulance speed
  const avgSpeedMs = (avgSpeedKmh * 1000) / 3600; // Convert to m/s
  const durationSeconds = Math.round(distanceMeters / avgSpeedMs);

  return {
    distance: distanceMeters,
    duration: durationSeconds,
    polyline: null,
    steps: [],
    estimated: true,
  };
};

/**
 * Get ETA (Estimated Time of Arrival)
 * @param {number} driverLat - Driver current latitude
 * @param {number} driverLng - Driver current longitude
 * @param {number} emergencyLat - Emergency latitude
 * @param {number} emergencyLng - Emergency longitude
 * @returns {Promise<Object>} ETA information
 */
exports.getETA = async (driverLat, driverLng, emergencyLat, emergencyLng) => {
  const route = await exports.getRoute(driverLat, driverLng, emergencyLat, emergencyLng);

  const eta = new Date(Date.now() + route.duration * 1000);

  return {
    distance: route.distance,
    duration: route.duration,
    eta: eta.toISOString(),
    estimatedMinutes: Math.ceil(route.duration / 60),
  };
};
