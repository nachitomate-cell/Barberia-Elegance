import { useState, useMemo } from 'react';
import { Clock, Check, ChevronRight, Scissors } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

/* ── Mock data ──────────────────────────────────────────────────── */
const MOCK_SERVICIOS = [
  { id: 1, nombre: 'Corte Tradicional',   precio: 10990, duracion: 40, categoria: 'Cortes' },
  { id: 2, nombre: 'Degradado Premium',   precio: 13990, duracion: 45, categoria: 'Cortes' },
  { id: 3, nombre: 'Corte con Navaja',    precio: 15990, duracion: 50, categoria: 'Cortes' },
  { id: 4, nombre: 'Perfilado de Barba',  precio:  8990, duracion: 30, categoria: 'Barba'  },
  { id: 5, nombre: 'Afeitado Clásico',    precio: 11990, duracion: 35, categoria: 'Barba'  },
  { id: 6, nombre: 'Arreglo de Barba',    precio:  9990, duracion: 25, categoria: 'Barba'  },
  { id: 7, nombre: 'Corte + Barba',       precio: 18990, duracion: 60, categoria: 'Combos' },
  { id: 8, nombre: 'Combo Premium',       precio: 24990, duracion: 90, categoria: 'Combos' },
];

const CATEGORIAS = ['Todos', 'Cortes', 'Barba', 'Combos'];
const fmtPrecio = p => `$${p.toLocaleString('es-CL')}`;

/* ── ServiceCard ─────────────────────────────────────────────────── */
function ServiceCard({ servicio, selected, onSelect, clr }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(servicio.id)}
      className="w-full text-left"
    >
      <div
        className="relative flex items-center justify-between px-5 py-4 rounded-2xl border transition-all duration-200"
        style={{
          borderColor:    selected ? clr.A : 'rgb(31 31 31)',
          backgroundColor: selected ? '#0f0f0a' : '#111111',
          boxShadow:      selected ? `0 0 0 1px ${clr.A22} inset, 0 4px 20px ${clr.A07}` : 'none',
        }}
      >
        {selected && (
          <div
            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
            style={{ backgroundColor: clr.A }}
          />
        )}

        <div className="flex-1 min-w-0 pr-4">
          <p className={`font-semibold text-[15px] leading-snug transition-colors ${
            selected ? 'text-primary' : 'text-gray-200'
          }`}>
            {servicio.nombre}
          </p>
          {servicio.descripcion && (
            <p className="text-xs text-gray-500 mt-1 mb-2 line-clamp-2 leading-relaxed">
              {servicio.descripcion}
            </p>
          )}
          <p className="font-bold text-base mt-1" style={{ color: clr.A }}>
            {fmtPrecio(servicio.precio)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Clock size={11} className="text-gray-600 shrink-0" />
            <span className="text-gray-600 text-xs">{servicio.duracion} min</span>
          </div>
        </div>

        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-200"
          style={{
            borderColor:     selected ? clr.A : '#333',
            backgroundColor: selected ? clr.A : 'transparent',
          }}
        >
          {selected && (
            <Check size={12} strokeWidth={3.5} className="text-black" />
          )}
        </div>
      </div>
    </button>
  );
}

