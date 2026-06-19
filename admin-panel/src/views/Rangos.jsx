import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import {
  Medal, Crown, Gem, Save, Check, Pencil, Plus, Trash2,
  Zap, Info, Stamp, Minus,
} from 'lucide-react';

const INPUT_CLS = 'w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500/80 transition-all shadow-inner placeholder:text-slate-500';

const DESCUENTO_PCT = 10; // % de descuento en servicios del beneficio automático.

// Catálogo FIJO de beneficios INFORMATIVOS (solo se muestran al cliente; no se
// aplican solos). En cada rango se eligen cuáles están activos.
const BENEFICIOS_CATALOGO = [
  { id: 'descuento_productos',   nombre: 'Descuento en productos' },
  { id: 'prioridad_reserva',     nombre: 'Prioridad en la reserva' },
  { id: 'atencion_preferencial', nombre: 'Atención preferencial' },
  { id: 'regalo_cumpleanos',     nombre: 'Regalo de cumpleaños' },
  { id: 'producto_regalo',       nombre: 'Producto de regalo' },
  { id: 'promos_exclusivas',     nombre: 'Promociones exclusivas' },
];

// Rangos por defecto (espejo de calcTier en Clientes.jsx: sellosHistoricos).
const DEFAULT_RANGOS = [
  { id: 'silver',   nombre: 'Silver',   minSellos: 0,  sellosPorVisita: 1, descuentoServicios: false, beneficios: [], beneficiosCustom: [] },
  { id: 'gold',     nombre: 'Gold',     minSellos: 10, sellosPorVisita: 1, descuentoServicios: false, beneficios: [], beneficiosCustom: [] },
  { id: 'platinum', nombre: 'Platinum', minSellos: 25, sellosPorVisita: 1, descuentoServicios: false, beneficios: [], beneficiosCustom: [] },
];

const RANGO_STYLE = {
  silver:   { Icon: Medal, color: '#cbd5e1', ring: 'border-slate-500/40',  glow: 'bg-slate-400/10',  text: 'text-slate-200' },
  gold:     { Icon: Crown, color: '#D4AF37', ring: 'border-[#D4AF37]/45', glow: 'bg-[#D4AF37]/10',  text: 'text-[#D4AF37]' },
  platinum: { Icon: Gem,   color: '#a78bfa', ring: 'border-violet-400/45', glow: 'bg-violet-400/10', text: 'text-violet-300' },
};

// Normaliza la config leída de Firestore contra los defaults (orden y campos).
function normalizar(rangosFs) {
  return DEFAULT_RANGOS.map(def => {
    const f = (rangosFs || []).find(r => r.id === def.id) || {};
    const oldBen = Array.isArray(f.beneficios) ? f.beneficios : [];
    return {
      ...def,
      nombre:    f.nombre || def.nombre,
      minSellos: f.minSellos != null ? f.minSellos : def.minSellos,
      sellosPorVisita: f.sellosPorVisita != null ? Math.max(0, Math.round(Number(f.sellosPorVisita)) || 0) : def.sellosPorVisita,
      // Migra el viejo id 'descuento_servicios' al toggle automático.
      descuentoServicios: f.descuentoServicios != null ? !!f.descuentoServicios : oldBen.includes('descuento_servicios'),
      beneficios: oldBen.filter(id => BENEFICIOS_CATALOGO.some(b => b.id === id)),
      beneficiosCustom: Array.isArray(f.beneficiosCustom) ? f.beneficiosCustom : [],
    };
  });
}

function rangoLabel(rangos, idx) {
  const min = Number(rangos[idx].minSellos) || 0;
  const next = rangos[idx + 1];
  if (!next) return `${min}+ sellos`;
  const max = (Number(next.minSellos) || 0) - 1;
  return `${min} – ${max} sellos`;
}

