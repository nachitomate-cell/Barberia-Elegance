import { useState } from 'react';
import { BellRing, Bot, Sparkles } from 'lucide-react';
import WhatsAppNotif from './WhatsAppNotif';
import WhatsAppBot from './WhatsAppBot';
import WhatsAppAsistente from './WhatsAppAsistente';

// Vista unificada "WhatsApp" — agrupa los dos módulos del canal:
//   · Avisos de reservas  (WhatsAppNotif: gratis al dueño + pagado al cliente)
//   · Bot de respuestas   (WhatsAppBot: pitch del auto-responder con IA)
// En el sidebar hay una sola entrada "WhatsApp"; las rutas antiguas
// whatsapp-bot y whatsapp-notif también renderizan esta vista.

function WaLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#25D366" d="M20.52 3.45C18.24 1.17 15.24 0 12.06 0 5.55 0 .21 5.28.21 11.79c0 2.07.54 4.11 1.62 5.91L.06 24l6.42-1.68c1.71.93 3.66 1.44 5.58 1.44 6.51 0 11.85-5.28 11.85-11.79 0-3.15-1.23-6.15-3.39-8.52z"/>
      <path fill="#fff" d="M17.51 14.31c-.33-.15-1.95-.96-2.25-1.08-.3-.12-.51-.15-.72.15-.21.33-.84 1.08-1.05 1.29-.18.21-.39.24-.72.09-.33-.18-1.41-.51-2.67-1.65-.99-.87-1.65-1.98-1.86-2.31-.18-.33-.03-.51.15-.66.15-.15.33-.39.48-.6.15-.18.21-.33.33-.54.09-.21.06-.42-.03-.6-.09-.18-.72-1.74-.99-2.37-.24-.6-.51-.51-.72-.51-.18 0-.39-.03-.6-.03s-.57.09-.87.42c-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.15 1.35 3.36.18.21 2.31 3.51 5.61 4.92.78.33 1.41.54 1.89.69.78.24 1.5.21 2.07.12.63-.09 1.95-.81 2.22-1.56.27-.75.27-1.41.21-1.56-.09-.15-.3-.24-.63-.39z"/>
    </svg>
  );
}

const TABS = [
  {
    key: 'avisos',
    label: 'Avisos de reservas',
    Icon: BellRing,
    badge: 'Gratis',
    badgeCls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  },
  {
    key: 'bot',
    label: 'Bot de respuestas',
    Icon: Bot,
    badge: 'Pro',
    badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  },
  {
    key: 'asistente',
    label: 'Asistente IA',
    Icon: Sparkles,
    badge: 'Premium',
    badgeCls: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  },
];

export default function WhatsApp() {
  const [tab, setTab] = useState('avisos');

  return (
    <div className="max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 shadow-[0_0_20px_-8px_rgba(37,211,102,0.5)]">
          <WaLogo size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">WhatsApp</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Todo el canal WhatsApp de tu local: avisos de reservas y respuestas automáticas.
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mt-5 mb-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-1.5 w-fit max-w-full overflow-x-auto">
        {TABS.map(({ key, label, Icon, badge, badgeCls }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                active
                  ? 'bg-slate-700/80 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon size={15} className={active ? 'text-[#25D366]' : ''} />
              {label}
              <span className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-1.5 py-0.5 ${badgeCls}`}>
                {badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Contenido ── */}
      {tab === 'avisos'    && <WhatsAppNotif embedded />}
      {tab === 'bot'       && <WhatsAppBot embedded />}
      {tab === 'asistente' && <WhatsAppAsistente embedded />}
    </div>
  );
}
