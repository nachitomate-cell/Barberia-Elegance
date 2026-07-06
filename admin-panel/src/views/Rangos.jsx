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
  silver: {
    Icon: Medal, color: '#cbd5e1', text: 'text-slate-200',
    borderTop: 'border-t-4 border-t-slate-400',
    iconBg:    'bg-slate-400/10 text-slate-300',
    shadow:    'shadow-[0_0_15px_rgba(148,163,184,0.06)]',
    checkedBg: '#94a3b8',  // slate-400
  },
  gold: {
    Icon: Crown, color: '#eab308', text: 'text-yellow-500',
    borderTop: 'border-t-4 border-t-yellow-500',
    iconBg:    'bg-yellow-500/10 text-yellow-500',
    shadow:    'shadow-[0_0_15px_rgba(234,179,8,0.1)]',
    checkedBg: '#eab308',  // yellow-500
  },
  platinum: {
    Icon: Gem, color: '#a855f7', text: 'text-purple-400',
    borderTop: 'border-t-4 border-t-purple-500',
    iconBg:    'bg-purple-500/10 text-purple-400',
    shadow:    'shadow-[0_0_15px_rgba(168,85,247,0.12)]',
    checkedBg: '#a855f7',  // purple-500
  },
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
              <div key={r.id} className={`bg-slate-800/40 ${st.borderTop} border-x border-b border-slate-700/40 rounded-2xl p-5 ${st.shadow} flex flex-col`}>

                {/* Cabecera: ícono circular tintado + nombre + umbral */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`${st.iconBg} p-3 rounded-full flex items-center justify-center shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="relative">
                      <input
                        value={r.nombre}
                        onChange={e => updateNombre(ri, e.target.value)}
                        maxLength={24}
                        placeholder={r.id}
                        aria-label={`Nombre del rango ${r.id}`}
                        className="w-full bg-transparent border border-transparent hover:border-slate-700/60 focus:border-slate-600 rounded-lg pl-1.5 pr-7 py-0.5 text-2xl font-bold text-white leading-tight focus:outline-none focus:bg-slate-900/40 transition-all"
                      />
                      <Pencil size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5 pl-1.5">{rangoLabel(rangos, ri)}</p>
                  </div>
                </div>

                {/* ── AUTOMÁTICOS ── */}
                <p className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-3">
                  <Zap size={11} /> Automáticos
                  <span className="ml-auto text-[10px] text-slate-500 italic normal-case tracking-normal font-normal">se aplican solos</span>
                </p>

                <div className="space-y-2.5">
                  {/* Sellos por visita — stepper unificado */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-300 flex items-center gap-1.5">
                      <Stamp size={13} className="text-slate-400" /> Sellos por visita
                    </span>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shrink-0">
                      <button
                        onClick={() => setSellos(ri, (Number(r.sellosPorVisita) || 0) - 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-800 transition-colors"
                        aria-label="Disminuir">
                        <Minus size={13} />
                      </button>
                      <div className="w-px h-5 bg-slate-700 self-center" aria-hidden />
                      <input
                        type="number" min="0" max="99" inputMode="numeric"
                        value={r.sellosPorVisita}
                        onChange={e => setSellos(ri, parseInt(e.target.value, 10) || 0)}
                        className="w-10 h-8 text-center bg-transparent text-sm font-bold text-white focus:outline-none tabular-nums appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="w-px h-5 bg-slate-700 self-center" aria-hidden />
                      <button
                        onClick={() => setSellos(ri, (Number(r.sellosPorVisita) || 0) + 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-800 transition-colors"
                        aria-label="Aumentar">
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Toggle: descuento en servicios (custom checkbox con color del rango) */}
                  <button onClick={() => toggleDescuento(ri)}
                    className="w-full flex items-center gap-2.5 py-1.5 text-left text-sm transition-colors group">
                    <span className="w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-all"
                      style={r.descuentoServicios
                        ? { background: st.checkedBg, borderColor: st.checkedBg, color: '#0f172a' }
                        : { background: '#0f172a', borderColor: '#475569' }}>
                      {r.descuentoServicios && <Check size={10} strokeWidth={3.5} />}
                    </span>
                    <span className={`flex-1 leading-tight transition-colors ${
                      r.descuentoServicios ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}>
                      {DESCUENTO_PCT}% de descuento en servicios
                    </span>
                  </button>
                </div>

                {/* Divisor sutil */}
                <div className="border-t border-slate-700/50 my-4" />

                {/* ── INFORMATIVOS ── */}
                <p className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-3">
                  <Info size={11} /> Informativos
                  <span className="ml-auto text-[10px] text-slate-500 italic normal-case tracking-normal font-normal">solo se muestran</span>
                </p>

                <div className="space-y-1.5 flex-1">
                  {BENEFICIOS_CATALOGO.map(b => {
                    const active = r.beneficios.includes(b.id);
                    return (
                      <button key={b.id} onClick={() => toggleBeneficio(ri, b.id)}
                        className="w-full flex items-center gap-2.5 py-1.5 text-left text-sm transition-colors group">
                        <span className="w-4 h-4 rounded flex items-center justify-center shrink-0 border-2 transition-all"
                          style={active
                            ? { background: st.checkedBg, borderColor: st.checkedBg, color: '#0f172a' }
                            : { background: '#0f172a', borderColor: '#475569' }}>
                          {active && <Check size={10} strokeWidth={3.5} />}
                        </span>
                        <span className={`flex-1 leading-tight transition-colors ${
                          active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}>
                          {b.nombre}
                        </span>
                      </button>
                    );
                  })}

                  {/* Beneficios personalizados */}
                  {r.beneficiosCustom.map((c, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <span className="w-4 h-4 shrink-0 rounded flex items-center justify-center border-2"
                        style={{ background: st.checkedBg, borderColor: st.checkedBg, color: '#0f172a' }}>
                        <Check size={10} strokeWidth={3.5} />
                      </span>
                      <input value={c} onChange={e => updateCustom(ri, ci, e.target.value)}
                        placeholder="Beneficio personalizado…"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors" />
                      <button onClick={() => removeCustom(ri, ci)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                        title="Quitar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {/* Ghost CTA */}
                  <button onClick={() => addCustom(ri)}
                    className="text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 py-2 px-3 rounded-lg w-full transition-colors flex items-center gap-2 mt-2">
                    <Plus size={14} strokeWidth={2.5} /> Agregar beneficio personalizado
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
