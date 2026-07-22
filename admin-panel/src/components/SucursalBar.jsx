import { MapPin, Lock } from 'lucide-react';
import { useSucursal } from '../contexts/SucursalContext';

// Etiqueta corta de la sede (quita el prefijo de marca): "Oren Barber Reñaca" → "Reñaca".
const shortLabel = (s) => (s?.nombre || '').replace(/^.*\bBarber(shop)?\b\s*/i, '').trim() || s?.ciudad || s?.id || '—';

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
        active ? 'bg-primary text-slate-900 shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Barra de sede — solo aparece en tenants multi-sucursal. El dueño (canViewAll)
 * ve pills para filtrar Todas / Sede A / Sede B; un encargado scopeado ve solo
 * un chip con su sede (no puede cambiar). Filtra Agenda, Caja, Métricas, etc.
 */
export default function SucursalBar() {
  const { multiSucursal, allowed, canViewAll, activeId, setActive, activeSucursal } = useSucursal();
  if (!multiSucursal) return null;

  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 px-4 lg:px-7 py-2 bg-slate-900/95 backdrop-blur border-b border-slate-800 shrink-0">
      <MapPin size={15} className="text-primary shrink-0" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0 hidden sm:inline">Sede</span>
      {canViewAll ? (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <Pill active={activeId === 'all'} onClick={() => setActive('all')}>Todas</Pill>
          {allowed.map(s => (
            <Pill key={s.id} active={activeId === s.id} onClick={() => setActive(s.id)}>{shortLabel(s)}</Pill>
          ))}
        </div>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <Lock size={12} className="opacity-70" />
          {activeSucursal ? shortLabel(activeSucursal) : '—'}
        </span>
      )}
    </div>
  );
}
