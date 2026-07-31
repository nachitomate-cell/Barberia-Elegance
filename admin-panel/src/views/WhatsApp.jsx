import { useState, useCallback } from 'react';
import WhatsAppNotif from './WhatsAppNotif';
import WhatsAppPlataforma from './WhatsAppPlataforma';
import WhatsAppAsistente from './WhatsAppAsistente';

// Vista unificada "WhatsApp" — los tres módulos del canal, uno debajo del otro.
//
//   · Confirmación al cliente (plantilla oficial de Meta)  → WhatsAppNotif
//   · Confirmaciones por el número de SynapTech            → WhatsAppPlataforma
//   · Asistente IA 24/7 (bot en el número del local)       → WhatsAppAsistente
//
// ORDENADOS POR ESTADO, no por código. Antes se renderizaban en orden fijo y el
// dueño abría la página encontrándose primero un módulo que NO tiene, con su
// botón de "Solicitar activación", mientras el que sí está funcionando quedaba
// más abajo. Peor: dos de los tres se llaman "confirmaciones", así que sin
// jerarquía no había forma de saber cuál le aplica.
//
// Ahora cada módulo reporta si está contratado y la página lo ubica: lo activo
// arriba, lo disponible al final bajo un separador. Se hace con CSS `order` en
// vez de reordenar el árbol, así cada módulo sigue siendo dueño de su estado y
// no hay que levantarlo acá — que obligaría a duplicar sus lecturas.
//
// Los módulos NO se auto-activan: la llave vive en _system/{tid}, que solo
// SynapTech escribe. El cliente únicamente puede solicitarlos.

function WhatsAppLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fill="#25D366" d="M20.52 3.45C18.24 1.17 15.24 0 12.06 0 5.55 0 .21 5.28.21 11.79c0 2.07.54 4.11 1.62 5.91L.06 24l6.42-1.68c1.71.93 3.66 1.44 5.58 1.44 6.51 0 11.85-5.28 11.85-11.79 0-3.15-1.23-6.15-3.39-8.52z"/>
      <path fill="#fff" d="M17.51 14.31c-.33-.15-1.95-.96-2.25-1.08-.3-.12-.51-.15-.72.15-.21.33-.84 1.08-1.05 1.29-.18.21-.39.24-.72.09-.33-.18-1.41-.51-2.67-1.65-.99-.87-1.65-1.98-1.86-2.31-.18-.33-.03-.51.15-.66.15-.15.33-.39.48-.6.15-.18.21-.33.33-.54.09-.21.06-.42-.03-.6-.09-.18-.72-1.74-.99-2.37-.24-.6-.51-.51-.72-.51-.18 0-.39-.03-.6-.03s-.57.09-.87.42c-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.15 1.35 3.36.18.21 2.31 3.51 5.61 4.92.78.33 1.41.54 1.89.69.78.24 1.5.21 2.07.12.63-.09 1.95-.81 2.22-1.56.27-.75.27-1.41.21-1.56-.09-.15-.3-.24-.63-.39z"/>
    </svg>
  );
}

// order 0 = contratado · 5 = separador · 10 = disponible.
// Mientras un módulo no reporta (aún leyendo Firestore) se lo trata como
// activo: si se asumiera lo contrario, los bloques saltarían de abajo hacia
// arriba al terminar de cargar, que se ve peor que esperar un instante.
const ORDEN = { activo: 0, disponible: 10 };

export default function WhatsApp() {
  const [estado, setEstado] = useState({});

  // useCallback por módulo: sin esto, cada render crea una función nueva, el
  // useEffect del hijo la ve cambiada y vuelve a reportar — bucle infinito.
  const reportar = {
    notif:      useCallback((e) => setEstado(p => (p.notif      === e ? p : { ...p, notif:      e })), []),
    plataforma: useCallback((e) => setEstado(p => (p.plataforma === e ? p : { ...p, plataforma: e })), []),
    bot:        useCallback((e) => setEstado(p => (p.bot        === e ? p : { ...p, bot:        e })), []),
  };

  const orden = (k) => ORDEN[estado[k]] ?? ORDEN.activo;
  const hayDisponibles = Object.values(estado).some(e => e === 'disponible');
  const hayActivos     = Object.values(estado).some(e => e === 'activo');

  return (
    <div data-view="whatsapp" className="max-w-3xl mx-auto pb-12">

      {/* ── Header sticky · estilo Apple ── */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 mb-6 bg-slate-950/85 backdrop-blur-md border-b border-white/[0.06] sm:border-none">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/25 flex items-center justify-center shrink-0 shadow-[0_6px_18px_-8px_rgba(37,211,102,0.5)]">
            <WhatsAppLogo size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-primary tracking-tight leading-tight">WhatsApp</h1>
            <p className="text-[13px] text-slate-500 mt-0.5 leading-snug">
              Todo el canal de tu local en un solo lugar: avisos, confirmaciones y el asistente que responde por ti.
            </p>
          </div>
        </div>
      </div>

      {/* ── Módulos apilados y ordenados por estado ──
          `gap`, no `space-y`: space-y pone el margen según el orden del DOM
          (`* + *`), que acá ya no es el orden visual — quedarían huecos
          disparejos y un margen colgando arriba del primer bloque. */}
      <div className="flex flex-col gap-10">

        <div style={{ order: orden('plataforma') }}>
          <WhatsAppPlataforma onEstado={reportar.plataforma} />
        </div>

        <div style={{ order: orden('bot') }}>
          <WhatsAppAsistente embedded onEstado={reportar.bot} />
        </div>

        <div style={{ order: orden('notif') }}>
          <WhatsAppNotif embedded onEstado={reportar.notif} />
        </div>

        {/* Separador: solo tiene sentido si hay algo a cada lado. */}
        {hayActivos && hayDisponibles && (
          <div style={{ order: 5 }} className="flex items-center gap-3 -my-2">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 shrink-0">
              Otros módulos disponibles
            </span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </div>
        )}

      </div>
    </div>
  );
}