/* ── CategoryChip ────────────────────────────────────────────────── */
function CategoryChip({ label, active, onClick, clr }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all duration-200"
      style={
        active
          ? { backgroundColor: clr.A, color: '#000', borderColor: clr.A, fontWeight: 700 }
          : { backgroundColor: 'transparent', color: '#6b6b6b', borderColor: '#1f1f1f' }
      }
    >
      {label}
    </button>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function BookingServicios({ servicios = MOCK_SERVICIOS, onContinuar, paso = 1, total = 4 }) {
  const { accent } = useTenant();
  const isLime = accent === 'lime';
  const clr = {
    A:    isLime ? '#39ff14' : '#D4AF37',
    A06:  isLime ? 'rgba(57,255,20,0.06)'  : 'rgba(212,175,55,0.06)',
    A07:  isLime ? 'rgba(57,255,20,0.07)'  : 'rgba(212,175,55,0.07)',
    A12:  isLime ? 'rgba(57,255,20,0.12)'  : 'rgba(212,175,55,0.12)',
    A15:  isLime ? 'rgba(57,255,20,0.15)'  : 'rgba(212,175,55,0.15)',
    A22:  isLime ? 'rgba(57,255,20,0.22)'  : 'rgba(212,175,55,0.22)',
    glow: isLime ? '0 0 22px rgba(57,255,20,0.30), 0 4px 12px rgba(0,0,0,0.4)'
                 : '0 0 22px rgba(212,175,55,0.30), 0 4px 12px rgba(0,0,0,0.4)',
  };

  const [categoria, setCategoria] = useState('Todos');
  const [selected,  setSelected]  = useState(null);

  const toggle = id => setSelected(prev => (prev === id ? null : id));

  const filtrados = useMemo(() =>
    categoria === 'Todos' ? servicios : servicios.filter(s => s.categoria === categoria),
  [servicios, categoria]);

  const agrupados = useMemo(() => {
    if (categoria !== 'Todos') return { [categoria]: filtrados };
    return filtrados.reduce((acc, s) => {
      (acc[s.categoria] ??= []).push(s);
      return acc;
    }, {});
  }, [filtrados, categoria]);

  const servicioActual = servicios.find(s => s.id === selected);

  const handleCategoriaChange = cat => {
    setCategoria(cat);
    setSelected(null);
  };

  return (
    <div
      className="max-w-md mx-auto min-h-screen flex flex-col relative"
      style={{ backgroundColor: '#0a0a0a', color: '#fff' }}
    >

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-6 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full"
            style={{ backgroundColor: clr.A12 }}
          >
            <Scissors size={13} style={{ color: clr.A }} />
          </div>
          <p
            className="text-[11px] font-bold tracking-[0.22em] uppercase"
            style={{ color: clr.A }}
          >
            Paso {paso} de {total}
          </p>
        </div>

        <h1 className="text-[26px] font-black text-primary tracking-tight leading-tight">
          Elige tu servicio
        </h1>
        <p className="text-gray-500 text-[13px] mt-1.5">
          Selecciona uno para continuar
        </p>
      </div>

      {/* ── Category chips ──────────────────────────────────────── */}
      <div className="px-5 pb-5 shrink-0">
        <div
          className="flex gap-2 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {CATEGORIAS.map(cat => (
            <CategoryChip
              key={cat}
              label={cat}
              active={categoria === cat}
              onClick={() => handleCategoriaChange(cat)}
              clr={clr}
            />
          ))}
        </div>
      </div>

      {/* ── Lista de servicios ───────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-5 space-y-7"
        style={{ paddingBottom: servicioActual ? '9.5rem' : '7rem' }}
      >
        {Object.entries(agrupados).map(([cat, items]) => (
          <section key={cat}>
            {categoria === 'Todos' && (
              <div
                className="pb-2 mb-4 border-b"
                style={{ borderColor: '#1a1a1a' }}
              >
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase"
                  style={{ color: '#555' }}>
                  {cat}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {items.map(s => (
                <ServiceCard
                  key={s.id}
                  servicio={s}
                  selected={selected === s.id}
                  onSelect={toggle}
                  clr={clr}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Botón flotante ───────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-8 pt-3"
        style={{
          background: 'linear-gradient(to top, #0a0a0a 70%, transparent)',
        }}
      >
        <div
          className="overflow-hidden transition-all duration-300"
          style={{
            maxHeight: servicioActual ? '80px' : '0px',
            opacity:   servicioActual ? 1 : 0,
            marginBottom: servicioActual ? '12px' : '0px',
          }}
        >
          {servicioActual && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ backgroundColor: clr.A06, border: `1px solid ${clr.A15}` }}
            >
              <div>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Seleccionado</p>
                <p className="text-sm font-semibold text-primary mt-0.5">{servicioActual.nombre}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-base" style={{ color: clr.A }}>
                  {fmtPrecio(servicioActual.precio)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Clock size={10} className="text-gray-600" />
                  <p className="text-[11px] text-gray-600">{servicioActual.duracion} min</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onContinuar?.(servicioActual)}
          className="w-full py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all duration-300"
          style={
            selected
              ? {
                  backgroundColor: clr.A,
                  color: '#000',
                  boxShadow: clr.glow,
                  transform: 'scale(1)',
                }
              : {
                  backgroundColor: '#111',
                  color: '#3a3a3a',
                  cursor: 'not-allowed',
                }
          }
          onMouseDown={e => { if (selected) e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { if (selected) e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {selected ? (
            <>
              Continuar
              <ChevronRight size={18} strokeWidth={2.5} />
            </>
          ) : (
            'Selecciona un servicio'
          )}
        </button>
      </div>
    </div>
  );
}
