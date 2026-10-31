/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 03_citizen_sos specific tokens
        appDark: '#080d15',
        appCard: '#131b2a',
        appSurface: '#162033',
        emergencyRed: '#eb3824',
        neonGreen: '#5cd67c',
        // 02_citizen_tracking specific tokens
        'brand-red': '#EA3836',
        // Shared design system (DESIGN.md)
        canvas: '#FFF7D6',
        surface: '#FFFEFA',
        'surface-muted': '#FFF0D0',
        ink: '#26231F',
        'ink-muted': '#5F5A52',
        border: '#E7DECC',
        brand: '#B84018',
        'brand-bright': '#F45A1F',
        'brand-soft': '#FBE5D9',
        sos: '#B42318',
        'sos-soft': '#FCE8E6',
        success: '#1F6F45',
        'success-soft': '#E7F3E9',
        warning: '#875400',
        'warning-soft': '#FFF1D4',
        info: '#285C78',
        'map-bg': '#F1EFE8',
        'map-road': '#FFFEFA',
        'map-road-secondary': '#DCD6CB',
        'map-route': '#C8471F',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
