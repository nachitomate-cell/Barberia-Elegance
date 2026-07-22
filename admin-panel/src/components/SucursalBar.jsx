import { Lock, Layers } from 'lucide-react';
import { useSucursal } from '../contexts/SucursalContext';

// Etiqueta corta de la sede.
const shortLabel = (s) =>
  s?.nombreCorto || (s?.nombre || '').replace(/^.*\bBarber(shop)?\b\s*/i, '').trim() || s?.ciudad || s?.id || '—';

// hex → rgba (para tintes translúcidos del color de la sede).
function rgba(hex, a) {
  const h = (hex || '#64748b').replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function Pill({ active, color, onClick, children, locked }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${locked ? 'cursor-default' : 'active:scale-95'}`}
      style={active
        ? { background: color, color: '#fff', boxShadow: `0 2px 12px ${rgba(color, 0.45)}` }
        : { background: 'rgba(148,163,184,0.14)', color: '#cbd5e1' }}
    >
      {locked && <Lock size={11} />}
      {children}
    </button>
  );
}

/**
 * Header de sede — identidad visual FUERTE por sucursal. Solo en tenants
 * multi-sucursal. Al cambiar de sede cambian el color, la foto, el nombre y la
 * dirección: deja clarísimo en qué local estás operando (cada sede funciona a
 * su manera). Un encargado scopeado ve su sede fija (con candado); el dueño
 * alterna Todas / sede A / sede B.
 */
export default function SucursalBar() {
  const { multiSucursal, allowed, canViewAll, activeId, setActive, activeSucursal } = useSucursal();
  if (!multiSucursal) return null;

  const isAll = activeId === 'all';
  const color = isAll ? '#64748b' : (activeSucursal?.color || '#64748b');

  return (
    <div
      className="sticky top-0 z-20 shrink-0 backdrop-blur"
      style={{
        borderTop: `3px solid ${color}`,
        borderBottom: '1px solid rgba(148,163,184,0.15)',
        background: isAll
          ? 'rgba(15,23,42,0.95)'
          : `linear-gradient(90deg, ${rgba(color, 0.20)} 0%, ${rgba(color, 0.06)} 55%, rgba(15,23,42,0.85) 100%)`,
      }}
    >
      <div className="flex items-center gap-3 px-4 lg:px-7 py-2.5">
        {/* Identidad de la sede activa */}
        {isAll ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
              <Layers size={19} className="text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-100 leading-tight">Todas las sedes</p>
              <p className="text-[11px] text-slate-400 leading-tight">Vista consolidada · {allowed.length} locales</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            {activeSucursal?.banner ? (
              <img
                src={activeSucursal.banner}
                alt=""
                className="w-11 h-11 rounded-xl object-cover shrink-0"
                style={{ border: `2px solid ${color}`, boxShadow: `0 0 0 3px ${rgba(color, 0.18)}` }}
              />
            ) : (
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: rgba(color, 0.22) }}>
                {activeSucursal?.emoji || '📍'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[15px] font-extrabold leading-tight truncate" style={{ color }}>
                {activeSucursal?.emoji ? activeSucursal.emoji + ' ' : ''}{shortLabel(activeSucursal)}
              </p>
              <p className="text-[11px] text-slate-300 leading-tight truncate">
                {activeSucursal?.calle || activeSucursal?.ciudad || ''}
              </p>
            </div>
          </div>
        )}

        {/* Selector de sede */}
        <div className="ml-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {canViewAll && (
            <Pill active={isAll} color="#64748b" onClick={() => setActive('all')}>Todas</Pill>
          )}
          {allowed.map(s => (
            <Pill
              key={s.id}
              active={activeId === s.id}
              color={s.color || '#64748b'}
              onClick={() => setActive(s.id)}
              locked={!canViewAll}
            >
              {s.emoji ? s.emoji + ' ' : ''}{shortLabel(s)}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}
