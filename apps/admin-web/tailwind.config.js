/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        appDark: '#080d15',
        appCard: '#131b2a',
        appSurface: '#162033',
        emergencyRed: '#eb3824',
        neonGreen: '#5cd67c',
        statusGreen: '#24a173',
      },
    },
  },
  plugins: [],
};

