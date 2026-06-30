export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans Arabic", "Cairo", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        brand: '#0052cc',
        dark: {
          bg: '#0A1128',
          card: '#121E3D',
          border: '#1C2E5A',
        },
        gold: {
          DEFAULT: '#D4AF37',
        }
      }
    },
  },
  plugins: [],
};
