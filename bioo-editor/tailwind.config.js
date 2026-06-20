/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'] },
      colors: {
        bioo: { DEFAULT: '#92c83a', light: '#a3d94a', dark: '#2c5a17', ink: '#15240b', soft: '#5b6a4e' },
      },
    },
  },
  plugins: [],
};
