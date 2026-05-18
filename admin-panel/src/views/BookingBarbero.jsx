import { useState, useMemo } from 'react';
import { Check, ChevronRight, Shuffle, User, ChevronLeft } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

/* ── Mock data ──────────────────────────────────────────────────── */
const MOCK_BARBEROS = [
  { id: 2, nombre: 'Joaquin Amiri',  especialidad: 'Cortes & Degradados', foto: null, citasHoy: 4 },
  { id: 3, nombre: 'Jesus',          especialidad: 'Barba & Perfilado',   foto: null, citasHoy: 2 },
  { id: 4, nombre: 'Nicolás Fabián', especialidad: 'Cortes Clásicos',     foto: null, citasHoy: 6 },
];

function elegirBarberoOptimo(barberos) {
  if (!barberos.length) return null;
  const minCitas = Math.min(...barberos.map(b => b.citasHoy));
  const candidatos = barberos.filter(b => b.citasHoy === minCitas);
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

/* ── BarberRow ───────────────────────────────────────────────────── */
function BarberRow({ barbero, selected, onSelect, clr }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(barbero.id)}
      className="w-full text-left"
    >
      <div
        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all duration-200"
        style={{
          borderColor:     selected ? clr.A : '#1a1a1a',
          backgroundColor: selected ? '#111108' : '#111111',
          boxShadow:       selected ? `0 0 0 1px ${clr.A15} inset` : 'none',
        }}
      >
        <div
          className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center border"
          style={{ borderColor: selected ? clr.A35 : '#222', backgroundColor: '#1a1a1a' }}
        >
          {barbero.foto
            ? <img src={barbero.foto} alt={barbero.nombre} className="w-full h-full object-cover" />
            : <User size={18} className="text-gray-600" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-white leading-snug truncate">
            {barbero.nombre}
          </p>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-0.5 truncate">
            {barbero.especialidad}
          </p>
        </div>

        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-200"
          style={{
            borderColor:     selected ? clr.A : '#333',
            backgroundColor: selected ? clr.A : 'transparent',
          }}
        >
          {selected && <Check size={12} strokeWidth={3.5} className="text-black" />}
        </div>
      </div>
    </button>
  );
}

/* ── SinPreferenciaRow ───────────────────────────────────────────── */
function SinPreferenciaRow({ selected, onSelect, clr }) {
  return (
    <button
      type="button"
      onClick={() => onSelect('no_preference')}
      className="w-full text-left"
    >
      <div
        className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all duration-200"
        style={{
          borderColor:     selected ? clr.A : clr.A22,
          backgroundColor: selected ? '#111108' : clr.A03,
          boxShadow:       selected ? `0 0 0 1px ${clr.A15} inset` : 'none',
        }}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 border"
          style={{ borderColor: clr.A35, backgroundColor: clr.A08 }}
        >
          <Shuffle size={18} style={{ color: clr.A }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-white leading-snug">
            Sin preferencia
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: clr.A, opacity: 0.8 }}>
            Asignación inteligente para hoy
          </p>
        </div>

        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-200"
          style={{
            borderColor:     selected ? clr.A : clr.A35,
            backgroundColor: selected ? clr.A : 'transparent',
          }}
        >
          {selected && <Check size={12} strokeWidth={3.5} className="text-black" />}
        </div>
      </div>
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function BookingBarbero({
  barberos      = MOCK_BARBEROS,
  servicioNombre = 'Corte Tradicional',
  onContinuar,
  onVolver,
  paso  = 2,
  total = 4,
}) {
  const { accent } = useTenant();
  const isLime = accent === 'lime';
  const clr = {
    A:    isLime ? '#39ff14' : '#D4AF37',
    A03:  isLime ? 'rgba(57,255,20,0.03)'  : 'rgba(212,175,55,0.03)',
    A08:  isLime ? 'rgba(57,255,20,0.08)'  : 'rgba(212,175,55,0.08)',
    A15:  isLime ? 'rgba(57,255,20,0.15)'  : 'rgba(212,175,55,0.15)',
    A22:  isLime ? 'rgba(57,255,20,0.2)'   : 'rgba(212,175,55,0.2)',
    A28:  isLime ? 'rgba(57,255,20,0.28)'  : 'rgba(212,175,55,0.28)',
    A35:  isLime ? 'rgba(57,255,20,0.35)'  : 'rgba(212,175,55,0.35)',
    glow: isLime ? '0 0 22px rgba(57,255,20,0.28), 0 4px 12px rgba(0,0,0,0.4)'
                 : '0 0 22px rgba(212,175,55,0.28), 0 4px 12px rgba(0,0,0,0.4)',
  };

  const [selected, setSelected] = useState('no_preference');
  const barberoOptimo = useMemo(() => elegirBarberoOptimo(barberos), [barberos]);

  const handleContinue = () => {
    if (selected === 'no_preference') {
      if (!barberoOptimo) return;
      onContinuar?.({ barbero: barberoOptimo, porBalanceo: true });
    } else {
      const barberoElegido = barberos.find(b => b.id === selected);
      onContinuar?.({ barbero: barberoElegido, porBalanceo: false });
    }
  };

  const pct = Math.round((paso / total) * 100);

  const ChipServicio = () => (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border"
      style={{ borderColor: '#2a2a2a', backgroundColor: '#141414' }}
    >
      <span className="text-[11px] text-gray-500">Servicio:</span>
      <span className="text-[11px] text-gray-300 font-medium">{servicioNombre}</span>
    </div>
  );

  return (
    <div
      className="max-w-md mx-auto flex flex-col"
      style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100dvh', paddingBottom: '6rem' }}
    >

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-6 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          {onVolver && (
            <button
              onClick={onVolver}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#555' }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <p
                className="text-[11px] font-bold tracking-[0.22em] uppercase"
                style={{ color: clr.A }}
              >
                Paso {paso} de {total}
              </p>
              <p className="text-[11px] text-gray-600">{pct}%</p>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: clr.A }}
              />
            </div>
          </div>
        </div>

        <h1 className="text-[26px] font-black text-white tracking-tight leading-tight mb-2">
          Elige tu barbero
        </h1>
        <ChipServicio />
      </div>

      {/* ── Lista ────────────────────────────────────────────────── */}
      <div className="flex-1 px-5 space-y-3 overflow-y-auto">
        <SinPreferenciaRow selected={selected === 'no_preference'} onSelect={setSelected} clr={clr} />

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px" style={{ backgroundColor: '#1a1a1a' }} />
          <p className="text-[10px] text-gray-700 uppercase tracking-widest shrink-0">O elige uno</p>
          <div className="flex-1 h-px" style={{ backgroundColor: '#1a1a1a' }} />
        </div>

        {barberos.map(b => (
          <BarberRow
            key={b.id}
            barbero={b}
            selected={selected === b.id}
            onSelect={setSelected}
            clr={clr}
          />
        ))}
      </div>

      {/* ── Botón flotante ───────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-8 pt-3"
        style={{ background: 'linear-gradient(to top, #0a0a0a 75%, transparent)' }}
      >
        {selected === 'no_preference' && barberoOptimo && (
          <div className="flex items-center justify-center gap-1.5 mb-3" style={{ opacity: 0.7 }}>
            <Shuffle size={11} style={{ color: clr.A }} />
            <p className="text-[11px]" style={{ color: clr.A }}>
              Se asignará a <strong>{barberoOptimo.nombre}</strong> ({barberoOptimo.citasHoy} citas hoy)
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          style={{
            backgroundColor: clr.A,
            color: '#000',
            boxShadow: clr.glow,
          }}
        >
          Continuar
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
