// Parse and validate coordinates
export const parseCoordinates = (lat, lon) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error('Invalid coordinates');
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  return { latitude, longitude };
};

// Get display string for coordinates
export const getCoordinateString = (lat, lon) => {
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
};

// Check if coordinates are valid
export const isValidCoordinates = (lat, lon) => {
  try {
    parseCoordinates(lat, lon);
    return true;
  } catch (error) {
    return false;
  }
};
