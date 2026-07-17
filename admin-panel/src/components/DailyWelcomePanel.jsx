/* ═══════════════════════════════════════════════════════════════
 *  DailyWelcomePanel · Fase 1 (operativo)
 *  ─────────────────────────────────────────────────────────────
 *  Reemplaza el modal "¿qué quieres hacer hoy?" por un brief
 *  matinal con contexto real del negocio:
 *
 *    · Citas hoy (número)
 *    · Ingresos proyectados vs. tu histórico del mismo día
 *    · Alertas accionables (sin barbero, teléfono inválido)
 *    · Cumpleaños esta semana
 *
 *  Sin glow, sin partículas, sin shimmer. Tipografía + tabular-nums.
 *  Cierra con Esc, clic afuera, o el botón cerrar.
 *  Se muestra 1 vez por día por dispositivo (localStorage).
 *
 *  Fase 2 (pendiente): sección "Esta semana en SynapTech" con
 *  features nuevas del changelog global.
 * ═══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, EyeOff, AlertTriangle, Cake, ArrowRight, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { getDocs, query, where, orderBy, limit as fbLimit, collection } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { db } from '../lib/firebase';
import { withTimeout } from '../lib/firestore-helpers';
import { useTenant } from '../contexts/TenantContext';

const LS_KEY  = 'daily_welcome_shown_date';
const BIOO_KEY = 'bioo_announcement_dismissed';
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

// ── Helpers ─────────────────────────────────────────────────────
function fechaStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fechaLarga(d = new Date()) {
  return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}
function saludo(h = new Date().getHours()) {
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
function nombreDia(dow) {
  return ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][dow];
}
function fmtCLP(n) {
  const v = Math.round(Number(n) || 0);
  return '$' + v.toLocaleString('es-CL');
}
function isTelefonoValido(t) {
  if (!t) return false;
  const digits = String(t).replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

// ── Data loader ─────────────────────────────────────────────────
async function cargarBrief() {
  const hoy = new Date();
  const hoyStr = fechaStr(hoy);
  const dow = hoy.getDay();

  // 1) Citas de hoy
  let citasHoy = [];
  try {
    const snap = await withTimeout(
      getDocs(query(tenantCol('citas'), where('fecha', '==', hoyStr))),
      10000, 'brief/citas-hoy',
    );
    citasHoy = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.warn('[brief] citas hoy:', e.message); }

  // 2) Últimas ~60 citas (para promedio del mismo día de la semana)
  //    Filtramos client-side por dow para no pedir un índice compuesto extra.
  let citasHistoricas = [];
  try {
    const snap = await withTimeout(
      getDocs(query(tenantCol('citas'), orderBy('fecha', 'desc'), fbLimit(90))),
      12000, 'brief/historico',
    );
    citasHistoricas = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.fecha && c.fecha !== hoyStr);
  } catch (e) { console.warn('[brief] historico:', e.message); }

  // Ingreso REALIZADO de hoy — solo citas Completadas (igual que Inicio.jsx).
  // Antes incluía Confirmadas (aún no atendidas) → sobrestimaba el ingreso del
  // día hasta que se cerraban las citas.
  const ingresoHoy = citasHoy
    .filter(c => c.estado === 'Completada')
    .reduce((sum, c) => sum + (Number(c.precio) || 0), 0);

  // Ingresos del mismo dow, agrupados por fecha (para promediar por día)
  const porFecha = {};
  for (const c of citasHistoricas) {
    if (c.estado === 'Cancelada' || c.estado === 'NoAsistio') continue;
    // reconstruir dow desde la fecha
    const dc = new Date(c.fecha + 'T00:00:00');
    if (dc.getDay() !== dow) continue;
    porFecha[c.fecha] = (porFecha[c.fecha] || 0) + (Number(c.precio) || 0);
  }
  const dias = Object.keys(porFecha);
  const promedioDia = dias.length ? Math.round(dias.reduce((s, k) => s + porFecha[k], 0) / dias.length) : 0;
  const deltaPct = promedioDia > 0
    ? Math.round(((ingresoHoy - promedioDia) / promedioDia) * 100)
    : null;
  const muestraDias = dias.length; // p. ej. "vs. 5 miércoles"

  // 3) Alertas accionables
  const alertas = [];
  const sinBarbero = citasHoy.filter(c => !c.barberoId && c.estado !== 'Cancelada');
  if (sinBarbero.length) {
    alertas.push({
      tipo: 'sin-barbero',
      titulo: `${sinBarbero.length} cita${sinBarbero.length !== 1 ? 's' : ''} sin barbero asignado`,
      accion: 'Resolver',
      to: '/agenda',
    });
  }
  const telInvalido = citasHoy.filter(c => c.clienteTelefono && !isTelefonoValido(c.clienteTelefono));
  if (telInvalido.length) {
    alertas.push({
      tipo: 'tel-invalido',
      titulo: `${telInvalido.length} cliente${telInvalido.length !== 1 ? 's' : ''} con teléfono inválido`,
      accion: 'Ver',
      to: '/agenda',
    });
  }

  // 4) Cumpleaños esta semana (users con cumpleDia MM-DD dentro de los próximos 7 días)
  let cumples = [];
  try {
    const snap = await withTimeout(
      getDocs(query(tenantCol('users'), fbLimit(500))),
      12000, 'brief/users-cumples',
    );
    const proximosMMDD = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      proximosMMDD.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    cumples = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.cumpleDia && proximosMMDD.includes(u.cumpleDia) && (u.nombre || '').trim())
      .slice(0, 5);
  } catch (e) { console.warn('[brief] cumples:', e.message); }

  // 5) Fase 2: features nuevas de esta semana (Centro de Ayuda)
  //    _ayuda/global/articulos con entregadoEn ≥ hoy − 7 días.
  //    Si no hay de la última semana, ampliamos a 14 días para que
  //    el bloque no quede vacío en semanas tranquilas de deploys.
  let features = [];
  try {
    const snap = await withTimeout(
      getDocs(query(
        collection(db, '_ayuda/global/articulos'),
        where('publicado', '==', true),
        orderBy('entregadoEn', 'desc'),
        fbLimit(6),
      )),
      10000, 'brief/features',
    );
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ahora = Date.now();
    const semana  = 7  * 86400 * 1000;
    const dosSem  = 14 * 86400 * 1000;
    const dentro = ms => todos.filter(a => {
      const t = a.entregadoEn?.toMillis?.() ?? 0;
      return t && (ahora - t) <= ms;
    });
    features = dentro(semana);
    if (features.length === 0) features = dentro(dosSem);
    features = features.slice(0, 2);
  } catch (e) { console.warn('[brief] features:', e.message); }

  return {
    citasHoy,
    citasHoyCount: citasHoy.filter(c => c.estado !== 'Cancelada').length,
    ingresoHoy,
    promedioDia,
    deltaPct,
    muestraDias,
    dowNombre: nombreDia(dow),
    alertas,
    cumples,
    features,
  };
}

// ═══════════════════════════════════════════════════════════════
export default function DailyWelcomePanel() {
  const navigate = useNavigate();
  const { name: shopName } = useTenant();

  const [open, setOpen] = useState(() => {
    try {
      if (localStorage.getItem(DAILY_WELCOME_DISABLED_KEY) === '1') return false;
      if (localStorage.getItem(BIOO_KEY) !== '1') return false; // gate original (bioo primero)
      return localStorage.getItem(LS_KEY) !== fechaStr();
    } catch { return false; }
  });

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try { setData(await cargarBrief()); }
      catch (e) { console.warn('[brief] load:', e.message); }
      setLoading(false);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    try { localStorage.setItem(LS_KEY, fechaStr()); } catch {}
    setOpen(false);
  }
  function dismissForever() {
    setDailyWelcomeDisabled(true);
    setOpen(false);
  }
  function irA(to) {
    dismiss();
    if (to) navigate(to);
  }

  // Formato "salón" corto (a veces name es muy largo).
  // NFKD decompone los "bold matemáticos" de Elegance (𝐄𝐥𝐞𝐠𝐚𝐧𝐜𝐞) a ASCII normal.
  const salonCorto = useMemo(() => {
    const raw = String(shopName || '').normalize('NFKD');
    return raw.trim().split(/\s+/).slice(0, 3).join(' ') || 'tu barbería';
  }, [shopName]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-component="daily-welcome"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={dismiss}
          style={{
            background: 'rgba(4, 8, 14, 0.72)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <motion.div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-slate-950 border border-slate-800"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            onClick={e => e.stopPropagation()}
            style={{ boxShadow: '0 24px 60px -12px rgba(0,0,0,0.6)' }}
          >
            {/* Cerrar */}
            <button
              onClick={dismiss}
              className="absolute top-3.5 right-3.5 z-10 w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:text-primary hover:bg-slate-800 transition-colors"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-800/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
                {saludo()} · {fechaLarga()}
              </p>
              <h3 className="text-primary font-bold text-[22px] leading-tight tracking-tight">
                {shopName ? `Buen día en ${salonCorto}.` : 'Buen día.'}
              </h3>
            </div>

            {/* Cuerpo */}
            <div className="px-6 py-5 space-y-5">
              {loading ? (
                <BriefSkeleton />
              ) : !data ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No pudimos cargar los datos de hoy. Intenta refrescar.
                </p>
              ) : (
                <>
                  {/* Citas + Ingresos */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatBlock
                      label="Citas hoy"
                      valor={data.citasHoyCount}
                      subtitulo={data.citasHoyCount === 0 ? 'Sin citas confirmadas' : (data.citasHoyCount === 1 ? 'confirmada' : 'confirmadas')}
                    />
                    <StatBlock
                      label="Proyectado"
                      valor={fmtCLP(data.ingresoHoy)}
                      subtitulo={renderDelta(data.deltaPct, data.dowNombre, data.muestraDias)}
                    />
                  </div>

                  {/* Alertas */}
                  {data.alertas.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/80">Requiere tu atención</div>
                      {data.alertas.map(a => (
                        <button
                          key={a.tipo}
                          onClick={() => irA(a.to)}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/25 hover:bg-amber-500/[0.10] hover:border-amber-500/40 text-left transition-colors"
                        >
                          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                          <span className="flex-1 text-[13.5px] font-medium text-primary">{a.titulo}</span>
                          <span className="text-[11.5px] font-semibold text-amber-300 flex items-center gap-1">
                            {a.accion} <ArrowRight size={12} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cumpleaños */}
                  {data.cumples.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-pink-400/80 flex items-center gap-1.5">
                        <Cake size={11} /> Cumpleaños esta semana
                      </div>
                      <div className="rounded-lg bg-pink-500/[0.05] border border-pink-500/20 divide-y divide-pink-500/10">
                        {data.cumples.map(c => (
                          <div key={c.id} className="flex items-center gap-3 px-3.5 py-2">
                            <span className="w-6 h-6 rounded-full bg-pink-500/15 border border-pink-500/25 grid place-items-center text-[10px] font-bold text-pink-300 shrink-0">
                              {(c.nombre?.[0] || '?').toUpperCase()}
                            </span>
                            <span className="flex-1 text-[13.5px] text-primary truncate">{c.nombre}</span>
                            <span className="text-[11px] tabular-nums text-pink-300/80">
                              {formatCumpleCorto(c.cumpleDia)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fase 2 — Esta semana en SynapTech.
                      Materializa la promesa del hero del Centro de Ayuda
                      dentro del brief matinal: features reales entregadas
                      esta semana, pedidas por otros salones. Solo se muestra
                      si hay features de las últimas 2 semanas. */}
                  {data.features.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/70">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 pt-4">
                        <Sparkles size={11} /> Esta semana en SynapTech
                      </div>
                      <div className="space-y-1.5">
                        {data.features.map(f => (
                          <button
                            key={f.id}
                            onClick={() => irA(`/ayuda/${f.categoriaSlug || 'general'}/${f.slug || f.id}`)}
                            className="w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg bg-white/[0.02] border border-slate-800 hover:bg-white/[0.04] hover:border-slate-700 text-left transition-colors"
                          >
                            <span className="w-6 h-6 rounded-full grid place-items-center shrink-0 text-primary mt-0.5"
                                  style={{ background: 'linear-gradient(135deg, #171412 0%, #3A3A3A 100%)' }}>
                              <span style={{ fontFamily: 'Charter, Georgia, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 12 }}>S</span>
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13.5px] font-semibold text-primary leading-tight truncate">{f.titulo}</p>
                              <p className="text-[11.5px] text-slate-500 mt-0.5 leading-tight">
                                Pedido por <span className="text-slate-300">{f.pedidoPor?.etiqueta || 'un cliente'}</span>
                                {' · '}
                                <span>{formatEntregadoRel(f.entregadoEn)}</span>
                              </p>
                            </div>
                            <ArrowRight size={13} className="text-slate-500 shrink-0 mt-1" />
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => irA('/ayuda')}
                        className="text-[11.5px] text-slate-400 hover:text-primary font-medium pt-1 transition-colors inline-flex items-center gap-1"
                      >
                        Ver changelog y todas las guías <ArrowRight size={11} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CTA principal */}
            <div className="px-6 pb-5 pt-1 flex items-center gap-2">
              <button
                onClick={() => irA('/agenda')}
                className="flex-1 py-2.5 rounded-lg bg-white text-ink-950 font-semibold text-[13.5px] hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
              >
                Ir a la agenda <ArrowRight size={14} />
              </button>
              <button
                onClick={dismiss}
                className="px-4 py-2.5 rounded-lg text-slate-400 hover:text-primary text-[13.5px] font-medium transition-colors"
              >
                Después
              </button>
            </div>

            {/* Footer sutil */}
            <div className="px-6 pb-4 flex justify-center">
              <button
                onClick={dismissForever}
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
                title="Puedes reactivarlo desde Configuración"
              >
                <EyeOff size={11} />
                No volver a mostrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Componentes internos ────────────────────────────────────────
function StatBlock({ label, valor, subtitulo }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{label}</div>
      <div className="text-primary font-bold text-[22px] tabular-nums leading-none">{valor}</div>
      {subtitulo && <div className="text-[11.5px] text-slate-400 mt-1.5 leading-tight">{subtitulo}</div>}
    </div>
  );
}

function renderDelta(pct, dow, n) {
  if (pct === null || n === 0) {
    return <span>Sin histórico de {dow}s</span>;
  }
  if (Math.abs(pct) < 3) {
    return (
      <span className="flex items-center gap-1">
        <Minus size={11} className="text-slate-500" />
        <span>En línea con tu {dow} promedio</span>
      </span>
    );
  }
  const arriba = pct > 0;
  const Icono  = arriba ? TrendingUp : TrendingDown;
  const color  = arriba ? 'text-emerald-400' : 'text-red-400';
  return (
    <span className="flex items-center gap-1">
      <Icono size={11} className={color} />
      <span className={`${color} font-semibold tabular-nums`}>{arriba ? '+' : ''}{pct}%</span>
      <span className="text-slate-500">vs. tu {dow} promedio</span>
    </span>
  );
}

function formatEntregadoRel(ts) {
  if (!ts) return 'Entregado';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const hoy = new Date();
  const diff = Math.floor((hoy - d) / (86400 * 1000));
  if (diff <= 0) return 'Entregado hoy';
  if (diff === 1) return 'Entregado ayer';
  if (diff < 7)   return `Entregado hace ${diff} días`;
  if (diff < 14)  return 'Entregado la semana pasada';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function formatCumpleCorto(mmdd) {
  if (!mmdd || !/^\d{2}-\d{2}$/.test(mmdd)) return '';
  const [m, d] = mmdd.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const mi = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${meses[mi] || ''}`;
}

function BriefSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        <div className="h-[86px] rounded-lg bg-slate-900/50 border border-slate-800" />
        <div className="h-[86px] rounded-lg bg-slate-900/50 border border-slate-800" />
      </div>
      <div className="h-11 rounded-lg bg-slate-900/40" />
      <div className="h-11 rounded-lg bg-slate-900/40" />
    </div>
  );
}
