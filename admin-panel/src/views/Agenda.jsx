import { useState, useMemo, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Ban, CalendarOff,
  CheckCircle2, XCircle, Clock, Trash2, Lock, History,
  User, Phone, Mail, Scissors, CalendarDays, DollarSign, Wallet,
  Timer, MessageSquare, BadgeCheck, Search, ListFilter, MapPin,
  Send, Download, RefreshCw, Copy, Check, ShoppingBag, Gift, MessageCircle, Activity,
  Users, Eye, UserPlus, MoreHorizontal, GripVertical, AlertTriangle, Zap, UserX,
  Coffee, Info,
} from 'lucide-react';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, where, orderBy, limit, writeBatch, getDocs, query,
  runTransaction, Timestamp, arrayUnion, onSnapshot,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { SheetModal, sheetBtn, sheetLabel, sheetHighlight } from '../components/ui/SheetModal';
import { atiendeSillon } from '../lib/roles';
import SlideOver from '../components/ui/SlideOver';
import Select from '../components/ui/Select';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { confirmDialog } from '../lib/confirmDialog';
import { tuuSandboxDialog } from '../lib/tuuSandbox';
import { tuuCobroDialog }   from '../lib/tuuCobro';
import { withTimeout } from '../lib/firestore-helpers';
import { buscarClientes, normalizarTexto } from '../lib/clienteSearch';
import { useConfig } from '../hooks/useConfig';
import { readGateConfig } from '../lib/reopenGate';
import ReopenPassModal from '../components/ui/ReopenPassModal';
import { sanitizarTelefonoCL, sufijo9 } from '../lib/phoneUtils';
import { incluyeRecordatorios } from '../lib/waPlan';
import { useCollection } from '../hooks/useCollection';
import { useClubUsers } from '../hooks/useClubUsers';
import { useClientesSinFicha } from '../hooks/useClientesSinFicha';
import { useTenant } from '../contexts/TenantContext';
import { useSucursal } from '../contexts/SucursalContext';
import { useAuth } from '../contexts/AuthContext';
import ReviewModal from '../components/ReviewModal';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import AIWatermark from '../components/ui/AIWatermark';

/* ════════════════════════════════════════════════════════════════════════
   MOTOR DE PACKS / CUPONERAS (Fase B)
   -------------------------------------------------------------------------
   Se ejecuta cuando una cita pasa a estado `Completada` por primera vez.
   Dos escenarios:

   1) `servicio.isPack === true` (activación)
      La cita agota el "primer uso" del pack. Se crea una entrada en
      `users/{uid}.packsActivos[]` con:
        { packId, nombrePack, sesionesTotales,
          sesionesRestantes: total - 1,   // esta cita ya lo consumió
          fechaCompra, fechaVencimiento,   // vencimiento = compra + diasValidez
          citaActivacion: cita.id }

   2) `cita.consumeSesionPack === true` + `cita.packRefId` (consumo)
      La cita es una sesión gratuita usada por el cliente desde su pack ya
      activo. Se busca esa entrada en packsActivos[] y se decrementa
      sesionesRestantes en 1.

   La operación es una transacción — si el cliente tiene concurrencia (dos
   citas Completadas al mismo tiempo), no se pierde saldo.

   Errores no bloquean el guardado de la cita: se loguean.
   ════════════════════════════════════════════════════════════════════════ */
/* Resuelve a qué doc de `users` pertenece una cita.
   ══════════════════════════════════════════════════════════════════════
   El teléfono es el último eslabón y es EL QUE FALTABA. Los clientes creados
   desde el panel son "legacy": su doc es users/{id} con uid === id === teléfono
   solo-dígitos (Clientes.jsx:1140 y :1219). Y selectCliente les pone
   clienteId = null a propósito (Agenda.jsx:736) para no confundirlos con
   cuentas reales; después handleSave borra el campo si viene vacío (:932).

   Resultado: la cita de un cliente creado desde el panel llegaba sin userId,
   sin clienteUid y sin clienteId → el motor de packs salía por
   `skip: 'sin-userId'` y no escribía nada. En silencio, y después de que el
   diálogo ya había prometido "quedarán 3 sesiones".

   La pista de que era esto: sobre la MISMA cita, los sellos sí funcionaban.
   Porque la CF de sellos resuelve por teléfono (sello-automatico.js:313) y el
   motor de packs no. Esa asimetría era el bug.

   Se sanitiza antes de sacar los dígitos: si el barbero tipeó "983568212"
   (9 dígitos), sanitizarTelefonoCL lo lleva a +56983568212 y recién ahí los
   dígitos calzan con el docId. Ojo: NO sirve `clienteTelefonoSuf9` — son los
   últimos 9 dígitos, otra cosa. */
function resolverUserIdCita(cita) {
  const directo = cita?.userId || cita?.clienteUid || cita?.clienteId;
  if (directo) return directo;
  const digs = sanitizarTelefonoCL(cita?.clienteTelefono || '').replace(/\D/g, '');
  return digs.length >= 11 ? digs : '';
}

/* Upsert de `users/{uid}` cuando el barbero crea/edita una cita.
 *
 * Delega la resolución al CF `upsertCliente` que aplica la regla híbrida
 * (email exacto → match; tel único con al menos uno sin email → merge;
 * emails distintos o tel ambiguo → personas distintas). Esto reemplaza la
 * lógica antigua que dedupeaba SOLO por tel y colapsaba a hermanos/parejas
 * con tel compartido en el mismo doc.
 *
 * Devuelve el uid canónico (o null si no aplica / si falla). El caller lo
 * usa para setear `payload.clienteId` y `payload.clienteUid` ANTES de guardar
 * la cita — así la cita queda linkeada al cliente correcto desde el primer
 * write.
 *
 * Fail-safe: si el CF falla (red/quota), devuelve null y la cita se guarda
 * igual con datos sueltos (backward compat).
 */
async function upsertUserDesdeCita(cita) {
  const nombre   = (cita?.clienteNombre   || '').trim();
  const email    = (cita?.clienteEmail    || '').trim();
  const telefono = (cita?.clienteTelefono || '').trim();
  // Sin nombre no podemos crear un doc que tenga sentido; sin email ni tel
  // el CF rechaza. En cualquiera de los dos casos: no-op.
  if (!nombre || (!email && !telefono)) return null;
  try {
    const call = httpsCallable(getFunctions(undefined, 'us-central1'), 'upsertCliente');
    const res  = await call({
      tenantId: resolveTenantId(),
      nombre,
      email,
      telefono,
    });
    return res?.data?.uid || null;
  } catch (e) {
    console.warn('[Agenda] upsertCliente falló (no bloqueante):', e?.message || e);
    return null;
  }
}

async function procesarPackDeCita({ servicio, cita, tenantId, barberos, servicios = [] }) {
  const userId = resolverUserIdCita(cita);
  if (!userId) return { skip: 'sin-userId' };

  const esActivacion = !!(servicio && servicio.isPack);
  const esConsumo    = !!cita.consumeSesionPack && !!cita.packRefId;
  if (!esActivacion && !esConsumo) return { skip: 'ni-activacion-ni-consumo' };

  const userRef = doc(tenantCol('users'), userId);
  // Log ref con ID auto en packConsumos (marca-aware — redirige a
  // tenants/kronnos/packConsumos cuando el tenant es una sede Kronnos).
  const logRef  = doc(tenantCol('packConsumos'));

  const barbNombre = (() => {
    if (!Array.isArray(barberos) || !cita?.barberoId) return cita?.barberoNombre || '';
    const b = barberos.find(x => x.id === cita.barberoId);
    return b?.nombre || cita?.barberoNombre || '';
  })();

  const logBase = {
    userId,
    clienteNombre:      cita?.clienteNombre || '',
    clienteTelefonoSuf9: cita?.clienteTelefonoSuf9 || cita?.telefonoSuf9 || '',
    citaId:             cita?.id || '',
    citaFecha:          cita?.fecha || '',
    citaHora:           cita?.hora || '',
    barberoId:          cita?.barberoId || '',
    barberoNombre:      barbNombre,
    servicioId:         cita?.servicioId || servicio?.id || '',
    servicioNombre:     cita?.servicioNombre || servicio?.nombre || '',
    sedeId:             tenantId || '',   // tenant operacional (útil en Kronnos multi-sede)
    createdAt:          serverTimestamp(),
  };

  await runTransaction(db, async (tx) => {
    const uSnap = await tx.get(userRef);
    if (!uSnap.exists()) return; // sin doc de user, no aplica (cliente no logueado)
    const uData = uSnap.data() || {};
    const packs = Array.isArray(uData.packsActivos) ? [...uData.packsActivos] : [];
    const now = Date.now();

    let logPayload = null;

    if (esActivacion) {
      // Idempotencia: si la cita ya activó un pack previamente (por doble Save),
      // no volver a crear.
      const yaActivado = packs.some(p => p.citaActivacion === cita.id);
      if (yaActivado) return;

      const totalSes = Math.max(1, Number(servicio.sesionesTotales) || 1);
      const dias     = Math.max(1, Number(servicio.diasValidez)     || 30);
      // Snapshot de nombres de servicios (mejora #7): congela el catálogo
      // que cubre el pack al momento de la activación. Si el admin renombra
      // o borra un servicio después, el pack sigue siendo legible para
      // cliente y barbero.
      const idsCubiertos = Array.isArray(servicio.serviciosIncluidos) ? servicio.serviciosIncluidos : [];
      const snapshot = idsCubiertos.map(id => {
        const svc = servicios.find(s => s.id === id);
        return { id, nombre: svc?.nombre || id };
      });
      const nuevoPack = {
        packId:            servicio.id,
        nombrePack:        servicio.nombre,
        sesionesTotales:   totalSes,
        sesionesRestantes: Math.max(0, totalSes - 1), // la cita actual cuenta como 1
        fechaCompra:       Timestamp.fromMillis(now),
        fechaVencimiento:  Timestamp.fromMillis(now + dias * 24 * 60 * 60 * 1000),
        citaActivacion:    cita.id,
        serviciosIncluidos: idsCubiertos,          // IDs vivos (match para consumo)
        serviciosIncluidosSnapshot: snapshot,       // Nombres congelados (display)
      };
      packs.push(nuevoPack);

      logPayload = {
        ...logBase,
        tipo:               'activacion',
        packId:             nuevoPack.packId,
        packNombre:         nuevoPack.nombrePack,
        sesionesTotales:    totalSes,
        sesionesAntes:      totalSes,
        sesionesDespues:    nuevoPack.sesionesRestantes,
        fechaVencimiento:   nuevoPack.fechaVencimiento,
      };
    }

    if (esConsumo) {
      // Busca el pack por packRefId (id interno del cliente en su array).
      // La reserva pública setea `packRefId` = id lógico + índice, aquí lo
      // resolvemos por packId + saldo > 0 (idempotencia via `consumido[cita.id]`).
      const idx = packs.findIndex(p =>
        p.packId === cita.packRefId &&
        (p.sesionesRestantes || 0) > 0 &&
        (!p.fechaVencimiento || (p.fechaVencimiento.toMillis?.() || 0) > now)
      );
      if (idx === -1) return; // pack no encontrado / sin saldo / expirado
      const yaConsumida = Array.isArray(packs[idx].citasConsumo) && packs[idx].citasConsumo.includes(cita.id);
      if (yaConsumida) return;
      const antes = packs[idx].sesionesRestantes || 0;
      const despues = Math.max(0, antes - 1);
      packs[idx] = {
        ...packs[idx],
        sesionesRestantes: despues,
        citasConsumo: [...(packs[idx].citasConsumo || []), cita.id],
        ultimoConsumo: Timestamp.fromMillis(now),
      };

      logPayload = {
        ...logBase,
        tipo:            'consumo',
        packId:          packs[idx].packId,
        packNombre:      packs[idx].nombrePack,
        sesionesTotales: packs[idx].sesionesTotales || 0,
        sesionesAntes:   antes,
        sesionesDespues: despues,
        fechaVencimiento: packs[idx].fechaVencimiento || null,
      };
    }

    tx.update(userRef, { packsActivos: packs, updatedAt: serverTimestamp() });
    if (logPayload) tx.set(logRef, logPayload);

    // Denormalizar en la cita para que el badge de la agenda tenga
    // toda la info al leerla (sin refetch). Se hace dentro de la
    // misma transacción para mantener consistencia con el saldo.
    if (esActivacion && cita?.id) {
      const citaRef = doc(tenantCol('citas'), cita.id);
      const vencAct = packs[packs.length - 1]?.fechaVencimiento || null;
      tx.update(citaRef, {
        esActivacionPack:     true,
        packNombre:           servicio.nombre || null,
        packSesionIndex:      1,
        packSesionTotal:      Number(servicio.sesionesTotales) || 1,
        packFechaVencimiento: vencAct,
      });
    } else if (esConsumo && cita?.id) {
      // Consumo desde el admin panel (cita ya creada sin denormalizar
      // el vencimiento): reflejarlo ahora si el pack activo lo tiene.
      const idxU = packs.findIndex(p => p.packId === cita.packRefId);
      const vencUse = idxU >= 0 ? (packs[idxU].fechaVencimiento || null) : null;
      if (vencUse && !cita.packFechaVencimiento) {
        const citaRef = doc(tenantCol('citas'), cita.id);
        tx.update(citaRef, { packFechaVencimiento: vencUse });
      }
    }
  });
  return { ok: true };
}

/* ── Urgencia de vencimiento de pack ─────────────────────────
   Devuelve nivel + días + label compacto. Consumido por el badge
   de la agenda para colorear según qué tan cerca del vencimiento
   está el pack del cliente. Recibe la cita porque los campos
   packFechaVencimiento y packSesionIndex/Total viven en la cita
   (denormalizado desde users/{uid}.packsActivos[] al crear la cita
   o al activar). */
function getPackUrgency(cita) {
  const venc = cita?.packFechaVencimiento;
  const vencMs = venc?.toMillis?.() ?? (venc ? new Date(venc).getTime() : 0);
  const hoyMs  = Date.now();
  if (!vencMs) return { nivel: 'neutro', dias: null, label: '' };

  const dias = Math.ceil((vencMs - hoyMs) / (1000 * 60 * 60 * 24));
  if (dias < 0)      return { nivel: 'expirado', dias, label: 'Vencido' };
  if (dias === 0)    return { nivel: 'critico',  dias, label: 'Vence hoy' };
  if (dias === 1)    return { nivel: 'critico',  dias, label: 'Vence mañana' };
  if (dias <= 3)     return { nivel: 'urgente',  dias, label: `Vence en ${dias}d` };
  if (dias <= 7)     return { nivel: 'proximo',  dias, label: `Vence en ${dias}d` };
  return             { nivel: 'saludable', dias, label: `${dias}d restantes` };
}

/* Clases Tailwind por nivel de urgencia — mantiene el badge autocontenido
   (sin CSS extra) y las clases se pueden purgar/leer estáticamente. */
const PACK_URGENCY_STYLE = {
  saludable: 'bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/50',
  proximo:   'bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/50',
  urgente:   'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/60',
  critico:   'bg-red-500/25 text-red-200 ring-1 ring-red-400/60',
  expirado:  'bg-red-500/40 text-primary ring-1 ring-red-500/80',
  neutro:    'bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/50',
};

/* ── Columna de barbero arrastrable (reordenar con tap+hold) ───
 * Render-prop: expone setNodeRef/style/listeners para usar la cabecera
 * como "manija" de arrastre. Soporta táctil (dnd-kit PointerSensor). */
function SortableCol({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };
  return children({ setNodeRef, style, listeners, attributes, isDragging });
}

/* ── Constants ─────────────────────────────────────────────── */
// Alto en px de UNA franja horaria de la grilla (la celda `h-10`). Todo lo que
// se dibuja encima —citas, bloqueos, colación, línea de "ahora"— se posiciona
// contra esta medida.
const SLOT_PX = 40;

// Alto mínimo visible de una card de cita. Con duraciones cortas en relojes
// anchos (15' en una grilla de 60') el bloque real quedaría en 10 px:
// ilegible e imposible de tocar en mobile. Preferimos exagerar un poco hacia
// "ocupado" antes que hacia "libre", que es el error que confunde al cliente.
// (24px = padding vertical de la card + una línea de text-xs: el nombre del
// cliente siempre legible.)
const MIN_CITA_PX = 24;

// ── Resoluciones del eje horario ───────────────────────────────────
// TODAS dividen a 60, a propósito. Con una que no (estaba 45') las filas caen
// en 15:00, 15:45, 16:30, 17:15… : horas a las que nadie agenda, el borde de
// cada hora NUNCA coincide con una línea, y una cita real de 16:45 no tiene
// ninguna etiqueta cerca. La grilla se queda sin ancla reconocible.
//
// Desde que los bloques se dibujan por minuto, la resolución dejó de limitar
// la duración de las citas: es solo la regla de medir. Y una regla tiene que
// estar en las unidades en que la gente piensa la hora.
const RESOLUCIONES = [15, 20, 30, 60];
const RESOLUCION_DEFAULT = 30;
// Cualquier valor heredado (localStorage con 45, `intervaloMinutos` del tenant)
// se acerca a la resolución válida más parecida en vez de romper el eje.
function snapResolucion(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return RESOLUCION_DEFAULT;
  if (RESOLUCIONES.includes(v)) return v;
  // Preferimos la resolución más grande que DIVIDA al intervalo pedido: así
  // toda hora agendable sigue cayendo sobre una línea real. Un tenant con
  // intervalo de 45' agenda a las 10:00, 10:45, 11:30, 12:15… — todos
  // múltiplos de 15, así que 15' los muestra todos; 30' dejaría la mitad a
  // media fila, que es justo la ambigüedad que estamos matando.
  const divisor = RESOLUCIONES.filter(r => v % r === 0).pop();
  if (divisor) return divisor;
  return RESOLUCIONES.reduce((best, r) =>
    Math.abs(r - v) < Math.abs(best - v) ? r : best, RESOLUCION_DEFAULT);
}

// Hueco mínimo (en minutos) que se rotula como tiempo libre entre dos citas.
const MIN_HUECO_MIN = 15;

const hhmm = m =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function buildSlotCfg(slotMins, hourStart = 8, hourEnd = 20) {
  // Math.ceil: con 45' el día puede no dividir exacto; redondeamos hacia arriba
  // para no recortar la última franja horaria.
  const totalSlots = Math.ceil((hourEnd - hourStart) * (60 / slotMins));
  const timeLabels = Array.from({ length: totalSlots }, (_, i) => {
    const mins = hourStart * 60 + i * slotMins;
    return `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
  });
  // Opciones de hora para los selects de los modales: SIEMPRE en pasos de 15 min,
  // independientes de la resolución de la vista, para que cambiar el reloj nunca
  // altere la hora de una cita abierta.
  const pickerStep = 15;
  const pickerSlots = (hourEnd - hourStart) * (60 / pickerStep);
  const pickerLabels = Array.from({ length: pickerSlots }, (_, i) => {
    const mins = hourStart * 60 + i * pickerStep;
    return `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
  });
  const totalPx = totalSlots * SLOT_PX;
  return {
    slotMins,
    totalSlots,
    totalPx,
    hourStart,
    timeLabels,
    pickerLabels,
    // ── Geometría en MINUTOS REALES ────────────────────────────
    // Antes existía un slotIdx() que redondeaba la hora hacia abajo a su
    // franja, y todo se dibujaba multiplicando ese índice por SLOT_PX. Eso
    // hacía mentir a la grilla: con el reloj en 45', una cita de 60' ocupaba
    // UNA franja (45') y los últimos 15' se veían libres — un cliente creyó
    // que tenía la hora disponible. Estas dos funciones posicionan por
    // minuto, así que cada bloque tapa exactamente lo que dura.
    topPx: t => {
      if (typeof t !== 'string' || !t.includes(':')) return 0;
      const [h, m] = t.split(':').map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
      const px = ((h * 60 + m - hourStart * 60) / slotMins) * SLOT_PX;
      return Math.max(0, Math.min(totalPx, px));
    },
    durPx: mins => ((Number(mins) || 0) / slotMins) * SLOT_PX,
  };
}

const AgendaCtx = createContext(buildSlotCfg(30));

/* Etiqueta compacta de la fecha para el toolbar mobile: "Martes 30 Jun".
   Capitaliza el weekday y usa el mes en formato corto (sin punto). */
function formatDateLabel(d) {
  const weekday = d.toLocaleDateString('es-CL', { weekday: 'long' });
  const day     = d.getDate();
  const mesFull = d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  return `${cap(weekday)} ${day} ${cap(mesFull)}`;
}

/* Devuelve las 7 fechas de la semana (lunes a domingo) que contiene la fecha dada.
   ISO week: si el día es Domingo (getDay=0), la "semana" empieza el LUNES anterior. */
function getWeekDates(d) {
  const dow = d.getDay();                         // 0=Dom, 1=Lun, …, 6=Sáb
  const backToMonday = (dow === 0) ? 6 : dow - 1;
  const monday = new Date(d);
  monday.setDate(d.getDate() - backToMonday);
  monday.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    out.push(x);
  }
  return out;
}

/* Grilla del mes: 42 celdas (6 semanas) empezando el LUNES de la semana que
   contiene el día 1. Se muestran los días de relleno del mes anterior/siguiente
   para que la grilla no quede coja, igual que cualquier calendario.
   42 fijo (y no 35 según el mes) evita que la grilla salte de alto al navegar. */
function getMonthGrid(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = getWeekDates(first)[0];
  return Array.from({ length: 42 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    x.setHours(0, 0, 0, 0);
    return x;
  });
}

/* Etiqueta del mes para el toolbar: "Julio 2026" */
function formatMonthLabel(d) {
  const s = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Etiqueta del rango semanal para el toolbar. Formatos:
     misma-mes: "6 — 12 Jul 2025"
     cambia-mes: "28 Jun — 4 Jul 2025" */
function formatWeekLabel(d) {
  const week = getWeekDates(d);
  const mon  = week[0], sun = week[6];
  const cap  = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const mMon = cap(mon.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''));
  const mSun = cap(sun.toLocaleDateString('es-CL', { month: 'short' }).replace('.', ''));
  const y    = sun.getFullYear();
  if (mMon === mSun) return `${mon.getDate()} — ${sun.getDate()} ${mMon} ${y}`;
  return `${mon.getDate()} ${mMon} — ${sun.getDate()} ${mSun} ${y}`;
}

/* Estado VISUAL de una cita. "Pendiente" (ámbar) significa "le preguntamos
   por WhatsApp y aún no contesta" — pero si el aviso nunca SALIÓ (bolsa
   agotada, canal apagado), el ámbar eterno confunde. Sin envío real la cita
   se muestra verde como Confirmada, y el check de WhatsApp aparece SOLO
   cuando el aviso efectivamente se envió. */
const waAvisado    = (c) => c?.waConfirmSolicitada === true || c?.waRecordatorioEnviado === true;
const estadoVisual = (c) => ((c?.estado === 'Pendiente' && !waAvisado(c)) ? 'Confirmada' : (c?.estado || 'Confirmada'));

const STATUS_STYLE = {
  Confirmada: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
  // Pendiente: cita del asistente WhatsApp aún sin confirmar por el cliente.
  // Ámbar = "esperando confirmación"; pasa a Confirmada (verde) al responder CONFIRMAR.
  Pendiente:  'bg-amber-500/15  border-amber-500/40    text-amber-300',
  Cancelada:  'bg-red-500/10   border-red-500/30     text-red-400',
  Completada: 'bg-blue-500/10  border-blue-500/30    text-blue-400',
  // No asistió: el cliente no llegó y no aviso. Rose para distinguirlo de
  // Cancelada (rojo) — es un no-show pasivo, mas grave para el negocio.
  NoAsistio:  'bg-rose-500/10  border-rose-500/40    text-rose-300',
};

// Label human-readable para el valor 'NoAsistio' (Firestore guarda sin acento
// ni espacio, la UI muestra "No asistió" con acento).
const STATUS_LABEL = {
  Confirmada: 'Confirmada',
  Completada: 'Completada',
  Cancelada:  'Cancelada',
  Pendiente:  'Pendiente',
  NoAsistio:  'No asistió',
};

/* ── Leyenda de colores ───────────────────────────────────────────────
   Los colores de la agenda eran conocimiento tribal: el dueño los aprendía
   preguntando. El ámbar es el peor caso, porque solo existe si el local tiene
   las confirmaciones por WhatsApp activas — quien no las tiene nunca lo ve y
   quien las acaba de activar no sabe qué significa.

   Por eso el bloque de WhatsApp tiene tres caras según el estado real del
   local: explicación (si está activo), empujón a activarlo (si ya lo pagó) o
   la propuesta de valor (si todavía no lo tiene). */
const LEYENDA_ESTADOS = [
  { estado: 'Confirmada', desc: 'La cita está en pie. Es el estado normal de una reserva.' },
  { estado: 'Completada', desc: 'El cliente vino y se atendió. Solo estas suman a la caja del día.' },
  { estado: 'Cancelada',  desc: 'Se anuló y la hora quedó libre para que otro la tome.' },
  { estado: 'NoAsistio',  desc: 'El cliente no llegó y tampoco avisó. Se separa de "Cancelada" para que puedas ver a quién le pasa seguido.' },
];

