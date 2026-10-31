// Helper to generate route polyline coordinates
export const generateRoutePolyline = (origin, destination) => {
  // This would typically call a mapping service API
  // For now, returning a placeholder
  return [
    { latitude: origin.latitude, longitude: origin.longitude },
    { latitude: destination.latitude, longitude: destination.longitude },
  ];
};

// Helper to get map zoom level based on distance
export const getZoomLevel = (distance) => {
  if (distance < 1) return 18;
  if (distance < 5) return 16;
  if (distance < 15) return 14;
  if (distance < 30) return 12;
  return 10;
};

// Helper to format coordinates for display
export const formatCoordinates = (lat, lon) => {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
};
