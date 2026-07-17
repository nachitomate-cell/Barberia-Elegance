import { useEffect, useMemo, useState } from 'react';
import { where } from 'firebase/firestore';
import {
  Zap, Clock, User, Coffee, Users, Maximize2, Minimize2,
} from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { useConfig } from '../hooks/useConfig';
import { useTenant } from '../contexts/TenantContext';

// ────────────────────────────────────────────────────────────────────
//  PIZARRA WALK-IN
//  ──────────────────
//  Feature pedida por barberos: al entrar un cliente de paso, el staff
//  responde al toque quién de todo el equipo se desocupa antes y en
//  cuántos minutos, sin abrir la agenda ni contar mentalmente.
//
//  Ideal para dejar abierta en un tablet/PC del local. Se refresca sola
//  cada 30s y ordena los barberos por "próximo libre" ascendente.
// ────────────────────────────────────────────────────────────────────

const REFRESH_MS = 30_000;

// Estados de cita que "ocupan" al barbero en su franja.
// Cualquier estado FUERA de este set se ignora (canceladas, no-asistió, etc.).
const ESTADOS_OCUPAN = new Set([
  'Confirmada', 'Pendiente', 'Completada',
]);

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hhmmToMin(hhmm) {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function minToHhmm(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function durOfCita(c) {
  return Number(c.duracion || c.duracionServicio || 30) || 30;
}

// Devuelve el estado del barbero AHORA: 'libre' | 'ocupado' | 'colacion'.
// Incluye "hasta cuándo" (mins), "cuánto falta" para desocuparse (mins) y,
// si está ocupado, el cliente + servicio actual para el chip.
function computeEstadoBarbero({ barberoId, citas, nowMin, colacion }) {
  const misCitas = citas
    .filter(c => c.barberoId === barberoId)
    .filter(c => ESTADOS_OCUPAN.has(c.estado || 'Confirmada'))
    .map(c => {
      const start = hhmmToMin(c.hora);
      if (start == null) return null;
      return { ...c, _start: start, _end: start + durOfCita(c) };
    })
    .filter(Boolean)
    .sort((a, b) => a._start - b._start);

  // 1) ¿Colación cubre ahora?
  if (colacion && colacion.inicio && colacion.fin) {
    const cIni = hhmmToMin(colacion.inicio);
    const cFin = hhmmToMin(colacion.fin);
    if (cIni != null && cFin != null && nowMin >= cIni && nowMin < cFin) {
      return {
        estado: 'colacion',
        hastaMin: cFin,
        faltaMin: cFin - nowMin,
      };
    }
  }

  // 2) ¿Alguna cita cubre ahora?
  const actual = misCitas.find(c => nowMin >= c._start && nowMin < c._end);
  if (actual) {
    return {
      estado: 'ocupado',
      hastaMin: actual._end,
      faltaMin: actual._end - nowMin,
      cliente: actual.clienteNombre || '',
      servicio: actual.servicioNombre || '',
    };
  }

  // 3) Libre — ¿hasta cuándo? Próxima cita futura o resto del día.
  const proxima = misCitas.find(c => c._start > nowMin);
  if (proxima) {
    return {
      estado: 'libre',
      libreHastaMin:   proxima._start,
      libreDuranteMin: proxima._start - nowMin,
      proxCliente: proxima.clienteNombre || '',
    };
  }

  return { estado: 'libre', libreHastaMin: null, libreDuranteMin: Infinity };
}

// Prioridad para ordenar tarjetas: menor = arriba.
//   1) Libres AHORA con más tiempo por delante primero (dan más margen al walk-in)
//   2) Ocupados: el que se desocupa antes primero
//   3) En colación al final
function priorityKey(e) {
  if (e.estado === 'libre') {
    // -Infinity primero. libreDuranteMin puede ser Infinity (resto del día) → mejor.
    return [0, -(e.libreDuranteMin === Infinity ? 999 : e.libreDuranteMin)];
  }
  if (e.estado === 'ocupado') {
    return [1, e.faltaMin];
  }
  return [2, e.faltaMin]; // colación
}

function formatWait(mins) {
  if (mins === Infinity) return 'resto del día';
  if (mins <= 0)  return 'ahora';
  if (mins < 60)  return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// ── Card por barbero ────────────────────────────────────────────────
function BarberoCard({ b, estado }) {
  const isLibre    = estado.estado === 'libre';
  const isOcupado  = estado.estado === 'ocupado';
  const isColacion = estado.estado === 'colacion';

  const wrap = isLibre
    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_40px_-15px_rgba(16,185,129,0.5)]'
    : isColacion
      ? 'bg-amber-500/10 border-amber-500/40'
      : 'bg-slate-800/40 border-slate-700/50';

  const iniciales = String(b.nombre || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();

  return (
    <div className={`relative rounded-2xl border p-5 md:p-6 transition-colors ${wrap}`}>
      <div className="flex items-center gap-4">
        {b.foto ? (
          <img src={b.foto} alt={b.nombre}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-white/10 shrink-0" />
        ) : (
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-700 text-primary text-xl font-bold flex items-center justify-center shrink-0">
            {iniciales || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg md:text-xl font-bold text-primary truncate">{b.nombre}</h3>
          {isLibre && (
            <p className="text-emerald-400 text-xs md:text-sm font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <Zap size={14} /> Libre ahora
            </p>
          )}
          {isOcupado && (
            <p className="text-slate-400 text-xs md:text-sm mt-0.5 flex items-center gap-1.5">
              <Clock size={14} /> Ocupado
            </p>
          )}
          {isColacion && (
            <p className="text-amber-400 text-xs md:text-sm font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <Coffee size={14} /> En colación
            </p>
          )}
        </div>
      </div>

      {/* Contador grande — el dato que el barbero grita al cliente */}
      <div className="mt-5 flex items-baseline gap-2">
        {isLibre ? (
          estado.libreDuranteMin === Infinity ? (
            <span className="text-3xl md:text-4xl font-black text-emerald-300 leading-none">
              Todo el día
            </span>
          ) : (
            <>
              <span className="text-4xl md:text-5xl font-black text-emerald-300 leading-none tabular-nums">
                {formatWait(estado.libreDuranteMin)}
              </span>
              <span className="text-sm text-emerald-400/70">hasta {minToHhmm(estado.libreHastaMin)}</span>
            </>
          )
        ) : (
          <>
            <span className={`text-4xl md:text-5xl font-black leading-none tabular-nums ${isColacion ? 'text-amber-300' : 'text-primary'}`}>
              {formatWait(estado.faltaMin)}
            </span>
            <span className="text-sm text-slate-400">hasta {minToHhmm(estado.hastaMin)}</span>
          </>
        )}
      </div>

      {/* Chip de contexto — cliente actual o próximo */}
      {isOcupado && (estado.cliente || estado.servicio) && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2 text-xs md:text-sm text-slate-400">
          <User size={13} className="shrink-0" />
          <span className="truncate">
            <span className="text-slate-300">{estado.cliente || 'Cliente'}</span>
            {estado.servicio && <span className="text-slate-500"> · {estado.servicio}</span>}
          </span>
        </div>
      )}
      {isLibre && estado.proxCliente && estado.libreDuranteMin !== Infinity && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center gap-2 text-xs md:text-sm text-slate-500">
          <Clock size={13} className="shrink-0" />
          <span className="truncate">Siguiente: <span className="text-slate-400">{estado.proxCliente}</span></span>
        </div>
      )}
    </div>
  );
}

// ── Vista principal ─────────────────────────────────────────────────
export default function Pizarra() {
  const { id: tenantId } = useTenant();
  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(false);

  // Auto-refresco: recalcula estados cada 30s (no re-fetchea datos, solo tick).
  useEffect(() => {
    const it = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(it);
  }, []);

  const hoy = todayStr(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const { data: barberos = [] } = useCollection('barberos');
  const { data: citas    = [] } = useCollection(
    'citas',
    [where('fecha', '==', hoy)],
    [hoy], // reset de query cuando cambia el día (medianoche)
  );
  const { config } = useConfig();

  // Filtro de barberos "que atienden" — mismo criterio que la reserva
  // pública/Agenda: excluye admins puros, docs-espejo de UID (_mainDocId) e
  // inactivos. Incluye admin-barbero (esBarbero/mostrarEnAgenda === true).
  const barberosVisibles = useMemo(() => (
    (barberos || []).filter(b =>
      !b._mainDocId &&
      b.disponible !== false &&
      (b.rol !== 'admin' || tenantId === 'delnero' || b.esBarbero === true || b.mostrarEnAgenda === true)
    )
  ), [barberos, tenantId]);

  // Compute estados y ordena por prioridad.
  const cards = useMemo(() => {
    const colacionesBarbero = (config && config.colacionesBarbero) || {};
    const colacionGlobal    = (config && config.colacion) || null;
    const arr = barberosVisibles.map(b => {
      const propia   = colacionesBarbero[b.id];
      const colacion = (propia && propia.inicio && propia.fin) ? propia : colacionGlobal;
      const estado = computeEstadoBarbero({
        barberoId: b.id, citas, nowMin, colacion,
      });
      return { b, estado, _prio: priorityKey(estado) };
    });
    arr.sort((x, y) => {
      if (x._prio[0] !== y._prio[0]) return x._prio[0] - y._prio[0];
      return x._prio[1] - y._prio[1];
    });
    return arr;
  }, [barberosVisibles, citas, nowMin, config]);

  const libres = cards.filter(x => x.estado.estado === 'libre').length;
  const proximoOcupado = cards.find(x => x.estado.estado === 'ocupado');

  const wrapCls = fullscreen
    ? 'fixed inset-0 z-50 bg-slate-950 overflow-auto p-6'
    : '';

  return (
    <div className={wrapCls}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-bold text-primary">Pizarra walk-in</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
              en vivo
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500">
            {libres > 0
              ? <>Hay <span className="text-emerald-400 font-bold">{libres}</span> {libres === 1 ? 'persona libre ahora' : 'personas libres ahora'} para tomar un cliente de paso.</>
              : proximoOcupado
                ? <>Nadie libre. Próximo desocupado: <span className="text-primary font-semibold">{proximoOcupado.b.nombre}</span> en <span className="text-primary font-semibold">{formatWait(proximoOcupado.estado.faltaMin)}</span>.</>
                : <>Nadie en agenda hoy.</>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Clock size={12} />
            <span className="tabular-nums">{minToHhmm(nowMin)}</span>
          </div>
          <button
            onClick={() => setFullscreen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (ideal para tablet)'}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            {fullscreen ? 'Salir' : 'Pantalla'}
          </button>
        </div>
      </div>

      {/* ── Grid de tarjetas ── */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-slate-600">
          <Users size={40} className="mb-3 opacity-50" />
          <p className="text-sm">No hay personal activo para mostrar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map(({ b, estado }) => (
            <BarberoCard key={b.id} b={b} estado={estado} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[10px] text-slate-700 uppercase tracking-widest">
        Se actualiza automáticamente cada {Math.round(REFRESH_MS / 1000)} s
      </p>
    </div>
  );
}
