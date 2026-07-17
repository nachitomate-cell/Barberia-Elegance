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
        // ── La rampa slate ahora sale de tokens (ver styles/_tokens.css) ──
        // `bg-slate-900` significa "superficie de tarjeta", no "#0f172a": el
        // valor lo decide el tema. Esto es lo que hace nativo al modo claro —
        // sin esto haría falta un override !important por cada clase.
        // El formato rgb(var(...) / <alpha-value>) es obligatorio: es lo que
        // mantiene vivos los ~600 modificadores de opacidad (bg-slate-800/40).
        slate: {
          50:  'rgb(var(--slate-50)  / <alpha-value>)',
          100: 'rgb(var(--slate-100) / <alpha-value>)',
          200: 'rgb(var(--slate-200) / <alpha-value>)',
          300: 'rgb(var(--slate-300) / <alpha-value>)',
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: 'rgb(var(--slate-500) / <alpha-value>)',
          600: 'rgb(var(--slate-600) / <alpha-value>)',
          700: 'rgb(var(--slate-700) / <alpha-value>)',
          800: 'rgb(var(--slate-800) / <alpha-value>)',
          900: 'rgb(var(--slate-900) / <alpha-value>)',
          950: 'rgb(var(--slate-950) / <alpha-value>)',
        },

        // Texto principal. Reemplaza a `text-white`, que no podía ser token
        // porque `white` también significa "blanco literal" en bg-white.
        primary: 'rgb(var(--primary) / <alpha-value>)',

        // Velo translúcido sobre la superficie: aclara en oscuro, oscurece
        // en claro. Para `bg-glass/5`, `border-glass/10`.
        glass: 'rgb(var(--glass) / <alpha-value>)',

        // Gris CONGELADO — mismos valores que el slate nativo de Tailwind,
        // pero inmune al tema. Es la válvula de escape para lo que ya vive
        // sobre fondo claro fijo y por lo tanto no debe voltear: texto sobre
        // un chip blanco, o los valores dentro de `[html.light_&]:`.
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },

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

      // ── Texto de acento ────────────────────────────────────────────
      // `textColor` es una escala SEPARADA de `colors` (por defecto ambas
      // derivan de él). Sobrescribirla acá hace que `text-emerald-400` se
      // oscurezca en modo claro mientras `bg-emerald-400` —el botón verde—
      // se queda intacto. Con un token en `colors` no se podría: el mismo
      // tono se usa de texto Y de fondo (medido: 1491 tinta vs 1277 fondo),
      // así que no hay un único valor correcto para los dos.
      //
      // Solo están los tonos cuyo override era sólido, global y con un
      // destino único → migran con delta cero. Ver styles/_tokens.css.
      textColor: {
        emerald: {
          50:  'rgb(var(--tx-emerald-50)  / <alpha-value>)',
          100: 'rgb(var(--tx-emerald-100) / <alpha-value>)',
          200: 'rgb(var(--tx-emerald-200) / <alpha-value>)',
          300: 'rgb(var(--tx-emerald-300) / <alpha-value>)',
          400: 'rgb(var(--tx-emerald-400) / <alpha-value>)',
        },
        red: {
          300: 'rgb(var(--tx-red-300) / <alpha-value>)',
          400: 'rgb(var(--tx-red-400) / <alpha-value>)',
        },
        rose: {
          200: 'rgb(var(--tx-rose-200) / <alpha-value>)',
          300: 'rgb(var(--tx-rose-300) / <alpha-value>)',
        },
        blue: {
          300: 'rgb(var(--tx-blue-300) / <alpha-value>)',
          400: 'rgb(var(--tx-blue-400) / <alpha-value>)',
        },
        amber: {
          50:  'rgb(var(--tx-amber-50)  / <alpha-value>)',
          100: 'rgb(var(--tx-amber-100) / <alpha-value>)',
          200: 'rgb(var(--tx-amber-200) / <alpha-value>)',
        },
        green: {
          400: 'rgb(var(--tx-green-400) / <alpha-value>)',
        },
        violet: {
          50:  'rgb(var(--tx-violet-50)  / <alpha-value>)',
          100: 'rgb(var(--tx-violet-100) / <alpha-value>)',
          200: 'rgb(var(--tx-violet-200) / <alpha-value>)',
        },
        lime: {
          200: 'rgb(var(--tx-lime-200) / <alpha-value>)',
          300: 'rgb(var(--tx-lime-300) / <alpha-value>)',
        },
        sky: {
          200: 'rgb(var(--tx-sky-200) / <alpha-value>)',
          300: 'rgb(var(--tx-sky-300) / <alpha-value>)',
        },

        // Familias que nunca tuvieron override en claro: su texto quedaba en
        // el tono claro sobre blanco (el "$0" lavado de Tarjeta en Caja).
        purple: {
          200: 'rgb(var(--tx-purple-200) / <alpha-value>)',
          300: 'rgb(var(--tx-purple-300) / <alpha-value>)',
          400: 'rgb(var(--tx-purple-400) / <alpha-value>)',
        },
        cyan: {
          300: 'rgb(var(--tx-cyan-300) / <alpha-value>)',
          400: 'rgb(var(--tx-cyan-400) / <alpha-value>)',
        },
        indigo: {
          300: 'rgb(var(--tx-indigo-300) / <alpha-value>)',
          400: 'rgb(var(--tx-indigo-400) / <alpha-value>)',
        },
        pink: {
          300: 'rgb(var(--tx-pink-300) / <alpha-value>)',
          400: 'rgb(var(--tx-pink-400) / <alpha-value>)',
        },
        teal: {
          300: 'rgb(var(--tx-teal-300) / <alpha-value>)',
          400: 'rgb(var(--tx-teal-400) / <alpha-value>)',
        },
        orange: {
          400: 'rgb(var(--tx-orange-400) / <alpha-value>)',
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
        'trophy-halo':    'trophyHalo 2.4s ease-out infinite',
        'sparkle-pop':    'sparklePop 1.8s ease-in-out infinite',
        'fideli-bg':      'fideliBg 6s ease-in-out infinite',
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
          '0%,100%': { filter: 'drop-shadow(0 0 2px rgba(251,191,36,0.55)) drop-shadow(0 0 6px rgba(244,63,94,0.15))' },
          '50%':     { filter: 'drop-shadow(0 0 10px rgba(251,191,36,1)) drop-shadow(0 0 14px rgba(244,63,94,0.35))' },
        },
        trophyHalo: {
          '0%':   { opacity: 0.7, transform: 'scale(0.6)' },
          '80%':  { opacity: 0,   transform: 'scale(1.8)' },
          '100%': { opacity: 0,   transform: 'scale(1.8)' },
        },
        sparklePop: {
          '0%,100%': { opacity: 0.3, transform: 'scale(0.7) rotate(0deg)' },
          '50%':     { opacity: 1,   transform: 'scale(1.1) rotate(20deg)' },
        },
        fideliBg: {
          '0%,100%': { 'background-position': '0% 50%' },
          '50%':     { 'background-position': '100% 50%' },
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
