import { useState, useEffect } from 'react';
import { Bot, MessageSquare, Activity, Wallet, Inbox, FlaskConical } from 'lucide-react';
import WhatsAppNotif from './WhatsAppNotif';
import WhatsAppPlataforma from './WhatsAppPlataforma';
import WhatsAppAsistente, { MiConsumo } from './WhatsAppAsistente';
import WhatsAppBandeja from './WhatsAppBandeja';
import WhatsAppSimulador from './WhatsAppSimulador';
import WaEstadoLinea from '../components/WaEstadoLinea';
import WaOnboarding from '../components/WaOnboarding';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { incluyeBot } from '../lib/waPlan';
import { resolveTenantId } from '../lib/tenantUtils';

// Vista unificada "WhatsApp" — TRES módulos del canal repartidos en CUATRO
// pestañas temáticas.
//
// Antes iban apilados en una sola columna ordenada por estado: la página medía
// varias pantallas y lo que el dueño venía a buscar (¿cuántos mensajes me
// quedan? ¿cómo apago el recordatorio?) estaba siempre a tres scrolls. Las
// pestañas agrupan por PREGUNTA, no por archivo:
//
//   Asistente IA        → conexión del número, encendido y estilo del bot, ayuda
//   Mensajería y reglas → qué avisos salen (plataforma + confirmaciones) + preview
//   Métricas y salud    → qué ha hecho el bot y cómo se cuida el número
//   Facturación         → saldo de la bolsa, reparto y recarga
//
// Solo se monta el contenido de la pestaña ACTIVA: cada módulo hace sus propias
// lecturas a Firestore/callables, así que renderizar los cuatro a la vez
// multiplicaría por cuatro las consultas de cada visita.
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

const TABS = [
  { id: 'asistente',   label: 'Asistente IA', corto: 'Asistente', Icon: Bot },
  { id: 'bandeja',     label: 'Conversaciones', corto: 'Chats',   Icon: Inbox },
  { id: 'simulador',   label: 'Probar bot',   corto: 'Probar',    Icon: FlaskConical },
  { id: 'mensajeria',  label: 'Mensajería',   corto: 'Mensajes',  Icon: MessageSquare },
  { id: 'metricas',    label: 'Métricas',     corto: 'Métricas',  Icon: Activity },
  { id: 'facturacion', label: 'Facturación',  corto: 'Bolsa',     Icon: Wallet },
];

export default function WhatsApp() {
  const [tab, setTab] = useState('asistente');
  const tid = resolveTenantId();

  // Plan contratado. La bandeja y el simulador son del Asistente IA: a un
  // local que no lo tiene no se le muestran esas pestañas — estarían vacías
  // y el simulador lo rechaza el servidor (gasta IA). El módulo igual se le
  // ofrece dentro de "Asistente IA", con su "Solicitar activación".
  const [sys, setSys] = useState(null);
  useEffect(() => {
    const un = onSnapshot(doc(db, '_system', tid), s => setSys(s.data() || {}), () => setSys({}));
    return () => un();
  }, [tid]);
  const conBot = incluyeBot(sys);
  const tabs = TABS.filter(t => conBot || !['bandeja', 'simulador'].includes(t.id));

  // Si la pestaña activa deja de existir (bajaron el plan mientras miraba),
  // volver a una que sí exista en vez de quedar con el panel en blanco.
  useEffect(() => {
    if (sys !== null && !tabs.some(t => t.id === tab)) setTab('asistente');
  }, [sys, tabs, tab]);

  return (
    <div data-view="whatsapp" className="max-w-3xl mx-auto pb-12">

      {/* ── Header sticky · estilo Apple, con la barra de pestañas ── */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 pt-3 pb-2.5 mb-6 bg-slate-950/85 backdrop-blur-md border-b border-white/[0.06]">
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

        {/* Pestañas. Scroll horizontal en vez de wrap: en móvil dos filas de
            chips empujan el contenido media pantalla hacia abajo. */}
        <div role="tablist" aria-label="Secciones de WhatsApp"
             className="flex gap-1.5 mt-3 overflow-x-auto -mx-1 px-1 pb-0.5">
          {tabs.map(({ id, label, corto, Icon }) => {
            const activa = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activa}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors border ${
                  activa
                    ? 'bg-[#25D366]/[0.12] border-[#25D366]/40 text-[#4ade80]'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/25'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{corto}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Estado del canal en una línea, siempre visible: la respuesta a
          "¿está funcionando?" no puede depender de qué pestaña elijas. */}
      <div className="mb-6 space-y-3">
        <WaEstadoLinea onIr={setTab} />
        {/* Checklist de puesta en marcha. Se retira solo al completarse. */}
        <WaOnboarding onIr={setTab} />
      </div>

      {/* ── Panel de la pestaña activa ── */}
      <div id={`panel-${tab}`} role="tabpanel" className="flex flex-col gap-10">

        {tab === 'asistente' && <WhatsAppAsistente embedded seccion="core" />}

        {tab === 'bandeja' && <WhatsAppBandeja />}

        {tab === 'simulador' && <WhatsAppSimulador />}

        {tab === 'mensajeria' && (
          <>
            <WhatsAppPlataforma />
            <WhatsAppNotif embedded seccion="reglas" />
          </>
        )}

        {tab === 'metricas' && <MiConsumo tid={tid} standalone />}

        {tab === 'facturacion' && <WhatsAppNotif embedded seccion="facturacion" />}

      </div>
    </div>
  );
}
