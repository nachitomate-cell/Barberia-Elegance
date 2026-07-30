import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { where } from 'firebase/firestore';
import {
  Zap, Clock, User, Coffee, Users, Maximize2, Minimize2, UserPlus, CalendarOff,
} from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { useConfig } from '../hooks/useConfig';
import { useTenant } from '../contexts/TenantContext';
import { useSucursal } from '../contexts/SucursalContext';

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

// Devuelve el estado del barbero AHORA:
//   'dia_libre'  → el barbero no trabaja hoy según su horario semanal
//   'libre'      → puede tomar un walk-in ahora mismo
//   'ocupado'    → está en cita
//   'colacion'   → en break de colación
// Incluye "hasta cuándo" (mins), "cuánto falta" para desocuparse (mins) y,
// si está ocupado, el cliente + servicio actual para el chip.
function computeEstadoBarbero({ barberoId, citas, nowMin, colacion, horarioHoy, esExcepcionExtra }) {
  // 0) ¿Día libre? El horario semanal del barbero marca este día como inactivo.
  //    Prioridad máxima: aunque tenga colación configurada o cita mal cargada,
  //    si su día no está activo, es día libre.
  //    EXCEPCIÓN: `diasExtra` (fechas puntuales que habilitan al barbero fuera
  //    de su jornada semanal) revierte el "día libre" y lo trata como día
  //    normal (empieza el flujo de detección de ocupado/colación/libre).
  if (horarioHoy && horarioHoy.activo === false && !esExcepcionExtra) {
    return { estado: 'dia_libre' };
  }
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
    // ENCADENAR. Antes se devolvía actual._end, o sea "se desocupa cuando
    // termine lo que está haciendo". Con la agenda llena eso es falso: si a
    // las 18:00 empieza la siguiente cita, a las 18:00 NO está libre. La
    // pizarra ofrecía un walk-in a una hora ya tomada.
    // Avanzamos mientras exista una cita que empiece antes (o justo) del
    // fin acumulado — así se saltan cadenas de citas pegadas y también los
    // solapamientos (sobrecupo).
    let fin = actual._end;
    for (let guard = 0; guard < misCitas.length; guard++) {
      const sigue = misCitas.find(c => c._start <= fin && c._end > fin);
      if (!sigue) break;
      fin = sigue._end;
    }

    // Hueco real DESPUÉS de la cadena: hasta la próxima cita, o resto del día.
    const trasCadena = misCitas.find(c => c._start > fin);
    const huecoMin   = trasCadena ? trasCadena._start - fin : Infinity;

    return {
      estado: 'ocupado',
      hastaMin: fin,
      faltaMin: fin - nowMin,
      cliente: actual.clienteNombre || '',
      servicio: actual.servicioNombre || '',
      // Cuánto dura el hueco cuando por fin se libera. Infinity = resto del
      // día. La tarjeta lo usa para no ofrecer un walk-in que no cabe.
      huecoMin,
      // true si hay más citas pegadas después de la actual: sirve para
      // avisar que el "hasta" no es el fin de la cita en curso.
      encadenado: fin !== actual._end,
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
  if (e.estado === 'ocupado')  return [1, e.faltaMin];
  if (e.estado === 'colacion') return [2, e.faltaMin];
  // 'dia_libre' al final — no acepta walk-in.
  return [3, 0];
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
function BarberoCard({ b, estado, walkinHora, onWalkin }) {
  const isLibre    = estado.estado === 'libre';
  const isOcupado  = estado.estado === 'ocupado';
  const isColacion = estado.estado === 'colacion';
  const isDiaLibre = estado.estado === 'dia_libre';

  // Base cristal para todas las tarjetas — la diferenciación viaja por el
  // gradiente radial detrás del avatar y por el badge, no por el borde de
  // la caja completa (que antes era verde/ámbar saturado).
  const wrap = isDiaLibre
    ? 'bg-white/[0.015] opacity-70'
    : 'bg-white/[0.02]';

  const iniciales = String(b.nombre || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();

  // ¿Cabe algo en el hueco? Un walk-in por debajo de este mínimo no alcanza
  // ni para el servicio más corto, así que ofrecerlo solo lleva a crear una
  // cita que después hay que mover. Los libres siempre pueden (su hueco es
  // "hasta la próxima cita", que ya lo valida la rama de arriba).
  const MIN_WALKIN = 20; // minutos
  const huecoUtil = !isOcupado || estado.huecoMin == null
    || estado.huecoMin === Infinity || estado.huecoMin >= MIN_WALKIN;

  return (
    <div
      className={`relative rounded-2xl p-5 md:p-6 overflow-hidden transition-all duration-200 ease-in-out ${wrap}`}
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
    >
      {/* Resplandor sutil detrás del avatar solo en libres.
          Radial verde translúcido, no invade la caja. */}
      {isLibre && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{
            background:
              'radial-gradient(ellipse 50% 100% at 20% 0%, rgba(52,199,89,0.18) 0%, rgba(52,199,89,0.06) 40%, transparent 75%)',
          }}
        />
      )}
      {isColacion && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{
            background:
              'radial-gradient(ellipse 50% 100% at 20% 0%, rgba(255,159,10,0.14) 0%, rgba(255,159,10,0.04) 40%, transparent 75%)',
          }}
        />
      )}
      <div className="relative flex items-center gap-4">
        {b.foto ? (
          <img
            src={b.foto} alt={b.nombre}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover shrink-0"
            style={{ border: '2px solid rgba(255,255,255,0.1)' }}
          />
        ) : (
          <div
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/[0.04] text-slate-200 text-xl font-semibold flex items-center justify-center shrink-0"
            style={{ border: '2px solid rgba(255,255,255,0.1)' }}
          >
            {iniciales || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg md:text-xl font-semibold text-primary truncate tracking-tight">{b.nombre}</h3>
          {isLibre && (
            <span className="inline-flex items-center gap-1.5 mt-1 rounded-full bg-emerald-400/15 text-emerald-300 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5">
              <Zap size={11} strokeWidth={2.25} /> Libre ahora
            </span>
          )}
          {isOcupado && (
            <p className="text-slate-400 text-xs md:text-sm mt-1 flex items-center gap-1.5">
              <Clock size={13} strokeWidth={1.75} /> Ocupado
            </p>
          )}
          {isColacion && (
            <span className="inline-flex items-center gap-1.5 mt-1 rounded-full bg-amber-400/15 text-amber-300 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5">
              <Coffee size={11} strokeWidth={2.25} /> En colación
            </span>
          )}
          {isDiaLibre && (
            <p className="text-slate-500 text-xs md:text-sm mt-1 flex items-center gap-1.5">
              <CalendarOff size={13} strokeWidth={1.75} /> Día libre
            </p>
          )}
        </div>
      </div>

      {/* Día libre: mensaje simple y CTA cortada (sin walk-in posible). */}
      {isDiaLibre ? (
        <div className="relative mt-5">
          <p className="text-slate-200 text-lg md:text-xl font-semibold leading-tight tracking-tight">
            Hoy no atiende
          </p>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            Su agenda semanal marca este día como no laborable.
          </p>
          <div className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] px-3 py-2.5 text-xs md:text-sm font-medium text-slate-500" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
            <CalendarOff size={15} className="shrink-0" strokeWidth={1.75} />
            <span>No disponible para walk-in</span>
          </div>
        </div>
      ) : (
      <>
      {/* Contador grande — el dato que el barbero grita al cliente.
          "Todo el día" queda en gris claro (info secundaria), no compite
          con el nombre. Los contadores numéricos sí conservan peso. */}
      <div className="relative mt-5 flex items-baseline gap-2">
        {isLibre ? (
          estado.libreDuranteMin === Infinity ? (
            <span className="text-xl md:text-2xl font-medium text-slate-200 leading-none tracking-tight">
              Todo el día
            </span>
          ) : (
            <>
              <span className="text-4xl md:text-5xl font-semibold text-primary leading-none tabular-nums tracking-tight">
                {formatWait(estado.libreDuranteMin)}
              </span>
              <span className="text-sm text-slate-400">hasta {minToHhmm(estado.libreHastaMin)}</span>
            </>
          )
        ) : (
          <>
            <span className={`text-4xl md:text-5xl font-semibold leading-none tabular-nums tracking-tight ${isColacion ? 'text-amber-200' : 'text-primary'}`}>
              {formatWait(estado.faltaMin)}
            </span>
            <span className="text-sm text-slate-400">hasta {minToHhmm(estado.hastaMin)}</span>
          </>
        )}
      </div>

      {/* Chip de contexto — cliente actual o próximo */}
      {isOcupado && (estado.cliente || estado.servicio) && (
        <div className="relative mt-4 pt-4 flex items-center gap-2 text-xs md:text-sm text-slate-400" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <User size={13} className="shrink-0" strokeWidth={1.75} />
          <span className="truncate">
            <span className="text-slate-300">{estado.cliente || 'Cliente'}</span>
            {estado.servicio && <span className="text-slate-500"> · {estado.servicio}</span>}
          </span>
        </div>
      )}
      {isLibre && estado.proxCliente && estado.libreDuranteMin !== Infinity && (
        <div className="relative mt-4 pt-4 flex items-center gap-2 text-xs md:text-sm text-slate-500" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Clock size={13} className="shrink-0" strokeWidth={1.75} />
          <span className="truncate">Siguiente: <span className="text-slate-400">{estado.proxCliente}</span></span>
        </div>
      )}

      {/* Aviso cuando el "hasta" NO es el fin de la cita en curso, sino el de
          una cadena de citas pegadas. Sin esto, "Ocupado hasta 20:00" con una
          cita que termina 18:00 se lee como un error del sistema. */}
      {isOcupado && estado.encadenado && (
        <p className="relative mt-3 text-[11px] md:text-xs leading-snug text-slate-500">
          Tiene citas seguidas hasta esa hora.
        </p>
      )}

      {/* CTA walk-in — abre la Agenda con barbero + hora ya resueltos:
          libre → ahora; ocupado/colación → cuando termina su cadena de citas.
          Si el hueco que queda es más corto que un servicio típico, no se
          ofrece: mandaba a crear una cita que no cabe.
          Layout: acción a la izquierda, temporizador a la derecha. */}
      {huecoUtil ? (
        <button
          onClick={onWalkin}
          className={`relative mt-4 w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-medium transition-all duration-200 ease-in-out ${
            isLibre
              ? 'bg-emerald-400/10 hover:bg-emerald-400/15 text-emerald-200'
              : isColacion
                ? 'bg-amber-400/10 hover:bg-amber-400/15 text-amber-200'
                : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-200'
          }`}
          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
          title={`Crear cita con ${b.nombre} a las ${walkinHora}`}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <UserPlus size={15} className="shrink-0" strokeWidth={1.75} />
            <span className="truncate">Agregar cliente de paso</span>
          </span>
          <span className="tabular-nums text-white/60 shrink-0">{walkinHora}</span>
        </button>
      ) : (
        <div className="relative mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] px-3 py-2.5 text-xs md:text-sm font-medium text-slate-500" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
          <CalendarOff size={15} className="shrink-0" strokeWidth={1.75} />
          <span>Sin espacio libre hoy</span>
        </div>
      )}
      </>
      )}
    </div>
  );
}

// ── Vista principal ─────────────────────────────────────────────────
export default function Pizarra() {
  const { id: tenantId } = useTenant();
  const navigate = useNavigate();
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
  const { activeSucursal } = useSucursal();

  // ── Local cerrado hoy ──
  // El horario del local vive en configuracion/main.horario (global) o en
  // configuracion/main.sucursales[i].horario (multi-sede tipo Oren). Si hoy
  // está marcado activo:false → nadie atiende, sea o no día libre del
  // barbero individual. Prioriza la sede activa si hay.
  const localCerradoHoy = useMemo(() => {
    const dowStr = String(now.getDay());
    // Prioridad: horario de la sede activa (si estamos filtrando por sede).
    if (activeSucursal?.horario) {
      const h = activeSucursal.horario[dowStr];
      if (h && h.activo === false) return true;
    }
    // Fallback: horario global del tenant.
    const h = config?.horario?.[dowStr];
    if (h && h.activo === false) return true;
    return false;
  }, [config, activeSucursal, now]);

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
    const dowStr = String(now.getDay()); // '0' dom .. '6' sab
    const fechaISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const arr = barberosVisibles.map(b => {
      const propia   = colacionesBarbero[b.id];
      const colacion = (propia && propia.inicio && propia.fin) ? propia : colacionGlobal;
      const horarioHoy = b.horario?.[dowStr] || null;
      // Excepción positiva: día extra habilitado puntualmente para HOY.
      const extras = Array.isArray(b?.diasExtra) ? b.diasExtra : [];
      const esExcepcionExtra = extras.includes(fechaISO);
      const estado = computeEstadoBarbero({
        barberoId: b.id, citas, nowMin, colacion, horarioHoy, esExcepcionExtra,
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

  // Hora sugerida para el walk-in: ahora si está libre; si no, cuando se
  // desocupa (fin de cita o colación). Redondeo ↑ a 5 min para una hora
  // limpia sin regalar minutos de sillón. Tope 23:55 por si el fin de la
  // última cita se pasa de medianoche.
  const horaWalkin = (estado) => {
    const base = estado.estado === 'libre' ? nowMin : (estado.hastaMin ?? nowMin);
    return minToHhmm(Math.min(Math.ceil(base / 5) * 5, 23 * 60 + 55));
  };
  // Deep-link a la Agenda: allá un efecto lee ?nueva=1&barbero&hora y abre
  // el modal de cita nueva con todo precargado (fecha = hoy).
  const goWalkin = (b, estado) =>
    navigate(`/agenda?nueva=1&barbero=${encodeURIComponent(b.id)}&hora=${horaWalkin(estado)}`);

  const wrapCls = fullscreen
    ? 'fixed inset-0 z-50 bg-slate-950 overflow-auto p-6'
    : '';

  return (
    <div className={wrapCls}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-semibold text-primary tracking-tight">Pizarra walk-in</h1>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-300 bg-emerald-400/15 rounded-full px-2 py-0.5">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              en vivo
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500">
            {localCerradoHoy
              ? <><span className="text-rose-400 font-semibold">El local no abre hoy</span> según el horario semanal.</>
              : libres > 0
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-white/[0.03] hover:bg-white/[0.06] rounded-full transition-all duration-200 ease-in-out"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (ideal para tablet)'}
          >
            {fullscreen ? <Minimize2 size={13} strokeWidth={1.75} /> : <Maximize2 size={13} strokeWidth={1.75} />}
            {fullscreen ? 'Salir' : 'Pantalla'}
          </button>
        </div>
      </div>

      {/* Banner destacado cuando el local no abre hoy. Se muestra ANTES del
          grid para que sea la primera cosa que se lee. El grid queda visible
          y atenuado por si el usuario quiere ver el detalle igual. */}
      {localCerradoHoy && (
        <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 flex items-start gap-3">
          <CalendarOff size={22} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-bold text-rose-200">El local no abre hoy</p>
            <p className="text-[12.5px] text-rose-200/80 leading-relaxed mt-0.5">
              El horario semanal del local marca este día como no laborable. No hay walk-ins disponibles.
              Si es un error, edita el horario en <span className="font-semibold">Configuración → Horario</span>.
            </p>
          </div>
        </div>
      )}

      {/* ── Grid de tarjetas ── */}
      {cards.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-slate-600">
          <Users size={40} className="mb-3 opacity-50" />
          <p className="text-sm">No hay personal activo para mostrar.</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${localCerradoHoy ? 'opacity-40 pointer-events-none' : ''}`}>
          {cards.map(({ b, estado }) => (
            <BarberoCard
              key={b.id}
              b={b}
              estado={estado}
              walkinHora={horaWalkin(estado)}
              onWalkin={() => goWalkin(b, estado)}
            />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[10px] text-slate-700 uppercase tracking-widest">
        Se actualiza automáticamente cada {Math.round(REFRESH_MS / 1000)} s
      </p>
    </div>
  );
}
