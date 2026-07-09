import { useState, useEffect, useMemo } from 'react';
import { getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  Sparkles, Instagram, Users, Search, MessageCircle,
  Plus, X, Check, ArrowUp, ArrowDown, Loader2, TrendingUp,
} from 'lucide-react';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { useTenant } from '../contexts/TenantContext';

// ═══════════════════════════════════════════════════════════════
//  AURA · Módulo exclusivo
//  Configuración de la pregunta "¿Cómo llegaste a nosotros?" que
//  aparece durante el flujo de agenda y análisis de resultados.
//
//  Firestore:
//    tenants/aura/configuracion/origen_pregunta  { activo, obligatorio, opciones[] }
//    tenants/aura/citas/{id}.origenAdquisicion   { id, label, textoLibre? }
// ═══════════════════════════════════════════════════════════════

const OPCIONES_DEFAULT = [
  { id: 'instagram',    label: 'Por un anuncio en Instagram', emoji: '📸', activo: true, orden: 1 },
  { id: 'recomendacion', label: 'Por una recomendación',       emoji: '👥', activo: true, orden: 2 },
  { id: 'google',       label: 'Por Google',                   emoji: '🔍', activo: true, orden: 3 },
  { id: 'otra',         label: 'Otra razón',                   emoji: '💬', activo: true, orden: 4, permitirTextoLibre: true },
];

const CONFIG_DEFAULT = {
  activo:      false,
  obligatorio: false,
  opciones:    OPCIONES_DEFAULT,
};

// ── Guard: la ruta ya bloquea acceso, esto es defensivo por si algún tenant
//    ajeno navega a /aura por URL manual. ──────────────────────────
export default function Aura() {
  const tenant = useTenant();
  if (tenant.id !== 'aura') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Sparkles size={32} className="mx-auto text-amber-400/60 mb-3" />
          <h1 className="text-lg font-bold text-white mb-2">Módulo exclusivo de AURA</h1>
          <p className="text-sm text-slate-400">
            Esta sección solo está habilitada para el tenant Aura. Si crees que
            deberías tener acceso, contacta a SynapTech.
          </p>
        </div>
      </div>
    );
  }
  return <AuraModulo />;
}

function AuraModulo() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500">
            <Sparkles size={22} className="text-slate-950" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">AURA</h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                Exclusivo
              </span>
            </div>
            <p className="text-sm text-slate-400">Módulo exclusivo diseñado para AURA · SynapTech</p>
          </div>
        </div>

        <ConfigCard />
        <MetricasCard />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  CONFIG                                                          */
