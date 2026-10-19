// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

// Emergency States
export const EMERGENCY_STATES = {
  INACTIVE: 'inactive',
  ARMED: 'armed',
  TRIGGERED: 'triggered',
  CANCELLED: 'cancelled',
};

// Accident Detection Thresholds
export const ACCIDENT_THRESHOLD = 50;
export const VIBRATION_THRESHOLD = 30;

// Timer Constants (in seconds)
export const EMERGENCY_COUNTDOWN = 30;
export const EMERGENCY_AUTO_DIAL = 15;

// Message Types
export const MESSAGE_TYPES = {
  EMERGENCY_ALERT: 'emergency_alert',
  LOCATION_UPDATE: 'location_update',
  MISSION_UPDATE: 'mission_update',
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_DATA: 'user_data',
  EMERGENCY_HISTORY: 'emergency_history',
  APP_SETTINGS: 'app_settings',
};
