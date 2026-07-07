/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
      },
      animation: {
        'slide-in-right': 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':        'fadeIn 0.15s ease',
        'confirm-fade':   'fadeIn 0.18s ease',
        'confirm-pop':    'confirmPop 0.38s cubic-bezier(0.34,1.56,0.64,1)',
        'confirm-logo':   'confirmLogo 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
        'confirm-ring':   'confirmRing 1.9s ease-out infinite',
        'shimmer':        'shimmer 3s ease-in-out infinite',
        'trophy-glow':    'trophyGlow 2.6s ease-in-out infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        shimmer: {
          '0%,100%': { 'background-position': '0% 50%' },
          '50%':     { 'background-position': '100% 50%' },
        },
        trophyGlow: {
          '0%,100%': { filter: 'drop-shadow(0 0 2px rgba(251,191,36,0.45))' },
          '50%':     { filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.9))' },
        },
        confirmPop: {
          '0%':   { opacity: 0, transform: 'scale(0.92) translateY(12px)' },
          '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        confirmLogo: {
          '0%':   { opacity: 0, transform: 'scale(0.4) rotate(-15deg)' },
          '60%':  { opacity: 1, transform: 'scale(1.12) rotate(5deg)' },
          '100%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
        },
        confirmRing: {
          '0%':   { opacity: 0.55, transform: 'scale(0.85)' },
          '100%': { opacity: 0, transform: 'scale(1.75)' },
        },
      },
    },
  },
  plugins: [],
};
