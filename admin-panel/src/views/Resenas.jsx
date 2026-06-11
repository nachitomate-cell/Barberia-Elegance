import { useMemo, useState } from 'react';
import { Star, Users, TrendingUp, Filter, Trash2 } from 'lucide-react';
import { deleteDoc } from 'firebase/firestore';
import { useCollection } from '../hooks/useCollection';
import { tenantDoc } from '../lib/tenantUtils';

const LABELS = ['', 'Mal servicio', 'Podría mejorar', 'Estuvo bien', 'Muy bueno', '¡Excelente!'];

function StarRow({ value, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={14}
          fill={i < value ? '#D4AF37' : 'none'}
          stroke={i < value ? '#D4AF37' : '#475569'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Resenas() {
  const { data: resenas, loading } = useCollection('resenas');

  const [filtroBarbero, setFiltroBarbero] = useState('');
  const [filtroRating,  setFiltroRating]  = useState('');
  const [confirmId,     setConfirmId]     = useState('');
  const [deletingId,    setDeletingId]    = useState('');

  const handleDelete = async id => {
    setDeletingId(id);
    try {
      await deleteDoc(tenantDoc('resenas', id));
    } catch (e) {
      console.error('Error al eliminar la reseña:', e);
    } finally {
      setDeletingId('');
      setConfirmId('');
    }
  };

  /* ── Barberos únicos para el filtro ──────────────────────── */
  const barberos = useMemo(() => {
    const seen = new Map();
    resenas.forEach(r => {
      if (r.barberoId && r.barberoNombre && !seen.has(r.barberoId)) {
        seen.set(r.barberoId, r.barberoNombre);
      }
    });
    return [...seen.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [resenas]);

  /* ── Estadísticas ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!resenas.length) return { promedio: 0, total: 0, distribucion: [0, 0, 0, 0, 0] };
    const total = resenas.length;
    const suma  = resenas.reduce((acc, r) => acc + (r.rating || 0), 0);
    const dist  = [1, 2, 3, 4, 5].map(n => resenas.filter(r => r.rating === n).length);
    return { promedio: (suma / total).toFixed(1), total, distribucion: dist };
  }, [resenas]);

  /* ── Filtrado ─────────────────────────────────────────────── */
  const filtradas = useMemo(() => {
    let list = [...resenas].sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    if (filtroBarbero) list = list.filter(r => r.barberoId === filtroBarbero);
    if (filtroRating)  list = list.filter(r => r.rating === Number(filtroRating));
    return list;
  }, [resenas, filtroBarbero, filtroRating]);

  /* ── Promedio por barbero (para el panel de stats) ─────────── */
  const statsBarbero = useMemo(() => {
    if (!filtroBarbero || !resenas.length) return null;
    const del = resenas.filter(r => r.barberoId === filtroBarbero);
    if (!del.length) return null;
    const prom = del.reduce((a, r) => a + (r.rating || 0), 0) / del.length;
    return { nombre: del[0].barberoNombre, promedio: prom.toFixed(1), total: del.length };
  }, [resenas, filtroBarbero]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Star size={18} className="text-amber-400" fill="#D4AF37" stroke="#D4AF37" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">Reseñas</h1>
          <p className="text-xs text-slate-500">Calificaciones de clientes al finalizar su cita</p>
        </div>
      </div>

      {/* Stat cards */}
      {!loading && resenas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Promedio general"
            value={`${stats.promedio} ★`}
            sub={`${stats.total} reseña${stats.total !== 1 ? 's' : ''}`}
          />
          <StatCard
            label="5 estrellas"
            value={stats.distribucion[4]}
            sub={`${stats.total ? Math.round((stats.distribucion[4] / stats.total) * 100) : 0}% del total`}
          />
          {statsBarbero ? (
            <StatCard
              label={statsBarbero.nombre}
              value={`${statsBarbero.promedio} ★`}
              sub={`${statsBarbero.total} reseña${statsBarbero.total !== 1 ? 's' : ''}`}
            />
          ) : (
            <StatCard
              label="Barberos calificados"
              value={barberos.length}
              sub="con al menos 1 reseña"
            />
          )}
        </div>
      )}

      {/* Distribución de estrellas */}
      {!loading && resenas.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribución</p>
          {[5, 4, 3, 2, 1].map(n => {
            const count = stats.distribucion[n - 1];
            const pct   = stats.total ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={n} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-20 shrink-0">
                  <span className="text-xs text-slate-400 w-2">{n}</span>
                  <Star size={11} fill="#D4AF37" stroke="#D4AF37" strokeWidth={1.5} />
                </div>
                <div className="flex-1 bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-slate-500 shrink-0" />

        <select
          value={filtroBarbero}
          onChange={e => setFiltroBarbero(e.target.value)}
          className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500"
        >
          <option value="">Todos los barberos</option>
          {barberos.map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>

        <select
          value={filtroRating}
          onChange={e => setFiltroRating(e.target.value)}
          className="text-sm bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-slate-500"
        >
          <option value="">Todas las calificaciones</option>
          {[5, 4, 3, 2, 1].map(n => (
            <option key={n} value={n}>{n} estrella{n !== 1 ? 's' : ''}</option>
          ))}
        </select>

        {(filtroBarbero || filtroRating) && (
          <button
            onClick={() => { setFiltroBarbero(''); setFiltroRating(''); }}
            className="text-xs text-slate-500 hover:text-white underline transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Star size={22} className="text-slate-600" />
          </div>
          <p className="text-slate-500 text-sm">
            {resenas.length === 0
              ? 'Aún no hay reseñas. Aparecerán aquí cuando los clientes califiquen sus citas.'
              : 'Sin reseñas para los filtros seleccionados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(r => {
            const fecha = r.createdAt?.toDate?.();
            const fechaStr = fecha
              ? fecha.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
              : null;

            return (
              <div
                key={r.id}
                className="bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                {/* Estrellas + etiqueta */}
                <div className="flex items-center gap-2 sm:w-40 shrink-0">
                  <StarRow value={r.rating} />
                  <span className="text-xs text-slate-500">{LABELS[r.rating] || ''}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {r.clienteNombre || 'Cliente'}
                    {r.clienteTelefono && (
                      <span className="text-slate-500 font-normal ml-2 text-xs">{r.clienteTelefono}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {[r.barberoNombre, r.servicioNombre].filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Fecha */}
                {fechaStr && (
                  <p className="text-xs text-slate-600 shrink-0">{fechaStr}</p>
                )}

                {/* Eliminar */}
                {confirmId === r.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="flex items-center gap-1 text-[11px] font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-1 rounded-md hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === r.id
                        ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 size={12} />}
                      Eliminar
                    </button>
                    <button
                      onClick={() => setConfirmId('')}
                      className="text-[11px] text-slate-400 hover:text-white px-1.5 py-1 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(r.id)}
                    title="Eliminar reseña"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
