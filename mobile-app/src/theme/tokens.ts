/**
 * mobile-app/src/theme/tokens.ts
 * Design system tokens from 01_shared_design_system/DESIGN.md & Dark Reference shells.
 */

export const Colors = {
  // Shared design system (DESIGN.md)
  canvas: '#FFF7D6',
  surface: '#FFFEFA',
  surfaceMuted: '#FFF0D0',
  ink: '#26231F',
  inkMuted: '#5F5A52',
  border: '#E7DECC',
  brand: '#B84018',
  brandBright: '#F45A1F',
  brandSoft: '#FBE5D9',
  sos: '#B42318',
  sosSoft: '#FCE8E6',
  success: '#1F6F45',
  successSoft: '#E7F3E9',
  warning: '#875400',
  warningSoft: '#FFF1D4',
  info: '#285C78',

  // Cartographic tokens
  mapBg: '#F1EFE8',
  mapRoad: '#FFFEFA',
  mapRoadSecondary: '#DCD6CB',
  mapRoute: '#C8471F',

  // Dark reference tokens (03_citizen_sos, 04_driver_dispatch, 05/06)
  darkBg: '#090d16',
  darkShell: '#08080a',
  darkCard: '#121216',
  darkCardElevated: '#171920',
  darkBorder: '#222938',
  darkDock: '#1a1c22',
  darkSubtext: '#878c99',
  neonGreen: '#34d399',
} as const;

export const Typography = {
  display: 'Bowlby One SC, Impact, sans-serif',
  body: 'DM Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
} as const;

export const Spacing = {
  touchTargetMin: 48,
  primaryCtaHeight: 56,
  bottomSheetRadius: 24,
  cardRadius: 20,
} as const;

