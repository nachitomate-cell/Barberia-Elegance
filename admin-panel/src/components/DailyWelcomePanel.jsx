// DailyWelcomePanel.jsx — Panel diario al entrar a gestión-interna.
// Identidad SynapTech SPA: negro puro + verde #8CC63F, animaciones spring,
// glow, partículas, grid sutil. Se muestra una sola vez por día por
// dispositivo (localStorage con la fecha actual como marca).

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays, BarChart3, Megaphone, Lightbulb, Coffee, ArrowRight, EyeOff } from 'lucide-react';

const LS_KEY = 'daily_welcome_shown_date';
const BIOO_KEY = 'bioo_announcement_dismissed';
// Preferencia persistente "no volver a mostrar". Si vale '1' el panel queda
// silenciado hasta que el usuario lo reactive desde Configuracion.
export const DAILY_WELCOME_DISABLED_KEY = 'daily_welcome_disabled';

export function isDailyWelcomeDisabled() {
  try { return localStorage.getItem(DAILY_WELCOME_DISABLED_KEY) === '1'; }
  catch { return false; }
}

export function setDailyWelcomeDisabled(disabled) {
  try {
    if (disabled) localStorage.setItem(DAILY_WELCOME_DISABLED_KEY, '1');
    else          localStorage.removeItem(DAILY_WELCOME_DISABLED_KEY);
  } catch {}
}

const SYNAP = '#8CC63F';
const SYNAP_SOFT = 'rgba(140, 198, 63, 0.12)';
const SYNAP_GLOW = 'rgba(140, 198, 63, 0.35)';

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const OPCIONES = [
  { to: '/agenda',    label: 'Revisar la agenda',       desc: 'Citas y reservas de hoy',     Icon: CalendarDays },
  { to: '/metricas',  label: 'Gestión financiera',      desc: 'Métricas y rendimiento',      Icon: BarChart3    },
  { to: '/marketing', label: 'Marketing para el local', desc: 'Campañas y promociones',      Icon: Megaphone    },
  { to: '/soporte',   label: '¿Tienes una idea de mejora?', desc: 'Cuéntanosla en soporte',  Icon: Lightbulb    },
  { to: null,         label: 'Aún no me decido',        desc: 'Explorar el panel libre',     Icon: Coffee       },
];