function LeyendaColores({ tenantId }) {
  const [open, setOpen] = useState(false);
  const [sys, setSys]   = useState(null);   // _system/{tid} → módulo contratado
  const [cfg, setCfg]   = useState(null);   // configuracion/whatsapp → estado operativo

  // Se suscribe solo al abrir: no tiene sentido tener dos listeners vivos por
  // una leyenda que casi nadie despliega.
  useEffect(() => {
    if (!open || !tenantId) return undefined;
    const u1 = onSnapshot(doc(db, '_system', tenantId),
      s => setSys(s.exists() ? s.data() : {}), () => setSys({}));
    const u2 = onSnapshot(doc(db, 'tenants', tenantId, 'configuracion', 'whatsapp'),
      s => setCfg(s.exists() ? s.data() : {}), () => setCfg({}));
    return () => { u1(); u2(); };
  }, [open, tenantId]);

  const confirmOn  = cfg?.confirmacionesEnabled === true;
  // Esta leyenda habla SOLO de confirmaciones, así que el plan que importa es
  // el que las incluye: un local con plan 'bot' no las tiene contratadas.
  // Sin fallback por estadoConexion: tener el número vinculado no es lo mismo
  // que tener el módulo contratado, y con el fallback quitar el plan no se
  // notaba en ningún lado.
  const contratado = incluyeRecordatorios(sys);

  const ctaUrl = `https://wa.me/56983568212?text=${encodeURIComponent(
    'Hola SynapTech, quiero activar las *confirmaciones automáticas por WhatsApp* en mi local para dejar de perder horas por clientes que no llegan. ¿Cómo lo hacemos?',
  )}`;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title="Qué significa cada color"
        className={`h-10 md:h-8 px-3 flex items-center gap-1.5 text-xs font-semibold rounded-xl border transition-colors ${
          open
            ? 'bg-slate-800 text-primary border-neutral-700'
            : 'bg-neutral-900 text-slate-400 border-neutral-800 hover:text-primary hover:bg-slate-800'
        }`}
      >
        <Info size={14} />
        <span className="hidden sm:inline">Colores</span>
      </button>

      {open && (
        <>
          {/* Capa para cerrar al tocar fuera */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[min(92vw,380px)] z-50 rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Qué significa cada color</p>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X size={14} />
              </button>
            </div>

            {LEYENDA_ESTADOS.map(({ estado, desc }) => (
              <div key={estado} className="flex items-start gap-3">
                <span className={`mt-0.5 w-4 h-4 rounded-md border shrink-0 ${STATUS_STYLE[estado]}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200">{STATUS_LABEL[estado]}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}

            {/* ── Ámbar: existe solo con las confirmaciones por WhatsApp ── */}
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 w-4 h-4 rounded-md border shrink-0 ${STATUS_STYLE.Pendiente}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    Pendiente <MessageCircle size={12} className="text-emerald-400" />
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {confirmOn
                      ? 'Le escribimos al cliente por WhatsApp y todavía no responde. Pasa a verde cuando contesta CONFIRMAR; si contesta CANCELAR, la hora se libera sola.'
                      : 'Aparece cuando el cliente aún no confirma su cita por WhatsApp. Hoy no lo verás en tu agenda.'}
                  </p>
                </div>
              </div>

              {!confirmOn && contratado && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3">
                  <p className="text-[11px] text-emerald-200 leading-relaxed">
                    Ya tienes el módulo contratado, solo falta encenderlo. Entra a
                    <span className="font-semibold"> Conexiones → WhatsApp</span> y activa las confirmaciones.
                  </p>
                </div>
              )}

              {!confirmOn && !contratado && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3 space-y-2">
                  <p className="text-[11px] text-emerald-200 leading-relaxed">
                    Con las <span className="font-semibold">confirmaciones automáticas</span> el sistema le escribe
                    al cliente antes de su hora y él responde CONFIRMAR o CANCELAR. La hora que se libera alcanzas
                    a venderla de nuevo, en vez de descubrir el asiento vacío cuando ya es tarde.
                  </p>
                  <a
                    href={ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 text-[11px] font-bold transition-colors"
                  >
                    <MessageCircle size={12} />
                    Quiero activarlo
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function toMins(t) {
  // Null-safe: t puede llegar null/'' desde citas legacy o bloqueos incompletos.
  if (typeof t !== 'string' || !t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/* ── Layout de columnas por solapamiento real ───────────────────
 * Reparte las citas en columnas lado a lado cuando sus rangos de
 * tiempo (inicio + duración) se solapan, NO solo cuando comparten la
 * misma hora exacta. Devuelve [{ cita, colIndex, colTotal }].          */
function computeOverlapLayout(citas) {
  const events = citas
    // Descarta citas sin hora válida — de otro modo toMins() devolvería 0
    // y las apiñaría todas en el mismo slot del amanecer, rompiendo el
    // solapamiento. Mejor no renderizarlas y que el admin las repare.
    .filter(c => typeof c?.hora === 'string' && c.hora.includes(':'))
    .map(c => {
      const start = toMins(c.hora);
      const dur   = Number(c.duracion || c.duracionServicio || 30) || 30;
      return { cita: c, start, end: start + dur };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result = [];
  let cluster    = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const colEnds = []; // hora de término de la última cita en cada columna
    cluster.forEach(ev => {
      let col = colEnds.findIndex(end => end <= ev.start);
      if (col === -1) { col = colEnds.length; colEnds.push(ev.end); }
      else colEnds[col] = ev.end;
      ev.colIndex = col;
    });
    const colTotal = colEnds.length;
    cluster.forEach(ev => result.push({ cita: ev.cita, colIndex: ev.colIndex, colTotal }));
    cluster    = [];
    clusterEnd = -1;
  };

  events.forEach(ev => {
    if (cluster.length && ev.start >= clusterEnd) flush(); // sin solape con el grupo actual
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.end);
  });
  flush();
  return result;
}

/* ── WhatsApp confirmation helpers ──────────────────────────── */
const WA_SHOP_NAMES = {
  elegance:       'Barbería Elegance',
  ferraza:        'Barbería Ferraza',
  chameleon:      'Chameleon Barber Studio',
  mapubarbershop: 'Mapu Barber Shop',
  gitana:         'Gitana Nails Studio',
  deluxeperfumes: 'Deluxe Perfumes',
  lumen:          "D'Jones Barber",
  delnero:        'Del Nero Barber',
  marcelo_hairdressing: 'Marcelo Palma Hairdressing',
};

function buildWaConfirmMsg(tenantId, form, dateStr) {
  const shop = WA_SHOP_NAMES[tenantId] || 'tu negocio';
  const fechaFmt = dateStr
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';
  return (
    `Hola ${form.clienteNombre} 👋, te confirmamos tu cita en *${shop}*:\n\n` +
    `📅 *Fecha:* ${fechaFmt}\n` +
    `⏰ *Hora:* ${form.hora}\n` +
    `✂️ *Servicio:* ${form.servicioNombre}\n` +
    `💈 *Profesional:* ${form.barbero}\n\n` +
    `¡Te esperamos! 🙌`
  );
}

function waPhone(tel) {
  const d = (tel || '').replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('9')) return '56' + d;
  if (d.length === 11 && d.startsWith('56')) return d;
  return d;
}

/* ── Modal shell ─────────────────────────────────────────────── */
// Exportado para que Caja pueda reutilizarlo en el drawer "Vender" sin
// duplicar el shell. Sin `export`, importar Modal desde Caja rompe el bundle.
export function Modal({ title, onClose, children, footer, maxW = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className={`w-full ${maxW} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-confirm-pop`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-primary">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-800 transition-all"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

/* ── CitaModal (create / edit) ───────────────────────────────── */
// Exportado para que Caja lo reutilice en el drawer "Vender". `AgendaCtx`
// tiene default (buildSlotCfg(30)) → funciona sin envolver en el Provider.
export function CitaModal({ cita, barberos, servicios, productos = [], defaultHora, defaultBarberoId, defaultEstado, sobrecupo = false, dateStr, onClose, onComplete }) {
  const { pickerLabels } = useContext(AgendaCtx);
  const isNew = !cita;
  const { id: tenantId } = useTenant();
  const { activeSucursal, sucursalDefault, sucursales: _sucursalesList } = useSucursal();  // para taggear la sede de la cita
  const defaultBarb = defaultBarberoId || barberos[0]?.id || '';
  const firstSvc = servicios[0];

  // Gate opt-in para reabrir una venta cerrada (config del tenant). Si está
  // activo, cambiar el estado de una cita ya Completada pide contraseña.
  const { config: mainConfig } = useConfig();
  const gateVenta = readGateConfig(mainConfig, 'ventaCerrada');
  // Cuando el usuario intenta guardar y aplica el gate, guardamos aquí el
  // "trabajo pendiente" — el modal de contraseña llama a onOk() para continuar.
  const [gatePending, setGatePending] = useState(false);

  // Estado del POS TUU del tenant. Cuando `enabled` es true, el flujo de
  // "Tarjeta" cobra directo por el POS al completar la cita, en vez de
  // marcarse a mano (evita registrar efectivo como tarjeta).
  const [tuuCfg, setTuuCfg] = useState(null);
  useEffect(() => {
    if (!tenantId) return undefined;
    const u = onSnapshot(
      doc(db, '_system', `tuu_${tenantId}`),
      s => setTuuCfg(s.exists() ? s.data() : {}),
      () => setTuuCfg({}),
    );
    return () => u();
  }, [tenantId]);
  const tuuActivo         = !!(tuuCfg?.configured && tuuCfg?.enabled);
  const tuuPermitirManual = tuuActivo && tuuCfg?.permitirTarjetaManual === true;

  const matchedSvc = (() => {
    if (!cita) return null;
    if (cita.servicioId) {
      const found = servicios.find(s => s.id === cita.servicioId);
      if (found) return found;
    }
    if (cita.servicioNombre) {
      const nameL = cita.servicioNombre.toLowerCase().trim();
      const exact = servicios.find(s => s.nombre.toLowerCase().trim() === nameL);
      if (exact) return exact;
      const partial = servicios.find(s => s.nombre.toLowerCase().includes(nameL) || nameL.includes(s.nombre.toLowerCase()));
      if (partial) return partial;
    }
    return null;
  })();

  const initialSvcId = matchedSvc?.id || cita?.servicioId || firstSvc?.id || '';
  const initialSvcNombre = matchedSvc?.nombre || cita?.servicioNombre || firstSvc?.nombre || '';

  // Sobrecupo / horario especial: form.precio siempre representa el "precio base
  // con descuento aplicado" (compat con vistas históricas). El recargo se guarda
  // aparte y se suma al total al persistir (payload.precio = base + recargo),
  // así toda la caja/comisiones lo cobra sin necesitar cambios.
  const initialRecargo = cita?.recargoSobrecupo != null
    ? Number(cita.recargoSobrecupo) || 0
    : (sobrecupo ? (Number(matchedSvc?.recargoSobrecupoDefault ?? firstSvc?.recargoSobrecupoDefault) || 0) : 0);
  // Servicios extra ya guardados (otro servicio en la misma atención, sumado
  // al total). Se restan del precio guardado para recuperar el precio BASE:
  // sin esto, editar una cita con extras duplicaba su monto en cada guardado.
  const extrasIniciales = Array.isArray(cita?.serviciosExtra) ? cita.serviciosExtra : [];
  const totalExtrasIniciales = extrasIniciales.reduce((s, e) => s + (Number(e.precio) || 0), 0);
  const initialBasePrecio = cita?.precioBase != null
    ? Number(cita.precioBase) || 0
    : (cita?.precio != null
        ? Math.max(0, Number(cita.precio) - initialRecargo - totalExtrasIniciales)
        : (Number(matchedSvc?.precio || firstSvc?.precio) || 0));

  const [form, setForm] = useState({
    clienteNombre:   cita?.clienteNombre   || '',
    clienteEmail:    cita?.clienteEmail    || '',
    clienteTelefono: cita?.clienteTelefono || '',
    // El vínculo con la ficha del cliente vive en `clienteUid`/`userId` en casi
    // toda la data (las reservas online y el upsert al guardar escriben ahí);
    // `clienteId` solo lo tienen algunas. Mirar únicamente `clienteId` dejaba
    // el modal "desvinculado" al editar: sin chip Vinculado, sin membresía
    // Corte al Lápiz detectada, y el historial dependiendo de que el teléfono
    // estuviera escrito idéntico.
    clienteId:       cita?.clienteId || cita?.clienteUid || cita?.userId || null,
    servicioId:      initialSvcId,
    servicioNombre:  initialSvcNombre,
    precio:          initialBasePrecio,
    duracion:        Number(cita?.duracion || cita?.duracionServicio || firstSvc?.duracion) || 30,
    barberoId:       cita?.barberoId       || defaultBarb,
    barbero:         cita?.barbero         || barberos.find(b => b.id === defaultBarb)?.nombre || '',
    fecha:           cita?.fecha           || dateStr,
    hora:            cita?.hora            || defaultHora || '09:00',
    estado:          defaultEstado         || cita?.estado || 'Confirmada',
    nota:            cita?.nota            || '',
    // SIN preseleccionar. Venía en 'Efectivo', y como los 4 chips se ven de
    // una, ese quedaba marcado y parecía elegido: quien cerraba una cita a la
    // carrera la dejaba como efectivo aunque el cliente pagara con tarjeta.
    // Eso infla el efectivo esperado y la caja "falta". Pasó en Kronnos
    // Peñablanca (29-jul): dos servicios por $37.980 marcados efectivo sin ser.
    // Una cita que ya tiene método conserva el suyo — esto solo afecta a las
    // nuevas. Al completar se exige elegir (ver handleSave).
    metodoPago:      cita?.metodoPago      || '',
    propina:         cita?.propina != null ? Number(cita.propina) : '',
    porcentajeDescuento: cita?.porcentajeDescuento != null ? Number(cita.porcentajeDescuento) : '',
    cortesia:        cita?.cortesia || false,
    // Consumo de pack — la mayoría de las citas NO son consumo, pero cuando lo
    // son la agenda debe persistir estas marcas para que la CF pack-automatico
    // descuente la sesión. Se hidratan desde la cita al editar, o desde el
    // botón "Usar sesión del pack" del chip de pack activo detectado.
    consumeSesionPack:    !!cita?.consumeSesionPack,
    packRefId:            cita?.packRefId || null,
    packNombre:           cita?.packNombre || null,
    packSesionIndex:      cita?.packSesionIndex ?? null,
    packSesionTotal:      cita?.packSesionTotal ?? null,
    packFechaVencimiento: cita?.packFechaVencimiento || null,
    // ── Caja: vuelto + pagos divididos ─────────────────────────────
    // `montoPagado` = con cuánto pagó el cliente en efectivo (para calcular
    // vuelto en vivo). Solo tiene sentido cuando hay Efectivo involucrado.
    // `pagos` = array `[{tipo, monto}]` cuando el cliente divide (ej: mitad
    // efectivo, mitad débito). NULL cuando es un único método — así las
    // vistas legacy siguen leyendo `metodoPago` (string) sin romper.
    montoPagado:     cita?.montoPagado != null ? Number(cita.montoPagado) : '',
    pagos:           Array.isArray(cita?.pagos) && cita.pagos.length ? cita.pagos : null,
  });
  const [sobrecupoActivo, setSobrecupoActivo] = useState(!!sobrecupo || cita?.sobrecupo === true);
  const [recargoSobrecupo, setRecargoSobrecupo] = useState(initialRecargo);
  const [saving, setSaving] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const [telError, setTelError] = useState(false);
  // Resalta el bloque de método de pago cuando se intentó completar sin elegir.
  const [errorMetodoPago, setErrorMetodoPago] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [gcInput, setGcInput]         = useState(cita?.giftCardCodigo || '');
  const [gcFound, setGcFound]         = useState(null);
  const [gcSearching, setGcSearching] = useState(false);
  const [gcErr, setGcErr]             = useState('');

  /* Servicios extra de la misma cita (ej: pidió barba estando en el sillón).
     Cada uno suma su precio al total; el desglose queda en `serviciosExtra`. */
  const [extras, setExtras] = useState(extrasIniciales);
  const [addingServicio, setAddingServicio] = useState(false);
  const [newServicioId, setNewServicioId] = useState('');

  /* Productos vendidos junto a esta cita */
  const ticketPrev = useMemo(() => Array.isArray(cita?.ticketProductos) ? cita.ticketProductos : [], [cita]);
  const [ticketNuevos, setTicketNuevos]   = useState([]); // [{ productId, nombre, cantidad, precioUnitario, totalLinea }]
  const [addingProducto, setAddingProducto] = useState(false);
  const [newProductId, setNewProductId]   = useState('');
  const [newProductQty, setNewProductQty] = useState(1);
  const [newProductDesc, setNewProductDesc] = useState(0); // % descuento de la línea

  const productosDisponibles = useMemo(() => productos.filter(p => Number(p.precio) > 0), [productos]);

  /* ── Corte al Lápiz (Yūgen): membresía a cuenta corriente del cliente ── */
  const esTenantCL = ['yugen'].includes(tenantId);
  const [clCuentas, setClCuentas] = useState([]);
  const [clRecargo, setClRecargo] = useState(5000);
  const [usarCorteLapiz, setUsarCorteLapiz] = useState(cita?.corteLapiz === true);

  useEffect(() => {
    if (!esTenantCL) return;
    let cancel = false;
    (async () => {
      try {
        const qs = await withTimeout(getDocs(tenantCol('corteLapiz')), 15000, 'agenda/corte-lapiz');
        if (!cancel) setClCuentas(qs.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { /* sin permiso o vacío */ }
      try {
        const cfg = await withTimeout(getDoc(doc(tenantCol('configuracion'), 'corteLapiz')), 10000, 'agenda/cfg-corte-lapiz');
        const r = cfg.exists() ? Number(cfg.data().recargo ?? cfg.data().monto) : NaN;
        if (!cancel && Number.isFinite(r) && r >= 0) setClRecargo(Math.round(r));
      } catch { /* usa default */ }
    })();
    return () => { cancel = true; };
  }, [esTenantCL, tenantId]);

  // Cuenta Corte al Lápiz activa que corresponde a este cliente (por uid o teléfono).
  const clMember = useMemo(() => {
    if (!esTenantCL || !clCuentas.length) return null;
    const tn = (form.clienteTelefono || '').replace(/\D/g, '');
    return clCuentas.find(c => c.activo !== false && (
      (form.clienteId && c.id === form.clienteId) ||
      (tn && c.telefonoNorm === tn)
    )) || null;
  }, [esTenantCL, clCuentas, form.clienteId, form.clienteTelefono]);
  const clFmt = n => '$' + (Number(n) || 0).toLocaleString('es-CL');

  /* ── Descuento de rango (beneficio automático): % según el rango del cliente ── */
  const [rangoDesc, setRangoDesc] = useState(null); // { nombre, pct } | null
  const rangoAplicadoRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const cfgSnap = await withTimeout(getDoc(doc(tenantCol('configuracion'), 'rangos')), 10000, 'agenda/cfg-rangos');
        if (!cfgSnap.exists()) return;
        const rangosCfg = cfgSnap.data().rangos || [];
        // Si ningún rango tiene descuento activo, no hace falta buscar al cliente.
        if (!rangosCfg.some(r => r.descuentoServicios && (Number(r.descuentoPct) || 0) > 0)) return;

        // Sellos históricos del cliente → rango.
        let hist = null;
        if (form.clienteId) {
          const u = await withTimeout(getDoc(doc(tenantCol('users'), form.clienteId)), 10000, 'agenda/user-rango');
          if (u.exists()) hist = Number(u.data().sellosHistoricos ?? u.data().stamps) || 0;
        }
        if (hist == null) {
          const tn = (form.clienteTelefono || '').replace(/\D/g, '');
          if (tn.length >= 8) {
            const c = await withTimeout(getDoc(doc(tenantCol('clientes'), tn)), 10000, 'agenda/cliente-rango');
            if (c.exists()) hist = Number(c.data().sellosHistoricos) || 0;
          }
        }
        if (hist == null) { if (!cancel) setRangoDesc(null); return; }

        const rid = hist >= 25 ? 'platinum' : hist >= 10 ? 'gold' : 'silver';
        const r = rangosCfg.find(x => x.id === rid);
        if (!cancel) {
          setRangoDesc(r && r.descuentoServicios ? { nombre: r.nombre || rid, pct: Number(r.descuentoPct) || 10 } : null);
        }
      } catch { /* sin permiso / sin config → sin descuento de rango */ }
    })();
    return () => { cancel = true; };
  }, [tenantId, form.clienteId, form.clienteTelefono]);

  // Pre-aplica el % del rango al campo de descuento (una vez, solo si está en 0).
  useEffect(() => {
    if (rangoDesc && !rangoAplicadoRef.current && !form.cortesia) {
      const actual = Number(form.porcentajeDescuento) || 0;
      if (actual === 0) {
        rangoAplicadoRef.current = true;
        set('porcentajeDescuento', rangoDesc.pct);
      }
    }
  }, [rangoDesc]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-detección de pack activo del cliente ─────────────────────
     Cuando el barbero está creando/editando la cita, si el cliente
     (por uid o teléfono normalizado) tiene un pack activo con saldo,
     mostramos un chip arriba del formulario con la opción de canjear
     una sesión. Cubre el caso "cliente sin registro al club": el
     banner del flujo público no aparece porque no hay auth, pero
     desde el panel el barbero sí puede identificar al cliente por
     teléfono y aplicar el consumo.

     packDisponible = { pack, servicios: [{svc, restante}], uid } | null */
  const [packDisponible, setPackDisponible] = useState(null);
  useEffect(() => {
    // Si la cita ya trae marcas de consumo (fue armada desde el flujo
    // público o desde este mismo chip), no interferimos.
    if (form.consumeSesionPack) { setPackDisponible(null); return; }
    // Cortesía o Corte al Lápiz tienen su propio flujo — no ofrecemos pack encima.
    if (form.cortesia || usarCorteLapiz) { setPackDisponible(null); return; }

    let cancel = false;
    (async () => {
      try {
        let uid = form.clienteId || cita?.userId || cita?.clienteUid || null;
        if (!uid) {
          const digs = sanitizarTelefonoCL(form.clienteTelefono || '').replace(/\D/g, '');
          if (digs.length >= 11) uid = digs;
        }
        if (!uid) { if (!cancel) setPackDisponible(null); return; }

        let uSnap = await withTimeout(getDoc(doc(tenantCol('users'), uid)), 8000, 'agenda/pack-activo');
        if (!uSnap.exists()) { if (!cancel) setPackDisponible(null); return; }

        // Si el doc está fusionado con otra cuenta (legacy → Auth tras registro
        // al club), seguir el pointer al doc canónico. Sin esto el chip no
        // aparece porque el legacy queda vaciado (packsActivos:[]) tras el merge.
        const fusion = uSnap.data().fusionadoCon;
        if (fusion && fusion !== uid) {
          const canon = await withTimeout(getDoc(doc(tenantCol('users'), fusion)), 8000, 'agenda/pack-activo-canon');
          if (canon.exists()) uSnap = canon;
        }

        const packs = Array.isArray(uSnap.data().packsActivos) ? uSnap.data().packsActivos : [];
        const now = Date.now();
        const activos = packs.filter(p => {
          const rest = Number(p.sesionesRestantes || 0);
          const vencMs = p.fechaVencimiento?.toMillis?.() ?? 0;
          return rest > 0 && (!vencMs || vencMs > now);
        });
        if (activos.length === 0) { if (!cancel) setPackDisponible(null); return; }

        // Renderizamos TODOS los packs activos (no solo el 1er). Poco común
        // pero pasa cuando un cliente compra un pack nuevo antes de agotar
        // el anterior o cuando el barbero le vende un pack extra por
        // temporada. El chip renderiza uno debajo del otro con sus botones
        // "Canjear" propios; el barbero elige de qué pack descontar.
        const packsProcesados = activos.map(p => {
          const incluidosIds = Array.isArray(p.serviciosIncluidos) ? p.serviciosIncluidos : [];
          const restantesPorSvc = p.serviciosRestantes && typeof p.serviciosRestantes === 'object' ? p.serviciosRestantes : null;
          const svcOpts = incluidosIds
            .map(sid => servicios.find(s => s.id === sid))
            .filter(Boolean)
            .map(s => ({
              svc: s,
              restante: restantesPorSvc ? Number(restantesPorSvc[s.id] || 0) : null,
            }));
          return { pack: p, servicios: svcOpts };
        });

        if (!cancel) setPackDisponible({ packs: packsProcesados, uid });
      } catch (e) {
        if (!cancel) setPackDisponible(null);
        // Sin permiso / red / etc. → silencioso.
      }
    })();
    return () => { cancel = true; };
  }, [form.clienteId, form.clienteTelefono, form.consumeSesionPack, form.cortesia, usarCorteLapiz, tenantId, servicios, cita]);

  /* Aplica el consumo de un pack (opcional: para el servicio elegido).
     Setea todas las marcas que la CF pack-automatico necesita para
     descontar la sesión al completar la cita.
     Recibe el pack específico elegido (para el caso de múltiples packs
     activos simultáneos). Si no se pasa, cae al primero. */
  const _canjearPackAgenda = (svcElegido = null, packEspecifico = null) => {
    if (!packDisponible) return;
    const p = packEspecifico || (Array.isArray(packDisponible.packs) ? packDisponible.packs[0]?.pack : null);
    if (!p) return;
    const dur = Number((svcElegido && svcElegido.duracion) || p.duracionSesion) || 30;
    setForm(f => ({
      ...f,
      servicioId:           svcElegido?.id || p.packId,
      servicioNombre:       svcElegido?.nombre || p.nombrePack,
      precio:               0,
      duracion:             dur,
      consumeSesionPack:    true,
      packRefId:            p.packId,
      packNombre:           p.nombrePack,
      packSesionIndex:      Math.max(1, (Number(p.sesionesTotales) || 1) - Number(p.sesionesRestantes || 0) + 1),
      packSesionTotal:      Number(p.sesionesTotales) || 1,
      packFechaVencimiento: p.fechaVencimiento || null,
      cortesia:             false,
      porcentajeDescuento:  '',
      metodoPago:           f.metodoPago === 'Cortesía' ? '' : f.metodoPago,
    }));
  };

  /* Deshace el canje: vuelve al servicio original del pack (o al primero
     del catálogo) con su precio de lista. */
  const _quitarCanjePack = () => {
    setForm(f => ({
      ...f,
      consumeSesionPack:    false,
      packRefId:            null,
      packNombre:           null,
      packSesionIndex:      null,
      packSesionTotal:      null,
      packFechaVencimiento: null,
      // Restaurar precio y duración del servicio del catálogo.
      precio:               Number(servicios.find(s => s.id === f.servicioId)?.precio) || 0,
      duracion:             Number(servicios.find(s => s.id === f.servicioId)?.duracion) || 30,
    }));
  };

  function addProductoAlTicket() {
    const p = productosDisponibles.find(x => x.id === newProductId);
    if (!p || newProductQty <= 0) return;
    const usadosEnNuevos = ticketNuevos
      .filter(n => n.productId === p.id)
      .reduce((s, n) => s + n.cantidad, 0);
    const stockActual = Number(p.stock);
    const stockManaged = !isNaN(stockActual);
    if (stockManaged && newProductQty + usadosEnNuevos > stockActual) {
      alert(`Stock insuficiente. Disponible: ${stockActual - usadosEnNuevos} unidad${stockActual - usadosEnNuevos !== 1 ? 'es' : ''}.`);
      return;
    }
    const precioUnitario = Number(p.precio) || 0;
    const descuento = Math.min(100, Math.max(0, Number(newProductDesc) || 0));
    const subtotalLinea = precioUnitario * Number(newProductQty);
    setTicketNuevos(arr => [...arr, {
      productId: p.id,
      nombre: p.nombre,
      cantidad: Number(newProductQty),
      precioUnitario,
      descuento,
      subtotalLinea,
      totalLinea: Math.round(subtotalLinea * (1 - descuento / 100)),
    }]);
    setNewProductId('');
    setNewProductQty(1);
    setNewProductDesc(0);
    setAddingProducto(false);
  }

  function removeProductoNuevo(idx) {
    setTicketNuevos(arr => arr.filter((_, i) => i !== idx));
  }

  const totalProductosPrev   = ticketPrev.reduce((s, p) => s + (Number(p.precio) || 0), 0);
  const totalProductosNuevos = ticketNuevos.reduce((s, p) => s + p.totalLinea, 0);
  // Cortesía = la atención completa es gratis, extras incluidos (mismo criterio
  // que el recargo de sobrecupo, que también se anula en cortesía).
  const totalExtrasNum = form.cortesia ? 0 : extras.reduce((s, e) => s + (Number(e.precio) || 0), 0);
  const totalTicket          = (Number(form.precio) || 0) + totalExtrasNum + totalProductosPrev + totalProductosNuevos;

  // ── Split de pago + vuelto ─────────────────────────────────────
  // `isSplit` es true cuando el cliente divide el pago en varios métodos.
  // `efectivoDelSplit` es cuánto se cobra en efectivo (para calcular vuelto):
  // en modo single = el total si método=Efectivo, sino 0; en modo split = la
  // suma de las filas Efectivo del array. `sumaSplit` es la suma de todas las
  // filas del split — debe calzar con totalTicket para poder completar la cita.
  const isSplit = Array.isArray(form.pagos) && form.pagos.length >= 1;
  const efectivoDelSplit = isSplit
    ? form.pagos.filter(p => p.tipo === 'Efectivo').reduce((s, p) => s + (Number(p.monto) || 0), 0)
    : (form.metodoPago === 'Efectivo' ? totalTicket : 0);
  const sumaSplit = isSplit
    ? form.pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0)
    : totalTicket;
  const splitOk = !isSplit || Math.abs(sumaSplit - totalTicket) < 1;
  const vuelto = (form.montoPagado !== '' && efectivoDelSplit > 0)
    ? (Number(form.montoPagado) - efectivoDelSplit)
    : null;

  // Helpers de manipulación del array pagos[] — el spread manual evita mutar
  // el estado (React re-render friendly).
  const setPagos = (arr) => set('pagos', arr);
  const setPagoTipo = (idx, tipo) => setPagos(form.pagos.map((p, i) => i === idx ? { ...p, tipo } : p));
  const setPagoMonto = (idx, monto) => setPagos(form.pagos.map((p, i) => i === idx ? { ...p, monto } : p));
  const addPago = () => setPagos([...(form.pagos || []), { tipo: 'Efectivo', monto: Math.max(0, totalTicket - sumaSplit) }]);
  const removePago = (idx) => {
    const next = form.pagos.filter((_, i) => i !== idx);
    setPagos(next.length ? next : null); // 0 filas → volver a modo single
  };

  // Fase 3.A: leer users/ vía el hook (post-cleanup+backfill Firestore está
  // limpio). Antes usábamos useCollection('clientes') mirror que traía docs
  // duplicados con distinto formato de docId (caso Esteban Luengo: 2 mirrors
  // "+56989308316" y "989308316" del mismo humano — el buscador los mostraba
  // como 2 clientes con badges distintos).
  const { data: clientes } = useClubUsers();
  const [fotoFavorita, setFotoFavorita] = useState(null);

  useEffect(() => {
    const email = form.clienteEmail?.trim().toLowerCase();
    if (!email) {
      setFotoFavorita(null);
      return;
    }
    const q = query(tenantCol('servicioFavorito'), where('email', '==', email));
    withTimeout(getDocs(q), 15000, 'agenda/foto-favorita')
      .then(qs => {
        if (!qs.empty) {
          const data = qs.docs[0].data();
          setFotoFavorita(data.adminUrl || data.clienteUrl || null);
        } else {
          setFotoFavorita(null);
        }
      })
      .catch(err => {
        console.warn('[Agenda SF]', err);
        setFotoFavorita(null);
      });
  }, [form.clienteEmail]);

  // Misma lógica que el buscador de la vista Clientes: vive en
  // lib/clienteSearch.js para que no puedan volver a divergir (antes cada
  // uno tenía la suya y la misma consulta daba resultados distintos).
  const suggFicha = useMemo(() => {
    if (!form.clienteNombre.trim()) return [];
    return buscarClientes(clientes, form.clienteNombre, { limite: 8 });
  }, [clientes, form.clienteNombre]);

  // Rescate de los clientes que solo viven dentro de una cita (agendados a
  // mano sin teléfono ni correo → nunca tuvieron ficha en users/). Se pide
  // recién cuando la búsqueda por ficha se queda corta, así la lectura extra
  // no se paga en el caso normal.
  const clientesSinFicha = useClientesSinFicha(
    form.clienteNombre.trim().length >= 3 && suggFicha.length < 3
  );

  const suggestions = useMemo(() => {
    if (!form.clienteNombre.trim()) return [];
    if (!clientesSinFicha.length)   return suggFicha;
    const yaEstan = new Set(suggFicha.map(c => normalizarTexto(c.nombre)));
    const extra   = buscarClientes(clientesSinFicha, form.clienteNombre, { limite: 8 })
      .filter(c => !yaEstan.has(normalizarTexto(c.nombre)));
    return [...suggFicha, ...extra].slice(0, 8);
  }, [suggFicha, clientesSinFicha, form.clienteNombre]);

  const selectCliente = async c => {
    // Sin ficha: el "cliente" es solo el nombre rescatado de una cita vieja.
    // No hay doc que linkear — si le pusiéramos su id inventado, se guardaría
    // en la cita y apuntaría a la nada.
    if (c?._sinFicha) {
      setForm(f => ({ ...f, clienteNombre: c.nombre || '', clienteId: null }));
      setShowSugg(false);
      return;
    }
    // Cliente legacy = migrado de AgendaPro, sin cuenta real en el Club.
    // Solo `uid === id` lo identifica unívocamente (uid generado por la migración
    // == telefono == id del doc). NO usar importedFrom: la dedup lo agrega al doc
    // real como marca histórica → daría falso positivo en clientes ya registrados.
    const esLegacy = !!c?.uid && c?.uid === c?.id;
    setForm(f => ({
      ...f,
      clienteNombre:   c.nombre   || '',
      clienteEmail:    c.email    || '',
      clienteTelefono: c.telefono || '',
      clienteId:       esLegacy ? null : c.id,
    }));
    setShowSugg(false);

    // Si el cliente tiene cuenta registrada (no legacy), enriquecer con datos más completos
    if (c.uid && !esLegacy) {
      try {
        const snap = await withTimeout(getDoc(doc(tenantCol('users'), c.uid)), 10000, 'agenda/user-enrich');
        if (snap.exists()) {
          const u = snap.data();
          setForm(f => ({
            ...f,
            clienteNombre:   u.nombre   || f.clienteNombre,
            clienteEmail:    u.email    || f.clienteEmail,
            clienteTelefono: u.telefono || f.clienteTelefono,
          }));
        }
      } catch (_) {}
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onServicioChange = id => {
    const s = servicios.find(s => s.id === id);
    const basePrice = Number(s?.precio) || 0;
    const pct = Number(form.porcentajeDescuento) || 0;
    const discountedPrice = Math.round(basePrice * (1 - pct / 100));
    setForm(f => ({
      ...f,
      servicioId:     id,
      servicioNombre: s?.nombre   || '',
      precio:         f.cortesia ? 0 : discountedPrice,
      duracion:       Number(s?.duracion) || 30,
    }));
    // Al cambiar de servicio con sobrecupo activo, cargamos el recargo default
    // del nuevo servicio (el barbero puede seguir ajustándolo a mano).
    if (sobrecupoActivo) {
      const defRecargo = Math.max(0, Math.round(Number(s?.recargoSobrecupoDefault) || 0));
      setRecargoSobrecupo(defRecargo);
    }
  };

  const handleDiscountChange = val => {
    const pct = val === '' ? 0 : Math.max(0, Math.min(100, Number(val)));
    const basePrice = Number(servicios.find(s => s.id === form.servicioId)?.precio) || 0;
    const discountedPrice = Math.round(basePrice * (1 - pct / 100));
    setForm(f => ({
      ...f,
      porcentajeDescuento: val === '' ? '' : pct,
      precio: discountedPrice,
    }));
  };

  const onBarberoChange = id => {
    const b = barberos.find(b => b.id === id);
    set('barberoId', id);
    set('barbero', b?.nombre || '');
  };

  // ── Servicios extra ──────────────────────────────────────────────
  const addServicioExtra = () => {
    const s = servicios.find(x => x.id === newServicioId);
    if (!s) return;
    setExtras(prev => [...prev, {
      servicioId: s.id,
      nombre:     s.nombre,
      precio:     Math.round(Number(s.precio) || 0),
      duracion:   Number(s.duracion) || 0,
    }]);
    setNewServicioId('');
    setAddingServicio(false);
  };
  const quitarServicioExtra = idx => setExtras(prev => prev.filter((_, i) => i !== idx));

  const toggleSobrecupo = on => {
    setSobrecupoActivo(on);
    if (on) {
      // Al activar, precargamos el recargo default del servicio actual (si aún es 0).
      const svc = servicios.find(s => s.id === form.servicioId);
      const defRecargo = Math.max(0, Math.round(Number(svc?.recargoSobrecupoDefault) || 0));
      setRecargoSobrecupo(prev => (Number(prev) > 0 ? prev : defRecargo));
    } else {
      setRecargoSobrecupo(0);
    }
  };

  // ── Horas acotadas al turno del profesional elegido ──────────────
  // Si el local abre a las 9 pero el trabajador entra a las 11, ofrecer 9:00
  // no tiene sentido (lo pidió Kronnos). Su jornada ya está guardada en
  // barberos/{id}.horario[díaSemana] desde Equipo → Configurar horario.
  //
  // Es una lista APARTE de `pickerLabels` a propósito: ese sigue
  // representando el rango del LOCAL, y es el que usa `horarioEspecial` más
  // abajo para marcar una cita fuera de turno. Si lo acotáramos, cualquier
  // cita fuera del horario del barbero quedaría marcada como especial.
  //
  // Cae a la lista completa ante cualquier duda —sin barbero elegido, sin
  // horario configurado, día libre, o si el filtro deja el select vacío—
  // porque un desplegable sin horas es peor que uno con horas de más.
  const horasDelBarbero = useMemo(() => {
    const b = barberos.find(x => x.id === form.barberoId);
    const dia = b?.horario?.[String(new Date(form.fecha + 'T12:00:00').getDay())];
    if (!dia || dia.activo === false || !dia.inicio || !dia.fin) return pickerLabels;
    const toMin = t => {
      const [h, m] = String(t).split(':').map(Number);
      return Number.isFinite(h) ? h * 60 + (m || 0) : NaN;
    };
    const ini = toMin(dia.inicio), fin = toMin(dia.fin);
    if (!Number.isFinite(ini) || !Number.isFinite(fin) || fin <= ini) return pickerLabels;
    const dentro = pickerLabels.filter(t => {
      const mm = toMin(t);
      return mm >= ini && mm < fin;
    });
    return dentro.length ? dentro : pickerLabels;
  }, [barberos, form.barberoId, form.fecha, pickerLabels]);

  // Turno del profesional del día, para DECIRLO cuando el desplegable queda
  // acotado. Sin esto, el recorte es invisible: el local ve la agenda vacía a
  // las 10:30, no encuentra esa hora en la lista y concluye que el sistema
  // está fallando — cuando en realidad ese profesional entra a las 11 (caso
  // real: Claudio en Kronnos Limache, sábado 11:00-19:00 con el local abierto
  // desde las 10:30). Solo se muestra si de verdad recorta algo.
  const turnoBarbero = useMemo(() => {
    if (!form.barberoId || horasDelBarbero.length === pickerLabels.length) return null;
    const b = barberos.find(x => x.id === form.barberoId);
    const dia = b?.horario?.[String(new Date(form.fecha + 'T12:00:00').getDay())];
    if (!dia || !dia.inicio || !dia.fin) return null;
    return { nombre: b?.nombre || 'Este profesional', inicio: dia.inicio, fin: dia.fin };
  }, [barberos, form.barberoId, form.fecha, horasDelBarbero, pickerLabels]);

  // Detección de "horario especial": la hora de la cita cae fuera del rango
  // laboral del día (el que arma el select `pickerLabels`). Se persiste como
  // flag adicional para reportes y filtros; no cambia el layout del bloque.
  const horarioEspecial = useMemo(() => {
    if (!sobrecupoActivo) return false;
    if (!form.hora) return false;
    if (!pickerLabels || pickerLabels.length === 0) return false;
    return !pickerLabels.includes(form.hora);
  }, [sobrecupoActivo, form.hora, pickerLabels]);

  const recargoNum   = Math.max(0, Math.round(Number(recargoSobrecupo) || 0));
  const precioBaseNum = Math.max(0, Math.round(Number(form.precio) || 0));
  const precioTotalConRecargo = sobrecupoActivo && !form.cortesia
    ? precioBaseNum + recargoNum
    : precioBaseNum;

  // Atención de cortesía: servicio gratis, pero la visita y el sello se registran igual.
  const toggleCortesia = on => {
    if (on) {
      setForm(f => ({ ...f, cortesia: true, precio: 0, porcentajeDescuento: '', metodoPago: 'Cortesía', propina: '' }));
    } else {
      const base = Number(servicios.find(s => s.id === form.servicioId)?.precio) || 0;
      setForm(f => ({ ...f, cortesia: false, precio: base, metodoPago: f.metodoPago === 'Cortesía' ? '' : f.metodoPago }));
    }
  };

  const buscarGC = async () => {
    const code = gcInput.trim().toUpperCase();
    if (!code) return;
    setGcSearching(true);
    setGcErr('');
    setGcFound(null);
    try {
      const snap = await withTimeout(getDocs(query(tenantCol('giftCards'), where('codigo', '==', code))), 15000, 'agenda/giftcard');
      if (snap.empty) { setGcErr('Código no encontrado'); return; }
      const gc = { id: snap.docs[0].id, ...snap.docs[0].data() };
      const todayStr = new Date().toISOString().slice(0, 10);
      if (gc.estado === 'usada') { setGcErr('Gift card ya fue usada completamente'); return; }
      if (gc.venceEn && gc.venceEn < todayStr) { setGcErr('Gift card vencida'); return; }
      setGcFound(gc);
    } catch { setGcErr('Error al buscar. Intenta nuevamente.'); }
    finally { setGcSearching(false); }
  };

  // Wrapper del click "Guardar": si aplica el gate de venta cerrada, muestra
  // el modal de contraseña antes del guardado real. El gate se activa para
  // CUALQUIER edición de una cita que ya estaba Completada — tanto cambiar
  // el estado (reabrir) como editar precio/método/notas manteniéndola cerrada.
  // Sino el cajero podría "corregir" el precio de una venta ya cerrada sin
  // que descuadre el arqueo, lo que es el mismo problema que reabrirla.
  const attemptSave = () => {
    const yaCompletada = !isNew && cita?.estado === 'Completada';
    if (yaCompletada && gateVenta.enabled && gateVenta.passHash) {
      setGatePending(true);
      return;
    }
    handleSave();
  };

  const handleSave = async () => {
    if (!form.clienteNombre.trim()) return;
    // Guard hora: misma protección que agenda.html — sin esto el panel
    // también podía guardar citas con hora vacía (invisibles en la grilla).
    if (!form.hora || !String(form.hora).includes(':')) return;

    // ── Método de pago obligatorio al COMPLETAR ─────────────────────
    // Solo acá se exige, porque solo acá entra plata: una cita futura no
    // necesita método. Las cortesías quedan exentas (precio 0, no mueven caja).
    // Sin este guard la cita se guardaba con el método preseleccionado y el
    // cierre de caja no cuadraba sin que nadie supiera por qué.
    // Modo split: exige al menos una fila válida con monto > 0. Modo single:
    // exige metodoPago no vacío. La cortesía queda exenta (precio 0).
    if (form.estado === 'Completada' && !form.cortesia && !form.metodoPago && !isSplit) {
      setErrorMetodoPago(true);
      await confirmDialog({
        title: 'Falta el método de pago',
        message: 'Elige con qué pagó el cliente antes de completar la cita. '
          + 'Esta cita suma a la caja del día: sin el dato el cierre no cuadra, '
          + 'y después es difícil reconstruir con qué se pagó.',
        confirmText: 'Entendido',
        cancelText: '',
      });
      return;
    }
    setErrorMetodoPago(false);

    // Split: la suma de los pagos debe calzar EXACTO con el total. Si no,
    // el cierre de caja va a arrastrar el descuadre y va a ser imposible
    // reconstruir qué se cobró.
    if (form.estado === 'Completada' && !form.cortesia && isSplit && !splitOk) {
      await confirmDialog({
        title: 'La suma del pago dividido no calza con el total',
        message: `Total del ticket: $${Math.round(totalTicket).toLocaleString('es-CL')}\n`
          + `Suma de las filas: $${Math.round(sumaSplit).toLocaleString('es-CL')}\n\n`
          + `Diferencia: $${Math.round(totalTicket - sumaSplit).toLocaleString('es-CL')}. `
          + 'Ajusta los montos para que sumen exacto antes de completar la cita.',
        confirmText: 'Entendido',
        cancelText: '',
      });
      return;
    }

    // ── Confirmación explícita si la cita involucra un pack ─────────
    // Se dispara SOLO al pasar de "pendiente" a "Completada" — es el momento
    // en que el motor descuenta/activa. Muestra al barbero exactamente qué
    // va a pasar (activación de N sesiones, o consumo con saldo antes/después)
    // para que no marque Completada por accidente ni olvide marcarla.
    // El modal queda ANTES de setSaving() para no bloquear el botón mientras
    // el barbero decide.
    if (!isNew && form.estado === 'Completada' && cita?.estado !== 'Completada') {
      const svc = servicios.find(s => s.id === form.servicioId)
               || servicios.find(s => (s.nombre || '') === form.servicioNombre);
      // Consumo tiene prioridad sobre activación: si la cita ya trae flags
      // de consumo (reserva pública detectó pack activo y ofreció canjear),
      // NO ofrecemos activar aunque el servicio del catálogo sea `isPack:true`.
      // Esto pasa cuando el mismo servicio es el pack (ej: "3 cortes al mes"):
      // la 1ª cita lo activa, las siguientes 2 lo consumen — todas con el
      // mismo servicioId. Antes el prompt "¿Activar pack?" aparecía en las
      // 3, confundiendo al barbero (creía que se estaba re-activando).
      const esConsumo    = !!cita?.consumeSesionPack && !!cita?.packRefId;
      const esActivacion = !esConsumo && !!(svc && svc.isPack);

      if (esActivacion) {
        const totalSes = Math.max(1, Number(svc.sesionesTotales) || 1);
        const dias     = Math.max(1, Number(svc.diasValidez)     || 30);
        // El diálogo prometía "quedarán N sesiones" sin comprobar que el pack
        // se pudiera acreditar a alguien. Si no hay a quién, se dice — antes
        // el barbero confirmaba, no pasaba nada, y se enteraba días después.
        const uidDestino = resolverUserIdCita({ ...cita, ...form });
        const ok = await confirmDialog(uidDestino ? {
          title: '📦 Activar pack',
          message:
            `Se activará el pack "${svc.nombre}" para ${form.clienteNombre || 'este cliente'}.\n\n` +
            `• ${totalSes} sesiones en total\n` +
            `• Esta cita cuenta como la primera → quedarán ${totalSes - 1} sesiones\n` +
            `• Vence en ${dias} días\n\n` +
            `¿Confirmar activación?`,
          confirmText: 'Activar pack',
          cancelText:  'Volver',
        } : {
          title: '📦 Falta el teléfono del cliente',
          message:
            `El pack "${svc.nombre}" no se le puede acreditar a ${form.clienteNombre || 'este cliente'}: ` +
            `la cita no tiene teléfono ni cuenta asociada, así que no hay a quién cargarle las sesiones.\n\n` +
            `Puedes completar la cita igual, pero el pack NO va a quedar activo.\n\n` +
            `Para que quede: cancela, agrega el teléfono del cliente y vuelve a completarla.`,
          confirmText: 'Completar sin pack',
          cancelText:  'Volver',
        });
        if (!ok) return;
      } else if (esConsumo) {
        const userId = resolverUserIdCita({ ...cita, ...form });
        let antes = null, despues = null, nombrePack = cita?.packNombre || 'Pack';
        if (userId) {
          try {
            const uSnap = await withTimeout(
              getDoc(doc(tenantCol('users'), userId)),
              8000,
              'agenda/pack-check'
            );
            const packs = Array.isArray(uSnap.data()?.packsActivos) ? uSnap.data().packsActivos : [];
            const p = packs.find(pk => pk.packId === cita.packRefId && (pk.sesionesRestantes || 0) > 0);
            if (p) {
              antes      = p.sesionesRestantes;
              despues    = Math.max(0, antes - 1);
              nombrePack = p.nombrePack || nombrePack;
            }
          } catch { /* si falla el fetch, seguimos sin saldo — la tx del motor valida igual */ }
        }
        const saldoMsg = antes !== null
          ? `• Antes: ${antes} ${antes === 1 ? 'sesión' : 'sesiones'}\n• Después: ${despues} ${despues === 1 ? 'sesión' : 'sesiones'}\n\n`
          : '';
        const ok = await confirmDialog({
          title: '📦 Consumir sesión',
          message:
            `Se descontará 1 sesión del pack "${nombrePack}" de ${cita?.clienteNombre || 'este cliente'}.\n\n` +
            saldoMsg +
            `¿Confirmar consumo?`,
          confirmText: 'Descontar sesión',
          cancelText:  'Volver',
        });
        if (!ok) return;
      }
    }

    // ── Cobro REAL vía POS TUU ─────────────────────────────────────────
    // Si el tenant tiene TUU activo y el barbero eligió "Tarjeta (POS)",
    // enviamos el cobro al POS antes de guardar. La cita queda Completada
    // SOLO si TUU confirma; si rechaza/cancela/timeout, abortamos el save.
    // El usuario puede elegir "manual_fallback" desde el modal (solo si el
    // admin habilitó permitirTarjetaManual en Recibir Pagos).
    let metodoPagoOverride = null;
    if (!isNew
        && form.estado === 'Completada'
        && cita?.estado !== 'Completada'
        && !form.cortesia
        && tuuActivo
        && form.metodoPago === 'Tarjeta (POS)') {
      const svcTuu   = servicios.find(s => s.id === form.servicioId)
                    || servicios.find(s => (s.nombre || '') === form.servicioNombre);
      const montoTuu = Number(form.precio) || Number(svcTuu?.precio) || 0;
      const result   = await tuuCobroDialog({
        tenantId,
        citaId:   cita.id,
        cliente:  form.clienteNombre,
        monto:    montoTuu,
        servicio: svcTuu?.nombre || form.servicioNombre || '',
        showManualFallback: tuuPermitirManual,
      });
      if (result === 'manual_fallback') {
        metodoPagoOverride = 'Tarjeta (manual)';
        set('metodoPago', 'Tarjeta (manual)');
      } else if (result !== 'approved') {
        // 'rejected' | 'canceled' | 'timeout' | 'error' → no completamos.
        return;
      }
    }

    // ── Sandbox visual TUU (POS presencial) — SOLO delnero, y solo si NO
    // hay TUU real activo (para no doblar modales). Sirve para demo interno.
    if (!isNew
        && form.estado === 'Completada'
        && cita?.estado !== 'Completada'
        && tenantId === 'delnero'
        && !tuuActivo
        && !form.cortesia) {
      const svcSand   = servicios.find(s => s.id === form.servicioId)
                     || servicios.find(s => (s.nombre || '') === form.servicioNombre);
      const montoSand = Number(form.precio) || Number(svcSand?.precio) || 0;
      const medio     = await tuuSandboxDialog({
        cliente:  form.clienteNombre,
        monto:    montoSand,
        servicio: svcSand?.nombre || form.servicioNombre || '',
      });
      if (medio === 'cancel') return;
      // Sandbox: no persistimos el medio elegido. Continuamos el save normal.
    }

    setSaving(true);
    try {
      // Fecha efectiva de la cita: la del formulario (editable) cae al día visible si quedara vacía.
      const fechaCita = form.fecha || dateStr;
      const payload = { ...form, duracionServicio: form.duracion, fecha: fechaCita, updatedAt: serverTimestamp() };
      if (!payload.clienteId) delete payload.clienteId;
      // Si el modal TUU forzó el fallback manual (POS caído), sobreescribe:
      // el setState de `form.metodoPago` es async y podría no reflejarse aún.
      if (metodoPagoOverride) payload.metodoPago = metodoPagoOverride;

      // ── Pagos divididos ─────────────────────────────────────────
      // Si el cliente dividió el pago, escribimos `pagos[]` normalizado y
      // `metodoPago='Mixto'` para que las vistas legacy (Caja/Comisiones/
      // Metricas) que aún leen el string vean un valor sensato — mientras
      // que las vistas nuevas leen `pagos[]` para el desglose real. Sin
      // split, `pagos` va a null explícito para limpiar valor viejo si el
      // usuario deshabilitó la división al editar.
      if (isSplit) {
        payload.pagos = form.pagos.map(p => ({ tipo: p.tipo, monto: Math.round(Number(p.monto) || 0) }));
        payload.metodoPago = 'Mixto';
      } else {
        payload.pagos = null;
      }

      // Vuelto: solo persistimos si hubo efectivo (para trazabilidad de caja).
      // Si el barbero deshabilitó Efectivo después de anotarlo, limpiamos.
      if (form.montoPagado !== '' && form.montoPagado !== null && efectivoDelSplit > 0) {
        payload.montoPagado     = Math.round(Number(form.montoPagado) || 0);
        payload.vueltoEntregado = Math.max(0, payload.montoPagado - Math.round(efectivoDelSplit));
      } else {
        payload.montoPagado     = null;
        payload.vueltoEntregado = null;
      }

      // Sede de la cita: la del barbero elegido. Si el barbero elegido es un
      // "espejo por authUid" (memoria project_roles_espejo_uid) puede no tener
      // sucursalId — buscamos entonces el hermano canónico por authUid para
      // heredar la sede. Último fallback: sede activa del panel. Sin esto,
      // las citas en tenants multi-sucursal quedaban sin sede en el 66% de
      // los casos (Oren histórico: 39/59 huérfanas antes del backfill).
      if (!payload.sucursalId) {
        const _barb   = barberos.find(b => b.id === payload.barberoId);
        // Espejo → buscar canónico por authUid|uid en el mismo array.
        const _authUid = _barb?.authUid || _barb?.uid;
        const _canon   = !_barb?.sucursalId && _authUid
          ? barberos.find(b => b.id !== _barb.id && (b.authUid === _authUid || b.uid === _authUid) && b.sucursalId)
          : null;
        const _sucId  = _barb?.sucursalId || _canon?.sucursalId || activeSucursal?.id || sucursalDefault?.id || null;
        if (_sucId) {
          payload.sucursalId = _sucId;
          const _suc = (_sucursalesList || []).find(s => s.id === _sucId);
          payload.sucursalNombre = _suc?.nombre || activeSucursal?.nombre || sucursalDefault?.nombre || payload.sucursalNombre || '';
        }
      }

      // Normalización de teléfono: quita espacios/guiones/paréntesis y
      // deriva `clienteTelefonoSuf9` (últimos 9 dígitos) para que la CF
      // sellosTenant resuelva el uid del cliente sin fallar por formato.
      if (payload.clienteTelefono) {
        payload.clienteTelefono = sanitizarTelefonoCL(payload.clienteTelefono);
        const suf9 = sufijo9(payload.clienteTelefono);
        if (suf9) payload.clienteTelefonoSuf9 = suf9;
      }

      // ── Sobrecupo / Horario Especial ─────────────────────────────
      // El recargo se suma AL final (después del descuento) y queda persistido
      // como `precio` (total a cobrar) + desglose separado (precioBase,
      // recargoSobrecupo, precioTotal). Los reportes de caja/comisiones ya
      // leen `precio`, así que cobran el recargo sin cambios extra.
      const basePrecioPersist = Math.max(0, Math.round(Number(form.precio) || 0));
      if (sobrecupoActivo) {
        const recargoPersist = form.cortesia ? 0 : Math.max(0, Math.round(Number(recargoSobrecupo) || 0));
        const totalPersist   = form.cortesia ? 0 : basePrecioPersist + recargoPersist;
        payload.sobrecupo         = true;
        payload.horarioEspecial   = !!horarioEspecial;
        payload.precioBase        = basePrecioPersist;
        payload.recargoSobrecupo  = recargoPersist;
        payload.precioTotal       = totalPersist;
        payload.precio            = totalPersist;   // compat con Caja/Comisiones/Metricas
      } else if (cita?.sobrecupo === true) {
        // Se desmarcó sobrecupo al editar → limpiamos el desglose y dejamos
        // el precio base como total.
        payload.sobrecupo        = false;
        payload.horarioEspecial  = false;
        payload.precioBase       = basePrecioPersist;
        payload.recargoSobrecupo = 0;
        payload.precioTotal      = basePrecioPersist;
        payload.precio           = basePrecioPersist;
      }

      // ── Servicios extra: se suman al TOTAL, mismo criterio que el recargo ──
      // `precio` sigue siendo el total a cobrar (Caja/Comisiones/Métricas ya
      // leen ese campo); el desglose queda en `serviciosExtra` + `precioBase`.
      // Se escribe también cuando quedó vacío (extras.length 0 con iniciales >0)
      // para que QUITAR un extra persista.
      if (extras.length || extrasIniciales.length) {
        const totalExtrasPersist = form.cortesia ? 0 : extras.reduce((s, e) => s + (Number(e.precio) || 0), 0);
        payload.serviciosExtra = extras.map(e => ({
          servicioId: e.servicioId || null,
          nombre:     String(e.nombre || ''),
          precio:     Math.round(Number(e.precio) || 0),
          duracion:   Number(e.duracion) || 0,
        }));
        if (payload.precioBase == null) payload.precioBase = basePrecioPersist;
        payload.precio      = (form.cortesia ? 0 : Math.max(0, Math.round(Number(payload.precio) || 0))) + totalExtrasPersist;
        payload.precioTotal = payload.precio;
      }

      // Corte al Lápiz: si el cliente es miembro y se cobra "a fin de mes",
      // marcamos la cita para que la CF acredite precio + recargo a su cuota.
      const cobrarCorteLapiz = !!clMember && form.estado === 'Completada' && !form.cortesia && usarCorteLapiz;
      if (cobrarCorteLapiz) {
        payload.corteLapiz = true;
        payload.metodoPago = 'Corte al Lápiz';
        payload.clienteUid = clMember.id;
      } else if (cita?.corteLapiz) {
        payload.corteLapiz = false; // se desmarcó: que no acredite
      }
      const applyingGC = !isNew && gcFound && !cita?.giftCardCodigo;
      if (applyingGC) {
        const gcDescuento = Math.min(gcFound.saldo, totalTicket);
        payload.giftCardCodigo    = gcFound.codigo;
        payload.giftCardDescuento = gcDescuento;
      }
      if (isNew) {
        payload.creadoEn = serverTimestamp();
        // Resolver el uid canónico del cliente ANTES de guardar la cita, así
        // clienteId/clienteUid del payload apuntan al doc correcto desde el
        // primer write. Si el CF falla (red/quota), la cita se guarda igual
        // con datos sueltos como antes (backward compat).
        if (!payload.clienteUid) {
          const uidResuelto = await upsertUserDesdeCita(payload);
          if (uidResuelto) {
            payload.clienteUid = uidResuelto;
            payload.clienteId  = uidResuelto;
          }
        }
        // Regla invariante: un sobrecupo NUNCA toma un slotLock público. Así
        // el horario ya reservado por la cita "dueña" del slot sigue siendo
        // la única referencia visible para el flujo de reserva del cliente.
        if (form.barberoId && !sobrecupoActivo) {
          const safeHora = (form.hora || '').replace(':', '');
          const safeBid  = String(form.barberoId).replace(/[^a-zA-Z0-9_-]/g, '_');
          const lockId   = `${safeBid}_${fechaCita}_${safeHora}`;
          const citaRef  = doc(tenantCol('citas'));
          const lockRef  = doc(db, `${tenantCol('slotLocks').path}/${lockId}`);
          const batch    = writeBatch(db);
          batch.set(citaRef, { ...payload, slotLockId: lockId });
          batch.set(lockRef, {
            citaId:    citaRef.id,
            fecha:     fechaCita,
            hora:      form.hora,
            barberoId: form.barberoId,
            duracion:  Number(form.duracion) || 30,
            creadoEn:  serverTimestamp(),
          });
          await batch.commit();
        } else {
          await addDoc(tenantCol('citas'), { ...payload, slotLockId: null });
        }
        onClose();
      } else {
        const yaEraCompletada = cita?.estado === 'Completada';
        if (form.estado === 'Completada' && !yaEraCompletada) {
          payload.pendingGoogleReview = true;
        }

        const citaRef = doc(db, `${tenantCol('citas').path}/${cita.id}`);
        const oldLockId = cita?.slotLockId || null;

        // Calcular el lockId que correspondería al estado nuevo. Un sobrecupo
        // NO toma lock: aunque cambie de hora/barbero, sigue apoyado sobre el
        // lock de la cita "dueña" del slot.
        // NoAsistio libera el slot igual que Cancelada — el cliente no vino, otro
        // puede tomar ese horario si aún no pasó (o queda libre en el histórico).
        const needsLock = form.estado !== 'Cancelada' && form.estado !== 'NoAsistio' && !!form.barberoId && !sobrecupoActivo;
        let nextLockId = null;
        if (needsLock) {
          const safeHora = (form.hora || '').replace(':', '');
          const safeBid  = String(form.barberoId).replace(/[^a-zA-Z0-9_-]/g, '_');
          nextLockId = `${safeBid}_${fechaCita}_${safeHora}`;
        }

        const lockChanged = oldLockId !== nextLockId;
        const hayProductos = ticketNuevos.length > 0;

        // Preparar resumen de productos y agregarlo al payload de la cita
        const productosResumen = [];
        const stockNeeded = {};
        if (hayProductos) {
          ticketNuevos.forEach(n => {
            stockNeeded[n.productId] = (stockNeeded[n.productId] || 0) + n.cantidad;
          });
        }

        if (lockChanged || hayProductos) {
          const batch = writeBatch(db);

          // Productos: crear reservations
          if (hayProductos) {
            ticketNuevos.forEach(n => {
              const reservationRef = doc(tenantCol('product_reservations'));
              batch.set(reservationRef, {
                productId:     n.productId,
                productName:   n.nombre,
                precio:        n.totalLinea,
                subtotal:      n.subtotalLinea ?? n.totalLinea,
                descuento:     n.descuento || 0,
                cantidad:      n.cantidad,
                status:        'delivered',
                userName:      form.clienteNombre || 'Cliente',
                userEmail:     form.clienteEmail  || '',
                // Hereda el método de la cita. NO defaultea a 'Efectivo': si
                // la cita no tiene método, la venta queda sin él y Caja la
                // excluye del efectivo esperado en vez de inventar plata en el
                // cajón. Al completar ya se exige elegir, así que en la
                // práctica siempre llega con valor.
                ...(form.metodoPago ? { metodoPago: form.metodoPago } : {}),
                barberoId:     form.barberoId,
                barberoNombre: form.barbero,
                citaId:        cita.id,
                fecha:         fechaCita,
                createdAt:     serverTimestamp(),
                updatedAt:     serverTimestamp(),
                // Misma sede que la cita (aísla la venta por sucursal).
                ...(payload.sucursalId ? { sucursalId: payload.sucursalId, sucursalNombre: payload.sucursalNombre } : {}),
              });
              productosResumen.push({
                productId:     n.productId,
                nombre:        n.nombre,
                cantidad:      n.cantidad,
                precio:        n.totalLinea,
                subtotal:      n.subtotalLinea ?? n.totalLinea,
                descuento:     n.descuento || 0,
                reservationId: reservationRef.id,
              });
            });

            // Descontar stock una sola vez por producto
            Object.entries(stockNeeded).forEach(([pid, qty]) => {
              const p = productos.find(x => x.id === pid);
              if (!p) return;
              const stockActual = Number(p.stock);
              if (isNaN(stockActual)) return;
              const newStock = Math.max(0, stockActual - qty);
              batch.update(doc(tenantCol('productos'), pid), { stock: newStock });
            });

            payload.ticketProductos = [...ticketPrev, ...productosResumen];
          }

          if (lockChanged) payload.slotLockId = nextLockId;
          batch.update(citaRef, payload);

          if (lockChanged && oldLockId) {
            batch.delete(doc(db, `${tenantCol('slotLocks').path}/${oldLockId}`));
          }
          if (lockChanged && nextLockId) {
            batch.set(doc(db, `${tenantCol('slotLocks').path}/${nextLockId}`), {
              citaId:    cita.id,
              fecha:     fechaCita,
              hora:      form.hora,
              barberoId: form.barberoId,
              duracion:  Number(form.duracion) || 30,
              creadoEn:  serverTimestamp(),
            });
          }

          await batch.commit();
          if (hayProductos) setTicketNuevos([]);
        } else {
          await updateDoc(citaRef, payload);
        }
        // Consolidar el cliente en users/. Idempotente y fire-and-forget: si
        // el user ya existía no toca nada crítico, solo actualiza campos
        // vacíos. Es especialmente relevante acá porque al pasar la cita a
        // Completada el motor de packs necesita el doc para acreditar.
        upsertUserDesdeCita({ ...cita, ...payload });

        if (applyingGC) {
          const gcDescuento = Math.min(gcFound.saldo, totalTicket);
          const nuevoSaldo  = Math.max(0, gcFound.saldo - gcDescuento);
          await updateDoc(doc(db, `${tenantCol('giftCards').path}/${gcFound.id}`), {
            saldo: nuevoSaldo,
            estado: nuevoSaldo <= 0 ? 'usada' : 'parcial',
            ultimoUso: serverTimestamp(),
          }).catch(() => {});
        }

        // Motor de packs: DESACTIVADO en el cliente.
        //
        // Antes corría acá `procesarPackDeCita` en paralelo con la CF
        // `pack-automatico` (server-side). Los dos leían el mismo doc
        // users/{uid}.packsActivos[] y competían por escribir; el último
        // en llegar pisaba al anterior.
        //
        // Este motor cliente-side NUNCA recibió la lógica de mapa por
        // servicio (serviciosRestantes) que la CF sí tiene → cuando el
        // cliente ganaba la carrera, el mapa NO se decrementaba y quedaba
        // desincronizado (ej. barba consumida pero `barba` en el mapa
        // seguía intacta, permitiendo un canje extra).
        //
        // La CF es idempotente (packProcesado + citasConsumo array) y
        // dispara automático al completarse la cita, así que no hace
        // falta procesar acá. Si la CF no existiera (elegance root en
        // otra época), la reactivación de este bloque debería sincronizar
        // primero la lógica de mapa por servicio.
        // TODO: eliminar `procesarPackDeCita` y helpers cuando estemos
        // seguros que la CF cubre el 100% de los tenants activos.

        if (form.estado === 'Completada' && !yaEraCompletada && onComplete) {
          onComplete({ ...cita, ...payload });
        } else {
          onClose();
        }
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!(await confirmDialog('¿Eliminar esta cita?'))) return;
    if (cita.slotLockId) {
      const batch = writeBatch(db);
      batch.delete(doc(db, `${tenantCol('citas').path}/${cita.id}`));
      batch.delete(doc(db, `${tenantCol('slotLocks').path}/${cita.slotLockId}`));
      await batch.commit();
    } else {
      await deleteDoc(doc(db, `${tenantCol('citas').path}/${cita.id}`));
    }
    onClose();
  };

  const field = 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors';
  const lbl   = 'block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5';
  const section     = 'bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-3';
  const sectionHead = 'text-[10px] font-bold uppercase tracking-widest text-slate-500';

  return (
    <Modal
      title={isNew ? (sobrecupo ? 'Nuevo sobrecupo' : 'Nueva cita') : 'Editar cita'}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {!isNew && (
            <button onClick={handleDelete} className="shrink-0 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
              <Trash2 size={16} />
            </button>
          )}
          <div className="hidden sm:block sm:flex-1" />
          <button onClick={onClose} className="shrink-0 px-4 py-2.5 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
          {/* El botón nombra el resultado: si la cita se va a cerrar, lo dice.
              Un "Guardar" neutro no le confirmaba al usuario que la acción
              que buscaba (dar por terminada la cita) era la correcta. */}
          <button onClick={attemptSave} disabled={saving || !form.clienteNombre || !form.hora}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-primary text-sm font-semibold rounded-lg transition-all">
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : (!isNew && form.estado === 'Completada' && <Check size={15} className="shrink-0" />)}
            {isNew
              ? 'Crear cita'
              : (form.estado === 'Completada' ? 'Completar cita' : 'Guardar')}
          </button>
        </div>
      }
    >
      {/* ═══ BLOQUE 1 · DATOS DEL CLIENTE ═══ */}
      <div className={section}>
        <p className={sectionHead}>Datos del cliente</p>

        {/* Nombre — full width con dropdown de sugerencias */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <label className={`${lbl} !mb-0`}>Nombre del cliente *</label>
            {/* Botón para ver historial completo del cliente. Habilitado apenas hay
                nombre + algún identificador (tel/email/clienteId) para poder consultar. */}
            {(form.clienteNombre?.trim() && (form.clienteId || form.clienteTelefono || form.clienteEmail)) && (
              <button
                type="button"
                onClick={() => setHistorialOpen(true)}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded-md hover:bg-slate-800"
                title="Ver historial completo del cliente"
              >
                <History size={12} />
                Historial
              </button>
            )}
          </div>
          <div className="relative">
            <input
              className={field}
              placeholder="Busca un cliente o escribe el nombre…"
              value={form.clienteNombre}
              onChange={e => { setForm(f => ({ ...f, clienteNombre: e.target.value, clienteId: null })); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              autoComplete="off"
            />
            {form.clienteId && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold pointer-events-none">
                <User size={10} />
                Vinculado
              </span>
            )}
          </div>
          {showSugg && suggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
              {suggestions.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => selectCliente(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <User size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-primary font-medium truncate">{c.nombre}</p>
                    {c.telefono && <p className="text-xs text-slate-500 truncate">{c.telefono}</p>}
                  </div>
                  {(() => {
                    // Sin ficha: existe solo dentro de una cita anterior. Se
                    // avisa para que se entienda por qué no trae ni teléfono
                    // ni historial.
                    if (c._sinFicha) return <span className="text-[10px] text-slate-500 font-semibold shrink-0">Sin ficha</span>;
                    const esLegacy = !!c.uid && c.uid === c.id;
                    if (esLegacy) return <span className="text-[10px] text-amber-400/80 font-semibold shrink-0">Migrado</span>;
                    if (c.uid)    return <span className="text-[10px] text-emerald-500/80 font-semibold shrink-0">Club</span>;
                    return null;
                  })()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chip Corte al Lápiz */}
        {clMember && (
          <div className="flex items-center gap-2.5 p-3 bg-amber-500/5 border border-amber-500/30 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
              <BadgeCheck size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-400">Cliente Corte al Lápiz</p>
              <p className="text-[11px] text-slate-400">Cuota actual: {clFmt(clMember.saldo)} · paga a fin de mes</p>
            </div>
          </div>
        )}

        {/* Foto de referencia */}
        {fotoFavorita && (
          <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-slate-700">
              <img src={fotoFavorita} alt="Foto favorita" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none">📸 Estilo de Referencia</p>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">El cliente cargó una foto favorita para su servicio.</p>
            </div>
            <a
              href={fotoFavorita}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-primary rounded-lg transition-colors border border-slate-700 shrink-0"
            >
              Ver grande
            </a>
          </div>
        )}

        {/* Grid: Teléfono (con addon WhatsApp) + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>
              Teléfono
              {form.estado === 'Completada' && <span className="ml-1 text-amber-400 normal-case font-normal">— req. sello</span>}
            </label>
            <div className={`flex rounded-lg border ${telError ? 'border-red-500 focus-within:border-red-400' : 'border-slate-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500'} overflow-hidden bg-slate-900 transition-colors`}>
              <input
                className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none"
                type="tel"
                inputMode="tel"
                placeholder="+569..."
                value={form.clienteTelefono}
                onChange={e => { set('clienteTelefono', e.target.value); if (telError) setTelError(false); }}
              />
              {form.clienteTelefono && (
                <a
                  href={`https://wa.me/${waPhone(form.clienteTelefono)}?text=${encodeURIComponent(buildWaConfirmMsg(tenantId, form, form.fecha || dateStr))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Enviar confirmación por WhatsApp"
                  className="flex items-center justify-center px-3 bg-emerald-600 hover:bg-emerald-500 text-primary transition-colors border-l border-emerald-700 shrink-0"
                >
                  <MessageSquare size={15} />
                </a>
              )}
            </div>
            {telError && (
              <p className="mt-1 text-xs text-red-400 font-semibold">El teléfono es obligatorio para registrar el sello.</p>
            )}
          </div>
          <div>
            <label className={lbl}>Email</label>
            <input className={field} type="email" inputMode="email" placeholder="juan@email.com" value={form.clienteEmail} onChange={e => set('clienteEmail', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ═══ BLOQUE 2 · DETALLES DE LA CITA ═══ */}
      <div className={section}>
        <p className={sectionHead}>Detalles de la cita</p>

        <div>
          <label className={lbl}>Servicio</label>
          <Select
            className={field}
            ariaLabel="Servicio"
            value={form.servicioId}
            onChange={onServicioChange}
            placeholder={servicios.length ? '— elegir —' : 'Sin servicios'}
            options={servicios.map(s => ({
              value: s.id,
              label: s.nombre,
              hint:  s.soloStaff ? '🔒 interno' : undefined,
            }))}
          />
        </div>

        {/* Servicios extra: otro servicio en la misma atención, sumado al total */}
        {(extras.length > 0 || servicios.length > 1) && (
          <div className="space-y-1.5 -mt-1">
            {extras.map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-900/60 border border-slate-700/70 rounded-lg text-xs">
                <span className="text-slate-200 truncate flex-1">
                  <span className="text-emerald-400/80 mr-1.5">+</span>{e.nombre}
                </span>
                <span className="text-emerald-400 font-bold font-mono shrink-0">${Math.round(Number(e.precio) || 0).toLocaleString('es-CL')}</span>
                <button
                  type="button"
                  onClick={() => quitarServicioExtra(i)}
                  className="text-rose-400/70 hover:text-rose-400 shrink-0 p-0.5"
                  title="Quitar servicio extra"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {addingServicio ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    className={field}
                    ariaLabel="Servicio extra"
                    value={newServicioId}
                    onChange={setNewServicioId}
                    placeholder="— elegir servicio —"
                    options={servicios
                      .filter(s => s.id !== form.servicioId)
                      .map(s => ({ value: s.id, label: `${s.nombre} · $${(Number(s.precio) || 0).toLocaleString('es-CL')}` }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={addServicioExtra}
                  disabled={!newServicioId}
                  className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shrink-0"
                >
                  Sumar
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingServicio(false); setNewServicioId(''); }}
                  className="p-2 text-slate-400 hover:text-slate-200 shrink-0"
                  title="Cancelar"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingServicio(true)}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                + Agregar otro servicio
              </button>
            )}
            {form.cortesia && extras.length > 0 && (
              <p className="text-[10px] text-amber-300/80">Cortesía activa: los servicios extra tampoco se cobran.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Fecha</label>
            <input className={field} type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>
              Hora
              {sobrecupoActivo && <span className="ml-1 normal-case font-normal text-amber-400/80">— libre</span>}
            </label>
            {sobrecupoActivo ? (
              <input
                className={field}
                type="time"
                step="900"
                value={form.hora}
                onChange={e => set('hora', e.target.value)}
              />
            ) : (
              <Select
                className={field}
                ariaLabel="Hora"
                value={form.hora}
                onChange={v => set('hora', v)}
                options={(horasDelBarbero.includes(form.hora) ? horasDelBarbero : [form.hora, ...horasDelBarbero].filter(Boolean))
                  .map(t => ({ value: t, label: t }))}
              />
            )}
          </div>
        </div>

        {/* Por qué faltan horas en el desplegable. Sin este aviso el recorte
            es invisible y se lee como una falla del sistema. */}
        {turnoBarbero && !sobrecupoActivo && (
          <p className="text-[11px] text-slate-500 leading-relaxed -mt-1 flex items-start gap-1.5">
            <Clock size={11} className="shrink-0 mt-0.5 text-slate-600" />
            <span>
              Solo se ofrecen horas del turno de <b className="text-slate-400">{turnoBarbero.nombre}</b> hoy
              ({turnoBarbero.inicio}–{turnoBarbero.fin}). Para agendarle fuera de su turno, activa <b className="text-amber-400/90">Sobrecupo</b>.
            </span>
          </p>
        )}
        {form.fecha && form.fecha !== dateStr && (
          <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1 -mt-1">
            <CalendarDays size={11} /> La cita se moverá al {new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}.
          </p>
        )}

        <div>
          <label className={lbl}>Barbero</label>
          <Select
            className={field}
            ariaLabel="Barbero"
            value={form.barberoId}
            onChange={onBarberoChange}
            options={barberos.map(b => ({ value: b.id, label: b.nombre }))}
          />
        </div>

        {/* Estado: antes era un <select> genérico metido al lado de "Barbero".
            Cerrar la cita es LA acción del día y quedaba escondida detrás de
            un desplegable — los locales no encontraban cómo completarla.
            Ahora los 4 estados se ven de una y se cambian con un toque, con
            los mismos colores que la grilla de la agenda. */}
        {!isNew && (
          <div>
            <label className={lbl}>Estado de la cita</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { v: 'Confirmada', txt: 'Confirmada', on: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300' },
                { v: 'Completada', txt: 'Completada', on: 'bg-blue-500/20 border-blue-500/60 text-blue-300' },
                { v: 'Cancelada',  txt: 'Cancelada',  on: 'bg-red-500/15 border-red-500/50 text-red-300' },
                { v: 'NoAsistio',  txt: 'No asistió', on: 'bg-rose-500/15 border-rose-500/50 text-rose-300' },
              ].map(o => {
                const activo = form.estado === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => set('estado', o.v)}
                    aria-pressed={activo}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                      activo ? o.on : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {activo && <Check size={13} className="shrink-0" />}
                    {o.txt}
                  </button>
                );
              })}
            </div>
            {form.estado === 'Completada' && (
              <p className="text-[11px] text-blue-300/80 mt-2 leading-relaxed">
                Al guardar, la cita queda cerrada: cuenta para las métricas del día, suma la comisión del barbero y le entrega el sello al cliente.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ═══ CHIP DE PACK ACTIVO DETECTADO ═══
          Se muestra cuando el cliente (por uid o teléfono) tiene un pack
          activo en users/{uid}.packsActivos[] con saldo > 0 y no vencido.
          Fundamental para el flujo "sin registro": el flujo público del
          cliente no puede identificarlo sin login, así que el barbero
          canjea desde acá. */}
      {packDisponible && !form.consumeSesionPack && Array.isArray(packDisponible.packs) && packDisponible.packs.map((packInfo, packIdx) => {
        const p = packInfo.pack;
        const rest = Number(p.sesionesRestantes || 0);
        const total = Number(p.sesionesTotales || rest);
        const opciones = packInfo.servicios.length > 0
          ? packInfo.servicios
          : [{ svc: null, restante: null }]; // fallback: pack sin serviciosIncluidos
        const hayMultiplesPacks = packDisponible.packs.length > 1;
        return (
          <div key={p.citaActivacion || packIdx} className="rounded-xl border border-violet-500/40 bg-violet-500/[0.08] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(167,139,250,0.20)' }}>
                <span className="text-xl leading-none" aria-hidden="true">📦</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
                  Pack activo detectado{hayMultiplesPacks ? ` · ${packIdx + 1} de ${packDisponible.packs.length}` : ''}
                </p>
                <p className="text-sm font-bold text-primary truncate">{p.nombrePack}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Le quedan <b className="text-primary">{rest}</b> de {total} sesión{total !== 1 ? 'es' : ''} · Vence {p.fechaVencimiento?.toDate ? p.fechaVencimiento.toDate().toLocaleDateString('es-CL') : 'sin fecha'}
                </p>
              </div>
            </div>
            {packIdx === 0 && (
              <p className="text-[11.5px] text-slate-400 leading-snug">
                Este cliente pagó un pack. Podés canjear una sesión ahora — la cita se guarda en $0 y descuenta del saldo al completarla.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {opciones.map(({ svc, restante }, i) => {
                const agotado = restante !== null && restante <= 0;
                const nombre = svc?.nombre || p.nombrePack;
                const saldoTxt = restante === null ? '' : (agotado ? ' · Sin sesiones' : ` · ${restante} disponible${restante !== 1 ? 's' : ''}`);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={agotado}
                    onClick={() => _canjearPackAgenda(svc, p, packInfo)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${agotado
                      ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed'
                      : 'bg-violet-500/15 text-violet-100 border-violet-500/40 hover:bg-violet-500/25'
                    }`}
                  >
                    <span className="truncate">
                      Canjear · <span className="font-normal opacity-90">{nombre}</span>
                      {saldoTxt && <span className="text-[10.5px] opacity-80">{saldoTxt}</span>}
                    </span>
                    <span aria-hidden="true">{agotado ? '—' : '→'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ═══ CHIP DE CANJE APLICADO ═══
          Cuando el barbero ya tocó "Canjear", cambiamos el chip anterior
          por este que resume qué se está por consumir y ofrece deshacer. */}
      {form.consumeSesionPack && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.20)' }}>
            <span className="text-lg leading-none" aria-hidden="true">✓</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Consumo de pack aplicado</p>
            <p className="text-[12.5px] text-slate-300 mt-0.5">
              <b className="text-primary">{form.servicioNombre}</b> · Sesión {form.packSesionIndex || '?'}/{form.packSesionTotal || '?'} · Precio $0
            </p>
          </div>
          <button type="button" onClick={_quitarCanjePack} className="shrink-0 text-[11px] font-semibold text-emerald-200 hover:text-white underline underline-offset-2">
            Deshacer
          </button>
        </div>
      )}

      {/* ═══ BLOQUE 3 · FINANZAS Y NOTAS ═══ */}
      <div className={section}>
        <p className={sectionHead}>Finanzas y notas</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Precio ($)</label>
            <input className={`${field} disabled:opacity-50 disabled:cursor-not-allowed`} type="number" inputMode="numeric" placeholder="Precio" value={form.precio} disabled={form.cortesia} onChange={e => set('precio', Number(e.target.value))} />
          </div>
          <div>
            <label className={lbl}>Descuento (%)</label>
            <input className={`${field} disabled:opacity-50 disabled:cursor-not-allowed`} type="number" inputMode="numeric" placeholder="0" min="0" max="100" value={form.porcentajeDescuento || ''} disabled={form.cortesia} onChange={e => handleDiscountChange(e.target.value)} />
          </div>
        </div>

        {/* Aviso: precio $0 sin marcar cortesía.
            Antes se registraban "cortesías a mano" bajando el precio a 0 sin
            tildar el checkbox → Métricas/Comisiones no las distinguían de un
            servicio pago que quedó en $0 por error. Ahora avisamos y ofrecemos
            marcarla como cortesía de un click.
            NO mostrar el aviso si la cita es consumo de un pack (ahí el $0
            es legítimo: el pack lo cubre) ni si es venta de un pack activador
            (esas se cobran, pero acá el `precio` puede ser el del pack). */}
        {Number(form.precio) === 0 && !form.cortesia && Number(form.porcentajeDescuento) < 100 && !cita?.consumeSesionPack && !cita?.esActivacionPack && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/[0.08]">
            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1 text-[12px] leading-snug text-amber-200">
              <p className="font-semibold text-amber-100">Precio $0 sin marcar cortesía</p>
              <p className="mt-0.5 text-amber-200/85">
                Si el cliente no pagó porque es cortesía (ej: 2° corte del mes), marcala como <b>Cortesía</b> abajo. Así queda registrada correctamente y no aparece como servicio con precio $0 en los reportes.
              </p>
              <button
                type="button"
                onClick={() => toggleCortesia(true)}
                className="mt-2 text-[11px] font-semibold text-amber-100 underline underline-offset-2 hover:text-white"
              >
                Marcar como cortesía →
              </button>
            </div>
          </div>
        )}

        {/* Rango descuento chip */}
        {rangoDesc && !form.cortesia && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/25 text-[11px] text-emerald-300">
            <BadgeCheck size={13} className="shrink-0" />
            <span>Rango <b className="text-primary">{rangoDesc.nombre}</b> · {rangoDesc.pct}% de descuento en servicios{(Number(form.porcentajeDescuento) || 0) >= rangoDesc.pct ? ' aplicado' : ' (ajustable arriba)'}</span>
          </div>
        )}

        {/* Toggle Sobrecupo — fila propia tipo interruptor clickeable */}
        <button
          type="button"
          onClick={() => toggleSobrecupo(!sobrecupoActivo)}
          className={`flex items-center justify-between w-full p-3 rounded-lg border transition-colors ${
            sobrecupoActivo
              ? 'bg-amber-500/10 border-amber-500/40'
              : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Zap size={14} className={sobrecupoActivo ? 'text-amber-400' : 'text-slate-500'} />
            <span className={`text-sm font-semibold ${sobrecupoActivo ? 'text-amber-300' : 'text-slate-300'}`}>
              Sobrecupo / Horario Especial
            </span>
          </span>
          <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${sobrecupoActivo ? 'bg-amber-500' : 'bg-slate-700'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${sobrecupoActivo ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>
        {sobrecupoActivo && !form.cortesia && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.05] p-3 space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-amber-300/90">
              <AlertTriangle size={13} className="shrink-0" />
              <span>Se cobra un recargo extra por atender fuera de tu turno normal o encima de otra cita.</span>
            </div>
            <div className="grid grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Precio base</label>
                <div className="px-2.5 py-2 rounded-lg bg-slate-800/70 border border-slate-700 text-sm text-slate-200 font-mono">
                  ${precioBaseNum.toLocaleString('es-CL')}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-300/80 mb-1">Recargo (+$)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-2 text-sm text-amber-200 font-mono focus:outline-none focus:border-amber-400"
                  value={recargoSobrecupo}
                  onChange={e => setRecargoSobrecupo(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-emerald-300/80 mb-1">Total</label>
                <div className="px-2.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-sm text-emerald-200 font-mono font-bold">
                  ${precioTotalConRecargo.toLocaleString('es-CL')}
                </div>
              </div>
            </div>
            {horarioEspecial && (
              <p className="text-[11px] text-amber-300/90 flex items-center gap-1">
                <Zap size={11} /> Horario especial: <b>{form.hora}</b> cae fuera del turno normal del día.
              </p>
            )}
          </div>
        )}

        {!isNew && (
          <>
          {form.estado === 'Completada' && (
            <>
            {/* Atención de cortesía (gratis) */}
            <label className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800/80 rounded-xl cursor-pointer animate-in fade-in slide-in-from-top-1 duration-200">
              <input
                type="checkbox"
                checked={form.cortesia}
                onChange={e => toggleCortesia(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-semibold text-primary">Atención de cortesía (gratis)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">No se cobra el servicio, pero la visita y el sello se registran igual. Usar solo en casos puntuales.</p>
              </div>
            </label>

            {/* Cobro a Corte al Lápiz (solo clientes miembros) */}
            {clMember && !form.cortesia && (
              <label className="flex items-start gap-3 p-3 bg-slate-950 border border-amber-500/30 rounded-xl cursor-pointer animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="checkbox"
                  checked={usarCorteLapiz}
                  onChange={e => setUsarCorteLapiz(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-sm font-semibold text-primary">Cobrar a Corte al Lápiz (pago a fin de mes)</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">No se cobra ahora. Se suma el servicio + recargo a su cuenta corriente.</p>
                </div>
              </label>
            )}

            {form.cortesia ? (
              <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded-xl text-[11px] text-amber-300/90 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                Servicio gratuito: $0 en caja. Se cuenta la visita y se entrega el sello al cliente (el teléfono es obligatorio para registrarlo).
              </div>
            ) : (
            <>
            {usarCorteLapiz ? (
              <div className="p-3 bg-amber-400/5 border border-amber-400/30 rounded-xl text-[12px] text-amber-300/90 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                Se cargará a la cuenta de <b className="text-primary">{form.clienteNombre || 'el cliente'}</b>: {clFmt(Number(form.precio) || 0)} + {clFmt(clRecargo)} de recargo = <b className="text-primary">{clFmt((Number(form.precio) || 0) + clRecargo)}</b>. No se cobra ahora; lo paga a fin de mes.
              </div>
            ) : (
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Método de pago: antes era un <select> (persiana) que obligaba
                  a un tap extra para ver las opciones. Ahora los 4 métodos se
                  ven de una — misma mecánica que el "Estado de la cita" para
                  que la UI sea uniforme. Colores propios por método (verde=cash,
                  sky=débito, violeta=crédito, ámbar=transf.) para diferenciar
                  y no confundirlo con el bloque de Estado. */}
              <div>
                <label className={lbl}>
                  Método de Pago *
                  {errorMetodoPago && (
                    <span className="ml-2 normal-case font-semibold text-rose-400">— elige uno</span>
                  )}
                </label>
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${
                  errorMetodoPago ? 'ring-1 ring-rose-500/60 rounded-lg p-1 -m-1' : ''}`}>
                  {(tuuActivo
                    ? [
                        { v: 'Efectivo',       txt: 'Efectivo',      on: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300' },
                        { v: 'Tarjeta (POS)',  txt: 'Tarjeta (POS)', on: 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300' },
                        { v: 'Transferencia',  txt: 'Transferencia', on: 'bg-amber-500/20 border-amber-500/60 text-amber-300' },
                        ...(tuuPermitirManual
                          ? [{ v: 'Tarjeta (manual)', txt: 'Tarjeta manual', on: 'bg-slate-500/25 border-slate-400/60 text-slate-200' }]
                          : []),
                      ]
                    : [
                        { v: 'Efectivo',      txt: 'Efectivo',      on: 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300' },
                        { v: 'Débito',        txt: 'Débito',        on: 'bg-sky-500/20 border-sky-500/60 text-sky-300' },
                        { v: 'Crédito',       txt: 'Crédito',       on: 'bg-violet-500/20 border-violet-500/60 text-violet-300' },
                        { v: 'Transferencia', txt: 'Transferencia', on: 'bg-amber-500/20 border-amber-500/60 text-amber-300' },
                      ]
                  ).map(o => {
                    const activo = form.metodoPago === o.v;
                    return (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => { setErrorMetodoPago(false); set('metodoPago', o.v); }}
                        aria-pressed={activo}
                        className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                          activo ? o.on : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        }`}
                      >
                        {activo && <Check size={13} className="shrink-0" />}
                        {o.txt}
                      </button>
                    );
                  })}
                </div>
                {form.metodoPago === 'Tarjeta' && (
                  <p className="text-[10px] text-slate-500 mt-1.5 italic">
                    Método legacy &quot;Tarjeta&quot; — elige Débito o Crédito para reemplazarlo.
                  </p>
                )}

                {/* ── Toggle: dividir pago en varios métodos ────────────── */}
                <label className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 accent-emerald-500"
                    checked={isSplit}
                    onChange={e => {
                      if (e.target.checked) {
                        // Arranca con una sola fila igual al método actual (o Efectivo)
                        // por el total del ticket — así el barbero solo ajusta y agrega.
                        setPagos([{ tipo: form.metodoPago || 'Efectivo', monto: Math.round(totalTicket) }]);
                      } else {
                        setPagos(null);
                      }
                    }}
                  />
                  Dividir pago en varios métodos (efectivo + tarjeta, etc.)
                </label>

                {/* Filas del split — solo cuando isSplit */}
                {isSplit && (
                  <div className="mt-2 space-y-2 p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                    {form.pagos.map((p, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className={`${field} flex-1`}
                          value={p.tipo}
                          onChange={e => setPagoTipo(idx, e.target.value)}
                        >
                          <option value="Efectivo">Efectivo</option>
                          <option value="Débito">Débito</option>
                          <option value="Crédito">Crédito</option>
                          <option value="Transferencia">Transferencia</option>
                        </select>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="0"
                          className={`${field} w-28 text-right`}
                          value={p.monto}
                          onChange={e => setPagoMonto(idx, e.target.value !== '' ? Number(e.target.value) : 0)}
                        />
                        <button
                          type="button"
                          onClick={() => removePago(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 shrink-0"
                          title="Quitar esta fila"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={addPago}
                        className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        + agregar método
                      </button>
                      <div className={`text-[11px] font-bold ${splitOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${Math.round(sumaSplit).toLocaleString('es-CL')} / ${Math.round(totalTicket).toLocaleString('es-CL')}
                        {splitOk
                          ? ' ✓'
                          : ` · falta $${Math.round(totalTicket - sumaSplit).toLocaleString('es-CL')}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Vuelto (solo cuando hay efectivo, single o split) ── */}
                {efectivoDelSplit > 0 && (
                  <div className="mt-2 flex items-end gap-3">
                    <div className="flex-1">
                      <label className={lbl}>Cliente paga con ($)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder={Math.round(efectivoDelSplit).toLocaleString('es-CL')}
                        className={field}
                        value={form.montoPagado}
                        onChange={e => set('montoPagado', e.target.value !== '' ? Number(e.target.value) : '')}
                      />
                    </div>
                    {vuelto !== null && (
                      <div className={`text-right px-3 py-2 rounded-lg border ${
                        vuelto >= 0
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-rose-500/10 border-rose-500/30'}`}>
                        <p className={`text-[9px] uppercase tracking-wider font-bold ${vuelto >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {vuelto >= 0 ? 'Vuelto' : 'Falta'}
                        </p>
                        <p className={`text-base font-bold leading-tight ${vuelto >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          ${Math.abs(vuelto).toLocaleString('es-CL')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className={lbl}>Monto Propina ($)</label>
                <input className={field} type="number" inputMode="numeric" placeholder="0" min="0" value={form.propina} onChange={e => set('propina', e.target.value !== '' ? Number(e.target.value) : '')} />
              </div>
            </div>
            )}

            {/* Gift Card */}
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gift size={11} className="text-emerald-400" />
                Gift Card (opcional)
              </p>
              {cita?.giftCardCodigo ? (
                <p className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
                  {cita.giftCardCodigo} — −${(cita.giftCardDescuento || 0).toLocaleString('es-CL')} aplicado ✓
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      className={`${field} flex-1 font-mono uppercase`}
                      placeholder="XXXX-XXXX-XXXX"
                      value={gcInput}
                      onChange={e => { setGcInput(e.target.value.toUpperCase()); setGcFound(null); setGcErr(''); }}
                      onKeyDown={e => e.key === 'Enter' && buscarGC()}
                    />
                    <button type="button" onClick={buscarGC} disabled={gcSearching}
                      className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-semibold disabled:opacity-50 shrink-0">
                      {gcSearching ? '...' : <Search size={13} />}
                    </button>
                  </div>
                  {gcErr && <p className="text-xs text-red-400">{gcErr}</p>}
                  {gcFound && (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                      <span className="text-xs text-emerald-400">{gcFound.nombre} · Saldo: ${gcFound.saldo.toLocaleString('es-CL')}</span>
                      <span className="text-xs font-bold text-emerald-400">−${Math.min(gcFound.saldo, totalTicket).toLocaleString('es-CL')}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            </>
            )}
            </>
          )}

          {/* Productos del ticket — estilo recibo */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingBag size={12} className="text-emerald-400" />
                Productos del Ticket
              </p>
              {totalTicket > 0 && (
                <span className="text-[10px] text-slate-500 flex items-baseline gap-1.5 shrink-0">
                  Total: <span className="text-emerald-400 font-bold text-lg leading-none">${Math.round(totalTicket).toLocaleString('es-CL')}</span>
                </span>
              )}
            </div>

            {/* Lista de productos ya vendidos en cargas previas */}
            {ticketPrev.length > 0 && (
              <div className="space-y-1">
                {ticketPrev.map((p, i) => (
                  <div key={`prev-${i}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-900/60 border border-slate-800/60 rounded-lg text-xs">
                    <span className="text-slate-300 truncate flex-1">
                      <span className="text-slate-600 mr-1.5">×{p.cantidad}</span>
                      {p.nombre}
                    </span>
                    <span className="text-slate-400 font-medium shrink-0">${Math.round(p.precio || 0).toLocaleString('es-CL')}</span>
                    <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded shrink-0">Guardado</span>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de productos pendientes (nuevos en esta edición) */}
            {ticketNuevos.length > 0 && (
              <div className="space-y-1">
                {ticketNuevos.map((p, i) => (
                  <div key={`new-${i}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs">
                    <span className="text-primary truncate flex-1">
                      <span className="text-emerald-400/80 mr-1.5">×{p.cantidad}</span>
                      {p.nombre}
                      {p.descuento > 0 && (
                        <span className="ml-1.5 text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded">-{p.descuento}%</span>
                      )}
                    </span>
                    {p.descuento > 0 && (
                      <span className="text-slate-500 line-through text-[10px] shrink-0">${Math.round(p.subtotalLinea).toLocaleString('es-CL')}</span>
                    )}
                    <span className="text-emerald-400 font-bold shrink-0">${Math.round(p.totalLinea).toLocaleString('es-CL')}</span>
                    <button
                      type="button"
                      onClick={() => removeProductoNuevo(i)}
                      className="text-rose-400/70 hover:text-rose-400 shrink-0 p-0.5"
                      title="Quitar"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Form para agregar producto — layout apilado, cómodo en teléfono */}
            {addingProducto ? (
              <div className="space-y-2.5 p-3 bg-slate-900 border border-slate-800 rounded-xl">
                {/* Producto: fila completa */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Producto</label>
                  <Select
                    className={field}
                    ariaLabel="Producto"
                    value={newProductId}
                    onChange={setNewProductId}
                    options={productosDisponibles.map(p => {
                      const usados = ticketNuevos.filter(n => n.productId === p.id).reduce((s, n) => s + n.cantidad, 0);
                      const stockShown = !isNaN(Number(p.stock)) ? Number(p.stock) - usados : null;
                      const sinStock   = stockShown !== null && stockShown <= 0;
                      return {
                        value: p.id,
                        disabled: sinStock,
                        label: `${p.nombre} — $${Math.round(Number(p.precio) || 0).toLocaleString('es-CL')}`,
                        hint: stockShown !== null ? (sinStock ? 'sin stock' : `stock ${stockShown}`) : undefined,
                      };
                    })}
                  />
                </div>
                {/* Cantidad y descuento: dos columnas */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cantidad</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      className={field}
                      value={newProductQty}
                      onChange={e => setNewProductQty(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Descuento %</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="100"
                      className={field}
                      value={newProductDesc}
                      onChange={e => setNewProductDesc(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    />
                  </div>
                </div>
                {/* Acciones: Agregar amplio + Cancelar */}
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={addProductoAlTicket}
                    disabled={!newProductId}
                    className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-primary disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={14} /> Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingProducto(false); setNewProductId(''); setNewProductQty(1); setNewProductDesc(0); }}
                    className="px-4 py-2.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-800 text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingProducto(true)}
                disabled={productosDisponibles.length === 0}
                className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Agregar producto al ticket
              </button>
            )}

            {ticketNuevos.length > 0 && (
              <p className="text-[10px] text-slate-500 italic">
                Al guardar se crearán {ticketNuevos.length} venta{ticketNuevos.length !== 1 ? 's' : ''} y se descontará el stock correspondiente.
              </p>
            )}
          </div>
          </>
        )}

        {/* Nota interna — cierre del bloque 3 */}
        <div>
          <label className={lbl}>Nota interna</label>
          <textarea className={`${field} resize-none`} rows={2} placeholder="Ej: Cliente prefiere sin gel..." value={form.nota} onChange={e => set('nota', e.target.value)} />
        </div>
      </div>

      {/* Historial completo del cliente — se abre desde el botón junto al nombre */}
      {historialOpen && (
        <HistorialClienteDrawer
          isOpen={historialOpen}
          onClose={() => setHistorialOpen(false)}
          clienteId={form.clienteId || null}
          nombre={form.clienteNombre}
          email={form.clienteEmail}
          telefono={form.clienteTelefono}
          barberos={barberos}
          servicios={servicios}
          citaActualId={cita?.id || null}
        />
      )}

      {/* Gate anti-descuido para venta cerrada: cualquier edición sobre una
          cita ya Completada (reabrirla o modificarla) requiere la contraseña
          definida en Configuración → Seguridad. */}
      {gatePending && (
        <ReopenPassModal
          titulo="Venta cerrada"
          contexto={
            form.estado !== 'Completada'
              ? `Vas a cambiar el estado de esta cita de "Completada" a "${form.estado}". Esto reabre una venta ya cerrada y puede descuadrar la caja.`
              : 'Esta cita ya está cerrada. Cualquier cambio (precio, método de pago, notas, etc.) afecta el arqueo del día. Ingresa la contraseña para confirmar la edición.'
          }
          passHash={gateVenta.passHash}
          onOk={() => { setGatePending(false); handleSave(); }}
          onCancel={() => setGatePending(false)}
        />
      )}
    </Modal>
  );
}

/* ── HistorialClienteDrawer ─────────────────────────────────── */
//  Panel lateral con el historial completo del cliente:
//   · Sellos actuales, gasto total, frecuencia promedio
//   · Barbero más fiel (con % del total de citas completadas)
//   · Servicio favorito
//   · Tabla de todas las citas (más recientes primero)
//  Se abre desde el botón "Historial" del CitaModal.
function HistorialClienteDrawer({ isOpen, onClose, clienteId, nombre, email, telefono, barberos, servicios, citaActualId }) {
  const [citas, setCitas] = useState(null);   // null = cargando, [] = sin data, [{}] = con data
  const [userDoc, setUserDoc] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setCitas(null); setUserDoc(null);
      // Cargar user si tenemos clienteId
      if (clienteId) {
        try {
          const uSnap = await withTimeout(getDoc(doc(tenantCol('users'), clienteId)), 10000, 'agenda/historial-user');
          if (!cancelled && uSnap.exists()) setUserDoc({ id: uSnap.id, ...uSnap.data() });
        } catch (_) {}
      }
      // Cargar citas: por clienteUid + por clienteTelefono en variantes.
      const seen = new Map();
      const push = (docs) => { for (const d of docs) if (!seen.has(d.id)) seen.set(d.id, { id: d.id, ...d.data() }); };
      try {
        if (clienteId) {
          const q1 = await withTimeout(getDocs(query(tenantCol('citas'), where('clienteUid', '==', clienteId))), 15000, 'agenda/historial-uid');
          push(q1.docs);
          const q2 = await withTimeout(getDocs(query(tenantCol('citas'), where('userId', '==', clienteId))), 15000, 'agenda/historial-userId');
          push(q2.docs);
        }
        if (telefono) {
          const tel = String(telefono).trim();
          const digs = tel.replace(/\D+/g, '');
          const variants = [...new Set([tel, digs, `+${digs}`])].filter(Boolean);
          for (const v of variants) {
            const q = await withTimeout(getDocs(query(tenantCol('citas'), where('clienteTelefono', '==', v))), 15000, 'agenda/historial-tel');
            push(q.docs);
          }
        }
      } catch (e) {
        console.warn('[HistorialCliente]', e?.message);
      }
      if (cancelled) return;
      const arr = Array.from(seen.values())
        .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
      setCitas(arr);
    })();
    return () => { cancelled = true; };
  }, [isOpen, clienteId, telefono]);

  const stats = useMemo(() => {
    if (!citas) return null;
    const completadas = citas.filter(c => c.estado === 'Completada');
    // Precio de una cita: c.precio explícito o 0 si cortesía (mismo criterio que Comisiones).
    const precio = (c) => c.cortesia ? 0 : Number(c.precio || 0);
    const gastoTotal = completadas.reduce((s, c) => s + precio(c), 0);

    // Barbero fiel: cuál acumula más citas completadas.
    const barbCount = new Map();
    for (const c of completadas) {
      const bId = c.barberoId || '_sin';
      barbCount.set(bId, (barbCount.get(bId) || 0) + 1);
    }
    const barbTop = [...barbCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([bId, count]) => {
        const b = barberos.find(x => x.id === bId);
        return {
          id: bId, count,
          nombre: b?.nombre || (bId === '_sin' ? 'Sin barbero' : bId),
          pct: completadas.length ? Math.round(count * 100 / completadas.length) : 0,
        };
      });

    // Servicio favorito.
    const svcCount = new Map();
    for (const c of completadas) {
      const key = c.servicioNombre || c.servicio || 'Sin dato';
      svcCount.set(key, (svcCount.get(key) || 0) + 1);
    }
    const svcTop = [...svcCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Frecuencia promedio (días entre citas completadas consecutivas).
    const fechas = completadas
      .map(c => c.fecha).filter(Boolean).sort();
    let avgDias = null;
    if (fechas.length >= 2) {
      const diffs = [];
      for (let i = 1; i < fechas.length; i++) {
        const d1 = new Date(fechas[i - 1] + 'T12:00:00');
        const d2 = new Date(fechas[i]     + 'T12:00:00');
        const dd = Math.round((d2 - d1) / 86400000);
        if (dd > 0 && dd < 365) diffs.push(dd);
      }
      if (diffs.length) avgDias = Math.round(diffs.reduce((s, v) => s + v, 0) / diffs.length);
    }
    return {
      totalCitas: citas.length,
      completadas: completadas.length,
      canceladas: citas.filter(c => c.estado === 'Cancelada' || c.estado === 'NoAsistio').length,
      gastoTotal,
      barbTop,
      svcTop,
      avgDias,
    };
  }, [citas, barberos]);

  const fmtCLP = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`;
  const barbNombre = (bId) => barberos.find(x => x.id === bId)?.nombre || bId || 'Sin barbero';

  const sellos = userDoc?.sellosDisponibles ?? '—';
  const sellosHist = userDoc?.sellosHistoricos ?? '—';

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
      title={`Historial · ${nombre || 'Cliente'}`}
      subtitle={
        (email || telefono)
          ? [email, telefono].filter(Boolean).join(' · ')
          : 'Sin identificadores'
      }
      footer={
        <div className="flex justify-end">
          <button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cerrar</button>
        </div>
      }
    >
      {citas === null ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <RefreshCw size={20} className="animate-spin mr-2" /> Cargando historial…
        </div>
      ) : citas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
          <History size={32} className="opacity-40" />
          <p className="text-sm">Sin historial de citas para este cliente.</p>
          <p className="text-xs opacity-70">Si el cliente ya vino antes, revisá que el nombre o teléfono estén escritos igual que en la reserva original.</p>
        </div>
      ) : (
        <>
          {/* Header stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatKpi label="Citas totales"      value={stats.totalCitas} />
            <StatKpi label="Completadas"        value={stats.completadas} tone="emerald" />
            <StatKpi label="Sellos actuales"    value={sellos} tone="amber" sub={sellosHist !== '—' ? `${sellosHist} históricos` : undefined} />
            <StatKpi label="Gasto total"        value={fmtCLP(stats.gastoTotal)} tone="blue" />
          </div>

          {/* Barbero fiel */}
          {stats.barbTop.length > 0 && (
            <section className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <User size={13} className="text-emerald-400" /> Barbero{stats.barbTop.length > 1 ? 's' : ''} preferido{stats.barbTop.length > 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {stats.barbTop.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-300'
                    }`}>{i === 0 ? '★' : (i + 1)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{b.nombre}</p>
                      <p className="text-[11px] text-slate-500">{b.count} cita{b.count !== 1 ? 's' : ''} completada{b.count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold tabular-nums text-emerald-400">{b.pct}%</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">fidelidad</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Servicio favorito + frecuencia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {stats.svcTop.length > 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 flex items-center gap-1.5">
                  <Scissors size={11} /> Servicios más pedidos
                </p>
                <ul className="text-[12.5px] space-y-1">
                  {stats.svcTop.map(([svc, n]) => (
                    <li key={svc} className="flex justify-between">
                      <span className="text-slate-300 truncate">{svc}</span>
                      <span className="text-slate-500 tabular-nums shrink-0 ml-2">{n}×</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stats.avgDias !== null && (
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 flex items-center gap-1.5">
                  <Clock size={11} /> Frecuencia
                </p>
                <p className="text-2xl font-bold tabular-nums text-slate-200">{stats.avgDias} <span className="text-sm font-normal text-slate-500">días</span></p>
                <p className="text-[11px] text-slate-500 mt-0.5">promedio entre citas</p>
              </div>
            )}
          </div>

          {/* Tabla de citas */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <CalendarDays size={13} className="text-blue-400" /> Historial completo ({stats.totalCitas})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-[12.5px]">
                <thead className="bg-slate-800/60 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold">Fecha</th>
                    <th className="text-left py-2 px-3 font-semibold">Barbero</th>
                    <th className="text-left py-2 px-3 font-semibold">Servicio</th>
                    <th className="text-left py-2 px-3 font-semibold">Estado</th>
                    <th className="text-right py-2 px-3 font-semibold">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {citas.map(c => {
                    const es = c.estado || '?';
                    const badge = es === 'Completada' ? 'text-emerald-400 bg-emerald-500/10'
                                : es === 'Cancelada' || es === 'NoAsistio' ? 'text-rose-400 bg-rose-500/10'
                                : es === 'Confirmada' ? 'text-blue-400 bg-blue-500/10'
                                : 'text-slate-400 bg-slate-500/10';
                    const highlight = c.id === citaActualId;
                    return (
                      <tr key={c.id} className={`${highlight ? 'bg-emerald-500/5' : 'hover:bg-slate-800/30'}`}>
                        <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                          {c.fecha}<span className="text-slate-600"> · {c.hora}</span>
                          {highlight && <span className="ml-2 text-[10px] text-emerald-400 font-semibold">(esta cita)</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-300 truncate max-w-[130px]" title={barbNombre(c.barberoId)}>{barbNombre(c.barberoId)}</td>
                        <td className="py-2 px-3 text-slate-300">
                          {c.servicioNombre || c.servicio || '—'}
                          {Array.isArray(c.serviciosExtra) && c.serviciosExtra.length > 0 && (
                            <span className="text-emerald-400/90"> + {c.serviciosExtra.map(e => e.nombre).join(' + ')}</span>
                          )}
                          {c.cortesia && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400">cortesía</span>}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badge}`}>{es}</span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-slate-300">{c.cortesia ? '—' : fmtCLP(c.precio)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </SlideOver>
  );
}

function StatKpi({ label, value, tone = 'slate', sub }) {
  const toneMap = {
    slate:   'text-slate-200',
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
    blue:    'text-blue-400',
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
      <p className={`text-xl font-bold mt-0.5 tabular-nums ${toneMap[tone]}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── BloqueoModal ────────────────────────────────────────────── */
function BloqueoModal({ barberos, dateStr, defaultBarberoId, defaultHora, defaultTipo, onClose }) {
  const { pickerLabels } = useContext(AgendaCtx);
  const [tipo, setTipo]     = useState(defaultTipo || 'parcial');
  const [barberoId, setBId] = useState(defaultBarberoId || '');
  const [horaIni,  setHIni] = useState(defaultHora || '09:00');
  const [horaFin,  setHFin] = useState(() => {
    const idx = pickerLabels.indexOf(defaultHora || '09:00');
    return pickerLabels[Math.min(idx + 4, pickerLabels.length - 1)] || '10:00';
  });
  const [nota, setNota]     = useState('');
  const [saving, setSaving] = useState(false);
  const [horaError, setHoraError] = useState('');

  const handleSave = async () => {
    if (tipo === 'parcial' && toMins(horaFin) <= toMins(horaIni)) {
      setHoraError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    setHoraError('');
    setSaving(true);
    try {
      const payload = { fecha: dateStr, nota, creadoEn: serverTimestamp() };
      if (barberoId) payload.barberoId = barberoId;
      if (tipo === 'dia') {
        payload.todo_el_dia = true;
        await addDoc(tenantCol('bloqueos'), payload);
      } else {
        payload.hora_inicio = horaIni;
        payload.hora_fin    = horaFin;
        if (barberoId) {
          const safeHora = horaIni.replace(':', '');
          const safeBid  = String(barberoId).replace(/[^a-zA-Z0-9_-]/g, '_');
          const lockId   = `bloqueo_${safeBid}_${dateStr}_${safeHora}`;
          const duracion = toMins(horaFin) - toMins(horaIni);
          const bloqueoRef = doc(tenantCol('bloqueos'));
          const lockRef    = doc(tenantCol('slotLocks'), lockId);
          payload.slotLockId = lockId;
          const batch = writeBatch(db);
          batch.set(bloqueoRef, payload);
          batch.set(lockRef, {
            bloqueoId: bloqueoRef.id,
            fecha:     dateStr,
            hora:      horaIni,
            barberoId,
            duracion,
            creadoEn:  serverTimestamp(),
          });
          await batch.commit();
        } else {
          await addDoc(tenantCol('bloqueos'), payload);
        }
      }
      onClose();
    } finally { setSaving(false); }
  };

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

  return (
    <Modal
      title="Bloquear horario"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-primary text-sm font-semibold rounded-lg transition-all">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Bloquear
          </button>
        </div>
      }
    >
      {/* Tipo */}
      <div className="flex gap-2">
        {[{ v: 'parcial', l: 'Rango de horas' }, { v: 'dia', l: 'Día completo' }].map(({ v, l }) => (
          <button key={v} onClick={() => { setTipo(v); setHoraError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${tipo === v ? 'border-red-500/60 bg-red-500/10 text-red-400' : 'border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Barbero */}
      <div>
        <label className={lbl}>Barbero (vacío = todos)</label>
        <Select
          className={field}
          ariaLabel="Barbero"
          value={barberoId}
          onChange={setBId}
          placeholder="— Todos los barberos —"
          options={[{ value: '', label: '— Todos los barberos —' },
                    ...barberos.map(b => ({ value: b.id, label: b.nombre }))]}
        />
      </div>

      {/* Horario parcial */}
      {tipo === 'parcial' && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Desde</label>
              <Select
                className={field}
                ariaLabel="Desde"
                value={horaIni}
                onChange={v => { setHIni(v); setHoraError(''); }}
                options={pickerLabels.map(t => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label className={lbl}>Hasta</label>
              <Select
                className={field}
                ariaLabel="Hasta"
                value={horaFin}
                onChange={v => { setHFin(v); setHoraError(''); }}
                options={pickerLabels.map(t => ({ value: t, label: t }))}
              />
            </div>
          </div>
          {horaError && <p className="text-xs text-red-400 font-semibold mt-1.5">{horaError}</p>}
        </div>
      )}

      <div>
        <label className={lbl}>Motivo (opcional)</label>
        <input className={field} placeholder="Ej: Almuerzo, vacaciones…" value={nota} onChange={e => setNota(e.target.value)} />
      </div>
    </Modal>
  );
}

/* ── BloqueoBlock ────────────────────────────────────────────── */
function BloqueoBlock({ bloqueo, onDelete }) {
  const { topPx, totalPx } = useContext(AgendaCtx);
  // Guard: bloqueos parciales (todo_el_dia=false) sin hora_inicio/fin son
  // basura de importaciones legacy — no los renderizamos.
  const validRange = bloqueo.todo_el_dia || (
    typeof bloqueo.hora_inicio === 'string' && bloqueo.hora_inicio.includes(':') &&
    typeof bloqueo.hora_fin    === 'string' && bloqueo.hora_fin.includes(':')
  );
  if (!validRange) return null;
  // Por minuto, igual que las citas: un bloqueo de 12:00 a 12:30 en reloj de
  // 45' tapaba la franja entera y hacía ver ocupado hasta las 12:45.
  const top   = bloqueo.todo_el_dia ? 0       : topPx(bloqueo.hora_inicio);
  const fin   = bloqueo.todo_el_dia ? totalPx : topPx(bloqueo.hora_fin);
  const alto  = Math.max(MIN_CITA_PX, fin - top - 4);
  // Cuántas franjas cubre — decide cuánto texto cabe dentro (ver más abajo).
  const spans = Math.round((fin - top) / SLOT_PX);

  return (
    <div
      title={[
        bloqueo.todo_el_dia ? 'Día cerrado' : `Bloqueo de agenda ${bloqueo.hora_inicio}–${bloqueo.hora_fin}`,
        'No disponible para reservas',
        bloqueo.nota || null,
        'Clic para desbloquear',
      ].filter(Boolean).join(' · ')}
      onClick={async () => { if (await confirmDialog('¿Desbloquear este horario?')) onDelete(bloqueo); }}
      className="agenda-blocked-slot absolute inset-x-0.5 rounded-md border border-neutral-800 bg-neutral-900 bg-[image:repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)] px-2 py-1 overflow-hidden cursor-pointer hover:brightness-125 transition-all"
      style={{ top: `${top}px`, height: `${alto}px` }}
    >
      {/* El bloqueo mostraba solo la hora, y había que saberse el sistema para
          entender qué era esa franja rayada. Ahora se explica solo: qué es,
          cuándo, y que no se puede reservar ahí.

          El detalle se ajusta al alto real: un bloqueo puede durar un solo
          slot (36px) y tres líneas no caben. spans = cuántos slots ocupa. */}
      <span className="agenda-blocked-pill bg-neutral-950 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide text-neutral-400 inline-flex items-center gap-1 mt-1">
        <Lock size={10} className="shrink-0" />
        <span className="truncate">
          {bloqueo.todo_el_dia ? 'Día cerrado' : 'Bloqueo de agenda'}
        </span>
      </span>

      {spans >= 2 && !bloqueo.todo_el_dia && (
        <p className="agenda-blocked-hora text-[11px] font-semibold text-neutral-300 truncate mt-1">
          {bloqueo.hora_inicio} – {bloqueo.hora_fin}
        </p>
      )}

      {spans >= 3 && (
        <p className="text-[9px] text-neutral-500 truncate mt-0.5">
          No disponible{bloqueo.nota ? ` · ${bloqueo.nota}` : ''}
        </p>
      )}

      {/* En bloqueos cortos la nota no cabe como línea propia, pero no se
          pierde: el title del contenedor ya la incluye. */}
      {spans === 2 && bloqueo.nota && (
        <p className="text-[9px] text-neutral-500 truncate mt-0.5">{bloqueo.nota}</p>
      )}
    </div>
  );
}

/* Descansos del barbero para un día concreto, desde barberos/{id}.horario.
   ───────────────────────────────────────────────────────────────
   Son los que se configuran en Equipo → "Horario semanal" (uno o más por día).
   La agenda del admin no los leía: se guardaban y no se veían acá.

   Que quede claro para el próximo que pase: la RESERVA PÚBLICA sí los respeta
   desde siempre — firebaseUtils.js:1039 saltea todo slot que pise un descanso,
   y getHorasDisponiblesMulti hace lo mismo por barbero. O sea que el agujero
   nunca fue de disponibilidad (nadie podía reservar encima), era solo que el
   local no los veía en su propia grilla.

   Ojo, es distinto de `colacion` (barberos/{id}/configuracion/main.colacion),
   que es UNA sola franja igual para todos los días. Conviven: un barbero puede
   tener su colación fija + descansos puntuales de un día. Si hay descansos del
   día, esos mandan y la colación global se ignora (firebaseUtils.js:1006). */
function descansosDe(barbero, dateObj) {
  // horario está indexado por getDay(): '0'=Dom … '6'=Sáb.
  const dia = barbero?.horario?.[String(dateObj.getDay())];
  if (!dia || dia.activo === false) return [];
  return (dia.descansos || []).filter(d =>
    typeof d?.inicio === 'string' && d.inicio.includes(':') &&
    typeof d?.fin === 'string' && d.fin.includes(':'));
}

/* ¿El barbero tiene DÍA LIBRE en esta fecha? El horario semanal (Equipo →
   "Horario semanal") marca cada día con `activo`. activo === false = día libre.
   Sin `horario` configurado, o sin entrada para ese día → asumimos que trabaja
   (retrocompat: barberos viejos sin horario NO se marcan como libres).

   Excepción "día extra": el barbero puede tener fechas específicas en
   `barberos/{id}.diasExtra: ['YYYY-MM-DD', ...]` que HABILITAN esa fecha aunque
   su horario semanal la marque inactiva. Sirve para tomar turnos puntuales
   fuera de la jornada normal (feriados, sábados eventuales, cubrir a otro). */
function esDiaLibre(barbero, dateObj) {
  const dia = barbero?.horario?.[String(dateObj.getDay())];
  if (!dia || dia.activo !== false) return false;
  // Día marcado como no laboral en el horario → chequear excepción positiva
  const fechaISO = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
  const extras = Array.isArray(barbero?.diasExtra) ? barbero.diasExtra : [];
  if (extras.includes(fechaISO)) return false;
  return true;
}

/* ── ColacionBlock ───────────────────────────────────────────────
   Franja informativa de colación/descanso del barbero en la grilla
   del admin (la agenda del profesional ya la pinta). Es solo visual:
   pointer-events-none para que el admin pueda igualmente agendar en
   ese rango si lo necesita (sobrecupo consciente). La colación viene
   de barberos/{id}/configuracion/main.colacion con fallback a la
   colación global de configuracion/main.

   `label` permite reusar el mismo bloque para los descansos del horario
   semanal — misma franja ámbar y mismo ícono, distinta palabra. Se buscó a
   propósito que NO se parezca a un bloqueo (rayado gris, candado): un bloqueo
   es "no disponible", un descanso es "está almorzando" y el admin igual puede
   agendar encima si hace falta. */
function ColacionBlock({ colacion, label = 'Colación' }) {
  const { topPx } = useContext(AgendaCtx);
  const valid = colacion
    && typeof colacion.inicio === 'string' && colacion.inicio.includes(':')
    && typeof colacion.fin === 'string' && colacion.fin.includes(':');
  if (!valid) return null;
  // Por minuto: una colación de 13:00 a 13:30 en reloj de 45' se dibujaba
  // como franja completa (o desaparecía si inicio y fin caían en la misma).
  const top  = topPx(colacion.inicio);
  const fin  = topPx(colacion.fin);
  if (fin <= top) return null;
  const alto = Math.max(MIN_CITA_PX, fin - top - 4);

  return (
    <div
      className="agenda-descanso absolute inset-x-0.5 rounded-md border border-dashed border-amber-500/25 bg-amber-500/[0.05] pointer-events-none overflow-hidden flex items-start justify-center"
      style={{ top: `${top}px`, height: `${alto}px` }}
    >
      <span className="agenda-descanso-label mt-1 inline-flex items-center gap-1 rounded bg-amber-950/70 px-2 py-0.5 text-[10px] font-bold text-amber-400/90">
        <Coffee size={10} />
        <span className="truncate">{label} {colacion.inicio}–{colacion.fin}</span>
      </span>
    </div>
  );
}

/* ── SinHoraTray ─────────────────────────────────────────────────
   Citas con hora inválida/nula (p. ej. creadas desde la agenda manual
   sin seleccionar horario). computeOverlapLayout las descarta para no
   romper la grilla, pero ocultarlas del todo hacía que la cabecera
   dijera "5 citas" mostrando 2 (reporte de D'Jones). Se muestran como
   chips de alerta arriba de la columna, clickeables para abrir la cita
   y asignarle hora. */
/* Citas sin hora válida: si tienen creadoEn se les asigna esa hora como
   ESTIMADA (_horaEstimada) para ubicarlas en la grilla donde probablemente
   corresponden — el barbero suele registrar la cita cerca de la hora
   conversada. El bloque se pinta con borde ámbar punteado y "estimada";
   al abrirlo (o arrastrarlo a su slot real) la hora queda corregida. */
const conHoraEstimada = (arr) => (arr || []).map(c => {
  if (typeof c?.hora === 'string' && c.hora.includes(':')) return c;
  const raw = c?.creadoEn;
  const d = raw?.toDate ? raw.toDate() : null;
  if (!d || Number.isNaN(d.getTime())) return c;
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { ...c, hora: hhmm, _horaEstimada: true };
});

// Solo las citas irrescatables (sin hora Y sin creadoEn) quedan en el tray.
const sinHoraDe = (arr) =>
  conHoraEstimada(arr).filter(c => !(typeof c?.hora === 'string' && c.hora.includes(':')));

function SinHoraTray({ citas, onOpen }) {
  if (!citas.length) return null;

  // Momento de creación como pista de a qué horario correspondía la cita
  // (el barbero suele agendar cerca de la hora conversada con el cliente).
  const pistaCreacion = (c) => {
    const raw = c.creadoEn;
    const d = raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null);
    if (!d || Number.isNaN(d.getTime())) return null;
    const hhmm = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const mismaFecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === c.fecha;
    return mismaFecha ? `creada ${hhmm}` : `creada ${d.getDate()}/${d.getMonth() + 1} ${hhmm}`;
  };

  return (
    <div className="absolute inset-x-0.5 top-0.5 z-20 flex flex-col gap-1">
      {citas.map(c => {
        const pista = pistaCreacion(c);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpen(c)}
            title={`Cita sin hora asignada${pista ? ` (${pista})` : ''} — toca para abrirla y ponerle horario`}
            className="w-full flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-950/90 px-2 py-1 text-left hover:bg-amber-900/90 transition-colors"
          >
            <AlertTriangle size={10} className="text-amber-400 shrink-0" />
            <span className="text-[10px] font-bold text-amber-300 truncate">
              {c.clienteNombre || 'Cita'} · sin hora{pista ? ` · ${pista}` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── HuecosLibres ────────────────────────────────────────────────
   Rotula el tiempo REALMENTE libre entre dos citas: "16:00 – 16:45 · 45 min".

   Sin esto, el hueco entre dos cards es solo espacio en blanco y hay que
   deducir a qué hora empieza y cuánto dura midiéndolo contra el eje — que es
   exactamente donde se equivocó el cliente que creyó tener una hora libre.

   REGLA: "libre" significa que ahí NO hay nada dibujado. Cuenta como
   ocupado todo lo que pinta un bloque en la columna:

     · citas en CUALQUIER estado — incluidas Cancelada y NoAsistio. Su hora
       podrá estar disponible para re-agendar, pero la tarjeta sigue en
       pantalla y rotular "libre" encima de ella ensucia la agenda.
     · bloqueos de agenda (todo_el_dia deja la columna entera sin huecos).
     · colación y descansos del horario semanal.

   · Fusiona los rangos ocupados antes de calcular: con citas solapadas
     (sobrecupo, reservas en grupo) la resta directa inventaría huecos.
   · Solo ENTRE bloques. Antes del primero y después del último no hace
     falta: ahí el hueco no está acotado por nada y la columna ya se lee vacía.
   · pointer-events-none — el clic sigue llegando al SlotRow de abajo, así que
     crear una cita en el hueco funciona igual que siempre.                  */
function HuecosLibres({ citas, bloqueos, descansos }) {
  const { topPx, durPx } = useContext(AgendaCtx);

  const huecos = useMemo(() => {
    // Un bloqueo de día completo tapa la columna entera: sin huecos que rotular.
    if ((bloqueos || []).some(b => b?.todo_el_dia)) return [];

    const rangos = [];

    for (const c of citas || []) {
      if (typeof c?.hora !== 'string' || !c.hora.includes(':')) continue;
      const ini = toMins(c.hora);
      rangos.push([ini, ini + (Number(c.duracion || c.duracionServicio || 30) || 30)]);
    }
    for (const b of bloqueos || []) {
      if (typeof b?.hora_inicio !== 'string' || typeof b?.hora_fin !== 'string') continue;
      if (!b.hora_inicio.includes(':') || !b.hora_fin.includes(':')) continue;
      rangos.push([toMins(b.hora_inicio), toMins(b.hora_fin)]);
    }
    for (const d of descansos || []) {
      if (typeof d?.inicio !== 'string' || typeof d?.fin !== 'string') continue;
      if (!d.inicio.includes(':') || !d.fin.includes(':')) continue;
      rangos.push([toMins(d.inicio), toMins(d.fin)]);
    }

    rangos.sort((a, b) => a[0] - b[0]);

    const fusionados = [];
    for (const [ini, fin] of rangos) {
      const ultimo = fusionados[fusionados.length - 1];
      if (ultimo && ini <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], fin);
      else fusionados.push([ini, fin]);
    }

    const out = [];
    for (let i = 1; i < fusionados.length; i++) {
      const ini = fusionados[i - 1][1];
      const fin = fusionados[i][0];
      if (fin - ini >= MIN_HUECO_MIN) out.push({ ini, fin, mins: fin - ini });
    }
    return out;
  }, [citas, bloqueos, descansos]);

  return huecos.map(({ ini, fin, mins }) => {
    const top  = topPx(hhmm(ini));
    const alto = durPx(mins) - 4;
    return (
      <div
        key={`hueco-${ini}`}
        // agenda-hueco / agenda-hueco-label son ganchos de tema: el modo claro
        // los repinta en index.css. Sin una clase estable habría que mapear
        // utilidades como `bg-emerald-500/[0.04]`, que en claro no tienen
        // override y se renderizan con el valor de modo oscuro — invisibles.
        className="agenda-hueco absolute inset-x-1 z-[1] rounded-md border border-dashed border-emerald-500/25 bg-emerald-500/[0.04] pointer-events-none flex items-center justify-center overflow-hidden"
        style={{ top: `${top}px`, height: `${alto}px` }}
      >
        {/* Bajo ~28px no cabe el texto sin ensuciar: queda solo la banda. */}
        {alto >= 28 && (
          <span className="agenda-hueco-label px-1.5 py-0.5 rounded text-[9px] font-semibold text-emerald-300/80 bg-slate-900/70 tabular-nums whitespace-nowrap">
            {hhmm(ini)} – {hhmm(fin)} · {mins} min libres
          </span>
        )}
      </div>
    );
  });
}

/* ── AppointmentBlock ────────────────────────────────────────── */
// barberColor (barberos/{id}.color) pinta SOLO la barra izquierda de 4px. El
// fondo sigue siendo el del estado (verde=Confirmada, ámbar=Pendiente…), que es
// lo que el local lee de un vistazo. Sin color, la barra queda como siempre.
function AppointmentBlock({ cita, colIndex, colTotal, barberColor, onClick, onContextMenu, onDragStart, onDragEnd, onDropOnCita, onTouchDrop, isDragged, dragActive }) {
  const { topPx, durPx, totalPx } = useContext(AgendaCtx);

  // Todos los hooks van ANTES del early return de abajo. Una cita puede
  // pasar de "sin hora válida" a tenerla dentro del mismo montaje (es el
  // flujo de _horaEstimada: se guarda sin hora y queda fijada al abrirla o
  // arrastrarla al slot). Con los hooks debajo del return, ese cambio movía
  // el conteo de 0 a 6 y React reventaba la agenda entera con "Rendered more
  // hooks than during the previous render".
  const [over, setOver] = useState(false);
  const cardRef      = useRef(null);
  const holdTimer    = useRef(null);
  const isTouchDrag  = useRef(false);
  const suppressTap  = useRef(false); // evita que el touchend dispare el click "abrir cita"
  const startPos     = useRef({ x: 0, y: 0 });
  const lastTarget   = useRef(null);  // { el, barberoId, hora, ciId }
  // Auto-scroll al arrastrar con el dedo (móvil): la agenda mide varias
  // pantallas y sin esto solo se puede mover una cita a una hora que ya esté
  // visible — para bajarla dos horas había que soltarla, scrollear y volver a
  // tomarla. Ahora, al acercar el dedo a un borde, la agenda acompaña.
  const autoScrollRAF = useRef(null);
  const autoScrollVel = useRef(0);
  const lastTouchPos  = useRef({ x: 0, y: 0 });
  const scrollerEl    = useRef(null);

  // Si la card se desmonta a mitad de arrastre (cambio de día, refresh de
  // datos), el bucle seguiría vivo moviendo la vista solo. Va acá arriba con
  // el resto de los hooks: debajo del early return rompe el orden de hooks.
  useEffect(() => () => {
    autoScrollVel.current = 0;
    if (autoScrollRAF.current) cancelAnimationFrame(autoScrollRAF.current);
  }, []);

  // Defense-in-depth: computeOverlapLayout ya filtra las citas sin hora
  // válida, pero si esta card llega por otra vía (ej. drag) prefiero no
  // renderizar nada a explotar la agenda entera.
  if (typeof cita?.hora !== 'string' || !cita.hora.includes(':')) return null;
  // Geometría por minuto: la card arranca en su hora exacta (una cita de 15:15
  // ya no se dibuja pegada al 15:00) y mide lo que realmente dura. Se recorta
  // al borde inferior de la grilla para que una cita larga al cierre no
  // desborde el contenedor.
  const _dur    = Number(cita.duracion || cita.duracionServicio || 30) || 30;
  const topCita = topPx(cita.hora);
  const altoCita = Math.max(MIN_CITA_PX, Math.min(durPx(_dur), totalPx - topCita) - 4);
  const color = STATUS_STYLE[estadoVisual(cita)] ?? STATUS_STYLE.Confirmada;
  // Hora estimada desde creadoEn (cita guardada sin hora): borde ámbar
  // punteado; al abrirla o arrastrarla a su slot la hora queda fijada.
  const estimada = !!cita._horaEstimada;
  const pct   = 100 / colTotal;
  // NoAsistio es también un estado final: no se arrastra (como Completada/Cancelada).
  const arrastrable = cita.estado !== 'Cancelada' && cita.estado !== 'Completada' && cita.estado !== 'NoAsistio';

  // ── Soporte táctil (long-press + arrastrar) ─────────────────
  // HTML5 draggable no dispara eventos en pantallas táctiles, así que
  // manejamos manualmente touchstart/move/end y usamos elementFromPoint
  // para saber qué franja horaria queda bajo el dedo al soltar.
  // (Los refs se declaran arriba, antes del early return.)
  const TOUCH_HOVER  = ['!bg-emerald-500/30', 'ring-2', 'ring-inset', 'ring-emerald-400', 'z-10'];

  const clearTouchHover = () => {
    if (lastTarget.current?.el) {
      lastTarget.current.el.classList.remove(...TOUCH_HOVER);
    }
    lastTarget.current = null;
  };

  const cancelHold = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  };

  // Encuentra la franja horaria (o cita) debajo del dedo. Oculta temporalmente
  // los pointer-events del propio bloque para poder ver el elemento inferior.
  const findDropTarget = (x, y) => {
    const card = cardRef.current;
    const prevPE = card?.style.pointerEvents;
    if (card) card.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    if (card) card.style.pointerEvents = prevPE || '';
    if (!el) return null;
    const slotEl = el.closest('[data-slot-barbero]');
    if (slotEl) {
      return {
        el: slotEl,
        barberoId: slotEl.getAttribute('data-slot-barbero'),
        hora:      slotEl.getAttribute('data-slot-hora'),
      };
    }
    // Si soltamos encima de otra cita, dejamos que el flujo trate el slot origen
    // de esa cita como destino (mismo comportamiento que onDropOnCita en desktop).
    const citaEl = el.closest('[data-cita-barbero]');
    if (citaEl && citaEl !== card) {
      return {
        el: citaEl,
        barberoId: citaEl.getAttribute('data-cita-barbero'),
        hora:      citaEl.getAttribute('data-cita-hora'),
      };
    }
    return null;
  };

  /* ── Auto-scroll durante el arrastre táctil ───────────────────────
     Busca el ancestro que realmente scrollea (la grilla o, si no hay, la
     página) y lo desplaza mientras el dedo esté en las bandas superior o
     inferior. La velocidad crece al acercarse al borde: cerca del límite
     avanza rápido, apenas entrando en la banda apenas se mueve.

     El destino se recalcula DENTRO del bucle y no solo en touchmove: con el
     dedo quieto sobre la banda no llegan más eventos de movimiento, y sin
     esto el resaltado se quedaría marcando la franja de antes de scrollear
     mientras el contenido pasa por debajo. */
  const BANDA_PX  = 90;   // zona sensible en cada borde
  const VEL_MAX   = 16;   // px por frame (~950 px/s a 60fps)

  const buscarScroller = (el) => {
    let n = el?.parentElement;
    while (n && n !== document.body) {
      const st = window.getComputedStyle(n);
      if (/(auto|scroll)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 4) return n;
      n = n.parentElement;
    }
    return null;   // null = scrollea la página
  };

  const pintarDestino = (x, y) => {
    const target = findDropTarget(x, y);
    if (target?.el !== lastTarget.current?.el) {
      clearTouchHover();
      if (target?.el) {
        target.el.classList.add(...TOUCH_HOVER);
        lastTarget.current = target;
      }
    } else if (target) {
      lastTarget.current = target;
    }
  };

  const tickAutoScroll = () => {
    const v = autoScrollVel.current;
    if (!v || !isTouchDrag.current) { autoScrollRAF.current = null; return; }
    const sc = scrollerEl.current;
    if (sc) sc.scrollTop += v;
    else window.scrollBy(0, v);
    const { x, y } = lastTouchPos.current;
    pintarDestino(x, y);
    autoScrollRAF.current = requestAnimationFrame(tickAutoScroll);
  };

  const evaluarAutoScroll = (y) => {
    const sc  = scrollerEl.current;
    const top = sc ? sc.getBoundingClientRect().top : 0;
    const bot = sc ? sc.getBoundingClientRect().bottom : window.innerHeight;
    let v = 0;
    if (y < top + BANDA_PX)      v = -Math.ceil(VEL_MAX * Math.min(1, (top + BANDA_PX - y) / BANDA_PX));
    else if (y > bot - BANDA_PX) v =  Math.ceil(VEL_MAX * Math.min(1, (y - (bot - BANDA_PX)) / BANDA_PX));
    autoScrollVel.current = v;
    if (v && !autoScrollRAF.current) autoScrollRAF.current = requestAnimationFrame(tickAutoScroll);
  };

  const pararAutoScroll = () => {
    autoScrollVel.current = 0;
    if (autoScrollRAF.current) { cancelAnimationFrame(autoScrollRAF.current); autoScrollRAF.current = null; }
  };

  const handleTouchStart = (e) => {
    if (!arrastrable) return;
    const t = e.touches[0]; if (!t) return;
    startPos.current = { x: t.clientX, y: t.clientY };
    isTouchDrag.current = false;
    suppressTap.current = false;
    cancelHold();
    lastTouchPos.current = { x: t.clientX, y: t.clientY };
    scrollerEl.current   = buscarScroller(cardRef.current);
    holdTimer.current = setTimeout(() => {
      isTouchDrag.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(15); } catch { /* noop */ }
      }
      onDragStart && onDragStart({ touch: true }, cita);
    }, 250);
  };

  const handleTouchMove = (e) => {
    const t = e.touches[0]; if (!t) return;

    // Aún no arranca el drag: si el dedo se aleja >5 px, es scroll → cancelamos el hold.
    if (!isTouchDrag.current) {
      const dx = t.clientX - startPos.current.x;
      const dy = t.clientY - startPos.current.y;
      if (Math.hypot(dx, dy) > 5) cancelHold();
      return;
    }

    // Drag activo: resalta la franja debajo del dedo (touch-action: none en el
    // bloque impide que el navegador scrollee, así que no necesitamos preventDefault).
    lastTouchPos.current = { x: t.clientX, y: t.clientY };
    pintarDestino(t.clientX, t.clientY);
    evaluarAutoScroll(t.clientY);
  };

  const handleTouchEnd = (e) => {
    cancelHold();
    pararAutoScroll();
    if (!isTouchDrag.current) return;
    isTouchDrag.current = false;
    suppressTap.current = true;
    // Bloquea el "click fantasma" que iOS/Android sintetizan después de touchend.
    if (e.cancelable) e.preventDefault();
    const target = lastTarget.current;
    clearTouchHover();
    if (target?.barberoId && target?.hora) {
      onTouchDrop && onTouchDrop(target.barberoId, target.hora);
    } else {
      // Mantuvo presionado y soltó sin llevarla a ninguna franja. Antes esto
      // no hacía NADA —ni movía ni abría—, así que el gesto se sentía roto:
      // "la aprieto y no me deja cambiarla". Se trata como intención de
      // editarla y se abre la cita, que es donde puede cambiar hora,
      // profesional y todo lo demás.
      onDragEnd && onDragEnd();
      onClick && onClick(cita);
    }
    // Reset suppressTap tras el ciclo de eventos para el próximo tap.
    setTimeout(() => { suppressTap.current = false; }, 400);
  };

  const handleTouchCancel = () => {
    cancelHold();
    pararAutoScroll();
    if (isTouchDrag.current) {
      isTouchDrag.current = false;
      clearTouchHover();
      onDragEnd && onDragEnd();
    }
  };


  // Tooltip on hover — estado + cliente + servicio + hora de fin sin ocupar
  // espacio en la card. Útil en columnas angostas donde el texto se trunca.
  //
  // `data-tooltip` y no `title`: el nativo lo dibuja el sistema operativo
  // (caja blanca, tipografía de Windows) y encima de un panel oscuro parece
  // otra aplicación asomándose. Lo pinta TooltipHost, montado en App.jsx.
  const _horaFin = (() => {
    const [hh, mm] = String(cita.hora || '0:0').split(':').map(Number);
    const minsFin = (hh * 60 + mm) + (Number(cita.duracion || cita.duracionServicio) || 30);
    return `${String(Math.floor(minsFin / 60)).padStart(2, '0')}:${String(minsFin % 60).padStart(2, '0')}`;
  })();
  const _estadoLabel = STATUS_LABEL[estadoVisual(cita)] || cita.estado || 'Confirmada';
  const _tooltip = [
    `Estado: ${_estadoLabel}`,
    waAvisado(cita) && '🟢 WhatsApp enviado al cliente',
    cita.confirmadaPorCorreo === true && '✉️ Confirmó su asistencia por correo',
    `Cliente: ${cita.clienteNombre || 'Sin nombre'}`,
    `Servicio: ${cita.servicioNombre || cita.servicio || '—'}`,
    `Horario: ${cita.hora} → ${_horaFin}`,
    cita.cortesia         && '🎁 Cortesía',
    cita.sobrecupo        && '⚡ Sobrecupo',
    cita.consumeSesionPack && '📦 Consume sesión de pack',
    cita.esActivacionPack && '📦 Activa nuevo pack',
    cita.corteLapiz       && '✏️ Corte al Lápiz',
    estimada              && 'ℹ️ Hora estimada (no fijada aún)',
  ].filter(Boolean).join('\n');

  return (
    <div
      data-tooltip={_tooltip}
      // El color del barbero va en la barra izquierda de 4px (el border-l-4 que
      // la card ya tenía); el fondo lo sigue decidiendo el estado de la cita.
      //
      // Se aplica con setProperty(...'important') y no con style={{ borderLeftColor }}
      // porque en modo claro index.css pinta el borde de las clases de estado con
      // !important (ej. `html.light [data-view="agenda"] .border-emerald-500\/50`),
      // y un !important de hoja de estilos le gana a un style inline normal —
      // solo otro !important inline lo supera. Sin esto el color se vería en
      // oscuro y desaparecería en claro.
      //
      // Va en el ref callback y no en un useEffect porque acá arriba hay un
      // early return (cita sin hora válida): sumar un hook después de él es
      // pedirle problemas al orden de hooks.
      ref={(el) => {
        cardRef.current = el;
        if (!el) return;
        if (barberColor) el.style.setProperty('border-left-color', barberColor, 'important');
        else el.style.removeProperty('border-left-color');
      }}
      // Data-* para que otras citas puedan tratar este bloque como slot destino durante touch.
      data-cita-barbero={cita.barberoId}
      data-cita-hora={cita.hora}
      onClick={() => { if (suppressTap.current) return; onClick(cita); }}
      onContextMenu={(e) => { if (onContextMenu) { e.preventDefault(); onContextMenu(e, cita); } }}
      draggable={arrastrable}
      onDragStart={(e) => onDragStart && onDragStart(e, cita)}
      onDragEnd={() => { setOver(false); onDragEnd && onDragEnd(); }}
      onDragOver={(e) => { if (dragActive) e.preventDefault(); }}
      onDragEnter={() => { if (dragActive && !isDragged) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.stopPropagation(); e.preventDefault(); setOver(false); onDropOnCita && onDropOnCita(cita); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={`group absolute rounded-md border border-l-4 shadow-[0_2px_8px_rgba(0,0,0,0.2)] px-2 py-1 overflow-hidden ${arrastrable ? 'cursor-grab active:cursor-grabbing touch-none select-none' : 'cursor-pointer'} hover:brightness-125 transition-transform duration-150 text-xs ${color} ${
        isDragged ? 'opacity-90 ring-2 ring-emerald-500 shadow-2xl scale-105 z-50'
                  : over ? 'ring-2 ring-amber-400 brightness-125 z-30'
                  : dragActive ? 'ring-1 ring-amber-400/50'
                  : ''
      }`}
      style={{
        top:    `${topCita}px`,
        height: `${altoCita}px`,
        left:   `calc(${colIndex * pct}% + 2px)`,
        width:  `calc(${pct}% - 4px)`,
      }}
    >
      {arrastrable && (
        <GripVertical size={12} className="absolute top-1 right-1 text-primary/45 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
      <p className="font-semibold truncate leading-tight">
        {waAvisado(cita) && (
          <svg viewBox="0 0 24 24" width="11" height="11" className="inline-block mr-1 -mt-0.5" aria-label="WhatsApp enviado">
            <path fill="#25D366" d="M20.52 3.45C18.24 1.17 15.24 0 12.06 0 5.55 0 .21 5.28.21 11.79c0 2.07.54 4.11 1.62 5.91L.06 24l6.42-1.68c1.71.93 3.66 1.44 5.58 1.44 6.51 0 11.85-5.28 11.85-11.79 0-3.15-1.23-6.15-3.39-8.52z"/>
            <path fill="#fff" d="M17.51 14.31c-.33-.15-1.95-.96-2.25-1.08-.3-.12-.51-.15-.72.15-.21.33-.84 1.08-1.05 1.29-.18.21-.39.24-.72.09-.33-.18-1.41-.51-2.67-1.65-.99-.87-1.65-1.98-1.86-2.31-.18-.33-.03-.51.15-.66.15-.15.33-.39.48-.6.15-.18.21-.33.33-.54.09-.21.06-.42-.03-.6-.09-.18-.72-1.74-.99-2.37-.24-.6-.51-.51-.72-.51-.18 0-.39-.03-.6-.03s-.57.09-.87.42c-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.15 1.35 3.36.18.21 2.31 3.51 5.61 4.92.78.33 1.41.54 1.89.69.78.24 1.5.21 2.07.12.63-.09 1.95-.81 2.22-1.56.27-.75.27-1.41.21-1.56-.09-.15-.3-.24-.63-.39z"/>
          </svg>
        )}
        {cita.confirmadaPorCorreo === true && (
          <span className="inline-block mr-1 text-[10px] leading-none" title="Confirmó su asistencia por correo" aria-label="Confirmó por correo">✉️✓</span>
        )}
        {cita.sobrecupo && (() => {
          const recargo = Math.round(Number(cita.recargoSobrecupo) || 0);
          if (recargo > 0) {
            return (
              <span
                title={cita.horarioEspecial ? 'Sobrecupo con horario especial (fuera de turno)' : 'Sobrecupo VIP con recargo'}
                className="mr-1 inline-flex items-center gap-0.5 px-1 py-px rounded bg-amber-400/30 text-amber-100 text-[8px] font-black uppercase tracking-wide align-middle ring-1 ring-amber-400/60"
              >
                <Zap size={7} className="shrink-0" strokeWidth={3} />
                Sobrecupo (+${recargo.toLocaleString('es-CL')})
              </span>
            );
          }
          return (
            <span className="mr-1 px-1 py-px rounded bg-amber-500/25 text-amber-300 text-[8px] font-bold uppercase tracking-wide align-middle">
              Sobrecupo
            </span>
          );
        })()}
        {/* Badge de pack enriquecido: PREPAGADO (consume una sesión) o
            NUEVO PACK (activación). Colores dinámicos según urgencia de
            vencimiento (verde/violeta neutro, ámbar próximo, rojo crítico).
            El texto principal aclara si es dinero real ("prepagado") vs
            cita normal, para que el barbero no confunda un $0. */}
        {(cita.consumeSesionPack || cita.esActivacionPack) && (() => {
          const u = getPackUrgency(cita);
          const label = cita.consumeSesionPack ? 'Prepagado' : 'Nuevo Pack';
          const tooltip = cita.consumeSesionPack
            ? `Sesión ${cita.packSesionIndex || '?'} de ${cita.packSesionTotal || '?'} · Pack "${cita.packNombre || ''}"${u.label ? ` · ${u.label}` : ''}`
            : `Activación del pack "${cita.servicioNombre || ''}"`;
          return (
            <span
              title={tooltip}
              className={`mr-1 inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-black uppercase tracking-wide align-middle ${PACK_URGENCY_STYLE[u.nivel]}`}
            >
              📦 {label}
            </span>
          );
        })()}
        {/* Reserva en grupo: N personas a la misma hora en sillones distintos.
            El grupoId agrupa las citas hermanas (mismo cliente reservante). */}
        {cita.grupoId && (
          <span
            title={`Reserva en grupo · ${cita.grupoTotal || '?'} personas a la misma hora`}
            className="mr-1 inline-flex items-center gap-0.5 px-1 py-px rounded text-[8px] font-black uppercase tracking-wide align-middle bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30"
          >
            👥 Grupo{cita.grupoTotal ? ` ${(cita.grupoIndex ?? 0) + 1}/${cita.grupoTotal}` : ''}
          </span>
        )}
        {cita.clienteNombre || 'Cliente'}
      </p>
      <p className="truncate text-[10px] opacity-75">
        {cita.servicioNombre}
        {cita.consumeSesionPack && cita.packSesionIndex && cita.packSesionTotal && (() => {
          const u = getPackUrgency(cita);
          // Color del contador y del "Vence en Xd" — usa el mismo nivel de urgencia.
          const cls = u.nivel === 'critico' || u.nivel === 'expirado' ? 'text-red-300'
                    : u.nivel === 'urgente' ? 'text-amber-300'
                    : 'text-violet-300';
          // "3/3" era ambiguo (¿quedan 3 o es la 3ª?). Ahora "Sesión N de M"
          // y "(última)" cuando corresponde para dejar cero duda al barbero.
          const idx = Number(cita.packSesionIndex);
          const tot = Number(cita.packSesionTotal);
          const esUltima = idx === tot;
          return (
            <span className={`ml-1 ${cls} font-semibold`}>
              · Sesión {idx} de {tot}{esUltima ? ' (última)' : ''}
              {u.label && <span className="ml-1 opacity-90">· {u.label}</span>}
            </span>
          );
        })()}
      </p>
      {/* Rango COMPLETO, no solo la hora de inicio. Es lo que hace que la card
          se explique sola: para saber hasta cuándo ocupa no hay que medirla
          contra el eje de la izquierda ni abrir el tooltip. */}
      <p className={`truncate text-[10px] tabular-nums ${estimada ? 'text-amber-300 opacity-90 font-bold' : 'opacity-60'}`}>
        {estimada ? `≈${cita.hora} · hora estimada` : `${cita.hora} – ${_horaFin}`}{cita.sucursalNombre ? ` · ${cita.sucursalNombre}` : ''}
      </p>
    </div>
  );
}

/* ── Vistas Semana / Mes "de todos" ───────────────────────────────
   Ni Semana ni Mes usan grilla horaria a propósito: 7 días × N barberos de
   ancho no entra en pantalla (por eso la Semana estaba limitada a un solo
   profesional). Son listas ordenadas por hora, que es lo que las hace escalar
   a cualquier cantidad de gente.

   El punto de color de cada fila es el del barbero (barberos/{id}.color); el
   fondo sigue siendo el del estado, igual que en la vista Día.
   ──────────────────────────────────────────────────────────────── */

// Fila compacta de una cita. Se usa en Semana y en Mes.
function CitaRow({ cita, barbero, onClick, dense = false }) {
  const color = STATUS_STYLE[estadoVisual(cita)] ?? STATUS_STYLE.Confirmada;
  return (
    <button
      onClick={() => onClick(cita)}
      title={`${cita.hora} · ${cita.clienteNombre || 'Cliente'}${cita.servicioNombre ? ` · ${cita.servicioNombre}` : ''}${barbero?.nombre ? ` · ${barbero.nombre}` : ''}`}
      className={`w-full flex items-center gap-1.5 rounded-md border border-l-4 text-left transition-colors hover:brightness-125 ${color} ${
        dense ? 'px-1.5 py-1' : 'px-2 py-1.5'
      }`}
      // Mismo motivo que en AppointmentBlock: en claro los overrides pintan el
      // borde de las clases de estado con !important, y eso le gana a un style
      // inline normal. Solo un !important inline lo supera.
      ref={(el) => {
        if (!el) return;
        if (barbero?.color) el.style.setProperty('border-left-color', barbero.color, 'important');
        else el.style.removeProperty('border-left-color');
      }}
    >
      <span className="text-[10px] font-bold tabular-nums shrink-0 opacity-80">{cita.hora}</span>
      <span className={`truncate font-semibold ${dense ? 'text-[10px]' : 'text-[11px]'}`}>
        {cita.clienteNombre || 'Cliente'}
      </span>
    </button>
  );
}

/* Semana de todos: 7 columnas (lun→dom), cada una con las citas del día
   ordenadas por hora, de todos los profesionales visibles. */
function SemanaTodos({ weekDates, citas, barberosById, onOpen }) {
  const hoy = fmt(new Date());
  return (
    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-slate-800 overflow-auto">
      {weekDates.map(d => {
        const diaStr = fmt(d);
        const esHoy  = diaStr === hoy;
        const delDia = citas
          .filter(c => c.fecha === diaStr)
          .sort((a, b) => toMins(a.hora) - toMins(b.hora));
        return (
          <div key={diaStr} className="bg-slate-900 min-h-[220px] flex flex-col">
            <div className={`sticky top-0 z-10 px-2 py-2 border-b bg-slate-900 ${esHoy ? 'border-emerald-500/50' : 'border-slate-800'}`}>
              <p className={`text-[11px] font-bold capitalize ${esHoy ? 'text-emerald-400' : 'text-slate-400'}`}>
                {d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')}
              </p>
              <p className="text-[10px] text-slate-500">
                {delDia.length === 0 ? 'Sin citas' : `${delDia.length} cita${delDia.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="p-1.5 space-y-1 flex-1">
              {delDia.map(c => (
                <CitaRow key={c.id} cita={c} barbero={barberosById[c.barberoId]} onClick={onOpen} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Mes: grilla de calendario de 6 semanas. Cada celda muestra hasta MAX_CELDA
   citas y un "+N más" que salta a la vista Día de ese día — igual que WeiBook.
   Sin el corte, un día con 12 citas estiraría toda la fila de la grilla. */
const MAX_CELDA = 3;
function MesTodos({ monthDates, mesActual, citas, barberosById, onOpen, onVerDia }) {
  const hoy = fmt(new Date());
  const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="grid grid-cols-7 gap-px bg-slate-800 sticky top-0 z-10">
        {DIAS.map(d => (
          <div key={d} className="bg-slate-900 px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-800 flex-1">
        {monthDates.map(d => {
          const diaStr  = fmt(d);
          const esHoy   = diaStr === hoy;
          const delMes  = d.getMonth() === mesActual;
          const delDia  = citas
            .filter(c => c.fecha === diaStr)
            .sort((a, b) => toMins(a.hora) - toMins(b.hora));
          const extra   = delDia.length - MAX_CELDA;
          return (
            <div
              key={diaStr}
              className={`bg-slate-900 min-h-[104px] p-1 flex flex-col gap-0.5 ${delMes ? '' : 'opacity-40'}`}
            >
              <div className="flex items-center justify-between px-0.5">
                <span className={`text-[11px] font-bold tabular-nums ${
                  esHoy ? 'w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center' : 'text-slate-400'
                }`}>
                  {d.getDate()}
                </span>
                {delDia.length > 0 && (
                  <span className="text-[9px] font-bold text-slate-500 tabular-nums">{delDia.length}</span>
                )}
              </div>
              {delDia.slice(0, MAX_CELDA).map(c => (
                <CitaRow key={c.id} cita={c} barbero={barberosById[c.barberoId]} onClick={onOpen} dense />
              ))}
              {extra > 0 && (
                <button
                  onClick={() => onVerDia(d)}
                  className="text-[9px] font-semibold text-slate-500 hover:text-primary text-left px-1 transition-colors"
                >
                  +{extra} más
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── SlotRow (clickable empty slot) ─────────────────────────── */
function SlotRow({ idx, barberoId, dateStr, onNewCita, onNewBloqueo, blockMode, onDragOver, onDrop, dragActive }) {
  const { timeLabels } = useContext(AgendaCtx);
  const hora = timeLabels[idx];
  // Franja en punto (HH:00) → línea superior más marcada para dar jerarquía
  // hora vs. cuarto y romper el efecto "grilla de Excel". Aplica en ambos modos.
  const esHora = hora?.endsWith(':00');
  const [over, setOver] = useState(false);
  return (
    <div
      // Los data-* permiten al drag táctil identificar la franja via document.elementFromPoint.
      // data-slot-fecha lo consumen los handlers de drop en vista semana para
      // saber en qué día de la columna se soltó la cita.
      data-slot-barbero={barberoId}
      data-slot-hora={hora}
      data-slot-fecha={dateStr}
      onClick={() => blockMode ? onNewBloqueo(barberoId, hora, dateStr) : onNewCita(barberoId, hora, dateStr)}
      onDragOver={onDragOver}
      onDragEnter={() => { if (dragActive) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop && onDrop(barberoId, hora, dateStr); }}
      className={`absolute inset-x-0 h-10 border-b border-slate-800/40 transition-colors ${
        esHora ? 'border-t border-slate-800/80' : ''
      } ${idx % 2 === 0 ? '' : 'bg-slate-800/10'} ${blockMode ? 'hover:bg-red-950/20 cursor-crosshair' : 'hover:bg-emerald-900/10 hover:border-dashed hover:border-emerald-500/30 cursor-pointer'} ${
        over && dragActive ? '!bg-emerald-500/30 ring-2 ring-inset ring-emerald-400 z-10'
          : dragActive && !blockMode ? 'bg-emerald-900/10 ring-1 ring-inset ring-emerald-500/25' : ''
      }`}
      style={{ top: `${idx * SLOT_PX}px` }}
    />
  );
}

/* ── CitaContextMenu — menú al hacer clic derecho sobre una cita ── */
// Ítem del menú contextual. whitespace-nowrap: labels largos ("Confirmar por
// WhatsApp") se quebraban en dos líneas con el ancho anterior.
function CtxItem({ icon: Icon, iconCls = '', label, onClick, danger = false, emphasis = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] whitespace-nowrap transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : emphasis
            ? 'text-emerald-300 font-semibold hover:bg-emerald-500/10'
            : 'text-slate-200 hover:bg-slate-800'
      }`}
    >
      <Icon size={15} className={`shrink-0 ${iconCls}`} />
      {label}
    </button>
  );
}

function CitaContextMenu({ x, y, cita, onCompletar, onHistorial, onCambiarFecha, onEditar, onWhatsApp, onCancelar, onNoAsistio, onEliminar, onClose }) {
  const ref = useRef(null);
  // Reposiciona para que no se salga de la ventana.
  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.min(x, window.innerWidth  - width  - 8),
      top:  Math.min(y, window.innerHeight - height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const iniciales = String(cita.clienteNombre || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase();

  // Completar solo tiene sentido si la cita sigue "viva".
  const puedeCompletar = onCompletar &&
    cita.estado !== 'Completada' && cita.estado !== 'Cancelada' && cita.estado !== 'NoAsistio';
  const puedeNoAsistio = onNoAsistio &&
    cita.estado !== 'Completada' && cita.estado !== 'Cancelada' && cita.estado !== 'NoAsistio';
  const puedeCancelar  = cita.estado !== 'Cancelada' && cita.estado !== 'NoAsistio';

  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }}>
      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        className="absolute w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 py-1.5 overflow-hidden"
        style={{ left: pos.left, top: pos.top }}
      >
        {/* Header: avatar + cliente + estado, contexto de un vistazo */}
        <div className="px-3 py-2.5 border-b border-slate-800 mb-1 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-300 text-[11px] font-bold flex items-center justify-center shrink-0">
            {iniciales || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-primary truncate">{cita.clienteNombre || 'Cliente'}</p>
            <p className="text-[10px] text-slate-500 truncate">{cita.hora}{cita.servicioNombre ? ` · ${cita.servicioNombre}` : ''}</p>
          </div>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${ESTADO_BADGE[cita.estado] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
            {STATUS_LABEL[cita.estado] || cita.estado || 'Confirmada'}
          </span>
        </div>

        {/* Acción principal: abre el modal con la cita en estado Completada,
            lista para confirmar pago/propina y guardar. */}
        {puedeCompletar && (
          <>
            <CtxItem icon={CheckCircle2} iconCls="text-emerald-400" emphasis
              label="Completar cita" onClick={onCompletar} />
            <div className="my-1 border-t border-slate-800" />
          </>
        )}

        <CtxItem icon={Scissors}     iconCls="text-slate-400"   label="Editar cita"           onClick={onEditar} />
        <CtxItem icon={CalendarDays} iconCls="text-emerald-400" label="Cambiar de fecha"      onClick={onCambiarFecha} />
        <CtxItem icon={History}      iconCls="text-emerald-400" label="Ver historial / Notas" onClick={onHistorial} />
        {cita.clienteTelefono && (
          <CtxItem icon={MessageSquare} iconCls="text-green-400" label="Confirmar por WhatsApp" onClick={onWhatsApp} />
        )}

        {(puedeNoAsistio || puedeCancelar) && <div className="my-1 border-t border-slate-800" />}
        {puedeNoAsistio && (
          <CtxItem icon={UserX} iconCls="text-rose-400"  label="Marcar no asistió" onClick={onNoAsistio} />
        )}
        {puedeCancelar && (
          <CtxItem icon={Ban}   iconCls="text-amber-400" label="Cancelar cita"     onClick={onCancelar} />
        )}

        <div className="my-1 border-t border-slate-800" />
        <CtxItem icon={Trash2} label="Eliminar cita" onClick={onEliminar} danger />
      </div>
    </div>
  );
}

/* ── ResumenDiaModal — foto del día de un vistazo ─────────────────
   La agenda muestra la grilla, pero para saber "¿cómo viene el día?" había
   que contar columnas a ojo. Esto responde eso: cuántas citas, cuánto se
   espera facturar y qué necesita atención.

   El ingreso usa la MISMA convención que Inicio/Métricas — cortesía = 0 y
   fallback al precio del servicio si la cita no lo trae — para que los
   números no se contradigan entre pantallas. Ese fallback existe porque
   citas viejas guardaban el precio solo en el servicio. */
function ResumenDiaModal({ citas, servicios, barberos, fechaLabel, onClose }) {
  const precioMap = useMemo(() => {
    const m = {};
    (servicios || []).forEach(s => {
      if (s.precio != null) { m[s.id] = Number(s.precio) || 0; m[s.nombre] = Number(s.precio) || 0; }
    });
    return m;
  }, [servicios]);

  const getPrice = (c) =>
    c.cortesia ? 0 : (Number(c.precio) || precioMap[c.servicioId] || precioMap[c.servicioNombre] || 0);

  const r = useMemo(() => {
    const activas    = citas.filter(c => c.estado !== 'Cancelada' && c.estado !== 'NoAsistio');
    const confirmadas = citas.filter(c => c.estado === 'Confirmada');
    const completadas = citas.filter(c => c.estado === 'Completada');
    const pendientes  = citas.filter(c => c.estado === 'Pendiente');
    const canceladas  = citas.filter(c => c.estado === 'Cancelada');
    const noAsistio   = citas.filter(c => c.estado === 'NoAsistio');
    const sinBarbero  = activas.filter(c => !c.barberoId);
    const sinHora     = activas.filter(c => !c.hora);

    // Esperado = lo que entra si el día se cumple. Realizado = lo ya cerrado.
    const esperado  = activas.reduce((s, c) => s + getPrice(c), 0);
    const realizado = completadas.reduce((s, c) => s + getPrice(c), 0);

    // Carga por barbero, para ver quién está copado y quién libre.
    const porBarbero = (barberos || []).map(b => ({
      nombre: b.nombre,
      n: activas.filter(c => c.barberoId === b.id).length,
    })).sort((a, b) => b.n - a.n);

    return { activas, confirmadas, completadas, pendientes, canceladas, noAsistio,
             sinBarbero, sinHora, esperado, realizado, porBarbero };
  }, [citas, barberos, precioMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = n => '$' + Number(n || 0).toLocaleString('es-CL');

  const Stat = ({ label, valor, color = 'text-primary' }) => (
    <div className="rounded-2xl bg-slate-800/50 px-3.5 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-[22px] font-semibold leading-none tracking-[-0.02em] ${color}`}>{valor}</p>
    </div>
  );

  // Solo lo que necesita acción entra acá: un panel lleno de avisos vacíos
  // enseña a ignorarlo.
  const avisos = [];
  if (r.sinBarbero.length) avisos.push(`${r.sinBarbero.length} cita${r.sinBarbero.length !== 1 ? 's' : ''} sin barbero asignado`);
  if (r.sinHora.length)    avisos.push(`${r.sinHora.length} cita${r.sinHora.length !== 1 ? 's' : ''} sin hora definida`);
  if (r.pendientes.length) avisos.push(`${r.pendientes.length} sin confirmar por el cliente`);

  return (
    <SheetModal
      icon={Activity}
      titulo="Resumen del día"
      sub={fechaLabel}
      onClose={onClose}
      maxW="max-w-[420px]"
      footer={<button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cerrar</button>}
    >
      {/* Titular: las dos cifras que resumen el día. */}
      <div className={sheetHighlight}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Se espera facturar</p>
        <p className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.02em] text-primary">{fmt(r.esperado)}</p>
        <p className="mt-1.5 text-[13px] text-slate-400">
          {r.activas.length} cita{r.activas.length !== 1 ? 's' : ''} activa{r.activas.length !== 1 ? 's' : ''}
          {r.realizado > 0 && <> · {fmt(r.realizado)} ya cerrado</>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Confirmadas" valor={r.confirmadas.length} color="text-emerald-400" />
        <Stat label="Completadas" valor={r.completadas.length} color="text-blue-400" />
        <Stat label="Pendientes"  valor={r.pendientes.length}  color={r.pendientes.length ? 'text-amber-400' : 'text-primary'} />
        <Stat label="Canceladas"  valor={r.canceladas.length + r.noAsistio.length} color={(r.canceladas.length + r.noAsistio.length) ? 'text-rose-400' : 'text-primary'} />
      </div>

      {avisos.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Requiere atención</p>
          <ul className="mt-1.5 space-y-1">
            {avisos.map(a => (
              <li key={a} className="flex items-start gap-2 text-[13px] leading-snug text-amber-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />{a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {r.porBarbero.length > 0 && (
        <div>
          <p className={sheetLabel}>Carga por barbero</p>
          <div className="space-y-1">
            {r.porBarbero.map(b => (
              <div key={b.nombre} className="flex items-center justify-between rounded-xl bg-slate-800/40 px-3.5 py-2.5 text-[13px]">
                <span className="truncate text-slate-300">{b.nombre}</span>
                <span className={`ml-2 shrink-0 font-semibold ${b.n ? 'text-slate-300' : 'text-slate-500'}`}>
                  {b.n === 0 ? 'sin citas' : `${b.n} cita${b.n !== 1 ? 's' : ''}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SheetModal>
  );
}

/* ── AvisarClienteModal — se abre DESPUÉS de mover una cita ──────
   Mover una cita cambia un compromiso que el cliente ya tenía tomado, y
   hasta ahora el sistema no ofrecía ninguna forma de contárselo: el
   local tenía que acordarse solo y escribirle por fuera.

   El texto va en español neutro con "tú" (misma regla que el resto de
   los mensajes a cliente final: sin voseo ni chilenismos), y se puede
   editar antes de enviar. */
function AvisarClienteModal({ data, shopName, onClose }) {
  const fechaLarga = (f) => {
    try {
      return new Date(`${f}T12:00:00`).toLocaleDateString('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
    } catch { return f; }
  };

  const nombre = (data.cita.clienteNombre || '').trim().split(' ')[0] || '';
  const textoBase =
    `Hola${nombre ? ' ' + nombre : ''}! Te escribimos de ${shopName || 'la barbería'} ` +
    `para avisarte que movimos la hora de tu cita.\n\n` +
    `Nueva hora: ${fechaLarga(data.fecha)} a las ${data.hora}\n` +
    (data.barberoNombre ? `Con: ${data.barberoNombre}\n` : '') +
    `\nSi no te acomoda, respóndenos este mensaje y la reagendamos. ¡Te esperamos!`;

  const [texto, setTexto] = useState(textoBase);
  const [copiado, setCopiado] = useState(false);

  const tel = String(data.cita.clienteTelefono || '').replace(/\D/g, '');
  const waUrl = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}` : null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* sin portapapeles: el textarea queda seleccionable igual */ }
  };

  return (
    <SheetModal
      icon={MessageCircle}
      titulo="Avísale a tu cliente"
      sub={`Cambiaste la hora de ${data.cita.clienteNombre || 'la cita'}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Ahora no</button>
          <button onClick={copiar} className={`${sheetBtn.base} ${sheetBtn.ghost} !flex-none px-4`}>
            {copiado ? '¡Listo!' : 'Copiar'}
          </button>
          {waUrl && (
            <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={onClose}
              className={`${sheetBtn.base} ${sheetBtn.primary} grid place-items-center`}>
              WhatsApp
            </a>
          )}
        </>
      }
    >
      {/* El mensaje se ve como una burbuja de chat, no como un formulario:
          así se entiende de inmediato que es lo que va a recibir el cliente. */}
      <div>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={7}
          className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3.5 text-[14px] leading-relaxed text-primary transition-colors focus:border-emerald-500/60 focus:outline-none"
        />
        <p className="mt-2 px-1 text-[12px] text-slate-500">Puedes editarlo antes de enviar.</p>
      </div>

      {!tel && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12.5px] leading-snug text-amber-300">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Esta cita no tiene teléfono guardado, así que no podemos abrir WhatsApp. Copia el mensaje y envíaselo por donde lo tengas.</span>
        </div>
      )}
    </SheetModal>
  );
}

/* ── ReagendarModal — aviso de la app al mover una cita ─────────── */
function ReagendarModal({ data, dateStr, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const [fecha, setFecha]     = useState(data?.fecha || dateStr);
  if (!data) return null;
  const otroDia = fecha !== dateStr;
  // La advertencia de sobrecupo solo aplica al día visible (no conocemos la ocupación de otros días).
  const ocupada = data.ocupada && !otroDia;
  const handle  = async () => { setLoading(true); await onConfirm(fecha); setLoading(false); };

  return (
    <SheetModal
      icon={CalendarDays}
      tone={ocupada ? 'amber' : 'emerald'}
      titulo="Mover cita"
      sub={data.cita.clienteNombre || 'Cliente'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cancelar</button>
          <button onClick={handle} disabled={loading}
            className={`${sheetBtn.base} ${ocupada ? sheetBtn.warn : sheetBtn.primary}`}>
            {loading ? 'Moviendo…' : ocupada ? 'Mover igual' : 'Mover cita'}
          </button>
        </>
      }
    >
      {/* El destino como dato destacado, no como frase corrida: es lo que
          el usuario viene a confirmar de un vistazo. */}
      <div className="rounded-2xl bg-slate-800/50 px-4 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Nueva hora</p>
        <p className="mt-1 text-[19px] font-semibold leading-tight tracking-[-0.01em] text-primary">
          {data.hora}
        </p>
        <p className="mt-0.5 text-[13px] text-slate-400">
          con {data.barberoNombre}{otroDia && <> · {fecha}</>}
        </p>
      </div>

      <div>
        <label className="mb-2 block px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fecha</label>
        <input
          type="date"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3 text-[15px] text-primary transition-colors focus:border-emerald-500/60 focus:outline-none"
        />
        <p className="mt-2 px-1 text-[12px] text-slate-500">Cámbiala para reagendar a otro día.</p>
      </div>

      {ocupada && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12.5px] leading-snug text-amber-300">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Ese horario <b>ya tiene una cita</b>. Quedará como <b>sobrecupo</b>: dos citas a la misma hora. Asegúrate de poder atender ambas.</span>
        </div>
      )}
    </SheetModal>
  );
}

/* ── HistorialNotasModal — historial rápido + notas internas del equipo ── */
const ESTADO_BADGE_HN = {
  Confirmada: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Confirmado: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Completada: 'bg-blue-500/20   text-blue-300   border-blue-500/40',
  Cancelada:  'bg-red-500/20    text-red-300    border-red-500/40',
  Pendiente:  'bg-amber-500/20  text-amber-300  border-amber-500/40',
  NoAsistio:  'bg-rose-500/20   text-rose-300   border-rose-500/40',
};

function fmtFechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function HistorialNotasModal({ cita, onClose }) {
  const [visitas,     setVisitas]     = useState(null); // null = cargando
  const [nota,        setNota]        = useState('');
  const [notaOrig,    setNotaOrig]    = useState('');
  const [loadingNota, setLoadingNota] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [savedMsg,    setSavedMsg]    = useState('');

  // Clave estable para asociar las notas al cliente: teléfono → email → id.
  const clientKey = useMemo(() => (
    (cita.clienteTelefono || '').replace(/\D/g, '')
    || (cita.clienteEmail || '').trim().toLowerCase()
    || cita.clienteId
    || null
  ), [cita]);

  // Últimas visitas (mismo patrón/índice que UltimaCitaModal).
  useEffect(() => {
    if (!cita?.clienteNombre) { setVisitas([]); return; }
    withTimeout(getDocs(query(
      tenantCol('citas'),
      where('clienteNombre', '==', cita.clienteNombre),
      orderBy('fecha', 'desc'),
      limit(30),
    )), 20000, 'agenda/visitas-cliente')
      .then(snap => setVisitas(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setVisitas([]));
  }, [cita?.clienteNombre]);

  // Nota interna confidencial (colección admin_notes — solo staff).
  useEffect(() => {
    if (!clientKey) { setLoadingNota(false); return; }
    withTimeout(getDoc(doc(tenantCol('admin_notes'), clientKey)), 10000, 'agenda/nota-interna')
      .then(snap => {
        const v = snap.exists() ? (snap.data().notaInterna || '') : '';
        setNota(v); setNotaOrig(v);
      })
      .catch(() => {})
      .finally(() => setLoadingNota(false));
  }, [clientKey]);

  const guardarNota = async () => {
    if (!clientKey) return;
    setSaving(true); setSavedMsg('');
    try {
      await setDoc(doc(tenantCol('admin_notes'), clientKey), {
        notaInterna:     nota.trim(),
        clienteNombre:   cita.clienteNombre   || '',
        clienteTelefono: cita.clienteTelefono || '',
        clienteEmail:    cita.clienteEmail    || '',
        updatedAt:       serverTimestamp(),
      }, { merge: true });
      setNotaOrig(nota.trim());
      setSavedMsg('✓ Guardado');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      setSavedMsg('Error: ' + e.message);
    } finally { setSaving(false); }
  };

  const dirty       = nota.trim() !== notaOrig.trim();
  const completadas = (visitas || []).filter(v => v.estado === 'Completada').length;
  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <History size={15} className="text-emerald-400" />
          Historial y notas
        </span>
      }
      onClose={onClose}
      maxW="max-w-lg"
    >
      {/* Cabecera del cliente */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-primary truncate">{cita.clienteNombre || 'Cliente'}</p>
          <p className="text-xs text-slate-500 truncate">
            {cita.clienteTelefono || cita.clienteEmail || 'Sin contacto'}
          </p>
        </div>
        {visitas && (
          <div className="flex gap-2 shrink-0">
            <span className="text-center px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
              <span className="block text-sm font-black text-primary leading-none">{visitas.length}</span>
              <span className="block text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">visitas</span>
            </span>
            <span className="text-center px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <span className="block text-sm font-black text-blue-300 leading-none">{completadas}</span>
              <span className="block text-[9px] text-blue-400/70 uppercase tracking-wide mt-0.5">hechas</span>
            </span>
          </div>
        )}
      </div>

      {/* Notas internas confidenciales */}
      <div className="bg-amber-500/[0.04] border border-amber-500/20 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <Lock size={12} className="text-amber-400 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Notas internas (privadas del equipo)</p>
        </div>
        {loadingNota ? (
          <div className="h-20 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          </div>
        ) : clientKey ? (
          <>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={4}
              placeholder="Fórmulas de color, preferencias, alergias, observaciones del equipo… (no lo ve el cliente)"
              className={`${inp} resize-y leading-relaxed`}
            />
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${savedMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{savedMsg}</span>
              <button
                onClick={guardarNota}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-primary text-xs font-bold rounded-lg transition-all"
              >
                {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Guardando…' : 'Guardar nota'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500 py-2">
            Este cliente no tiene teléfono ni correo para asociar la nota. Agrégale un contacto editando la cita.
          </p>
        )}
      </div>

      {/* Últimas visitas + fórmulas usadas */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Últimas visitas</p>
        {visitas === null ? (
          <div className="flex justify-center py-6">
            <span className="w-5 h-5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          </div>
        ) : visitas.length === 0 ? (
          <div className="flex flex-col items-center py-6 gap-2 text-center">
            <CalendarDays size={26} className="text-slate-700" />
            <p className="text-sm text-slate-500">Sin visitas registradas.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
            {visitas.map(v => (
              <div key={v.id} className="bg-slate-800/40 border border-slate-800 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400 shrink-0">{fmtFechaCorta(v.fecha)}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${ESTADO_BADGE_HN[v.estado] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                    {v.estado || '—'}
                  </span>
                  <span className="text-xs text-primary truncate ml-auto text-right">{v.servicioNombre || '—'}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {v.hora}{v.barbero ? ` · ${v.barbero}` : ''}
                  {v.precio != null && !v.cortesia ? ` · $${Number(v.precio).toLocaleString('es-CL')}` : ''}
                  {v.cortesia ? ' · Cortesía' : ''}
                </p>
                {v.nota && v.nota.trim() && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-200/90 bg-amber-500/[0.06] border border-amber-500/20 rounded-lg px-2 py-1.5 leading-relaxed">
                    <Scissors size={11} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="break-words">{v.nota}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── UltimaCitaModal ─────────────────────────────────────────── */
const ESTADO_BADGE = {
  Confirmada: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Confirmado: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Completada: 'bg-blue-500/20   text-blue-300   border-blue-500/40',
  Cancelada:  'bg-red-500/20    text-red-300    border-red-500/40',
  Pendiente:  'bg-amber-500/20  text-amber-300  border-amber-500/40',
  NoAsistio:  'bg-rose-500/20   text-rose-300   border-rose-500/40',
};

function fmtTimestamp(val) {
  if (!val) return '—';
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800 last:border-b-0">
      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm text-primary break-words">{value}</p>
      </div>
    </div>
  );
}

function UltimaCitaModal({ cita, loading, onClose, titleText = 'Última cita agendada' }) {
  const [clientHistory, setClientHistory] = useState(null);
  useEffect(() => {
    if (!cita?.clienteNombre || loading) { setClientHistory(null); return; }
    withTimeout(getDocs(query(
      tenantCol('citas'),
      where('clienteNombre', '==', cita.clienteNombre),
      orderBy('fecha', 'desc'),
      limit(50),
    )), 20000, 'agenda/ultima-cita')
      .then(snap => {
        const rows = snap.docs.map(d => d.data());
        const svcCnt = {};
        rows.forEach(r => { if (r.servicioNombre) svcCnt[r.servicioNombre] = (svcCnt[r.servicioNombre] || 0) + 1; });
        const favSvc = Object.entries(svcCnt).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        const completadas = rows.filter(r => r.estado === 'Completada');
        const canceladas = rows.filter(r => r.estado === 'Cancelada').length;
        setClientHistory({ total: rows.length, favSvc, lastVisit: completadas[0]?.fecha || null, canceladas });
      })
      .catch(() => {});
  }, [cita?.clienteNombre, loading]);

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <History size={15} className="text-slate-400" />
          {titleText}
        </span>
      }
      onClose={onClose}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        </div>
      ) : !cita ? (
        <div className="flex flex-col items-center py-8 text-center gap-2">
          <CalendarDays size={32} className="text-slate-700" />
          <p className="text-sm text-slate-500">No hay citas registradas aún.</p>
        </div>
      ) : (
        <div>
          {/* Estado badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${ESTADO_BADGE[cita.estado] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
              {cita.estado ?? 'Sin estado'}
            </span>
            <span className="text-xs text-slate-600 font-mono">{cita.fecha} · {cita.hora}</span>
          </div>

          {/* Datos del cliente */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cliente</p>
          <div className="bg-slate-800/50 rounded-xl px-4 mb-4">
            <Row icon={User}         label="Nombre"    value={cita.clienteNombre}   />
            <Row icon={Mail}         label="Email"     value={cita.clienteEmail}    />
            <Row icon={Phone}        label="Teléfono"  value={cita.clienteTelefono} />
          </div>

          {/* Datos de la cita */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Cita</p>
          <div className="bg-slate-800/50 rounded-xl px-4 mb-4">
            <Row icon={CalendarDays} label="Fecha"     value={cita.fecha}           />
            <Row icon={Clock}        label="Hora"      value={cita.hora}            />
            <Row icon={Scissors}     label="Servicio"  value={cita.servicioNombre}  />
            <Row icon={BadgeCheck}   label="Barbero"   value={cita.barbero}         />
            {cita.sucursalNombre && <Row icon={MapPin} label="Sede" value={cita.sucursalNombre} />}
            <Row icon={Timer}        label="Duración"  value={cita.duracion ? `${cita.duracion} min` : null} />
            <Row icon={DollarSign}   label="Precio"    value={cita.cortesia ? 'Cortesía (gratis)' : (cita.precio != null ? `$${Number(cita.precio).toLocaleString('es-CL')}` : null)} />
            {!cita.cortesia && cita.porcentajeDescuento > 0 && <Row icon={DollarSign} label="Descuento" value={`${cita.porcentajeDescuento}%`} />}
          </div>

          {/* Nota y fecha de reserva */}
          {cita.nota && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Nota</p>
              <div className="bg-slate-800/50 rounded-xl px-4 mb-4">
                <Row icon={MessageSquare} label="Nota interna" value={cita.nota} />
              </div>
            </>
          )}

          <p className="text-[10px] text-slate-600 text-right mt-2">
            Reservada el {fmtTimestamp(cita.creadoEn)}
          </p>

          {clientHistory && (() => {
            const rate = clientHistory.total > 0 ? Math.round((clientHistory.canceladas / clientHistory.total) * 100) : 0;
            const isHighRisk = rate >= 25 && clientHistory.total >= 3;
            return (
              <>
                {isHighRisk && (
                  <div className="relative overflow-hidden bg-red-950/20 border border-red-500/30 rounded-xl p-4 mt-3 shadow-lg shadow-red-950/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-2 mb-2">
                      <Ban className="text-red-400 shrink-0 animate-pulse" size={14} />
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                        Riesgo de Inasistencia Alto
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-normal">
                      Este cliente ha cancelado el <strong className="text-red-400">{rate}%</strong> de sus citas ({clientHistory.canceladas} de {clientHistory.total}). Se recomienda reconfirmar asistencia antes del servicio.
                    </p>
                  </div>
                )}

                <div className="relative overflow-hidden bg-slate-900 border border-violet-500/20 rounded-xl p-4 mt-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                      <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">Historial IA</span>
                    </div>
                    <span className="text-[9px] text-slate-600 ml-auto">Basado en {clientHistory.total} visita{clientHistory.total !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center bg-slate-800/60 rounded-lg py-2 px-1">
                      <p className="text-lg font-bold text-primary leading-none">{clientHistory.total}</p>
                      <p className="text-[9px] text-slate-500 mt-1">citas totales</p>
                    </div>
                    <div className="text-center bg-slate-800/60 rounded-lg py-2 px-1">
                      <p className="text-xs font-bold text-primary truncate leading-tight">{clientHistory.favSvc || '—'}</p>
                      <p className="text-[9px] text-slate-500 mt-1">servicio fav.</p>
                    </div>
                    <div className="text-center bg-slate-800/60 rounded-lg py-2 px-1">
                      <p className="text-xs font-bold text-primary leading-tight">{clientHistory.lastVisit || '—'}</p>
                      <p className="text-[9px] text-slate-500 mt-1">última visita</p>
                    </div>
                  </div>
                  <AIWatermark />
                </div>
              </>
            );
          })()}
        </div>
      )}
    </Modal>
  );
}

/* ── HistorialModal ──────────────────────────────────────────── */
const ESTADOS_FILTRO = ['Confirmada', 'Completada', 'Cancelada', 'Pendiente', 'NoAsistio'];

function HistorialModal({ onClose }) {
  const [search,  setSearch]  = useState('');
  const [estado,  setEstado]  = useState('');
  const [detalle, setDetalle] = useState(null);

  const { data: citas, loading } = useCollection(
    'citas',
    [orderBy('creadoEn', 'desc'), limit(200)],
    [],
  );

  const filtered = useMemo(() => citas.filter(c => {
    if (estado && c.estado !== estado) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      return (
        c.clienteNombre?.toLowerCase().includes(q) ||
        c.servicioNombre?.toLowerCase().includes(q) ||
        c.barbero?.toLowerCase().includes(q)
      );
    }
    return true;
  }), [citas, search, estado]);

  const fmtFecha = f => {
    if (!f) return '—';
    const [y, m, d] = f.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <Modal
        title={
          <span className="flex items-center gap-2">
            <History size={15} className="text-slate-400" />
            Historial de citas
          </span>
        }
        onClose={onClose}
        maxW="max-w-2xl"
      >
        {/* Barra de búsqueda y filtros */}
        <div className="flex gap-2 mb-1">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, servicio o barbero…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>
          <div className="relative">
            <ListFilter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <Select
              ariaLabel="Filtrar por estado"
              value={estado}
              onChange={setEstado}
              className="min-w-[7.5rem] bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-primary focus:outline-none focus:border-slate-500 transition-colors"
              options={[{ value: '', label: 'Todos' },
                        ...ESTADOS_FILTRO.map(e => ({ value: e, label: STATUS_LABEL[e] || e }))]}
            />
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          {loading ? 'Cargando…' : `${filtered.length} cita${filtered.length !== 1 ? 's' : ''}`}
          {!loading && citas.length >= 200 && ' (mostrando últimas 200)'}
        </p>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2 text-center">
            <CalendarDays size={32} className="text-slate-700" />
            <p className="text-sm text-slate-500">Sin resultados.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setDetalle(c)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all group"
              >
                {/* Estado dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  c.estado === 'Completada' ? 'bg-blue-400' :
                  c.estado === 'Cancelada'  ? 'bg-red-400'  :
                  c.estado === 'Pendiente'  ? 'bg-amber-400':
                  c.estado === 'NoAsistio'  ? 'bg-rose-400' :
                  'bg-emerald-400'
                }`} />

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-primary truncate">{c.clienteNombre || 'Sin nombre'}</p>
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${ESTADO_BADGE[c.estado] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                      {c.estado ?? '—'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {c.servicioNombre || '—'}{c.barbero ? ` · ${c.barbero}` : ''}{c.sucursalNombre ? ` · ${c.sucursalNombre}` : ''}
                  </p>
                </div>

                {/* Fecha + hora */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-400">{fmtFecha(c.fecha)}</p>
                  <p className="text-[10px] text-slate-600">{c.hora || '—'}</p>
                </div>

                <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Detalle de cita seleccionada */}
      {detalle && (
        <UltimaCitaModal
          cita={detalle}
          loading={false}
          titleText="Detalle de cita"
          onClose={() => setDetalle(null)}
        />
      )}
    </>
  );
}

/* ── UltimasCitasModal (últimas 5) ───────────────────────────── */
function UltimasCitasModal({ citas, loading, onClose }) {
  const [detalle, setDetalle] = useState(null);

  if (detalle) {
    return (
      <UltimaCitaModal
        cita={detalle}
        loading={false}
        titleText="Detalle de cita"
        onClose={() => setDetalle(null)}
      />
    );
  }

  return (
    <Modal
      title={
        <span className="flex items-center gap-2">
          <History size={15} className="text-slate-400" />
          Últimas 5 citas
        </span>
      }
      onClose={onClose}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
        </div>
      ) : citas.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center gap-2">
          <CalendarDays size={32} className="text-slate-700" />
          <p className="text-sm text-slate-500">No hay citas registradas aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {citas.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setDetalle(c)}
              className="w-full flex items-center gap-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl px-4 py-3 text-left transition-all group"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{c.clienteNombre || '—'}</p>
                <p className="text-xs text-slate-500">{c.servicioNombre || '—'} · {c.fecha} {c.hora}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${ESTADO_BADGE[c.estado] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                {c.estado}
              </span>
              <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ── DifusionPanel (Universal & Tematizado) ───────────────── */
function DifusionPanel({ citas, bloqueos, barberos, dateStr, tenantId }) {
  const [copied, setCopied] = useState(false);
  const [shopSettings, setShopSettings] = useState(null);

  useEffect(() => {
    withTimeout(getDoc(doc(tenantCol('settings'), 'general')), 10000, 'agenda/settings-general')
      .then(snap => { if (snap.exists()) setShopSettings(snap.data()); })
      .catch(() => {});
  }, []);

  // Hours config
  const SHOP_START = 10 * 60; // 10:00
  const SHOP_END   = 20 * 60; // 20:00
  const SLOT_M     = 30;

  const allSlots = useMemo(() => {
    const slots = [];
    for (let m = SHOP_START; m < SHOP_END; m += SLOT_M) {
      const h  = String(Math.floor(m / 60)).padStart(2, '0');
      const mn = String(m % 60).padStart(2, '0');
      slots.push(`${h}:${mn}`);
    }
    return slots;
  }, []);

  // Build occupied map: hora -> clienteNombre
  const occupied = useMemo(() => {
    const map = {};
    (citas || []).forEach(c => {
      // NoAsistio: no bloquea el slot en el mapa (como Cancelada) — el horario
      // queda visualmente libre en la vista de "occupied" del día.
      if (c.estado !== 'Cancelada' && c.estado !== 'NoAsistio') {
        const dur  = Number(c.duracion || c.duracionServicio || 30);
        const base = c.hora;
        // Guard: citas legacy/corruptas pueden traer hora=null/'' → base.split
        // explota y tumba el render completo de la agenda. Las saltamos.
        if (typeof base !== 'string' || !base.includes(':')) return;
        const baseMin = parseInt(base.split(':')[0]) * 60 + parseInt(base.split(':')[1]);
        for (let offset = 0; offset < dur; offset += SLOT_M) {
          const m = baseMin + offset;
          const key = `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
          map[key] = c.clienteNombre || 'Cliente';
        }
      }
    });
    // Mark bloqueos
    (bloqueos || []).forEach(b => {
      if (b.todo_el_dia) {
        allSlots.forEach(s => { map[s] = 'BLOQUEADO'; });
      } else if (b.hora_inicio && b.hora_fin) {
        const ini = parseInt(b.hora_inicio.split(':')[0])*60 + parseInt(b.hora_inicio.split(':')[1]);
        const fin = parseInt(b.hora_fin.split(':')[0])*60 + parseInt(b.hora_fin.split(':')[1]);
        for (let m = ini; m < fin; m += SLOT_M) {
          const key = `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
          map[key] = 'BLOQUEADO';
        }
      }
    });
    return map;
  }, [citas, bloqueos, allSlots]);

  const freeSlots = useMemo(() => allSlots.filter(s => !occupied[s]), [allSlots, occupied]);

  const fechaFmt = useMemo(() => {
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }, [dateStr]);

  const shopName = WA_SHOP_NAMES[tenantId] || 'tu negocio';
  const TENANT_ACCENTS = {
    elegance: '#D4AF37',
    ferraza: '#e2e8f0',
    lumen: '#C9A050',
    gitana: '#f43f5e',
    chameleon: '#00C8FF',
  };
  const accentColor = TENANT_ACCENTS[tenantId] || '#D4AF37';

  // Generate broadcast message
  const message = useMemo(() => {
    const domain = `${tenantId}.synaptechspa.cl`;
    const titulo = `✂️ *${shopName}* — ${fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1)}`;
    const ubicacion  = typeof shopSettings?.direccion === 'string' && shopSettings.direccion
      ? `📍 ${shopSettings.direccion.replace(/^📍\s*/, '')}`
      : '📍 tu local';
    const horarioTxt = '🕒 Lun a Sáb: 10:00 – 20:00 hrs.';
    const cta = `📲 Agenda tu hora ahora:\n   ${domain}`;

    if (freeSlots.length === 0) {
      return `${titulo}\n\n` +
             `La agenda para este día está *completa*.\n\n` +
             `${ubicacion}\n${horarioTxt}\n\n` +
             `${cta}\n\n_¡Te esperamos!_ ✂️🙌`;
    }
    const horasStr = freeSlots.map(h => `   • ${h}`).join('\n');
    return (
      `${titulo}\n\n` +
      `🟢 *Horas disponibles (${freeSlots.length}):*\n${horasStr}\n\n` +
      `${ubicacion}\n${horarioTxt}\n\n` +
      `${cta}\n\n_¡Te esperamos!_ ✂️🙌`
    );
  }, [freeSlots, fechaFmt, shopSettings, tenantId, shopName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // PNG export using Canvas
  const handleExport = () => {
    const CARD_W   = 800;
    const SLOT_H   = 44;
    const PADDING  = 32;
    const HEADER_H = 110;
    const FOOTER_H = 60;
    const TOTAL_H  = HEADER_H + allSlots.length * SLOT_H + FOOTER_H + PADDING * 2;

    const canvas  = document.createElement('canvas');
    const DPR     = 2;
    canvas.width  = CARD_W * DPR;
    canvas.height = TOTAL_H * DPR;
    canvas.style.width  = `${CARD_W}px`;
    canvas.style.height = `${TOTAL_H}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    // Background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, CARD_W, TOTAL_H);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CARD_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TOTAL_H); ctx.stroke();
    }
    for (let y = 0; y < TOTAL_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CARD_W, y); ctx.stroke();
    }

    // Top accent bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(PADDING, PADDING, CARD_W - PADDING * 2, 2);

    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(shopName, PADDING, PADDING + 38);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`Horarios Disponibles  ·  ${fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1)}`, PADDING, PADDING + 62);

    // Stats row
    const libre = freeSlots.length;
    const ocup  = allSlots.length - libre;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.roundRect(PADDING, PADDING + 74, 140, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`🟢  ${libre} disponibles`, PADDING + 12, PADDING + 93);

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.roundRect(PADDING + 152, PADDING + 74, 130, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`🔴  ${ocup} ocupadas`, PADDING + 164, PADDING + 93);

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, HEADER_H + PADDING - 8);
    ctx.lineTo(CARD_W - PADDING, HEADER_H + PADDING - 8);
    ctx.stroke();

    // Slot rows
    const COL_TIME = PADDING;
    const COL_STATUS = PADDING + 80;
    const COL_NAME = PADDING + 170;
    const ROW_W = CARD_W - PADDING * 2;

    allSlots.forEach((slot, i) => {
      const y = HEADER_H + PADDING + i * SLOT_H;
      const isOcc = !!occupied[slot];
      const isBloq = occupied[slot] === 'BLOQUEADO';
      const isEven = i % 2 === 0;

      // Row bg
      if (isEven) {
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(PADDING, y, ROW_W, SLOT_H - 1);
      }

      // Status pill
      if (isOcc) {
        ctx.fillStyle = isBloq ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)';
        ctx.beginPath();
        ctx.roundRect(COL_STATUS - 4, y + 10, isBloq ? 72 : 60, 22, 6);
        ctx.fill();
        ctx.fillStyle = isBloq ? '#fbbf24' : '#f87171';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(isBloq ? 'BLOQUEADO' : 'OCUPADO', COL_STATUS + 4, y + 25);
      } else {
        ctx.fillStyle = 'rgba(74,222,128,0.12)';
        ctx.beginPath();
        ctx.roundRect(COL_STATUS - 4, y + 10, 72, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('LIBRE ✓', COL_STATUS + 4, y + 25);
      }

      // Time
      ctx.fillStyle = isOcc ? 'rgba(255,255,255,0.5)' : '#ffffff';
      ctx.font = `${isOcc ? '500' : 'bold'} 14px -apple-system, BlinkMacSystemFont, monospace`;
      ctx.fillText(slot, COL_TIME, y + 27);

      // Client name
      if (isOcc && !isBloq && occupied[slot]) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
        const name = occupied[slot];
        ctx.fillText(name.length > 28 ? name.slice(0, 26) + '…' : name, COL_NAME, y + 27);
      }

      // Row bottom border
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PADDING, y + SLOT_H - 1);
      ctx.lineTo(CARD_W - PADDING, y + SLOT_H - 1);
      ctx.stroke();
    });

    // Footer
    const footerY = HEADER_H + PADDING + allSlots.length * SLOT_H + 16;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, footerY); ctx.lineTo(CARD_W - PADDING, footerY); ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${tenantId}.synaptechspa.cl  ·  ${shopName}`, PADDING, footerY + 26);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${new Date().toLocaleDateString('es-CL', {hour:'2-digit', minute:'2-digit'})}`, CARD_W - PADDING, footerY + 26);
    ctx.textAlign = 'left';

    // Bottom accent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(PADDING, TOTAL_H - PADDING - 2, CARD_W - PADDING * 2, 2);

    // Download
    const link = document.createElement('a');
    link.download = `marcelo-agenda-${dateStr}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="shrink-0 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Send size={13} className="text-slate-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-primary tracking-wide">Canal de difusión</p>
            <p className="text-[10px] text-slate-500">
              {freeSlots.length} hora{freeSlots.length !== 1 ? 's' : ''} libre{freeSlots.length !== 1 ? 's' : ''} · {fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExport}
            title="Exportar imagen PNG"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600 transition-all"
          >
            <Download size={12} /> Imagen PNG
          </button>
          <button
            onClick={handleCopy}
            title="Copiar mensaje"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              copied
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600'
            }`}
          >
            {copied ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
          </button>
        </div>
      </div>

      {/* Message preview */}
      <div className="px-4 py-3">
        <pre
          className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-slate-300 bg-slate-900 rounded-lg border border-slate-800 px-4 py-3 max-h-[180px] overflow-y-auto"
          style={{ fontFamily: 'inherit' }}
        >
          {message}
        </pre>
      </div>

      {/* Mini slot preview chips */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {allSlots.map(slot => {
          const isOcc  = !!occupied[slot];
          const isBloq = occupied[slot] === 'BLOQUEADO';
          return (
            <span
              key={slot}
              title={isOcc ? (isBloq ? 'Bloqueado' : occupied[slot]) : 'Libre'}
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                isBloq
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  : isOcc
                    ? 'border-red-500/25 bg-red-500/08 text-red-400/70'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
              }`}
            >
              {slot}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Toolbar overflow menu item ──────────────────────────────── */
function MenuItem({ icon: Icon, label, onClick, active, badge, accent }) {
  const tone = accent === 'amber'
    ? 'text-amber-400 hover:bg-amber-500/10'
    : active
      ? 'text-red-400 bg-red-500/10'
      : 'text-slate-300 hover:bg-slate-800 hover:text-primary';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${tone}`}
    >
      <Icon size={15} className="shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {badge && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
    </button>
  );
}

/* ── Main Agenda component ───────────────────────────────────── */
const LS_LAST_SEEN = 'agenda_last_seen_cita';

export default function Agenda() {
  // `name` se usa al avisarle al cliente que se movió su cita: el mensaje
  // se firma con el nombre del local, no con un genérico.
  const { id: tenantId, name: tenantName } = useTenant();
  // Duración de franja cacheada por sede → evita el parpadeo del eje "denso" en la primera carga.
  const SLOT_KEY = `agenda_slot_${tenantId}`;
  const [slotMins,      setSlotMins]      = useState(() => snapResolucion(localStorage.getItem(SLOT_KEY)));
  const [hourStart,     setHourStart]     = useState(8);
  const [hourEnd,       setHourEnd]       = useState(20);
  const [cfgHorario,    setCfgHorario]    = useState(null);  // { horarioInicio, horarioFin, diasConfig } para rango por día
  const [date,          setDate]          = useState(new Date());
  const [showHelp,      setShowHelp]      = useState(false);
  const [hasNewCita,    setHasNewCita]    = useState(false);
  const [blockMode,     setBlockMode]     = useState(false);
  const [citaModal,     setCitaModal]     = useState(null);
  const [blqModal,      setBlqModal]      = useState(null);
  const [reviewCita,    setReviewCita]    = useState(null);
  const [showUltima,    setShowUltima]    = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [draggedCita,   setDraggedCita]   = useState(null);
  const [reagendarModal, setReagendarModal] = useState(null);
  const [showResumen, setShowResumen] = useState(false);
  // Se llena al mover una cita con éxito → abre AvisarClienteModal.
  const [avisarModal, setAvisarModal] = useState(null);
  const [ctxMenu,       setCtxMenu]       = useState(null);  // { x, y, cita } menú clic derecho sobre una cita
  const [histModal,     setHistModal]     = useState(null);  // cita seleccionada para ver historial/notas
  const [showDifusionModal, setShowDifusionModal] = useState(false);
  const [soloBarbero,   setSoloBarbero]   = useState(null);   // id del barbero enfocado (null = todos)
  // Modo de vista de la agenda:
  //   'day'   → grilla horaria, una columna por barbero
  //   'week'  → con un barbero filtrado: grilla horaria de sus 7 días.
  //             sin filtro: lista compacta por día, con las citas de TODOS.
  //   'month' → grilla de calendario, citas de todos, con "+N más"
  //
  // Semana y Mes "de todos" no usan grilla horaria a propósito: 7 días × N
  // barberos de ancho no entra en pantalla. Por eso son listas ordenadas por
  // hora — es lo mismo que hace WeiBook, y es lo que las hace escalar.
  const [viewMode,      setViewMode]      = useState(() => {
    const v = localStorage.getItem('agenda_admin_view');
    return (v === 'week' || v === 'month') ? v : 'day';
  });
  const [labelStep,     setLabelStep]     = useState(() => snapResolucion(localStorage.getItem(SLOT_KEY)));     // minutos entre etiquetas visibles en el eje
  const [showMenu,      setShowMenu]      = useState(false);  // menú "Más" de acciones secundarias
  const [now,           setNow]           = useState(() => new Date()); // hora actual (línea "ahora")
  const menuRef = useRef(null);
  const swimRef = useRef(null);            // contenedor scrolleable de la grilla
  const didAutoScroll = useRef(false);     // auto-scroll a "ahora" solo la primera vez

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // (El guardrail que forzaba 'day' al quitar el filtro de barbero se fue: la
  //  semana sin filtro ya no rompe el layout porque no es una grilla horaria,
  //  es una lista por día.)

  // Reloj en vivo: refresca cada 30s para mover la línea "ahora".
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const completarId = searchParams.get('completar');
    if (!completarId) return;
    withTimeout(getDoc(doc(tenantCol('citas'), completarId)), 10000, 'agenda/completar-cita')
      .then(snap => {
        if (!snap.exists()) return;
        const cita = { id: snap.id, ...snap.data() };
        // Cita legacy sin fecha → no navegamos, solo abrimos el modal con el estado actual.
        if (typeof cita.fecha !== 'string' || !cita.fecha.includes('-')) return;
        const [y, m, d] = cita.fecha.split('-').map(Number);
        setDate(new Date(y, m - 1, d));
        setCitaModal({ cita, barberoId: cita.barberoId, hora: cita.hora, defaultEstado: 'Completada' });
        setSearchParams(p => { p.delete('completar'); return p; }, { replace: true });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: ultimasCitas, loading: loadingUltima } = useCollection(
    'citas',
    [orderBy('creadoEn', 'desc'), limit(5)],
    [],
  );
  const ultimaCita = ultimasCitas[0] ?? null;

  useEffect(() => {
    if (!ultimaCita?.id) return;
    const lastSeen = localStorage.getItem(LS_LAST_SEEN);
    setHasNewCita(ultimaCita.id !== lastSeen);
  }, [ultimaCita?.id]);

  // Colación visible en la grilla: global (configuracion/main.colacion) con
  // override por barbero (barberos/{id}/configuracion/main.colacion) — misma
  // fuente que usa la agenda del profesional (agenda.html).
  const [colacionGlobal,    setColacionGlobal]    = useState(null);
  const [colacionesBarbero, setColacionesBarbero] = useState({});
  // Rótulos de hueco libre en la grilla: opt-in del local
  // (configuracion/main.mostrarHuecosLibres). Default apagado.
  const [verHuecos,         setVerHuecos]         = useState(false);

  useEffect(() => {
    withTimeout(getDoc(doc(tenantCol('configuracion'), 'main')), 10000, 'agenda/cfg-main')
      .then(snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.intervaloMinutos) { const r = snapResolucion(data.intervaloMinutos); setSlotMins(r); setLabelStep(r); try { localStorage.setItem(SLOT_KEY, String(r)); } catch { /* noop */ } }
        if (data.colacion && data.colacion.inicio && data.colacion.fin) setColacionGlobal(data.colacion);
        // Huecos libres: opt-in por local (Configuración → Agenda). Ausente =
        // apagado, para que ningún tenant se encuentre con la grilla llena de
        // etiquetas sin haberlas pedido.
        setVerHuecos(data.mostrarHuecosLibres === true);
        // Guardamos el horario completo; el rango visible se calcula POR DÍA (abajo),
        // respetando diasConfig (cada día puede cerrar a una hora distinta).
        setCfgHorario({ horarioInicio: data.horarioInicio, horarioFin: data.horarioFin, diasConfig: data.diasConfig || null });
      })
      .catch(() => {});
  }, []);

  const { matchSucursal, activeSucursal, sucursales: sedesList, multiSucursal: esMultiSucursal } = useSucursal();
  const { user: _authUser } = useAuth();
  // Superadmin (Ignacio) puede ver el fantasma QA en la agenda; los dueños no.
  const _isSuperadmin = (_authUser?.email || '').toLowerCase() === 'ignaciiio.mate@gmail.com';

  // Rango de horas visible según el horario del DÍA seleccionado.
  // Prioridad: horario POR SUCURSAL (sucursales[].horario, lo edita
  // Configuración → Horarios) > diasConfig global > horarioInicio/Fin global.
  // Caso real oren: la sede decía 10:00–20:00 pero la grilla usaba el
  // diasConfig global (sábado hasta 14:00) y cortaba la agenda a media tarde.
  // En "Todas" se muestra la unión (min inicio, max fin) de las sedes activas.
  useEffect(() => {
    const c = cfgHorario; if (!c) return;
    const dow = date.getDay();                         // 0=Dom … 6=Sáb
    const horarioDia = (sede) => {
      const h = sede && sede.horario; if (!h) return null;
      const d = h[dow] ?? h[String(dow)];
      return (d && d.activo !== false && d.inicio && d.fin) ? d : null;
    };
    let ini = null, fin = null;
    if (activeSucursal) {
      const d = horarioDia(activeSucursal);
      if (d) { ini = d.inicio; fin = d.fin; }
    } else if (esMultiSucursal && sedesList.length) {
      const toM = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
      let a = Infinity, b = -Infinity;
      for (const s of sedesList) {
        const d = horarioDia(s);
        if (d) { a = Math.min(a, toM(d.inicio)); b = Math.max(b, toM(d.fin)); }
      }
      if (isFinite(a) && isFinite(b)) {
        ini = `${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
        fin = `${String(Math.floor(b / 60)).padStart(2, '0')}:${String(b % 60).padStart(2, '0')}`;
      }
    }
    if (!ini || !fin) {                                 // fallback global (histórico)
      const dc = c.diasConfig || {};
      const day = dc[dow] ?? dc[String(dow)] ?? null;
      ini = (day && day.inicio) || c.horarioInicio || '08:00';
      fin = (day && day.fin)    || c.horarioFin    || '20:00';
    }
    const hi = parseInt(String(ini).split(':')[0], 10);
    const fp = String(fin).split(':').map(Number);
    const hf = fp[0], mf = fp[1] || 0;
    setHourStart(Number.isFinite(hi) ? hi : 8);
    setHourEnd(Number.isFinite(hf) ? (mf > 0 ? hf + 1 : hf) : 20);
  }, [cfgHorario, date, activeSucursal, sedesList, esMultiSucursal]);

  const dateStr = fmt(date);

  // Fechas visibles según el modo:
  //   day   → [dateStr]
  //   week  → 7 strings YYYY-MM-DD lunes → domingo
  //   month → 42 (6 semanas, con relleno de los meses vecinos)
  const weekDates    = useMemo(() => getWeekDates(date), [date]);
  const monthDates   = useMemo(() => getMonthGrid(date), [date]);
  const visibleDates = useMemo(() => {
    if (viewMode === 'month') return monthDates.map(fmt);
    if (viewMode === 'week')  return weekDates.map(fmt);
    return [dateStr];
  }, [viewMode, weekDates, monthDates, dateStr]);

  const { data: rawBarberos, loading: barberosLoading } = useCollection('barberos');

  // Colación por barbero — un getDoc por profesional visible, una sola vez
  // por cambio real de la lista (dep-key estable por ids, no por identidad
  // del array que useCollection renueva en cada snapshot).
  const _barberoIdsKey = (rawBarberos || []).map(b => b.id).sort().join(',');
  useEffect(() => {
    const ids = _barberoIdsKey ? _barberoIdsKey.split(',') : [];
    if (!ids.length) return;
    let cancelado = false;
    Promise.all(ids.map(id =>
      withTimeout(getDoc(doc(tenantCol('barberos'), id, 'configuracion', 'main')), 10000, 'agenda/cfg-barbero')
        .then(s => [id, s.exists() ? (s.data().colacion || null) : null])
        .catch(() => [id, null]),
    )).then(entries => { if (!cancelado) setColacionesBarbero(Object.fromEntries(entries)); });
    return () => { cancelado = true; };
  }, [_barberoIdsKey]);

  // Colación efectiva de un barbero: la suya propia > la global del local.
  const colacionDe = useCallback((barberoId) => {
    const propia = colacionesBarbero[barberoId];
    if (propia && propia.inicio && propia.fin) return propia;
    return colacionGlobal;
  }, [colacionesBarbero, colacionGlobal]);
  // Query por RANGO, no por 'in'. El 'in' de Firestore topea en 30 valores y la
  // grilla del mes son 42 días — no entra. Como `fecha` es 'YYYY-MM-DD', el
  // orden lexicográfico ES el cronológico, así que un >= / <= sobre el string
  // funciona y no tiene tope. Para day (1 día) y week (7) da exactamente lo
  // mismo que el 'in' que había antes.
  // dep-key: string estable, evita re-suscribir en render sin cambio real.
  const rangeStart = visibleDates[0];
  const rangeEnd   = visibleDates[visibleDates.length - 1];
  const _visibleDatesKey = `${rangeStart}..${rangeEnd}`;
  const dateRange = useMemo(
    () => [where('fecha', '>=', rangeStart), where('fecha', '<=', rangeEnd)],
    [rangeStart, rangeEnd],
  );
  const { data: citasAll }    = useCollection('citas',    dateRange, [_visibleDatesKey]);
  // Filtro por sede activa: en "Todas" pasa todo; con sede elegida solo sus
  // citas (por sucursalId/sucursalNombre; las sin sede pasan por compat).
  const citas = useMemo(() => citasAll.filter(matchSucursal), [citasAll, matchSucursal]);
  const { data: bloqueos }    = useCollection('bloqueos', dateRange, [_visibleDatesKey]);
  const { data: serviciosRaw } = useCollection('servicios');
  const { data: productos }   = useCollection('productos');

  // Respeta el orden que el local definió arrastrando en Servicios (campo
  // `orden`). Antes el desplegable de "Servicio" al crear una cita mostraba
  // el orden interno de Firestore, así que el trabajo de ordenarlos no se
  // veía acá (lo pidió Kronnos).
  //
  // Se ordena en el CLIENTE, no con orderBy('orden') en la query: Firestore
  // EXCLUYE los docs que no tienen el campo del orderBy, así que un servicio
  // creado por fuera del panel desaparecería del selector sin aviso. Hoy
  // todos tienen `orden`, pero el modo de fallar no vale la pena.
  const servicios = useMemo(
    () => [...serviciosRaw].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999)),
    [serviciosRaw],
  );

  // Rango horario efectivo: parte del rango del tenant y se estira si hay citas
  // (sobrecupos u horarios especiales) que caen antes o después. Así una cita
  // agendada a las 21:00 cuando el local cierra a las 20:00 se dibuja en la
  // grilla sin cortarse; y la reserva pública sigue usando el rango del tenant.
  const { hourStartEff, hourEndEff } = useMemo(() => {
    let hs = hourStart, he = hourEnd;
    // conHoraEstimada: las citas sin hora usan su hora estimada (creadoEn)
    // igual que en la grilla. Guard de ':' — sin él, String(null||'') = ''
    // y Number('') = 0, con lo que una cita con hora nula estiraba el rango
    // visible hasta las 00:00 (bug reportado por D'Jones).
    conHoraEstimada(citas || []).forEach(c => {
      const t = String(c.hora || '');
      if (!t.includes(':')) return;
      const parts = t.split(':').map(Number);
      if (!Number.isFinite(parts[0])) return;
      const dur = Number(c.duracion || c.duracionServicio || 30) || 30;
      const startMins = parts[0] * 60 + (parts[1] || 0);
      const endMins   = startMins + dur;
      const startH    = Math.floor(startMins / 60);
      const endH      = Math.ceil(endMins / 60);
      if (startH < hs) hs = startH;
      if (endH   > he) he = endH;
    });
    // Cinturón de seguridad: rango dentro de 0-24 h.
    hs = Math.max(0, Math.min(23, hs));
    he = Math.max(hs + 1, Math.min(24, he));
    return { hourStartEff: hs, hourEndEff: he };
  }, [citas, hourStart, hourEnd]);

  const slotCfg = useMemo(() => buildSlotCfg(slotMins, hourStartEff, hourEndEff), [slotMins, hourStartEff, hourEndEff]);
  const { totalSlots, timeLabels } = slotCfg;

  // ── Indicador "ahora" y salto a la hora actual ────────────────
  const isToday     = fmt(now) === dateStr;
  const nowMins     = now.getHours() * 60 + now.getMinutes();
  const nowInRange  = nowMins >= hourStartEff * 60 && nowMins <= hourEndEff * 60;
  const nowOffsetPx = ((nowMins - hourStartEff * 60) / slotMins) * SLOT_PX;
  const nowLabel    = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const showNowLine = isToday && nowInRange;

  const scrollToNow = () => {
    if (!isToday) setDate(new Date());
    requestAnimationFrame(() => {
      const el = swimRef.current;
      if (!el) return;
      const target = SLOT_PX + ((nowMins - hourStartEff * 60) / slotMins) * SLOT_PX - el.clientHeight / 2;
      el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    });
  };

  // Auto-scroll a la hora actual la primera vez que se ve el día de hoy.
  useEffect(() => {
    if (didAutoScroll.current || !showNowLine) return;
    const el = swimRef.current;
    if (!el) return;
    didAutoScroll.current = true;
    el.scrollTo({ top: Math.max(0, 36 + nowOffsetPx - el.clientHeight / 2), behavior: 'smooth' });
  }, [showNowLine, nowOffsetPx]);

  // Quién es columna de la agenda. El predicado vive en lib/roles.js y lo
  // comparte la reserva pública (vía ReservaCore): antes cada lado preguntaba
  // distinto y se podía ofrecer online a alguien que acá no se dibuja, dejando
  // citas que nadie ve. El fantasma de QA solo lo ve el superadmin.
  const barberos = useMemo(() =>
    rawBarberos.filter(b => atiendeSillon(b, tenantId, _isSuperadmin) && matchSucursal(b)),
  [rawBarberos, tenantId, matchSucursal, _isSuperadmin]);

  // Deep-link ?nueva=1&barbero=<id>&hora=HH:MM — la Pizarra walk-in manda aquí
  // con barbero y hora ya resueltos (libre → ahora; ocupado → cuando se
  // desocupa). Abre el modal de cita nueva para HOY con eso precargado.
  // Espera a que cargue `barberos`: el modal resuelve el NOMBRE del barbero al
  // inicializar su form (línea "barbero: barberos.find(...)"), y con la lista
  // vacía la cita se guardaría con barbero:''. Como los params se borran tras
  // procesar, el efecto corre una sola vez en la práctica.
  useEffect(() => {
    if (barberosLoading) return;
    if (searchParams.get('nueva') !== '1') return;
    const barberoParam = searchParams.get('barbero') || '';
    const horaParam    = searchParams.get('hora') || '';
    const barberoId    = barberos.some(b => b.id === barberoParam) ? barberoParam : '';
    setDate(new Date());   // walk-in siempre es hoy, aunque la agenda quedara en otro día
    setCitaModal({
      cita: null,
      barberoId,
      hora: /^([01]\d|2[0-3]):[0-5]\d$/.test(horaParam) ? horaParam : '09:00',
    });
    setSearchParams(p => { p.delete('nueva'); p.delete('barbero'); p.delete('hora'); return p; }, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberosLoading]);

  // Orden manual de columnas (arrastrar la cabecera para reordenar), persistido por sede.
  const ORDER_KEY = `agenda_barber_order_${tenantId}`;
  const [barberOrder, setBarberOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ORDER_KEY)) || []; } catch { return []; }
  });
  const orderedBarberos = useMemo(() => {
    if (!barberOrder.length) return barberos;
    const pos = bid => { const i = barberOrder.indexOf(bid); return i === -1 ? Infinity : i; };
    return [...barberos].sort((a, b) => pos(a.id) - pos(b.id));
  }, [barberos, barberOrder]);

  const dragSensors = useSensors(
    // Escritorio: pequeño desplazamiento antes de activar (evita conflictos con el tap normal).
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Móvil: hay que mantener presionado 250 ms; una vibración/tolerancia mínima evita
    // que un temblor del dedo cancele el drag. Sin este sensor el reordenar tampoco funcionaba táctil.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const handleReorderBarberos = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids  = orderedBarberos.map(b => b.id);
    const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
    setBarberOrder(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  // Filtro "ver solo la agenda de un barbero" (al tocar su cabecera)
  const focusBarbero    = soloBarbero ? barberos.find(b => b.id === soloBarbero) : null;
  const barberosVisibles = focusBarbero ? [focusBarbero] : orderedBarberos;

  // ¿Estamos en una vista de LISTA (semana de todos / mes) en vez de la grilla
  // horaria? Las de lista no llevan eje de horas ni min-w-max: se dibujan sobre
  // el ancho disponible, no sobre una escala de tiempo.
  const modoLista = viewMode === 'month' || (viewMode === 'week' && !focusBarbero);

  // Para las vistas Semana/Mes, que listan citas de todos y necesitan resolver
  // el barbero de cada una (su color y su nombre para el tooltip).
  const barberosById = useMemo(
    () => Object.fromEntries(barberos.map(b => [b.id, b])),
    [barberos],
  );
  // Citas de los profesionales visibles. La query trae todo el rango sin filtrar
  // por barbero, así que acá se respeta el filtro de la píldora y se descartan
  // las citas de barberos que ya no están en la lista (borrados, de otra sede).
  const _visiblesKey = barberosVisibles.map(b => b.id).join(',');
  const citasVisibles = useMemo(() => {
    const ids = new Set(_visiblesKey ? _visiblesKey.split(',') : []);
    return citas.filter(c => ids.has(c.barberoId));
  }, [citas, _visiblesKey]);

  // Navegación: misma flecha, salto acorde a la vista — 1 día, 7 días o 1 mes.
  const moveDay = delta => {
    const d = new Date(date);
    if (viewMode === 'month') {
      // setDate(1) antes de mover el mes: si no, saltar desde un 31 a un mes de
      // 30 días desborda al siguiente (31 mar → 1 may en vez de 30 abr).
      d.setDate(1);
      d.setMonth(d.getMonth() + delta);
    } else {
      d.setDate(d.getDate() + (viewMode === 'week' ? delta * 7 : delta));
    }
    setDate(d);
  };

  const handleDeleteBloqueo = useCallback(async bloqueo => {
    const batch = writeBatch(db);
    batch.delete(doc(db, `${tenantCol('bloqueos').path}/${bloqueo.id}`));

    // Un bloqueo de RANGO crea UN candado por franja (ver "Bloqueo rango" en
    // agenda.html), pero en `slotLockId` solo queda el PRIMERO. Borrando ese
    // uno, los demás sobrevivían al bloqueo: la reserva pública seguía
    // mostrando esas horas ocupadas aunque la agenda las mostrara libres.
    // Encontrado en Studio Dieciséis (Omar, 30-jul): 5 horas fantasma.
    // Por eso se buscan TODOS los candados de este bloqueo, no el registrado.
    try {
      const q = query(tenantCol('slotLocks'), where('bloqueoId', '==', bloqueo.id));
      const snap = await withTimeout(getDocs(q), 10000, 'agenda/locks-del-bloqueo');
      snap.forEach(d => batch.delete(d.ref));
    } catch (e) {
      console.warn('[Agenda] no se pudieron listar los candados del bloqueo:', e?.message);
    }
    // Cinturón: si la consulta falló, al menos cae el registrado.
    if (bloqueo.slotLockId) {
      batch.delete(doc(db, `${tenantCol('slotLocks').path}/${bloqueo.slotLockId}`));
    }
    await batch.commit();
  }, []);

  // Al soltar una cita: abre el aviso de la app (no el confirm del navegador).
  // Detecta si el horario destino ya está ocupado → sobrecupo (con precaución).
  // fechaDestino: en vista semana viene el día de la columna clickeada; en vista
  // día es undefined y se usa dateStr como antes.
  const handleDrop = (barberoId, hora, fechaDestino) => {
    if (!draggedCita) return;

    const fecha = fechaDestino || dateStr;
    // Mismo slot → no hacer nada
    if (draggedCita.barberoId === barberoId && draggedCita.hora === hora
        && (draggedCita.fecha || dateStr) === fecha) {
      setDraggedCita(null);
      return;
    }

    const targetBarbero = barberos.find(b => b.id === barberoId);
    const barberoNombre = targetBarbero?.nombre || '';

    // La ocupación se chequea SOLO dentro de la fecha destino (en vista semana
    // `citas` trae 7 días — comparar sin filtrar por fecha marcaría sobrecupo
    // aunque el conflicto sea otro día).
    const ocupada = citas.some(c =>
      c.id !== draggedCita.id &&
      c.barberoId === barberoId &&
      c.hora === hora &&
      (c.fecha || dateStr) === fecha &&
      c.estado !== 'Cancelada' &&
      c.estado !== 'NoAsistio',
    );

    setReagendarModal({ cita: draggedCita, barberoId, barberoNombre, hora, fecha, ocupada });
    setDraggedCita(null);
  };

  const doReagendar = async (fechaElegida) => {
    const m = reagendarModal;
    if (!m) return;
    const fecha       = fechaElegida || dateStr;
    const mismaFecha  = fecha === dateStr;
    // La ocupación solo se conoce en el día visible; al mover a otro día no es sobrecupo aquí.
    const sobrecupo   = mismaFecha ? !!m.ocupada : false;
    try {
      const safeHora   = m.hora.replace(':', '');
      const safeBid    = String(m.barberoId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const nextLockId = `${safeBid}_${fecha}_${safeHora}`;

      const batch   = writeBatch(db);
      const citaRef = doc(db, `${tenantCol('citas').path}/${m.cita.id}`);

      batch.update(citaRef, {
        barberoId:  m.barberoId,
        barbero:    m.barberoNombre,
        hora:       m.hora,
        fecha,
        sobrecupo,
        // En sobrecupo NO tomamos un lock propio: el slot ya está reservado por la otra cita.
        slotLockId: sobrecupo ? null : nextLockId,
        updatedAt:  serverTimestamp(),
      });

      // Liberar el lock del horario anterior
      if (m.cita.slotLockId) {
        batch.delete(doc(db, `${tenantCol('slotLocks').path}/${m.cita.slotLockId}`));
      }
      // Crear lock del nuevo horario solo si NO es sobrecupo
      if (!sobrecupo) {
        batch.set(doc(db, `${tenantCol('slotLocks').path}/${nextLockId}`), {
          citaId:    m.cita.id,
          fecha,
          hora:      m.hora,
          barberoId: m.barberoId,
          duracion:  Number(m.cita.duracion || m.cita.duracionServicio || 30),
          creadoEn:  serverTimestamp(),
        });
      }

      await batch.commit();
      // Movida OK → ofrecer avisarle al cliente. Solo si salió bien: si el
      // batch falló, la hora no cambió y avisar sería mentirle.
      setAvisarModal({
        cita: m.cita,
        fecha,
        hora: m.hora,
        barberoNombre: m.barberoNombre,
      });
    } catch (err) {
      console.error('Error al reagendar cita:', err);
    }
    setReagendarModal(null);
  };

  const openNewCita    = (barberoId, hora, fecha) =>
    setCitaModal({ cita: null, barberoId, hora, fechaOverride: fecha });
  const openEditCita   = (cita)            => setCitaModal({ cita, barberoId: cita.barberoId, hora: cita.hora });
  // Abre el ReagendarModal manteniendo barbero/hora actuales — solo se cambia la fecha.
  const openReagendar  = (cita)            => setReagendarModal({
    cita,
    barberoId:     cita.barberoId,
    barberoNombre: cita.barbero || barberos.find(b => b.id === cita.barberoId)?.nombre || '',
    hora:          cita.hora,
    fecha:         cita.fecha || dateStr,
    ocupada:       false,
  });

  // Cancela la cita (estado → Cancelada) y libera el lock del horario.
  const cancelarCita = async (cita) => {
    try {
      const citaRef = doc(db, `${tenantCol('citas').path}/${cita.id}`);
      if (cita.slotLockId) {
        const batch = writeBatch(db);
        batch.update(citaRef, { estado: 'Cancelada', slotLockId: null, updatedAt: serverTimestamp() });
        batch.delete(doc(db, `${tenantCol('slotLocks').path}/${cita.slotLockId}`));
        await batch.commit();
      } else {
        await updateDoc(citaRef, { estado: 'Cancelada', updatedAt: serverTimestamp() });
      }
    } catch (err) { console.error('Error al cancelar cita:', err); }
  };

  // Marca no-show: estado → NoAsistio y libera el lock (misma mecánica que
  // Cancelada, pero preserva el registro para el historial del cliente y
  // stats de churn). Distinto de Cancelada: el cliente NO avisó.
  const marcarNoAsistio = async (cita) => {
    try {
      const citaRef = doc(db, `${tenantCol('citas').path}/${cita.id}`);
      if (cita.slotLockId) {
        const batch = writeBatch(db);
        batch.update(citaRef, { estado: 'NoAsistio', slotLockId: null, updatedAt: serverTimestamp() });
        batch.delete(doc(db, `${tenantCol('slotLocks').path}/${cita.slotLockId}`));
        await batch.commit();
      } else {
        await updateDoc(citaRef, { estado: 'NoAsistio', updatedAt: serverTimestamp() });
      }
    } catch (err) { console.error('Error al marcar no asistió:', err); }
  };

  // Elimina la cita por completo + su lock.
  const eliminarCita = async (cita) => {
    try {
      if (cita.slotLockId) {
        const batch = writeBatch(db);
        batch.delete(doc(db, `${tenantCol('citas').path}/${cita.id}`));
        batch.delete(doc(db, `${tenantCol('slotLocks').path}/${cita.slotLockId}`));
        await batch.commit();
      } else {
        await deleteDoc(doc(db, `${tenantCol('citas').path}/${cita.id}`));
      }
    } catch (err) { console.error('Error al eliminar cita:', err); }
  };

  // Abre WhatsApp con el mensaje de confirmación precargado.
  const whatsappCita = (cita) => {
    const phone = waPhone(cita.clienteTelefono);
    if (!phone) return;
    const msg = buildWaConfirmMsg(tenantId, cita, cita.fecha || dateStr);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };
  // Handlers con `fecha` opcional: en vista día usan dateStr; en vista semana
  // reciben el string del día de la columna clickeada.
  const openNewBloqueo = (barberoId, hora, fecha) =>
    setBlqModal({ barberoId, hora, tipo: 'parcial', fechaOverride: fecha });

  // En modo semana `bloqueos` trae 7 días — el banner sólo tiene sentido para
  // el día "central" (dateStr), así que filtramos por fecha antes del some.
  const diaGlobalCerrado = bloqueos.some(b =>
    b.todo_el_dia && !b.barberoId && b.fecha === dateStr,
  );

  const bloqueosPorBarbero = useCallback((barberoId) =>
    bloqueos.filter(b => !b.barberoId || b.barberoId === barberoId),
  [bloqueos]);

  return (
    <AgendaCtx.Provider value={slotCfg}>
    <div data-view="agenda" className="flex flex-col h-full gap-3">

      {/* Toolbar — Mobile-first: se apila en 2 filas en móvil, 1 fila en desktop */}
      <h1 className="sr-only">Agenda</h1>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 w-full shrink-0">
        {/* ── Fila 1 (móvil) / Izquierda (desktop): navegación de fecha ── */}
        <div className="flex items-center justify-between w-full md:w-auto bg-neutral-900 border border-neutral-800 p-1 rounded-xl gap-1 min-w-0">
          <button
            onClick={() => moveDay(-1)}
            aria-label="Día anterior"
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-primary transition-all shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="flex-1 md:flex-none text-sm font-semibold text-primary text-center capitalize whitespace-nowrap tabular-nums px-2 truncate">
            {viewMode === 'month' ? formatMonthLabel(date)
              : viewMode === 'week' ? formatWeekLabel(date)
              : formatDateLabel(date)}
          </span>
          <button
            onClick={() => moveDay(1)}
            aria-label="Día siguiente"
            className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-primary transition-all shrink-0"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── Fila 2 (móvil) / Derecha (desktop): controles y acciones ── */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
        {/* Segmented control estilo iOS: Hoy · Día · Semana · Mes.
            Los tres modos andan con o sin profesional filtrado. */}
        <div
          className="flex items-center bg-neutral-900 border border-neutral-800 p-1 rounded-xl gap-1 shrink-0"
          role="tablist"
          aria-label="Modo de vista"
        >
          <button
            onClick={() => setDate(new Date())}
            className="h-10 md:h-8 px-3 text-xs font-semibold rounded-md transition-colors text-slate-400 hover:text-primary hover:bg-slate-800 shrink-0"
          >
            Hoy
          </button>
          {[
            { key: 'day',   label: 'Día'    },
            { key: 'week',  label: 'Semana' },
            { key: 'month', label: 'Mes'    },
          ].map(opt => {
            const active = viewMode === opt.key;
            return (
              <button
                key={opt.key}
                role="tab"
                aria-selected={active}
                title={opt.label}
                onClick={() => {
                  setViewMode(opt.key);
                  try { localStorage.setItem('agenda_admin_view', opt.key); } catch { /* noop */ }
                }}
                className={`h-10 md:h-8 px-3 text-xs font-semibold rounded-md transition-colors ${
                  active
                    ? 'bg-slate-800 text-primary shadow-sm'
                    : 'text-slate-400 hover:text-primary hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Leyenda de colores (incluye el ámbar de WhatsApp y, si el local no
            tiene el módulo, la invitación a activarlo). */}
        <LeyendaColores tenantId={tenantId} />

        {/* Acciones primarias — pegadas al final del row en desktop */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
        {/* Caja y agenda se usan juntas todo el día pero en el menú están a
            cinco grupos de distancia (Operación vs Finanzas). El atajo va en
            los dos sentidos: el de vuelta está en la cabecera de la caja. */}
        <Link
          to="/caja"
          title="Ir al control de caja"
          className="h-9 px-2.5 flex items-center gap-1.5 border border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600 rounded-lg text-xs font-semibold transition-all shrink-0"
        >
          <Wallet size={14} /> <span className="hidden sm:inline">Caja</span>
        </Link>
        <button
          onClick={() => setCitaModal({ cita: null, barberoId: barberos[0]?.id || '', hora: '09:00' })}
          className="h-9 px-3 flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg text-xs shadow-md transition-all shrink-0"
        >
          <Plus size={14} strokeWidth={2.5} /> Cita
        </button>

        {/* Menú de acciones secundarias */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
              showMenu || blockMode
                ? 'border-slate-600 bg-slate-800 text-primary'
                : 'border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600'
            }`}
            title="Más acciones"
          >
            <MoreHorizontal size={16} />
            {(hasNewCita || blockMode) && !showMenu && (
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900 animate-pulse ${blockMode ? 'bg-red-500' : 'bg-emerald-500'}`} />
            )}
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-30 p-1.5">
              {/* Solo en MÓVIL: lo que se sacó de la fila de controles para
                  darle alto a la agenda. En desktop sigue estando allá, así
                  que acá se ocultaría duplicado. */}
              <div className="sm:hidden">
                <MenuItem
                  icon={Activity}
                  label="Resumen del día"
                  onClick={() => { setShowMenu(false); setShowResumen(true); }}
                />
                <MenuItem
                  icon={Clock}
                  label={isToday ? 'Ir a la hora actual' : 'Volver a hoy'}
                  onClick={() => { setShowMenu(false); scrollToNow(); }}
                />
                {/* Resolución de la grilla: preferencia, no acción diaria. */}
                <div className="px-2.5 pt-2 pb-1">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Resolución de la grilla
                  </p>
                  <div className="flex items-center gap-1">
                    {RESOLUCIONES.map(step => (
                      <button
                        key={step}
                        // Mismas tres cosas que el control de desktop: estado,
                        // etiquetas del eje horario y persistencia. Con solo
                        // setSlotMins la preferencia no sobrevivía al reload y
                        // el eje quedaba con la resolución anterior.
                        onClick={() => {
                          setSlotMins(step);
                          setLabelStep(step);
                          try { localStorage.setItem(SLOT_KEY, String(step)); } catch { /* modo privado */ }
                        }}
                        className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                          slotMins === step
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {step < 60 ? `${step}'` : '1h'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="my-1.5 border-t border-slate-800" />
              </div>

              <MenuItem
                icon={UserPlus}
                label="Sobrecupo"
                accent="amber"
                onClick={() => { setShowMenu(false); setCitaModal({ cita: null, barberoId: barberos[0]?.id || '', hora: '09:00', sobrecupo: true }); }}
              />
              <MenuItem
                icon={Ban}
                label={blockMode ? 'Modo bloqueo activo' : 'Bloquear horas'}
                active={blockMode}
                onClick={() => { setShowMenu(false); setBlockMode(v => !v); }}
              />
              <MenuItem
                icon={CalendarOff}
                label="Cerrar día"
                onClick={() => { setShowMenu(false); setBlqModal({ barberoId: '', hora: '', tipo: 'dia' }); }}
              />
              <div className="h-px bg-slate-800 my-1" />
              <MenuItem
                icon={History}
                label="Últimas citas"
                badge={hasNewCita}
                onClick={() => {
                  setShowMenu(false);
                  setShowUltima(true);
                  if (ultimaCita?.id) {
                    localStorage.setItem(LS_LAST_SEEN, ultimaCita.id);
                    setHasNewCita(false);
                  }
                }}
              />
              <MenuItem
                icon={ListFilter}
                label="Historial"
                onClick={() => { setShowMenu(false); setShowHistorial(true); }}
              />
              <MenuItem
                icon={Send}
                label="Canal de difusión"
                onClick={() => { setShowMenu(false); setShowDifusionModal(true); }}
              />
            </div>
          )}
        </div>
        </div>
        </div>
      </div>

      {/* ── Fila 3: reloj + intervalos + FilterChip + resumen/ayuda ──
          En MÓVIL esta fila entera se oculta salvo el chip de filtro. Entre
          la cabecera, la navegación de fecha y las pestañas ya se iban ~330px
          de una pantalla de ~790px: 42% del alto gastado en controles antes
          de mostrar una sola cita.

          Lo que se va no se pierde, se mueve a donde corresponde por
          frecuencia de uso: la resolución de la grilla (15'/30'/45'/1h) es
          una preferencia que se ajusta una vez, no una acción diaria, y el
          resumen y la ayuda son secundarios — los tres viven ahora en el
          menú "…". El reloj/"ir a ahora" queda junto a la fecha, que es
          donde uno lo busca. */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto py-1 my-1 shrink-0 no-scrollbar">
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 text-xs shrink-0">
          <button
            onClick={scrollToNow}
            title={isToday ? 'Ir a la hora actual' : 'Volver a hoy y a la hora actual'}
            className="group h-7 flex items-center gap-1 pl-1.5 pr-2 rounded-md hover:bg-emerald-500/10 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              {showNowLine && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />}
              <Clock size={12} className="text-emerald-400 -m-0.5" />
            </span>
            <span className="text-[11px] font-mono font-semibold text-slate-200 tabular-nums group-hover:text-primary">{nowLabel}</span>
          </button>
          <span className="w-px h-4 bg-neutral-800" aria-hidden />
          <div className="relative flex items-center gap-0.5" title="Resolución de la grilla">
            {RESOLUCIONES.map(step => {
              const active = slotMins === step;
              return (
                <button
                  key={step}
                  onClick={() => { setSlotMins(step); setLabelStep(step); try { localStorage.setItem(SLOT_KEY, String(step)); } catch { /* noop */ } }}
                  className={`relative h-7 min-w-[28px] px-1.5 rounded-md text-[10px] font-mono font-semibold transition-colors ${
                    active ? 'text-primary' : 'text-slate-500 hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="slotmins-pill"
                      className="absolute inset-0 rounded-md bg-emerald-600 shadow-sm"
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{step < 60 ? `${step}'` : '1h'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Chip: barbero focus activo — reemplaza al banner verde grande */}
        {focusBarbero && (
          <div className="h-7 pl-2.5 pr-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-full text-xs flex items-center gap-1.5 shrink-0">
            <User size={11} className="shrink-0" />
            <span className="font-semibold truncate max-w-[140px]">{focusBarbero.nombre}</span>
            <button
              onClick={() => setSoloBarbero(null)}
              aria-label="Quitar filtro de barbero"
              className="w-5 h-5 -mr-0.5 flex items-center justify-center rounded-full hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-100 transition-colors"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Resumen del día + ayuda contextual, al final de la barra. */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowResumen(true)}
            title="Resumen del día"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[12px] font-semibold text-slate-300 transition-all hover:bg-slate-700 active:scale-95"
          >
            <Activity size={13} />
            <span className="hidden sm:inline">Resumen</span>
          </button>
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
      </div>

      {/* Chip de filtro en MÓVIL. Va aparte porque la fila de arriba se
          oculta: si el chip desapareciera, la agenda quedaría filtrada por
          un barbero sin nada que lo indique — el peor tipo de estado
          invisible. Solo ocupa alto cuando hay filtro puesto. */}
      {focusBarbero && (
        <div className="flex sm:hidden items-center py-1 shrink-0">
          <div className="h-7 pl-2.5 pr-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-full text-xs flex items-center gap-1.5">
            <User size={11} className="shrink-0" />
            <span className="font-semibold truncate max-w-[180px]">{focusBarbero.nombre}</span>
            <button
              onClick={() => setSoloBarbero(null)}
              aria-label="Quitar filtro de barbero"
              className="w-5 h-5 -mr-0.5 flex items-center justify-center rounded-full hover:bg-emerald-500/20 text-emerald-300 transition-colors"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {diaGlobalCerrado && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-400 shrink-0">
          <CalendarOff size={16} />
          <span className="flex-1 font-medium">Agenda cerrada para todo el día</span>
        </div>
      )}

      {blockMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-400 shrink-0">
          <Ban size={14} />
          <span>Modo bloqueo: haz clic en cualquier horario vacío para bloquearlo. Los bloqueados en rojo se pueden hacer clic para desbloquear.</span>
        </div>
      )}

      {/* Canal de Difusión Modal — universal */}
      {showDifusionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl shadow-2xl border border-slate-800 bg-[#0F0F0F]">
            <button
              onClick={() => setShowDifusionModal(false)}
              className="absolute top-3 right-3 px-2.5 py-1 text-slate-400 hover:text-primary bg-slate-900 border border-slate-800 rounded-lg text-xs font-black transition-all z-50 shadow-md animate-pulse"
            >
              ✕
            </button>
            {/* DifusionPanel opera sobre 1 día — en modo semana la query trae 7,
                así que le pasamos las citas/bloqueos filtradas al día activo. */}
            <DifusionPanel
              citas={citas.filter(c => c.fecha === dateStr)}
              bloqueos={bloqueos.filter(b => b.fecha === dateStr)}
              barberos={barberos}
              dateStr={dateStr}
              tenantId={tenantId}
            />
          </div>
        </div>
      )}

      {/* Swimlane */}
      <div ref={swimRef} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-auto no-scrollbar">
        {/* min-w-max hace que la grilla horaria sea tan ancha como sus columnas
            (y scrollee). Las vistas de lista, en cambio, se reparten el ancho
            disponible: con min-w-max la grilla del mes no llenaría la caja. */}
        <div className={modoLista ? 'flex' : 'flex min-w-max'}>

          {/* Time axis — solo en las vistas de grilla horaria. */}
          {!modoLista && (() => {
            // El corner del eje de horas debe calzar con la cabecera de cada
            // columna: en vista día es alta (avatar+nombre+contador ≈ 104 px),
            // en vista semana el header vuelve a h-9 (36 px). Sin esto, las
            // horas quedan desplazadas respecto a las filas de citas.
            const headerH = viewMode === 'week' ? 36 : 104;
            return (
              <div className="w-16 shrink-0 sticky left-0 bg-slate-900 z-20 border-r border-neutral-800 relative">
                <div
                  className="border-b border-r border-neutral-800 bg-neutral-900/50"
                  style={{ height: `${headerH}px` }}
                />
                {showNowLine && (
                  <div
                    className="absolute right-0 z-30 flex justify-end pr-1 pointer-events-none"
                    style={{ top: `${headerH + nowOffsetPx}px`, transform: 'translateY(-50%)' }}
                  >
                    <span className="text-[9px] font-sans font-bold text-primary bg-red-500 rounded px-1 py-px shadow-[0_0_6px_rgba(239,68,68,0.6)]">
                      {nowLabel}
                    </span>
                  </div>
                )}
                {timeLabels.map((t, i) => {
                  const [h, m] = t.split(':').map(Number);
                  const tMins = h * 60 + m;
                  const showLabel = tMins % labelStep === 0;
                  const subMarks = [];
                  for (let sub = 15; sub < slotMins; sub += 15) {
                    const total = tMins + sub;
                    if (total % labelStep === 0) {
                      subMarks.push({
                        label: `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
                        pct: (sub / slotMins) * 100,
                      });
                    }
                  }
                  // La hora en punto es el ancla de lectura: va más clara y en
                  // negrita, con línea propia. Los cuartos quedan atenuados.
                  // Con las resoluciones actuales (todas divisores de 60) esto
                  // cae SIEMPRE en una línea real de la grilla.
                  const esHora = tMins % 60 === 0;
                  return (
                    <div key={i} className={`relative h-10 border-r border-b border-neutral-800 bg-neutral-900/30 ${esHora ? 'border-t border-t-neutral-700' : ''}`}>
                      {showLabel && (
                        <span className={`absolute -top-2.5 left-0 right-0 text-center bg-neutral-950 px-1 mx-auto w-max z-10 font-sans tracking-wide select-none tabular-nums ${
                          esHora ? 'text-xs font-bold text-neutral-200' : 'text-[11px] font-medium text-neutral-500'
                        }`}>
                          {t}
                        </span>
                      )}
                      {subMarks.map(({ label, pct }) => (
                        <div
                          key={label}
                          className="absolute inset-x-0 flex items-center justify-center"
                          style={{ top: `${pct}%`, transform: 'translateY(-50%)' }}
                        >
                          <span className="font-sans text-[9px] font-medium text-neutral-600 tracking-wide select-none">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Barber columns */}
          {barberosLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-slate-500 text-sm">
              <span className="w-5 h-5 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin" />
              Cargando agenda…
            </div>
          ) : barberos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-20 text-slate-600 text-sm">
              Sin barberos activos
            </div>
          ) : viewMode === 'month' ? (
            /* ── Vista MES: calendario de todos ── */
            <MesTodos
              monthDates={monthDates}
              mesActual={date.getMonth()}
              citas={citasVisibles}
              barberosById={barberosById}
              onOpen={openEditCita}
              onVerDia={(d) => { setDate(d); setViewMode('day'); }}
            />
          ) : viewMode === 'week' && !focusBarbero ? (
            /* ── Vista SEMANA sin filtro: lista por día, todos ── */
            <SemanaTodos
              weekDates={weekDates}
              citas={citasVisibles}
              barberosById={barberosById}
              onOpen={openEditCita}
            />
          ) : viewMode === 'week' && focusBarbero ? (
            /* ── Vista SEMANA: 7 columnas del barbero focus ─────────────
               El eje X ya no es "barbero" sino "día". Sin SortableContext
               porque no hay reordenamiento posible (1 solo profesional). */
            weekDates.map(d => {
              const diaStr     = fmt(d);
              const isTodayCol = fmt(new Date()) === diaStr;
              const diasCorto  = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
              const dayCitas   = citas.filter(c =>
                c.fecha === diaStr && c.barberoId === focusBarbero.id);
              const dayBloqueos = bloqueos.filter(b =>
                b.fecha === diaStr && (!b.barberoId || b.barberoId === focusBarbero.id));
              const layoutCitas = computeOverlapLayout(conHoraEstimada(dayCitas));
              return (
                <div key={diaStr} className="flex-1 min-w-[140px] border-r border-slate-800 last:border-r-0">
                  {/* Cabecera del día — "LUN 6". "Hoy" resaltado en emerald. */}
                  <div
                    className={`h-9 py-1.5 px-3 flex items-center gap-2 border-b border-slate-800 sticky top-0 z-10 ${
                      isTodayCol ? 'bg-emerald-950/30' : 'bg-slate-900'
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isTodayCol ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {diasCorto[d.getDay()]}
                    </span>
                    <span className={`text-sm font-semibold tabular-nums ${
                      isTodayCol ? 'text-primary' : 'text-slate-300'
                    }`}>
                      {d.getDate()}
                    </span>
                  </div>

                  {/* Grilla horaria de este día */}
                  <div className="relative" style={{ height: `${totalSlots * SLOT_PX}px` }}>
                    {timeLabels.map((_, i) => (
                      <SlotRow
                        key={i}
                        idx={i}
                        barberoId={focusBarbero.id}
                        dateStr={diaStr}
                        blockMode={blockMode}
                        onNewCita={openNewCita}
                        onNewBloqueo={openNewBloqueo}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        dragActive={!!draggedCita}
                      />
                    ))}
                    <ColacionBlock colacion={colacionDe(focusBarbero.id)} />
                    {/* `d` es la fecha de ESTA columna: cada día de la semana
                        puede tener sus propios descansos. */}
                    {descansosDe(focusBarbero, d).map((desc, i) => (
                      <ColacionBlock key={`desc-${i}`} colacion={desc} label="Descanso" />
                    ))}
                    <SinHoraTray citas={sinHoraDe(dayCitas)} onOpen={openEditCita} />
                    {dayBloqueos.map(blq => (
                      <BloqueoBlock key={blq.id} bloqueo={blq} onDelete={handleDeleteBloqueo} />
                    ))}
                    {layoutCitas.map(({ cita, colIndex, colTotal }) => (
                      <AppointmentBlock
                        key={cita.id}
                        cita={cita}
                        colIndex={colIndex}
                        colTotal={colTotal}
                        barberColor={focusBarbero.color}
                        onClick={openEditCita}
                        onContextMenu={(e, c) => setCtxMenu({ x: e.clientX, y: e.clientY, cita: c })}
                        onDragStart={(e, c) => setDraggedCita(c)}
                        onDragEnd={() => setDraggedCita(null)}
                        onDropOnCita={(c) => handleDrop(c.barberoId, c.hora, c.fecha)}
                        onTouchDrop={(bid, hora) => handleDrop(bid, hora, diaStr)}
                        isDragged={draggedCita?.id === cita.id}
                        dragActive={!!draggedCita}
                      />
                    ))}
                    {/* Línea "ahora" solo en la columna del día actual */}
                    {isTodayCol && showNowLine && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none"
                        style={{ top: `${nowOffsetPx}px` }}
                      >
                        <div className="relative h-px bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]">
                          <span className="absolute left-0 -top-[3px] w-1.5 h-1.5 rounded-full bg-red-500" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleReorderBarberos}>
              <SortableContext items={barberosVisibles.map(b => b.id)} strategy={horizontalListSortingStrategy}>
                {barberosVisibles.map(b => {
                  // Filtro por fecha del día visible — la query multi-fecha del
                  // modo semana puede quedar cacheada un tick al volver a día;
                  // filtrar acá evita mostrar citas de otros días en el frame
                  // intermedio antes de que el hook re-suscriba.
                  const barberCitas    = citas.filter(c => c.fecha === dateStr && c.barberoId === b.id);
                  const barberBloqueos = bloqueosPorBarbero(b.id).filter(bl => bl.fecha === dateStr);

                  // Layout en columnas por solapamiento real de horarios (no solo misma hora)
                  const layoutCitas = computeOverlapLayout(conHoraEstimada(barberCitas));
                  const diaLibre    = esDiaLibre(b, date);

                  return (
                    <SortableCol key={b.id} id={b.id}>
                      {({ setNodeRef, style, listeners, attributes, isDragging }) => (
                        <div
                          ref={setNodeRef}
                          style={style}
                          className={`flex-1 min-w-[110px] md:min-w-[160px] border-r border-slate-800 last:border-r-0 ${isDragging ? 'shadow-2xl ring-1 ring-emerald-500/40' : ''}`}
                        >
                          {/* Cabecera: tocar = ver solo este barbero. La manija ⠿ (izquierda) = arrastrar para reordenar. */}
                          <div
                            onClick={() => setSoloBarbero(prev => prev === b.id ? null : b.id)}
                            title={focusBarbero?.id === b.id ? 'Mostrar todos los barberos' : `Ver solo la agenda de ${b.nombre}`}
                            className="group relative flex flex-col items-center justify-center py-2 md:py-3 px-1.5 md:px-2 border-b border-neutral-800 sticky top-0 bg-slate-900 z-10 cursor-pointer hover:bg-slate-800/60 transition-colors"
                          >
                            {/* Manija de arrastre — esquina superior izquierda */}
                            <span
                              {...attributes}
                              {...listeners}
                              onClick={e => e.stopPropagation()}
                              title="Mantén presionado y arrastra para reordenar"
                              aria-label={`Reordenar a ${b.nombre}`}
                              className="hidden md:block absolute top-1.5 left-1.5 text-slate-600 hover:text-emerald-400 cursor-grab active:cursor-grabbing touch-none select-none"
                            >
                              <GripVertical size={14} />
                            </span>
                            {/* Indicador de foco — esquina superior derecha */}
                            <span className="absolute top-1.5 right-1.5">
                              {focusBarbero?.id === b.id
                                ? <Users size={13} className="text-emerald-400" />
                                : <Eye size={13} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />}
                            </span>
                            {/* Avatar — con el color del barbero (barberos/{id}.color) si lo tiene.
                                El color va en el borde y en un fondo muy tenue, no en el fondo
                                pleno: así no compite con la foto. El `1f` final es el alpha en
                                hex (~12%) — el color llega como string desde Firestore, así que
                                no hay clase Tailwind que valga; va por style inline.
                                Sin color, queda exactamente el verde de antes. */}
                            <div
                              className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
                                b.color ? 'border-2' : 'border border-neutral-700 bg-emerald-500/20'
                              }`}
                              style={b.color ? { borderColor: b.color, backgroundColor: `${b.color}1f` } : undefined}
                            >
                              {b.foto
                                ? <img src={b.foto} alt={b.nombre} className="w-full h-full object-cover" />
                                : <span
                                    className={`text-sm font-bold ${b.color ? '' : 'text-emerald-400'}`}
                                    style={b.color ? { color: b.color } : undefined}
                                  >
                                    {b.nombre?.[0] ?? '?'}
                                  </span>}
                            </div>
                            {/* Nombre */}
                            <span className={`font-semibold text-sm mt-1 truncate max-w-full ${diaLibre ? 'text-slate-500' : 'text-primary'}`}>{b.nombre}</span>
                            {/* Citas del día — o "Día libre" si no atiende hoy */}
                            {diaLibre ? (
                              <span className="text-xs font-semibold text-amber-500/90 flex items-center gap-1">
                                <CalendarOff size={11} /> Día libre
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-500">
                                {barberCitas.length === 0
                                  ? 'Sin citas'
                                  : `${barberCitas.length} cita${barberCitas.length === 1 ? '' : 's'}`}
                              </span>
                            )}
                          </div>

                          <div className={`relative ${diaLibre ? 'opacity-60' : ''}`} style={{ height: `${totalSlots * SLOT_PX}px` }}>
                            {/* Día libre: rayado + chip. pointer-events-none → el admin
                                igual puede agendar una excepción encima si lo necesita.
                                El rayado va por CLASE (.agenda-dia-libre), no inline: un
                                estilo inline gana sobre cualquier hoja, así que el modo
                                claro no tenía forma de subirle el contraste y al 5%
                                sobre blanco no se veía nada. */}
                            {diaLibre && (
                              <div
                                className="agenda-dia-libre absolute inset-0 z-[15] flex items-start justify-center pt-8 pointer-events-none"
                              >
                                <span className="text-[11px] font-semibold text-amber-500/90 bg-slate-900/85 border border-amber-500/30 rounded-full px-3 py-1 flex items-center gap-1.5">
                                  <CalendarOff size={11} /> Día libre — no atiende hoy
                                </span>
                              </div>
                            )}
                            {timeLabels.map((_, i) => (
                              <SlotRow
                                key={i}
                                idx={i}
                                barberoId={b.id}
                                dateStr={dateStr}
                                blockMode={blockMode}
                                onNewCita={openNewCita}
                                onNewBloqueo={openNewBloqueo}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                dragActive={!!draggedCita}
                              />
                            ))}
                            <ColacionBlock colacion={colacionDe(b.id)} />
                            {descansosDe(b, date).map((desc, i) => (
                              <ColacionBlock key={`desc-${i}`} colacion={desc} label="Descanso" />
                            ))}
                            <SinHoraTray citas={sinHoraDe(barberCitas)} onOpen={openEditCita} />
                            {barberBloqueos.map(blq => (
                              <BloqueoBlock key={blq.id} bloqueo={blq} onDelete={handleDeleteBloqueo} />
                            ))}
                            {/* Solo en la columna de UN barbero: en la vista
                                "todos" un hueco de alguien no es hueco del local.
                                Recibe TODO lo que ocupa espacio visual (citas de
                                cualquier estado, bloqueos, colación y descansos)
                                para no rotular "libre" encima de un bloque. */}
                            {verHuecos && (
                              <HuecosLibres
                                citas={barberCitas}
                                bloqueos={barberBloqueos}
                                descansos={[colacionDe(b.id), ...descansosDe(b, date)].filter(Boolean)}
                              />
                            )}
                            {layoutCitas.map(({ cita, colIndex, colTotal }) => (
                              <AppointmentBlock
                                key={cita.id}
                                cita={cita}
                                colIndex={colIndex}
                                colTotal={colTotal}
                                barberColor={b.color}
                                onClick={openEditCita}
                                onContextMenu={(e, c) => setCtxMenu({ x: e.clientX, y: e.clientY, cita: c })}
                                onDragStart={(e, c) => setDraggedCita(c)}
                                onDragEnd={() => setDraggedCita(null)}
                                onDropOnCita={(c) => handleDrop(c.barberoId, c.hora)}
                                onTouchDrop={(bid, hora) => handleDrop(bid, hora)}
                                isDragged={draggedCita?.id === cita.id}
                                dragActive={!!draggedCita}
                              />
                            ))}
                            {showNowLine && (
                              <div
                                className="absolute inset-x-0 z-20 pointer-events-none"
                                style={{ top: `${nowOffsetPx}px` }}
                              >
                                <div className="relative h-px bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]">
                                  <span className="absolute left-0 -top-[3px] w-1.5 h-1.5 rounded-full bg-red-500" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </SortableCol>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {reviewCita && (
        <ReviewModal
          cita={reviewCita}
          tenantId={tenantId}
          onClose={() => { setReviewCita(null); setCitaModal(null); }}
        />
      )}

      {citaModal && (
        <CitaModal
          cita={citaModal.cita}
          barberos={barberos}
          servicios={servicios}
          productos={productos}
          defaultHora={citaModal.hora}
          defaultBarberoId={citaModal.barberoId}
          defaultEstado={citaModal.defaultEstado}
          sobrecupo={citaModal.sobrecupo}
          dateStr={citaModal.fechaOverride || dateStr}
          onClose={() => setCitaModal(null)}
          onComplete={cita => { setCitaModal(null); setReviewCita(cita); }}
        />
      )}
      {blqModal && (
        <BloqueoModal
          barberos={barberos}
          dateStr={blqModal.fechaOverride || dateStr}
          defaultBarberoId={blqModal.barberoId}
          defaultHora={blqModal.hora}
          defaultTipo={blqModal.tipo}
          onClose={() => setBlqModal(null)}
        />
      )}
      {ctxMenu && (
        <CitaContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          cita={ctxMenu.cita}
          onCompletar={() => {
            // Mismo flujo que el deep-link ?completar=: el modal abre con la
            // cita cargada y estado Completada — solo falta confirmar y guardar.
            const c = ctxMenu.cita; setCtxMenu(null);
            setCitaModal({ cita: c, barberoId: c.barberoId, hora: c.hora, defaultEstado: 'Completada' });
          }}
          onHistorial={() => { setHistModal(ctxMenu.cita); setCtxMenu(null); }}
          onCambiarFecha={() => { openReagendar(ctxMenu.cita); setCtxMenu(null); }}
          onEditar={() => { openEditCita(ctxMenu.cita); setCtxMenu(null); }}
          onWhatsApp={() => { whatsappCita(ctxMenu.cita); setCtxMenu(null); }}
          onCancelar={async () => {
            const c = ctxMenu.cita; setCtxMenu(null);
            if (await confirmDialog(`¿Cancelar la cita de ${c.clienteNombre || 'este cliente'}?`)) cancelarCita(c);
          }}
          onNoAsistio={async () => {
            const c = ctxMenu.cita; setCtxMenu(null);
            if (await confirmDialog({
              title: 'Marcar como No asistió',
              message: `¿${c.clienteNombre || 'Este cliente'} no llegó a su cita?\n\nEl horario queda libre y se registra el no-show en su historial.`,
              confirmText: 'Sí, marcar',
              cancelText: 'Cancelar',
            })) marcarNoAsistio(c);
          }}
          onEliminar={async () => {
            const c = ctxMenu.cita; setCtxMenu(null);
            if (await confirmDialog('¿Eliminar esta cita? Esta acción no se puede deshacer.')) eliminarCita(c);
          }}
          onClose={() => setCtxMenu(null)}
        />
      )}
      {histModal && (
        <HistorialNotasModal
          cita={histModal}
          onClose={() => setHistModal(null)}
        />
      )}
      {reagendarModal && (
        <ReagendarModal
          data={reagendarModal}
          dateStr={dateStr}
          onConfirm={doReagendar}
          onClose={() => setReagendarModal(null)}
        />
      )}
      {avisarModal && (
        <AvisarClienteModal
          data={avisarModal}
          shopName={tenantName}
          onClose={() => setAvisarModal(null)}
        />
      )}
      {showResumen && (
        <ResumenDiaModal
          citas={citas.filter(c => c.fecha === dateStr)}
          servicios={servicios}
          barberos={barberos}
          fechaLabel={date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          onClose={() => setShowResumen(false)}
        />
      )}
      {showUltima && (
        <UltimasCitasModal
          citas={ultimasCitas}
          loading={loadingUltima}
          onClose={() => setShowUltima(false)}
        />
      )}
      {showHistorial && (
        <HistorialModal onClose={() => setShowHistorial(false)} />
      )}
      {showHelp && (
        <HelpModal title="Cómo usar la Agenda" onClose={() => setShowHelp(false)}>
          <p>La <strong className="text-primary">Agenda</strong> muestra las citas del día por barbero en columnas. Es tu pantalla central de operación.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Navegación</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Flechas ◀ ▶ o botón <em>Hoy</em> para cambiar de día.</li>
              <li>En móvil, los barberos quedan en pestañas; en desktop ves columnas paralelas.</li>
              <li>Toca la <strong className="text-primary">cabecera de un barbero</strong> para ver solo su agenda; tocala de nuevo (o <em>Ver todos</em>) para volver.</li>
              <li>Arrastrá la <strong className="text-primary">manija ⠿</strong> (a la izquierda del nombre) para <strong className="text-primary">reordenar las columnas</strong>. El orden se guarda en este dispositivo.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Crear cita</p>
            <p>Toca un horario vacío. Si escribes un nombre con coincidencia, autocompleta. Si el cliente es <strong className="text-primary">"Migrado"</strong>, autocompleta datos pero NO se marca como "Vinculado" al Club (no se ha registrado aún).</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Editar cita</p>
            <p>Toca una cita existente para cambiar barbero, hora, estado, etc. <strong className="text-primary">Cambios de barbero u hora también actualizan el bloqueo del slot</strong> automáticamente (no queda el slot viejo bloqueado).</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Productos del Ticket</p>
            <p>En el modal de edición, abajo del Estado, hay una sección <strong className="text-primary">"Productos del Ticket"</strong> para sumar productos vendidos junto al servicio. Descuenta stock y se cuentan en Caja/Métricas como ventas reales.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Marcar como Completada</p>
            <p>Cambiá el estado a <em>Completada</em> al final de la atención. Esto dispara:</p>
            <ul className="list-disc ml-4 space-y-1 mt-1">
              <li>+1 sello al cliente (o descuenta uso de membresía).</li>
              <li>Modal de <strong className="text-primary">calificación Google</strong> al cliente cuando entre a su dashboard.</li>
              <li>Cita pasa al historial y al cierre del día en Caja.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Bloqueos</p>
            <p>Botón <em>Bloquear</em> para marcar día libre, vacaciones u horas no disponibles. Se ve en el booking público también para evitar reservas.</p>
          </div>

          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Botón verde <strong>WhatsApp</strong> arriba a la derecha = soporte directo a SynapTech si algo no funciona.</p>
        </HelpModal>
      )}
    </div>
    </AgendaCtx.Provider>
  );
}
