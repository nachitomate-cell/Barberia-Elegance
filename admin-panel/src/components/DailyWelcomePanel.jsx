// DailyWelcomePanel.jsx — Panel diario al entrar a gestión-interna.
// Pregunta al usuario "¿Qué quieres hacer hoy?" con tres accesos directos
// (agenda, finanzas, marketing) y una opción para postergar la decisión.
// Se muestra una sola vez por día (por dispositivo), usando localStorage
// con la fecha actual como marca.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CalendarDays, Wallet, Megaphone, Coffee } from 'lucide-react';

const LS_KEY = 'daily_welcome_shown_date';
const BIOO_KEY = 'bioo_announcement_dismissed';

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const OPCIONES = [
  { to: '/agenda',    label: 'Revisar la agenda',     desc: 'Citas y reservas de hoy',      Icon: CalendarDays },
  { to: '/finanzas',  label: 'Gestión financiera',    desc: 'Caja, ingresos y gastos',      Icon: Wallet       },
  { to: '/marketing', label: 'Marketing para el local', desc: 'Campañas y promociones',     Icon: Megaphone    },
  { to: null,         label: 'Aún no me decido',      desc: 'Cerrar y elegir más tarde',    Icon: Coffee       },
];

export default function DailyWelcomePanel() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(() => {
    try {
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

  function elegir(to) {
    dismiss();
    if (to) navigate(to);
  }

  if (!open) return null;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: '#0d0d0d',
          border: '1px solid rgba(212,175,55,0.25)',
          boxShadow: '0 0 70px rgba(0,0,0,0.7)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="px-6 pt-6 pb-2 text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: '#D4AF37' }}>
            {saludo}
          </p>
          <h3 className="text-white font-bold text-xl leading-snug">
            ¿Qué quieres hacer hoy?
          </h3>
        </div>

        <div className="px-5 pt-4 pb-5 flex flex-col gap-2.5">
          {OPCIONES.map(({ to, label, desc, Icon }) => (
            <button
              key={label}
              onClick={() => elegir(to)}
              className="group text-left rounded-xl p-3.5 transition-all hover:scale-[1.01] flex items-center gap-3"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}
              >
                <Icon size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                <p className="text-slate-400 text-xs leading-snug mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