export default function DailyWelcomePanel() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(() => {
    try {
      if (localStorage.getItem(DAILY_WELCOME_DISABLED_KEY) === '1') return false;
      if (localStorage.getItem(BIOO_KEY) !== '1') return false;
      return localStorage.getItem(LS_KEY) !== todayKey();
    } catch {
      return false;
    }
  });

  function dismiss() {
    try { localStorage.setItem(LS_KEY, todayKey()); } catch {}
    setOpen(false);
  }

  function dismissForever() {
    setDailyWelcomeDisabled(true);
    setOpen(false);
  }

  function elegir(to) {
    dismiss();
    if (to) navigate(to);
  }

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-component="daily-welcome"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={dismiss}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(140,198,63,0.08) 0%, rgba(0,0,0,0.85) 60%)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Grid de fondo */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(140,198,63,0.06) 1px, transparent 1px),' +
                'linear-gradient(to bottom, rgba(140,198,63,0.06) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            }}
          />

          {/* Orbes flotantes */}
          <motion.div
            aria-hidden
            className="absolute pointer-events-none rounded-full"
            style={{
              width: 380, height: 380, top: '15%', left: '12%',
              background: `radial-gradient(circle, ${SYNAP_GLOW} 0%, transparent 70%)`,
              filter: 'blur(30px)',
            }}
            animate={{ y: [0, -20, 0], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute pointer-events-none rounded-full"
            style={{
              width: 320, height: 320, bottom: '12%', right: '15%',
              background: `radial-gradient(circle, ${SYNAP_GLOW} 0%, transparent 70%)`,
              filter: 'blur(30px)',
            }}
            animate={{ y: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />

          <motion.div
            data-card="daily-welcome"
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #0f0f0f 0%, #0A0A0A 100%)',
              border: '1px solid rgba(140, 198, 63, 0.22)',
              boxShadow:
                '0 0 0 1px rgba(140, 198, 63, 0.1), ' +
                '0 30px 90px -30px rgba(140, 198, 63, 0.35), ' +
                '0 20px 60px -20px rgba(0, 0, 0, 0.9)',
            }}
          >
            {/* Halo verde superior */}
            <div
              aria-hidden
              className="absolute -top-32 left-1/2 -translate-x-1/2 pointer-events-none rounded-full"
              style={{
                width: 360, height: 200,
                background: `radial-gradient(ellipse, ${SYNAP_GLOW} 0%, transparent 65%)`,
                filter: 'blur(28px)',
              }}
            />

            {/* Cerrar */}
            <button
              data-close="daily-welcome"
              onClick={dismiss}
              className="absolute top-3.5 right-3.5 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = SYNAP_SOFT;
                e.currentTarget.style.borderColor = 'rgba(140,198,63,0.35)';
                e.currentTarget.style.color = SYNAP;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              }}
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>

            {/* Branding SynapTech */}
            <motion.div
              className="px-6 pt-7 flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <motion.span
                className="block rounded-full"
                style={{ width: 7, height: 7, background: SYNAP, boxShadow: `0 0 12px ${SYNAP_GLOW}` }}
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span
                data-brand="daily-welcome"
                className="text-[10px] font-semibold tracking-[0.22em] uppercase"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                SynapTech <span style={{ color: SYNAP }}>SPA</span>
              </span>
            </motion.div>

            {/* Encabezado */}
            <motion.div
              className="px-6 pt-3 pb-1 text-center space-y-2 relative"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.45 }}
            >
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: SYNAP }}>
                {saludo}
              </p>
              <h3 className="text-white font-bold text-2xl leading-tight">
                ¿Qué quieres hacer{' '}
                <span
                  style={{
                    background: `linear-gradient(135deg, ${SYNAP} 0%, #bce07c 50%, ${SYNAP} 100%)`,
                    backgroundSize: '200% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'synapShimmer 3.5s linear infinite',
                  }}
                >
                  hoy?
                </span>
              </h3>
            </motion.div>

            {/* Opciones */}
            <div className="px-5 pt-5 pb-3 flex flex-col gap-2.5 relative">
              {OPCIONES.map(({ to, label, desc, Icon }, i) => (
                <motion.button
                  key={label}
                  data-option="daily-welcome"
                  onClick={() => elegir(to)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + i * 0.07, type: 'spring', damping: 20, stiffness: 220 }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative text-left rounded-2xl p-3.5 flex items-center gap-3 overflow-hidden transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(140,198,63,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(140,198,63,0.32)';
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${SYNAP_SOFT}, 0 10px 30px -10px ${SYNAP_GLOW}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Brillo diagonal al hover */}
                  <span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(120deg, transparent 30%, ${SYNAP_SOFT} 50%, transparent 70%)`,
                    }}
                  />

                  {/* Ícono */}
                  <span
                    className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: SYNAP_SOFT,
                      border: '1px solid rgba(140,198,63,0.18)',
                      color: SYNAP,
                    }}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </span>

                  {/* Texto */}
                  <div className="flex-1 min-w-0 relative">
                    <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                    <p
                      data-option-desc="daily-welcome"
                      className="text-xs leading-snug mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {desc}
                    </p>
                  </div>

                  {/* Flecha */}
                  <span
                    className="relative shrink-0 transition-all duration-300 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    style={{ color: SYNAP }}
                  >
                    <ArrowRight size={16} />
                  </span>
                </motion.button>
              ))}
            </div>

            {/* "No volver a mostrar" — reactivable desde Configuracion */}
            <motion.div
              className="px-5 pb-5 pt-1 flex justify-center relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.35 }}
            >
              <button
                type="button"
                data-dismiss-forever="daily-welcome"
                onClick={dismissForever}
                className="group inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
                title="Puedes reactivarlo desde Configuración"
              >
                <EyeOff size={12} />
                No volver a mostrar este panel
              </button>
            </motion.div>
          </motion.div>

          {/* Keyframes locales */}
          <style>{`
            @keyframes synapShimmer {
              0% { background-position: 0% 50%; }
              100% { background-position: 200% 50%; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
