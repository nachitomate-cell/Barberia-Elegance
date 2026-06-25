// reservas.ts — Capa de datos del módulo "Reservas Bioo" (gratis, individual).
// Cada bioo tiene UN doc de configuración en bios/{username}/reservasConfig/config
// con servicios, horario semanal y bloqueos. Las reservas (subcolección
// /reservas) las introduciremos en el siguiente paso del plan.

import {
  doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy,
  onSnapshot, runTransaction, type Unsubscribe, type Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

/** Día de la semana (0=domingo, 6=sábado), siguiendo Date.getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Franja {
  /** "HH:MM" en hora local del barbero. */
  desde: string;
  hasta: string;
}

export interface ServicioReserva {
  id: string;
  nombre: string;
  /** Duración en minutos (slot que ocupa la cita). */
  duracion: number;
  /** Precio opcional, en la moneda local. Solo informativo. */
  precio?: number;
}

export interface BloqueoFecha {
  /** "YYYY-MM-DD" — día completo bloqueado. */
  fecha: string;
  motivo?: string;
}

export interface ReservasConfig {
  /** Master switch: si está apagado, el bloque público no muestra reservas. */
  activo: boolean;
  servicios: ServicioReserva[];
  /** Franjas disponibles por día de la semana. Array vacío ⇒ día cerrado. */
  horario: Record<Weekday, Franja[]>;
  bloqueos: BloqueoFecha[];
  /** Minutos de descanso forzado entre dos citas seguidas. */
  bufferMin: number;
  /** Anticipación mínima (horas) con la que un cliente puede reservar. */
  antelacionMinHoras: number;
  /** Ventana hacia adelante en días que se pueden reservar. */
  ventanaDias: number;
}

export const DEFAULT_RESERVAS_CONFIG: ReservasConfig = {
  activo: false,
  servicios: [],
  horario: {
    0: [],
    1: [{ desde: '10:00', hasta: '19:00' }],
    2: [{ desde: '10:00', hasta: '19:00' }],
    3: [{ desde: '10:00', hasta: '19:00' }],
    4: [{ desde: '10:00', hasta: '19:00' }],
    5: [{ desde: '10:00', hasta: '19:00' }],
    6: [{ desde: '10:00', hasta: '15:00' }],
  },
  bloqueos: [],
  bufferMin: 0,
  antelacionMinHoras: 2,
  ventanaDias: 30,
};

const CFG_PATH = (username: string) =>
  doc(db, 'bios', username, 'reservasConfig', 'config');

function normalizeHorario(raw: unknown): Record<Weekday, Franja[]> {
  const out: Record<Weekday, Franja[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  const r = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).forEach((d) => {
    const arr = r[String(d)];
    if (!Array.isArray(arr)) return;
    out[d] = arr
      .filter((f): f is Franja =>
        !!f && typeof (f as Franja).desde === 'string' && typeof (f as Franja).hasta === 'string',
      )
      .map((f) => ({ desde: f.desde, hasta: f.hasta }));
  });
  return out;
}

export async function loadReservasConfig(username: string): Promise<ReservasConfig> {
  const snap = await getDoc(CFG_PATH(username));
  if (!snap.exists()) return DEFAULT_RESERVAS_CONFIG;
  const d = snap.data() as Record<string, unknown>;
  return {
    activo: typeof d.activo === 'boolean' ? d.activo : false,
    servicios: Array.isArray(d.servicios) ? (d.servicios as ServicioReserva[]) : [],
    horario: normalizeHorario(d.horario),
    bloqueos: Array.isArray(d.bloqueos) ? (d.bloqueos as BloqueoFecha[]) : [],
    bufferMin: typeof d.bufferMin === 'number' ? d.bufferMin : 0,
    antelacionMinHoras:
      typeof d.antelacionMinHoras === 'number' ? d.antelacionMinHoras : 2,
    ventanaDias: typeof d.ventanaDias === 'number' ? d.ventanaDias : 30,
  };
}

