// SynapTechNews.jsx — Feed de novedades de SynapTech con estado de lectura persistido.
// Datos: array estático `newsFeed`. Para conectar a Firestore en el futuro, reemplazar
// el array por un `useEffect` que lea de la colección global `global_news`.

import { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, Tag } from 'lucide-react';

/* ── Mock data (reemplazar con Firestore `global_news` en el futuro) ── */
const newsFeed = [
  {
    id: 'v3-ai-features',
    date: '2026-05-13',
    category: 'nueva-funcion',
    title: 'Análisis IA — Insights, Demanda y Riesgo',
    summary: 'Panel IA con insights automáticos, mapa de calor de demanda y detección de clientes en riesgo.',
    detail: 'En Métricas: un panel "Análisis IA" genera hasta 4 insights automáticos con tus datos reales — tendencia mensual vs. el mes anterior, día más activo, barbero líder y alertas de cancelación. También se agregó un Mapa de Demanda que muestra la frecuencia de citas por día y hora en un heatmap de colores. En Clientes: detección automática de clientes que no han visitado en 30+ días, clasificados como Seguimiento, En riesgo o Crítico, con acceso directo a WhatsApp para reconectarlos.',
  },
  {
    id: 'v3-sidebar-groups',
    date: '2026-05-13',
    category: 'mejora',
    title: 'Sidebar inteligente por módulos',
    summary: 'El menú lateral ahora agrupa las funciones en 5 categorías y es completamente comprimible.',
    detail: 'El sidebar fue rediseñado con 5 grupos colapsables: Operaciones, Equipo, Clientes, Análisis y Administración. Cada grupo puede comprimirse con un clic y el estado se recuerda entre sesiones. Si un grupo tiene notificaciones pendientes (chats, alertas de pago, novedades), muestra un indicador incluso estando cerrado. El grupo con la página activa nunca se colapsa accidentalmente.',
  },
  {
    id: 'v2-memberships',
    date: '2026-05-09',
    category: 'nueva-funcion',
    title: 'Sistema de Membresías y Suscripciones',
    summary: 'Tus clientes ahora pueden suscribirse a planes Silver, Gold y Black para cortes ilimitados.',
    detail: 'Activamos el módulo de membresías "Elegance Pass". Desde Finanzas puedes ver el MRR, gestionar suscripciones y activar planes manualmente. Los clientes acumulan servicios mensuales (cortes, barba, masajes) según su plan. El sistema descuenta automáticamente al momento de agendar.',
  },
  {
    id: 'v2-tv-signage',
    date: '2026-05-07',
    category: 'nueva-funcion',
    title: 'Barber TV — Digital Signage Premium',
    summary: 'Nueva pantalla de sala de espera con turnos en tiempo real, lookbook animado y equipo.',
    detail: 'Accede a /gestion-interna/tv en cualquier pantalla o Smart TV de tu local. Muestra el turno actual en sillón, los próximos clientes, fotos del lookbook y el equipo de barberos. El carrusel rota cada 15 segundos con transiciones cinematográficas. Incluye QR de reserva y reloj digital.',
  },
  {
    id: 'v2-reviews',
    date: '2026-05-05',
    category: 'mejora',
    title: 'Sistema de Reseñas Post-Cita',
    summary: 'Al completar una cita, se abre una pantalla de calificación por estrellas.',
    detail: 'Cuando el barbero marca una cita como "Completada", aparece el modal de reseña. El cliente puede dar de 1 a 5 estrellas. Si da 5 estrellas, se le ofrece publicar en Google Maps y recibe +1 sello de bonificación. Las reseñas se guardan en la colección `resenas` de Firestore.',
  },
  {
    id: 'v2-haircut-reminder',
    date: '2026-05-03',
    category: 'mejora',
    title: 'Recordatorios Automáticos de Corte',
    summary: 'El sistema ahora aprende el intervalo promedio de cada cliente y manda push cuando es hora.',
    detail: 'Una Cloud Function analiza el historial de citas de cada cliente y calcula el intervalo promedio entre visitas (entre 7 y 60 días). Cuando llega la fecha sugerida, envía una notificación push automática recordándole que es hora de su corte. El sistema avanza la fecha automáticamente para no generar spam.',
  },
  {
    id: 'v1-superadmin',
    date: '2026-04-28',
    category: 'aviso',
    title: 'Panel Superadmin — Control Total',
    summary: 'Nuevo panel en /admin para gestionar todos los tenants desde un solo lugar.',
    detail: 'Incluye Kill Switch por tenant, control de versión PWA, logger de errores en tiempo real y monitor de consumo de Firestore. Solo accesible para el equipo de SynapTech.',
  },
];

/* ── Colores por categoría ────────────────────────────────────── */
const CATEGORY_META = {
  'nueva-funcion': { label: 'Nueva función', bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
  'mejora':        { label: 'Mejora',        bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  'aviso':         { label: 'Aviso',         bg: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: 'rgba(212,175,55,0.25)' },
};

const LS_KEY           = 'synaptech_last_seen_news';

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7)  return `Hace ${diff} días`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

/* ── Modal de detalle ────────────────────────────────────────── */
function DetailModal({ news, onClose }) {
  const cat = CATEGORY_META[news.category] ?? CATEGORY_META.aviso;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 60px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="space-y-1.5">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
            >
              <Tag size={9} />
              {cat.label}
            </span>
            <h3 className="text-white font-bold text-base leading-snug">{news.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors ml-4 shrink-0 mt-1">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-slate-400 text-sm leading-relaxed">{news.detail}</p>
          <p className="text-xs text-slate-600">{formatDate(news.date)}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────── */
export default function SynapTechNews() {
  const latestDate = newsFeed[0]?.date ?? '';

  const [hasUnread, setHasUnread] = useState(() => {
    try {
      const seen = localStorage.getItem(LS_KEY) ?? '';
      return latestDate > seen;
    } catch {
      return false;
    }
  });

  const [selected, setSelected] = useState(null);

  function markRead() {
    try { localStorage.setItem(LS_KEY, latestDate); } catch {}
    setHasUnread(false);
  }

  function openDetail(item) {
    markRead();
    setSelected(item);
  }

  function handleSectionClick() {
    if (hasUnread) markRead();
  }

  return (
    <>
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
        onClick={handleSectionClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <Sparkles size={15} style={{ color: '#D4AF37' }} className="shrink-0" />
            <h2 className="text-sm font-semibold text-white">Novedades de SynapTech</h2>
            {hasUnread && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            )}
          </div>
          <a
            href="https://www.synaptechspa.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold tracking-wide hover:opacity-80 transition-opacity"
            style={{ color: 'rgba(212,175,55,0.7)' }}
            onClick={e => e.stopPropagation()}
          >
            synaptechspa.cl ↗
          </a>
        </div>

        {/* Feed */}
        <div className="divide-y divide-slate-800/60">
          {newsFeed.map(item => {
            const cat = CATEGORY_META[item.category] ?? CATEGORY_META.aviso;
            return (
              <button
                key={item.id}
                onClick={() => openDetail(item)}
                className="w-full text-left px-5 py-4 hover:bg-slate-800/40 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                      >
                        <Tag size={8} />
                        {cat.label}
                      </span>
                      <span className="text-[10px] text-slate-600">{formatDate(item.date)}</span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight">{item.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{item.summary}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && <DetailModal news={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