/* ═══════════════════════════════════════════════════════════════ */
function ConfigCard() {
  const [cfg, setCfg] = useState(CONFIG_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newOpcion, setNewOpcion] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await withTimeout(
          getDoc(tenantDoc('configuracion', 'origen_pregunta')),
          10000,
          'aura/origen-pregunta-load',
        );
        if (snap.exists()) {
          const data = snap.data();
          setCfg({
            activo:      data.activo ?? false,
            obligatorio: data.obligatorio ?? false,
            opciones:    Array.isArray(data.opciones) && data.opciones.length ? data.opciones : OPCIONES_DEFAULT,
          });
        }
      } catch (e) {
        console.warn('[aura] load config error:', e);
      }
      setLoading(false);
    })();
  }, []);

  async function persistir(next) {
    setSaving(true);
    try {
      await withTimeout(
        setDoc(tenantDoc('configuracion', 'origen_pregunta'), next, { merge: true }),
        10000,
        'aura/origen-pregunta-save',
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      console.error('[aura] save error:', e);
    }
    setSaving(false);
  }

  function toggleActivo() {
    const next = { ...cfg, activo: !cfg.activo };
    setCfg(next);
    persistir(next);
  }
  function toggleObligatorio() {
    const next = { ...cfg, obligatorio: !cfg.obligatorio };
    setCfg(next);
    persistir(next);
  }
  function toggleOpcion(id) {
    const opciones = cfg.opciones.map(o => o.id === id ? { ...o, activo: !o.activo } : o);
    const next = { ...cfg, opciones };
    setCfg(next);
    persistir(next);
  }
  function moverOpcion(id, direccion) {
    const idx = cfg.opciones.findIndex(o => o.id === id);
    if (idx < 0) return;
    const nextIdx = idx + direccion;
    if (nextIdx < 0 || nextIdx >= cfg.opciones.length) return;
    const opciones = [...cfg.opciones];
    [opciones[idx], opciones[nextIdx]] = [opciones[nextIdx], opciones[idx]];
    opciones.forEach((o, i) => { o.orden = i + 1; });
    const next = { ...cfg, opciones };
    setCfg(next);
    persistir(next);
  }
  function eliminarOpcion(id) {
    const opciones = cfg.opciones.filter(o => o.id !== id);
    const next = { ...cfg, opciones };
    setCfg(next);
    persistir(next);
  }
  function agregarOpcion() {
    const label = newOpcion.trim();
    if (!label) return;
    const id = 'custom-' + Date.now();
    const next = { ...cfg, opciones: [...cfg.opciones, { id, label, emoji: '✨', activo: true, orden: cfg.opciones.length + 1 }] };
    setCfg(next);
    setNewOpcion('');
    persistir(next);
  }

  if (loading) {
    return (
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-8 flex items-center justify-center mb-4">
        <Loader2 className="animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 mb-4">
      <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
        Pregunta al agendar: ¿Cómo llegaste a nosotros?
      </h2>

      {/* Toggles */}
      <div className="space-y-3 mb-6">
        <ToggleRow
          title="Módulo activo"
          desc="Muestra la pregunta durante el flujo de agenda pública."
          value={cfg.activo}
          onToggle={toggleActivo}
        />
        <ToggleRow
          title="Respuesta obligatoria"
          desc="No permite confirmar la reserva sin elegir una opción."
          value={cfg.obligatorio}
          onToggle={toggleObligatorio}
          disabled={!cfg.activo}
        />
      </div>

      {/* Opciones */}
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Opciones</h3>
      <div className="space-y-2 mb-3">
        {cfg.opciones.map((o, i) => (
          <div key={o.id} className={`flex items-center gap-2 rounded-lg border p-2.5 transition-opacity ${o.activo ? 'border-slate-700 bg-slate-800/40' : 'border-slate-800 bg-slate-900/40 opacity-60'}`}>
            <span className="text-lg select-none">{o.emoji || '✨'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{o.label}</p>
              {o.permitirTextoLibre && <p className="text-[10px] text-slate-500">Permite texto libre</p>}
            </div>
            <button onClick={() => moverOpcion(o.id, -1)} disabled={i === 0}
              className="p-1 text-slate-500 hover:text-white disabled:opacity-30" aria-label="Subir">
              <ArrowUp size={14} />
            </button>
            <button onClick={() => moverOpcion(o.id, 1)} disabled={i === cfg.opciones.length - 1}
              className="p-1 text-slate-500 hover:text-white disabled:opacity-30" aria-label="Bajar">
              <ArrowDown size={14} />
            </button>
            <button onClick={() => toggleOpcion(o.id)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${o.activo ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
              {o.activo ? 'On' : 'Off'}
            </button>
            {!OPCIONES_DEFAULT.some(d => d.id === o.id) && (
              <button onClick={() => eliminarOpcion(o.id)}
                className="p-1 text-slate-500 hover:text-red-400" aria-label="Eliminar">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Agregar opción */}
      <div className="flex gap-2 items-center">
        <input
          type="text" value={newOpcion} onChange={e => setNewOpcion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && agregarOpcion()}
          placeholder="Nueva opción (ej. Por Facebook, Por TikTok…)"
          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
        />
        <button
          onClick={agregarOpcion}
          disabled={!newOpcion.trim()}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-1"
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      {saving && <p className="text-[11px] text-slate-500 mt-3">Guardando…</p>}
      {saved  && <p className="text-[11px] text-emerald-400 mt-3 flex items-center gap-1"><Check size={12} /> Guardado</p>}
    </div>
  );
}

function ToggleRow({ title, desc, value, onToggle, disabled }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button
        role="switch" aria-checked={value}
        onClick={onToggle}
        className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-amber-500' : 'bg-slate-700'}`}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: value ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  METRICAS                                                        */
/* ═══════════════════════════════════════════════════════════════ */
function MetricasCard() {
  const [periodo, setPeriodo] = useState('30d');
  const [conteos, setConteos] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90;
    const desde = new Date(Date.now() - dias * 86400 * 1000).toISOString().split('T')[0];
    // Escuchamos citas con origenAdquisicion.id != null. Snapshot filtra client-side
    // porque la mayoría de citas no lo tendrán y compound queries requieren index.
    const ref = tenantCol('citas');
    const q = query(ref, where('fecha', '>=', desde));
    const unsub = onSnapshot(q, snap => {
      const c = {};
      let t = 0;
      for (const d of snap.docs) {
        const cita = d.data();
        const oa = cita.origenAdquisicion;
        if (!oa || !oa.id) continue;
        c[oa.id] = (c[oa.id] || 0) + 1;
        t += 1;
      }
      setConteos(c);
      setTotal(t);
      setLoading(false);
    }, err => {
      console.warn('[aura] metricas listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, [periodo]);

  const ordenados = useMemo(
    () => Object.entries(conteos).sort((a, b) => b[1] - a[1]),
    [conteos],
  );

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <TrendingUp size={14} className="text-amber-400" /> Resultados
        </h2>
        <div className="flex gap-1 text-[11px] bg-slate-800/60 rounded-lg p-1">
          {['7d','30d','90d'].map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                periodo === p ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-500" /></div>
      ) : total === 0 ? (
        <div className="py-10 text-center text-slate-500">
          <Sparkles size={28} className="mx-auto mb-2 text-slate-700" />
          <p className="text-sm">Aún no hay respuestas en este período.</p>
          <p className="text-[11px] mt-1">Activa el módulo para empezar a recolectar datos.</p>
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-white mb-4">
            {total} <span className="text-sm font-normal text-slate-500">respuestas totales</span>
          </p>
          <div className="space-y-2">
            {ordenados.map(([id, count]) => {
              const pct = Math.round((count / total) * 100);
              const label = OPCIONES_DEFAULT.find(o => o.id === id)?.label || id;
              const emoji = OPCIONES_DEFAULT.find(o => o.id === id)?.emoji || '✨';
              return (
                <div key={id} className="bg-slate-800/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-white flex items-center gap-2">
                      <span>{emoji}</span> {label}
                    </span>
                    <span className="text-sm font-bold text-amber-300 tabular-nums">
                      {count} <span className="text-[10px] text-slate-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                      style={{ width: pct + '%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