export default function Rangos() {
  const tenant = useTenant();
  const [rangos,   setRangos]   = useState(DEFAULT_RANGOS);
  const [original, setOriginal] = useState(DEFAULT_RANGOS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [savedOk,  setSavedOk]  = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const ref = doc(tenantCol('configuracion'), 'rangos');
    const unsub = onSnapshot(ref, snap => {
      const norm = normalizar(snap.exists() ? snap.data().rangos : null);
      setRangos(norm);
      setOriginal(norm);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [tenant.id]);

  const dirty = useMemo(
    () => JSON.stringify(rangos) !== JSON.stringify(original),
    [rangos, original],
  );

  const patch = (ri, fn) => setRangos(prev => prev.map((r, i) => i === ri ? fn(r) : r));

  const updateNombre   = (ri, val) => patch(ri, r => ({ ...r, nombre: val }));
  const setSellos      = (ri, val) => patch(ri, r => ({ ...r, sellosPorVisita: Math.max(0, Math.min(99, val)) }));
  const toggleDescuento= (ri)      => patch(ri, r => ({ ...r, descuentoServicios: !r.descuentoServicios }));
  const toggleBeneficio= (ri, bid) => patch(ri, r => ({
    ...r,
    beneficios: r.beneficios.includes(bid) ? r.beneficios.filter(x => x !== bid) : [...r.beneficios, bid],
  }));
  const updateCustom   = (ri, ci, val) => patch(ri, r => ({ ...r, beneficiosCustom: r.beneficiosCustom.map((c, j) => j === ci ? val : c) }));
  const addCustom      = (ri)      => patch(ri, r => ({ ...r, beneficiosCustom: [...r.beneficiosCustom, ''] }));
  const removeCustom   = (ri, ci)  => patch(ri, r => ({ ...r, beneficiosCustom: r.beneficiosCustom.filter((_, j) => j !== ci) }));

  async function guardar() {
    setSaving(true); setSavedOk(false);
    try {
      const payload = rangos.map(r => ({
        id:                 r.id,
        nombre:             (r.nombre || '').trim() || r.id,
        minSellos:          Number(r.minSellos) || 0,
        sellosPorVisita:    Math.max(0, Math.round(Number(r.sellosPorVisita)) || 0),
        descuentoServicios: !!r.descuentoServicios,
        descuentoPct:       r.descuentoServicios ? DESCUENTO_PCT : 0,
        beneficios:         r.beneficios.filter(id => BENEFICIOS_CATALOGO.some(b => b.id === id)),
        beneficiosCustom:   r.beneficiosCustom.map(c => c.trim()).filter(Boolean),
      }));
      await setDoc(doc(tenantCol('configuracion'), 'rangos'),
        { rangos: payload, updatedAt: Timestamp.now() }, { merge: true });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (e) {
      console.error(e);
      alert('Error al guardar los rangos. Verifica que tengas permisos de administrador.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">

      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{tenant.name}</p>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Rangos
            <HelpButton onClick={() => setShowHelp(true)} />
          </h1>
          <p className="text-xs text-slate-500 mt-1">Niveles de fidelidad por sellos acumulados · edita el nombre y los beneficios de cada rango</p>
        </div>
        <button
          onClick={guardar}
          disabled={!dirty || saving}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shrink-0 ${
            savedOk ? 'bg-emerald-600 text-white'
              : dirty ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/20'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {savedOk ? <><Check size={15} /> Guardado</> : <><Save size={15} /> {saving ? 'Guardando…' : 'Guardar cambios'}</>}
        </button>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rangos.map((r, ri) => {
            const st = RANGO_STYLE[r.id] || RANGO_STYLE.silver;
            const Icon = st.Icon;
            return (
              <div key={r.id} className={`bg-slate-800/40 border ${st.ring} rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col`}>
                <div className={`absolute -top-10 -right-10 w-28 h-28 ${st.glow} rounded-full blur-3xl pointer-events-none`} />

                {/* Cabecera: ícono + nombre editable + umbral */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border" style={{ borderColor: st.color + '55', background: st.color + '14' }}>
                    <Icon size={20} style={{ color: st.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="relative">
                      <input
                        value={r.nombre}
                        onChange={e => updateNombre(ri, e.target.value)}
                        maxLength={24}
                        placeholder={r.id}
                        aria-label={`Nombre del rango ${r.id}`}
                        className="w-full bg-transparent border border-transparent hover:border-slate-700/60 focus:border-slate-600 rounded-lg pl-2 pr-7 py-1 text-lg font-black leading-none focus:outline-none focus:bg-slate-900/50 transition-all"
                        style={{ color: st.color }}
                      />
                      <Pencil size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-2">{rangoLabel(rangos, ri)}</p>
                  </div>
                </div>

                {/* ── Beneficios automáticos ── */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-3 mb-3">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap size={11} /> Automáticos
                    <span className="ml-auto text-emerald-500/70 normal-case tracking-normal font-semibold">se aplican solos</span>
                  </p>

                  {/* Sellos por visita */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5"><Stamp size={13} className="text-slate-400" /> Sellos por visita</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSellos(ri, (Number(r.sellosPorVisita) || 0) - 1)}
                        className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition-all"><Minus size={13} /></button>
                      <input
                        type="number" min="0" max="99" inputMode="numeric"
                        value={r.sellosPorVisita}
                        onChange={e => setSellos(ri, parseInt(e.target.value, 10) || 0)}
                        className="w-11 text-center bg-slate-900 border border-slate-700 rounded-lg py-1.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/70"
                      />
                      <button onClick={() => setSellos(ri, (Number(r.sellosPorVisita) || 0) + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition-all"><Plus size={13} /></button>
                    </div>
                  </div>

                  {/* 10% descuento en servicios (toggle) */}
                  <button onClick={() => toggleDescuento(ri)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left text-xs transition-all ${
                      r.descuentoServicios ? 'border-emerald-500/50 bg-emerald-500/10 text-white' : 'border-slate-700/40 bg-slate-900/25 text-slate-400 hover:text-slate-200'
                    }`}>
                    <span className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
                      style={r.descuentoServicios ? { background: '#10b981', borderColor: '#10b981', color: '#06281d' } : { borderColor: 'rgba(148,163,184,0.35)' }}>
                      {r.descuentoServicios && <Check size={11} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 leading-tight">{DESCUENTO_PCT}% de descuento en servicios</span>
                  </button>
                </div>

                {/* ── Beneficios informativos ── */}
                <div className="space-y-2 flex-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Info size={11} /> Informativos
                    <span className="ml-auto text-slate-600 normal-case tracking-normal font-semibold">solo se muestran al cliente</span>
                  </p>

                  {BENEFICIOS_CATALOGO.map(b => {
                    const active = r.beneficios.includes(b.id);
                    return (
                      <button key={b.id} onClick={() => toggleBeneficio(ri, b.id)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all ${
                          active ? 'text-white' : 'border-slate-700/40 bg-slate-900/25 text-slate-500 hover:text-slate-300 hover:border-slate-600/60'
                        }`}
                        style={active ? { borderColor: st.color + '66', background: st.color + '14' } : undefined}>
                        <span className="w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all"
                          style={active ? { background: st.color, borderColor: st.color, color: '#0b1220' } : { borderColor: 'rgba(148,163,184,0.35)' }}>
                          {active && <Check size={11} strokeWidth={3} />}
                        </span>
                        <span className="flex-1 leading-tight">{b.nombre}</span>
                      </button>
                    );
                  })}

                  {/* Beneficios personalizados (informativos) */}
                  {r.beneficiosCustom.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-1.5">
                      <span className="shrink-0 text-xs font-bold" style={{ color: st.color }}>✓</span>
                      <input value={c} onChange={e => updateCustom(ri, ci, e.target.value)}
                        placeholder="Beneficio personalizado…"
                        className={INPUT_CLS + ' py-1.5 flex-1 text-xs'} />
                      <button onClick={() => removeCustom(ri, ci)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0" title="Quitar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  <button onClick={() => addCustom(ri)}
                    className="flex items-center gap-1.5 text-xs font-semibold mt-1 transition-colors hover:opacity-80" style={{ color: st.color }}>
                    <Plus size={13} /> Agregar beneficio personalizado
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showHelp && (
        <HelpModal title="Cómo funcionan los Rangos" onClose={() => setShowHelp(false)}>
          <p>Cada cliente sube de rango automáticamente según los <strong className="text-white">sellos históricos</strong> que acumula (no bajan al canjear premios).</p>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">Niveles</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><span className="text-slate-200 font-semibold">Silver</span>: desde 0 sellos.</li>
              <li><span className="text-[#D4AF37] font-semibold">Gold</span>: desde 10 sellos.</li>
              <li><span className="text-violet-300 font-semibold">Platinum</span>: desde 25 sellos.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">Automáticos (se aplican solos)</p>
            <p>Solo estos dos los ejecuta el sistema: los <strong className="text-white">sellos por visita</strong> (eliges cuántos gana cada rango) y el <strong className="text-white">{DESCUENTO_PCT}% de descuento en servicios</strong>.</p>
          </div>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">Informativos</p>
            <p>El resto son <strong className="text-white">solo informativos</strong>: se le muestran al cliente como beneficios de su rango, pero no se aplican automáticamente. Puedes activar los del catálogo o <strong className="text-white">agregar beneficios personalizados</strong>.</p>
          </div>
          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 El nombre de cada rango es editable (toca el nombre). Los cambios se guardan con "Guardar cambios".</p>
        </HelpModal>
      )}
    </div>
  );
}
