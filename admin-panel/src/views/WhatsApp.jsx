import WhatsAppNotif from './WhatsAppNotif';
import WhatsAppAsistente from './WhatsAppAsistente';

// Vista unificada "WhatsApp" — una sola página fluida con los módulos del canal,
// uno debajo del otro (sin pestañas). El cliente ve de un vistazo qué tiene y
// qué puede pedir:
//   1. Avisos de reservas   (GRATIS · incluido)            → WhatsAppNotif (nivel dueño)
//   2. Confirmación al cliente (PLAN PAGADO)               → WhatsAppNotif (nivel cliente)
//   3. Asistente IA 24/7     (PREMIUM · lo activa SynapTech) → WhatsAppAsistente
//
// Los módulos pagados NO se auto-activan: la "llave" vive en _system/{tid}
// (solo SynapTech escribe) y el cliente solo puede solicitar la activación.

function WaLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#25D366" d="M20.52 3.45C18.24 1.17 15.24 0 12.06 0 5.55 0 .21 5.28.21 11.79c0 2.07.54 4.11 1.62 5.91L.06 24l6.42-1.68c1.71.93 3.66 1.44 5.58 1.44 6.51 0 11.85-5.28 11.85-11.79 0-3.15-1.23-6.15-3.39-8.52z"/>
      <path fill="#fff" d="M17.51 14.31c-.33-.15-1.95-.96-2.25-1.08-.3-.12-.51-.15-.72.15-.21.33-.84 1.08-1.05 1.29-.18.21-.39.24-.72.09-.33-.18-1.41-.51-2.67-1.65-.99-.87-1.65-1.98-1.86-2.31-.18-.33-.03-.51.15-.66.15-.15.33-.39.48-.6.15-.18.21-.33.33-.54.09-.21.06-.42-.03-.6-.09-.18-.72-1.74-.99-2.37-.24-.6-.51-.51-.72-.51-.18 0-.39-.03-.6-.03s-.57.09-.87.42c-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.15 1.35 3.36.18.21 2.31 3.51 5.61 4.92.78.33 1.41.54 1.89.69.78.24 1.5.21 2.07.12.63-.09 1.95-.81 2.22-1.56.27-.75.27-1.41.21-1.56-.09-.15-.3-.24-.63-.39z"/>
    </svg>
  );
}

export default function WhatsApp() {
  return (
    <div className="max-w-3xl mx-auto pb-16">

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 shadow-[0_0_24px_-10px_rgba(37,211,102,0.6)] shrink-0">
          <WaLogo size={26} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-primary leading-tight">WhatsApp</h1>
          <p className="text-sm text-slate-400 mt-0.5 leading-snug">
            Todo el canal de tu local en un solo lugar: avisos, confirmaciones y el asistente que responde por ti.
          </p>
        </div>
      </div>

      {/* ── Módulos, uno debajo del otro ── */}
      <div className="mt-6 space-y-5">
        <WhatsAppNotif embedded />
        <WhatsAppAsistente embedded />
      </div>

    </div>
  );
}
