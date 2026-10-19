// Validate phone number
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate name
export const isValidName = (name) => {
  return name && name.trim().length > 0 && name.trim().length <= 100;
};

// Validate non-empty string
export const isNotEmpty = (str) => {
  return str && str.trim().length > 0;
};

// Validate number in range
export const isInRange = (value, min, max) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};
