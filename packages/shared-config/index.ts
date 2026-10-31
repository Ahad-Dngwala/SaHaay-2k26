/**
 * packages/shared-config/index.ts
 * Source-of-truth tokens and constants grounded in 01_shared_design_system/DESIGN.md
 */

export const SaHaayTokens = {
  colors: {
    // Dark App Surfaces
    appDark: '#080d15',
    appCard: '#131b2a',
    appSurface: '#162033',
    appDarkElevated: '#1a1c22',
    appDarkBase: '#0c0d10',
    appInputDark: '#18181e',
    appBorderDark: '#26262e',

    // Emergency & Priority
    emergencyRed: '#eb3824',
    brandRed: '#ea3836',
    sosGlow: 'rgba(235, 56, 36, 0.45)',

    // Accents & Signals
    neonGreen: '#5cd67c',
    statusGreen: '#24a173',
    warningOrange: '#f59e0b',
    infoBlue: '#3894e6',
    purpleAccent: '#ab7bff',

    // Neutral Text
    textPrimary: '#ffffff',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
  },

  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Roboto, "Segoe UI", sans-serif',
  },

  server: {
    DEFAULT_API_URL: 'http://localhost:3000',
    DEFAULT_WS_URL: 'ws://localhost:3000',
    AHMEDABAD_CENTER: {
      lat: 23.03386,
      lon: 72.58502,
    },
  },
};

export const AHMEDABAD_LOCATIONS = [
  { name: 'Navrangpura', lat: 23.0365, lon: 72.5611 },
  { name: 'Usmanpura', lat: 23.0487, lon: 72.5694 },
  { name: 'Paldi', lat: 23.0131, lon: 72.5625 },
  { name: 'Ellisbridge', lat: 23.0232, lon: 72.5714 },
  { name: 'Maninagar', lat: 22.9978, lon: 72.6033 },
  { name: 'Ashram Road', lat: 23.0312, lon: 72.5701 },
  { name: 'C.G. Road', lat: 23.0334, lon: 72.5568 },
  { name: 'Sabarmati Riverfront', lat: 23.0415, lon: 72.5782 },
];