export async function saveReservasConfig(
  username: string,
  cfg: ReservasConfig,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('not-authenticated');
  // Round-trip para limpiar `undefined` (Firestore los rechaza).
  const clean = JSON.parse(JSON.stringify(cfg));
  await setDoc(
    CFG_PATH(username),
    { ...clean, uid: user.uid, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function nuevoServicioId(): string {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const DIAS_LABEL: Record<Weekday, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

/** "HH:MM" → minutos desde 00:00. Sin validar (asumimos input UI). */
export function hhmmToMin(s: string): number {
  const [h, m] = s.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function minToHhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ────────────────────────────────────────────────────────────────────
   Reservas (paso 3): listado en vivo del barbero + gestión por cita.
   ──────────────────────────────────────────────────────────────────── */

export type EstadoReserva = 'confirmada' | 'cancelada' | 'completada';

export interface Reserva {
  id: string;
  servicioId: string;
  servicioNombre: string;
  duracion: number;
  precio?: number;
  fecha: string;     // "YYYY-MM-DD"
  hora: string;      // "HH:MM"
  slotKey: string;   // "YYYY-MM-DD HH:MM"
  cliente: { nombre: string; whatsapp: string };
  estado: EstadoReserva;
  creadaEn?: Timestamp;
}

/** Suscripción en vivo a las reservas del barbero, ordenadas por slotKey
 *  ascendente (las próximas primero). Devuelve la función para desuscribirse. */
export function watchReservas(
  username: string,
  onData: (rows: Reserva[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  const col = collection(db, 'bios', username, 'reservas');
  const q = query(col, orderBy('slotKey', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const rows: Reserva[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Reserva, 'id'>;
        return { id: d.id, ...data };
      });
      onData(rows);
    },
    (err) => { if (onError) onError(err); },
  );
}

/** Marca una reserva como completada (no toca disponibilidad: el slot ya
 *  pasó y mantener el bloqueo histórico evita confundir contadores). */
export async function completarReserva(
  username: string,
  reservaId: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('not-authenticated');
  await setDoc(
    doc(db, 'bios', username, 'reservas', reservaId),
    { estado: 'completada', updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Cancela una reserva (soft) y libera el slot en /disponibilidad/{fecha} para
 *  que vuelva a ser reservable. Transacción atómica para evitar carreras con
 *  visitantes tomando justo ese slot mientras cancelamos. */
export async function cancelarReserva(
  username: string,
  reserva: Reserva,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('not-authenticated');
  const resvRef = doc(db, 'bios', username, 'reservas', reserva.id);
  const dispRef = doc(db, 'bios', username, 'disponibilidad', reserva.fecha);

  await runTransaction(db, async (tx) => {
    const dispSnap = await tx.get(dispRef);
    const ocupados: Array<{ hora: string; dur: number }> = dispSnap.exists()
      ? ((dispSnap.data() as { ocupados?: Array<{ hora: string; dur: number }> }).ocupados ?? [])
      : [];
    // Quitamos el match exacto (mismo `hora` y `dur`). Si por algún motivo el
    // espejo no contenía este slot, la cancelación sigue adelante igual.
    const filtrados = ocupados.filter(
      (o) => !(o.hora === reserva.hora && o.dur === reserva.duracion),
    );
    if (dispSnap.exists()) {
      tx.set(dispRef, { ocupados: filtrados, updatedAt: serverTimestamp() }, { merge: true });
    }
    tx.set(resvRef, { estado: 'cancelada', updatedAt: serverTimestamp() }, { merge: true });
  });
}

/** WhatsApp link pre-armado para confirmar la cita con el cliente. */
export function whatsappUrl(reserva: Reserva, nombreBarbero?: string): string {
  const digits = reserva.cliente.whatsapp.replace(/\D/g, '');
  if (digits.length < 8) return '';
  const fechaFmt = formatearFechaLarga(reserva.fecha);
  const firma = nombreBarbero ? ` — ${nombreBarbero}` : '';
  const msg =
    `Hola ${reserva.cliente.nombre}! 👋 Confirmo tu cita de ` +
    `${reserva.servicioNombre} el ${fechaFmt} a las ${reserva.hora}. ` +
    `¡Te espero!${firma}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function formatearFechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: '2-digit', month: 'long',
  }).format(new Date(y, m - 1, d));
}

export function formatearFechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'short', day: '2-digit', month: 'short',
  }).format(new Date(y, m - 1, d));
}

/** Reduce una reserva a una "instancia de tiempo" para clasificar por bucket. */
export function reservaTimestamp(r: Reserva): number {
  const [y, m, d] = r.fecha.split('-').map((n) => parseInt(n, 10));
  const [hh, mm] = r.hora.split(':').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, hh, mm).getTime();
}
