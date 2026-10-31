export const VIBRATION_THRESHOLDS = {
  // Normal driving bumps
  NORMAL_BUMP: 1.2,
  
  // Hard pothole/rough road
  HARD_BUMP: 1.8,
  
  // Minor accident threshold
  MINOR_ACCIDENT: 2.5,
  
  // Major crash threshold
  SEVERE_CRASH: 4.0,
};

export const getVibrationStatus = (level) => {
  if (level < VIBRATION_THRESHOLDS.NORMAL_BUMP) return 'SAFE';
  if (level < VIBRATION_THRESHOLDS.HARD_BUMP) return 'BUMP';
  if (level < VIBRATION_THRESHOLDS.MINOR_ACCIDENT) return 'WARNING';
  if (level < VIBRATION_THRESHOLDS.SEVERE_CRASH) return 'ACCIDENT';
  return 'CRITICAL';
};
