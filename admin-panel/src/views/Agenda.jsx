import { useState, useMemo, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Ban, CalendarOff,
  CheckCircle2, XCircle, Clock, Trash2, Lock, History,
  User, Phone, Mail, Scissors, CalendarDays, DollarSign,
  Timer, MessageSquare, BadgeCheck, Search, ListFilter, MapPin,
  Send, Download, RefreshCw, Copy, Check, ShoppingBag, Gift,
  Users, Eye, UserPlus, MoreHorizontal, GripVertical, AlertTriangle,
} from 'lucide-react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, where, orderBy, limit, writeBatch, getDocs, query,
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { confirmDialog } from '../lib/confirmDialog';
import { withTimeout } from '../lib/firestore-helpers';
import { useCollection } from '../hooks/useCollection';
import { useTenant } from '../contexts/TenantContext';
import ReviewModal from '../components/ReviewModal';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import AIWatermark from '../components/ui/AIWatermark';

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
  return {
    slotMins,
    totalSlots,
    timeLabels,
    pickerLabels,
    slotIdx: t => { const [h, m] = t.split(':').map(Number); return Math.floor((h * 60 + m - hourStart * 60) / slotMins); },
  };
}

const AgendaCtx = createContext(buildSlotCfg(30));

const STATUS_STYLE = {
  Confirmada: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
  Cancelada:  'bg-red-500/10   border-red-500/30     text-red-400',
  Completada: 'bg-blue-500/10  border-blue-500/30    text-blue-400',
};

/* ── Helpers ─────────────────────────────────────────────────── */
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function toMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

/* ── Layout de columnas por solapamiento real ───────────────────
 * Reparte las citas en columnas lado a lado cuando sus rangos de
 * tiempo (inicio + duración) se solapan, NO solo cuando comparten la
 * misma hora exacta. Devuelve [{ cita, colIndex, colTotal }].          */
function computeOverlapLayout(citas) {
  const events = citas
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
function Modal({ title, onClose, children, footer, maxW = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className={`w-full ${maxW} bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-confirm-pop`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

/* ── CitaModal (create / edit) ───────────────────────────────── */
function CitaModal({ cita, barberos, servicios, productos = [], defaultHora, defaultBarberoId, defaultEstado, sobrecupo = false, dateStr, onClose, onComplete }) {
  const { pickerLabels } = useContext(AgendaCtx);
  const isNew = !cita;
  const { id: tenantId } = useTenant();
  const defaultBarb = defaultBarberoId || barberos[0]?.id || '';
  const firstSvc = servicios[0];

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

  const [form, setForm] = useState({
    clienteNombre:   cita?.clienteNombre   || '',
    clienteEmail:    cita?.clienteEmail    || '',
    clienteTelefono: cita?.clienteTelefono || '',
    clienteId:       cita?.clienteId       || null,
    servicioId:      initialSvcId,
    servicioNombre:  initialSvcNombre,
    precio:          cita?.precio != null ? Number(cita.precio) : (Number(matchedSvc?.precio || firstSvc?.precio) || 0),
    duracion:        Number(cita?.duracion || cita?.duracionServicio || firstSvc?.duracion) || 30,
    barberoId:       cita?.barberoId       || defaultBarb,
    barbero:         cita?.barbero         || barberos.find(b => b.id === defaultBarb)?.nombre || '',
    fecha:           cita?.fecha           || dateStr,
    hora:            cita?.hora            || defaultHora || '09:00',
    estado:          defaultEstado         || cita?.estado || 'Confirmada',
    nota:            cita?.nota            || '',
    metodoPago:      cita?.metodoPago      || 'Efectivo',
    propina:         cita?.propina != null ? Number(cita.propina) : '',
    porcentajeDescuento: cita?.porcentajeDescuento != null ? Number(cita.porcentajeDescuento) : '',
    cortesia:        cita?.cortesia || false,
  });
  const [saving, setSaving] = useState(false);
  const [showSugg, setShowSugg] = useState(false);
  const [telError, setTelError] = useState(false);
  const [gcInput, setGcInput]         = useState(cita?.giftCardCodigo || '');
  const [gcFound, setGcFound]         = useState(null);
  const [gcSearching, setGcSearching] = useState(false);
  const [gcErr, setGcErr]             = useState('');

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
  const totalTicket          = (Number(form.precio) || 0) + totalProductosPrev + totalProductosNuevos;

  const { data: clientes } = useCollection('clientes');
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

  const suggestions = useMemo(() => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(form.clienteNombre.trim());
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    const scored = clientes
      .map(c => {
        const nombre = norm(c.nombre);
        const email  = norm(c.email);
        const tel    = (c.telefono || '').replace(/\D/g, '');
        const allWords = words.every(w =>
          nombre.includes(w) || email.includes(w) || tel.includes(w),
        );
        if (!allWords) return null;
        // Prioridad: nombre empieza con la query > cualquier palabra empieza con query > contiene
        const score = nombre.startsWith(q) ? 0
          : words.some(w => nombre.startsWith(w)) ? 1
          : 2;
        return { c, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .map(({ c }) => c)
      .slice(0, 8);
    return scored;
  }, [clientes, form.clienteNombre]);

  const selectCliente = async c => {
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

  // Atención de cortesía: servicio gratis, pero la visita y el sello se registran igual.
  const toggleCortesia = on => {
    if (on) {
      setForm(f => ({ ...f, cortesia: true, precio: 0, porcentajeDescuento: '', metodoPago: 'Cortesía', propina: '' }));
    } else {
      const base = Number(servicios.find(s => s.id === form.servicioId)?.precio) || 0;
      setForm(f => ({ ...f, cortesia: false, precio: base, metodoPago: f.metodoPago === 'Cortesía' ? 'Efectivo' : f.metodoPago }));
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

  const handleSave = async () => {
    if (!form.clienteNombre.trim()) return;
    setSaving(true);
    try {
      // Fecha efectiva de la cita: la del formulario (editable) cae al día visible si quedara vacía.
      const fechaCita = form.fecha || dateStr;
      const payload = { ...form, duracionServicio: form.duracion, fecha: fechaCita, updatedAt: serverTimestamp() };
      if (!payload.clienteId) delete payload.clienteId;

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
        if (sobrecupo) payload.sobrecupo = true;
        if (form.barberoId) {
          const safeHora = (form.hora || '').replace(':', '');
          const safeBid  = String(form.barberoId).replace(/[^a-zA-Z0-9_-]/g, '_');
          // Un sobrecupo usa un lockId único para no pisar el lock de la cita ya existente en ese horario.
          const lockId   = sobrecupo
            ? `${safeBid}_${fechaCita}_${safeHora}_sc${Date.now().toString(36)}`
            : `${safeBid}_${fechaCita}_${safeHora}`;
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

        // Calcular el lockId que correspondería al estado nuevo
        const needsLock = form.estado !== 'Cancelada' && !!form.barberoId;
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
                metodoPago:    form.metodoPago    || 'Efectivo',
                barberoId:     form.barberoId,
                barberoNombre: form.barbero,
                citaId:        cita.id,
                fecha:         fechaCita,
                createdAt:     serverTimestamp(),
                updatedAt:     serverTimestamp(),
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

        if (applyingGC) {
          const gcDescuento = Math.min(gcFound.saldo, totalTicket);
          const nuevoSaldo  = Math.max(0, gcFound.saldo - gcDescuento);
          await updateDoc(doc(db, `${tenantCol('giftCards').path}/${gcFound.id}`), {
            saldo: nuevoSaldo,
            estado: nuevoSaldo <= 0 ? 'usada' : 'parcial',
            ultimoUso: serverTimestamp(),
          }).catch(() => {});
        }

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

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

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
          <button onClick={onClose} className="shrink-0 px-4 py-2.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.clienteNombre}
            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isNew ? 'Crear cita' : 'Guardar'}
          </button>
        </div>
      }
    >
      <div className="relative">
        <label className={lbl}>Nombre del cliente *</label>
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
                  <p className="text-sm text-white font-medium truncate">{c.nombre}</p>
                  {c.telefono && <p className="text-xs text-slate-500 truncate">{c.telefono}</p>}
                </div>
                {(() => {
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
      {clMember && (
        <div className="flex items-center gap-2.5 p-3 bg-amber-500/5 border border-amber-500/30 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <BadgeCheck size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-amber-400">Cliente Corte al Lápiz</p>
            <p className="text-[11px] text-slate-400">Cuota actual: {clFmt(clMember.saldo)} · paga a fin de mes</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Email</label>
          <input className={field} type="email" inputMode="email" placeholder="juan@email.com" value={form.clienteEmail} onChange={e => set('clienteEmail', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>
            Teléfono
            {form.estado === 'Completada' && <span className="ml-1 text-amber-400 normal-case font-normal">— opcional (requerido para el sello)</span>}
          </label>
          <div className="flex gap-1.5">
            <input
              className={`${field} ${telError ? 'border-red-500 focus:border-red-400' : ''}`}
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
                className="flex-shrink-0 flex items-center justify-center w-10 rounded-lg bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 hover:border-emerald-500/60 transition-colors"
              >
                <MessageSquare size={15} />
              </a>
            )}
          </div>
          {telError && (
            <p className="mt-1 text-xs text-red-400 font-semibold">El teléfono es obligatorio para registrar el sello.</p>
          )}
        </div>
      </div>
      {fotoFavorita && (
        <div className="p-3 bg-slate-900 border border-slate-750/70 rounded-xl flex items-center gap-3.5 my-2">
          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-slate-750">
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
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-[10px] font-bold text-white rounded-lg transition-colors border border-slate-700 shrink-0"
          >
            Ver grande
          </a>
        </div>
      )}
      <div>
        <label className={lbl}>Servicio</label>
        <select className={field} value={form.servicioId} onChange={e => onServicioChange(e.target.value)}>
          {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          {servicios.length === 0 && <option value="">Sin servicios</option>}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
        <div>
          <label className={lbl}>Precio ($)</label>
          <input className={`${field} disabled:opacity-50 disabled:cursor-not-allowed`} type="number" inputMode="numeric" placeholder="Precio" value={form.precio} disabled={form.cortesia} onChange={e => set('precio', Number(e.target.value))} />
        </div>
        <div>
          <label className={lbl}>Descuento (%)</label>
          <input className={`${field} disabled:opacity-50 disabled:cursor-not-allowed`} type="number" inputMode="numeric" placeholder="0" min="0" max="100" value={form.porcentajeDescuento || ''} disabled={form.cortesia} onChange={e => handleDiscountChange(e.target.value)} />
        </div>
      </div>
      {rangoDesc && !form.cortesia && (
        <div className="flex items-center gap-2 px-3 py-2 -mt-1 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/25 text-[11px] text-emerald-300">
          <BadgeCheck size={13} className="shrink-0" />
          <span>Rango <b className="text-white">{rangoDesc.nombre}</b> · {rangoDesc.pct}% de descuento en servicios{(Number(form.porcentajeDescuento) || 0) >= rangoDesc.pct ? ' aplicado' : ' (ajustable arriba)'}</span>
        </div>
      )}
      <div>
        <label className={lbl}>Fecha</label>
        <input className={field} type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        {form.fecha && form.fecha !== dateStr && (
          <p className="mt-1 text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <CalendarDays size={11} /> La cita se moverá al {new Date(form.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Barbero</label>
          <select className={field} value={form.barberoId} onChange={e => onBarberoChange(e.target.value)}>
            {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Hora</label>
          <select className={field} value={form.hora} onChange={e => set('hora', e.target.value)}>
            {(pickerLabels.includes(form.hora) ? pickerLabels : [form.hora, ...pickerLabels].filter(Boolean))
              .map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      {!isNew && (
        <div className="space-y-3">
          <div>
            <label className={lbl}>Estado</label>
            <select className={field} value={form.estado} onChange={e => set('estado', e.target.value)}>
              <option>Confirmada</option>
              <option>Completada</option>
              <option>Cancelada</option>
            </select>
          </div>
          
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
                <span className="text-sm font-semibold text-white">Atención de cortesía (gratis)</span>
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
                  <span className="text-sm font-semibold text-white">Cobrar a Corte al Lápiz (pago a fin de mes)</span>
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
                Se cargará a la cuenta de <b className="text-white">{form.clienteNombre || 'el cliente'}</b>: {clFmt(Number(form.precio) || 0)} + {clFmt(clRecargo)} de recargo = <b className="text-white">{clFmt((Number(form.precio) || 0) + clRecargo)}</b>. No se cobra ahora; lo paga a fin de mes.
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-800/80 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <label className={lbl}>Método de Pago *</label>
                <select className={field} value={form.metodoPago} onChange={e => set('metodoPago', e.target.value)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                  <option value="Transferencia">Transferencia</option>
                  {form.metodoPago === 'Tarjeta' && (
                    <option value="Tarjeta">Tarjeta (legacy)</option>
                  )}
                </select>
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

          {/* Productos vendidos junto a la cita */}
          <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag size={11} className="text-emerald-400" />
                Productos del Ticket
              </p>
              {totalTicket > 0 && (
                <span className="text-[10px] text-slate-500">
                  Total: <span className="text-emerald-400 font-bold">${Math.round(totalTicket).toLocaleString('es-CL')}</span>
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
                    <span className="text-white truncate flex-1">
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
                  <select
                    className={field}
                    value={newProductId}
                    onChange={e => setNewProductId(e.target.value)}
                  >
                    <option value="">— elegir —</option>
                    {productosDisponibles.map(p => {
                      const usados = ticketNuevos.filter(n => n.productId === p.id).reduce((s, n) => s + n.cantidad, 0);
                      const stockShown = !isNaN(Number(p.stock)) ? Number(p.stock) - usados : null;
                      const sinStock   = stockShown !== null && stockShown <= 0;
                      return (
                        <option key={p.id} value={p.id} disabled={sinStock}>
                          {p.nombre} — ${Math.round(Number(p.precio) || 0).toLocaleString('es-CL')}
                          {stockShown !== null ? (sinStock ? ' · sin stock' : ` · stock ${stockShown}`) : ''}
                        </option>
                      );
                    })}
                  </select>
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
                    className="flex-1 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={14} /> Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingProducto(false); setNewProductId(''); setNewProductQty(1); setNewProductDesc(0); }}
                    className="px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
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
        </div>
      )}
      <div>
        <label className={lbl}>Nota interna</label>
        <textarea className={`${field} resize-none`} rows={2} placeholder="Ej: Cliente prefiere sin gel..." value={form.nota} onChange={e => set('nota', e.target.value)} />
      </div>
    </Modal>
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

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1';

  return (
    <Modal
      title="Bloquear horario"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all">
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
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${tipo === v ? 'border-red-500/60 bg-red-500/10 text-red-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Barbero */}
      <div>
        <label className={lbl}>Barbero (vacío = todos)</label>
        <select className={field} value={barberoId} onChange={e => setBId(e.target.value)}>
          <option value="">— Todos los barberos —</option>
          {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
        </select>
      </div>

      {/* Horario parcial */}
      {tipo === 'parcial' && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Desde</label>
              <select className={field} value={horaIni} onChange={e => { setHIni(e.target.value); setHoraError(''); }}>
                {pickerLabels.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Hasta</label>
              <select className={field} value={horaFin} onChange={e => { setHFin(e.target.value); setHoraError(''); }}>
                {pickerLabels.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
  const { slotIdx, totalSlots } = useContext(AgendaCtx);
  const startIdx = bloqueo.todo_el_dia ? 0 : Math.max(0, slotIdx(bloqueo.hora_inicio));
  const endIdx   = bloqueo.todo_el_dia ? totalSlots : Math.min(totalSlots, slotIdx(bloqueo.hora_fin));
  const spans    = Math.max(endIdx - startIdx, 1);

  return (
    <div
      title={`Bloqueado${bloqueo.nota ? ': ' + bloqueo.nota : ''}`}
      onClick={async () => { if (await confirmDialog('¿Desbloquear este horario?')) onDelete(bloqueo); }}
      className="absolute inset-x-0.5 rounded-md border border-red-500/30 bg-red-950/40 px-2 py-1 overflow-hidden cursor-pointer hover:bg-red-950/60 transition-all"
      style={{ top: `${startIdx * 40}px`, height: `${spans * 40 - 4}px` }}
    >
      <div className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
        <Lock size={10} />
        <span className="truncate">{bloqueo.todo_el_dia ? 'Día cerrado' : `${bloqueo.hora_inicio}–${bloqueo.hora_fin}`}</span>
      </div>
      {bloqueo.nota && <p className="text-[9px] text-red-400/60 truncate mt-0.5">{bloqueo.nota}</p>}
    </div>
  );
}

/* ── AppointmentBlock ────────────────────────────────────────── */
function AppointmentBlock({ cita, colIndex, colTotal, onClick, onContextMenu, onDragStart, onDragEnd, onDropOnCita, isDragged, dragActive }) {
  const { slotIdx, totalSlots, slotMins } = useContext(AgendaCtx);
  const slot  = Math.max(0, Math.min(totalSlots - 1, slotIdx(cita.hora)));
  const spans = Math.max(1, Math.min(totalSlots - slot, Math.round((cita.duracion || cita.duracionServicio || 30) / slotMins)));
  const color = STATUS_STYLE[cita.estado] ?? STATUS_STYLE.Confirmada;
  const pct   = 100 / colTotal;
  const arrastrable = cita.estado !== 'Cancelada' && cita.estado !== 'Completada';
  const [over, setOver] = useState(false);

  return (
    <div
      onClick={() => onClick(cita)}
      onContextMenu={(e) => { if (onContextMenu) { e.preventDefault(); onContextMenu(e, cita); } }}
      draggable={arrastrable}
      onDragStart={(e) => onDragStart && onDragStart(e, cita)}
      onDragEnd={() => { setOver(false); onDragEnd && onDragEnd(); }}
      onDragOver={(e) => { if (dragActive) e.preventDefault(); }}
      onDragEnter={() => { if (dragActive && !isDragged) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.stopPropagation(); e.preventDefault(); setOver(false); onDropOnCita && onDropOnCita(cita); }}
      className={`group absolute rounded-md border px-2 py-1 overflow-hidden ${arrastrable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:brightness-125 transition-all text-xs ${color} ${
        isDragged ? 'opacity-40 ring-2 ring-emerald-400 z-30'
                  : over ? 'ring-2 ring-amber-400 brightness-125 z-30'
                  : dragActive ? 'ring-1 ring-amber-400/50'
                  : ''
      }`}
      style={{
        top:    `${slot * 40}px`,
        height: `${spans * 40 - 4}px`,
        left:   `calc(${colIndex * pct}% + 2px)`,
        width:  `calc(${pct}% - 4px)`,
      }}
    >
      {arrastrable && (
        <GripVertical size={12} className="absolute top-1 right-1 text-white/45 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
      <p className="font-semibold truncate leading-tight">
        {cita.sobrecupo && <span className="mr-1 px-1 py-px rounded bg-amber-500/25 text-amber-300 text-[8px] font-bold uppercase tracking-wide align-middle">Sobrecupo</span>}
        {cita.clienteNombre || 'Cliente'}
      </p>
      <p className="truncate text-[10px] opacity-75">{cita.servicioNombre}</p>
      <p className="truncate text-[10px] opacity-50">{cita.hora}{cita.sucursalNombre ? ` · ${cita.sucursalNombre}` : ''}</p>
    </div>
  );
}

/* ── SlotRow (clickable empty slot) ─────────────────────────── */
function SlotRow({ idx, barberoId, dateStr, onNewCita, onNewBloqueo, blockMode, onDragOver, onDrop, dragActive }) {
  const { timeLabels } = useContext(AgendaCtx);
  const hora = timeLabels[idx];
  const [over, setOver] = useState(false);
  return (
    <div
      onClick={() => blockMode ? onNewBloqueo(barberoId, hora) : onNewCita(barberoId, hora)}
      onDragOver={onDragOver}
      onDragEnter={() => { if (dragActive) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop && onDrop(barberoId, hora); }}
      className={`absolute inset-x-0 h-10 border-b border-slate-800/40 transition-colors ${
        idx % 2 === 0 ? '' : 'bg-slate-800/10'
      } ${blockMode ? 'hover:bg-red-950/20 cursor-crosshair' : 'hover:bg-emerald-900/10 hover:border-dashed hover:border-emerald-500/30 cursor-pointer'} ${
        over && dragActive ? '!bg-emerald-500/30 ring-2 ring-inset ring-emerald-400 z-10'
          : dragActive && !blockMode ? 'bg-emerald-900/10 ring-1 ring-inset ring-emerald-500/25' : ''
      }`}
      style={{ top: `${idx * 40}px` }}
    />
  );
}

/* ── CitaContextMenu — menú al hacer clic derecho sobre una cita ── */
function CitaContextMenu({ x, y, cita, onHistorial, onCambiarFecha, onEditar, onWhatsApp, onCancelar, onEliminar, onClose }) {
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

  return (
    <div className="fixed inset-0 z-[70]" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }}>
      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        className="absolute w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 overflow-hidden"
        style={{ left: pos.left, top: pos.top }}
      >
        <div className="px-3 py-2 border-b border-slate-800 mb-1">
          <p className="text-xs font-semibold text-white truncate">{cita.clienteNombre || 'Cliente'}</p>
          <p className="text-[10px] text-slate-500 truncate">{cita.hora}{cita.servicioNombre ? ` · ${cita.servicioNombre}` : ''}</p>
        </div>
        <button
          onClick={onHistorial}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <History size={15} className="text-emerald-400 shrink-0" />
          Ver historial / Notas
        </button>
        <button
          onClick={onCambiarFecha}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <CalendarDays size={15} className="text-emerald-400 shrink-0" />
          Cambiar de fecha
        </button>
        <button
          onClick={onEditar}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Scissors size={15} className="text-slate-400 shrink-0" />
          Editar cita
        </button>
        {cita.clienteTelefono && (
          <button
            onClick={onWhatsApp}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <MessageSquare size={15} className="text-green-400 shrink-0" />
            Confirmar por WhatsApp
          </button>
        )}
        {cita.estado !== 'Cancelada' && (
          <button
            onClick={onCancelar}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Ban size={15} className="text-amber-400 shrink-0" />
            Cancelar cita
          </button>
        )}
        <div className="my-1 border-t border-slate-800" />
        <button
          onClick={onEliminar}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={15} className="shrink-0" />
          Eliminar cita
        </button>
      </div>
    </div>
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
  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors';

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ocupada ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
              <CalendarDays size={20} className={ocupada ? 'text-amber-400' : 'text-emerald-400'} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Mover cita</p>
              <p className="text-xs text-slate-500">{data.cita.clienteNombre || 'Cliente'}</p>
            </div>
          </div>

          <p className="text-sm text-slate-300">
            Mover a las <span className="font-bold text-white">{data.hora}</span> con <span className="font-bold text-white">{data.barberoNombre}</span>
            {otroDia && <> el <span className="font-bold text-white">{fecha}</span></>}.
          </p>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Fecha</label>
            <input type="date" className={inp} value={fecha} onChange={e => setFecha(e.target.value)} />
            <p className="text-[11px] text-slate-500 mt-1.5">Cambia la fecha para reagendar a otro día.</p>
          </div>

          {ocupada && (
            <div className="flex items-start gap-2 text-amber-300 text-xs bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>Ese horario <b>ya tiene una cita</b>. Quedará como <b>sobrecupo</b> (dos citas a la misma hora). Asegúrate de poder atender ambas.</span>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all">
              Cancelar
            </button>
            <button onClick={handle} disabled={loading}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${
                ocupada ? 'text-amber-950 bg-amber-400 hover:bg-amber-300' : 'text-emerald-950 bg-emerald-400 hover:bg-emerald-300'
              }`}>
              {loading ? 'Moviendo...' : ocupada ? 'Mover (sobrecupo)' : otroDia ? 'Mover a otro día' : 'Mover cita'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── HistorialNotasModal — historial rápido + notas internas del equipo ── */
const ESTADO_BADGE_HN = {
  Confirmada: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Confirmado: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Completada: 'bg-blue-500/20   text-blue-300   border-blue-500/40',
  Cancelada:  'bg-red-500/20    text-red-300    border-red-500/40',
  Pendiente:  'bg-amber-500/20  text-amber-300  border-amber-500/40',
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
  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';

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
          <p className="text-base font-bold text-white truncate">{cita.clienteNombre || 'Cliente'}</p>
          <p className="text-xs text-slate-500 truncate">
            {cita.clienteTelefono || cita.clienteEmail || 'Sin contacto'}
          </p>
        </div>
        {visitas && (
          <div className="flex gap-2 shrink-0">
            <span className="text-center px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
              <span className="block text-sm font-black text-white leading-none">{visitas.length}</span>
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
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all"
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
                  <span className="text-xs text-white truncate ml-auto text-right">{v.servicioNombre || '—'}</span>
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
        <p className="text-sm text-white break-words">{value}</p>
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
                      <p className="text-lg font-bold text-white leading-none">{clientHistory.total}</p>
                      <p className="text-[9px] text-slate-500 mt-1">citas totales</p>
                    </div>
                    <div className="text-center bg-slate-800/60 rounded-lg py-2 px-1">
                      <p className="text-xs font-bold text-white truncate leading-tight">{clientHistory.favSvc || '—'}</p>
                      <p className="text-[9px] text-slate-500 mt-1">servicio fav.</p>
                    </div>
                    <div className="text-center bg-slate-800/60 rounded-lg py-2 px-1">
                      <p className="text-xs font-bold text-white leading-tight">{clientHistory.lastVisit || '—'}</p>
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
const ESTADOS_FILTRO = ['Confirmada', 'Completada', 'Cancelada', 'Pendiente'];

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
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>
          <div className="relative">
            <ListFilter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select
              value={estado}
              onChange={e => setEstado(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500 transition-colors appearance-none"
            >
              <option value="">Todos</option>
              {ESTADOS_FILTRO.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
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
                  'bg-emerald-400'
                }`} />

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-semibold text-white truncate">{c.clienteNombre || 'Sin nombre'}</p>
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
                <p className="text-sm font-semibold text-white truncate">{c.clienteNombre || '—'}</p>
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
      if (c.estado !== 'Cancelada') {
        const dur  = Number(c.duracion || c.duracionServicio || 30);
        const base = c.hora;
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
            <p className="text-xs font-bold text-white tracking-wide">Canal de difusión</p>
            <p className="text-[10px] text-slate-500">
              {freeSlots.length} hora{freeSlots.length !== 1 ? 's' : ''} libre{freeSlots.length !== 1 ? 's' : ''} · {fechaFmt.charAt(0).toUpperCase() + fechaFmt.slice(1)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExport}
            title="Exportar imagen PNG"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
          >
            <Download size={12} /> Imagen PNG
          </button>
          <button
            onClick={handleCopy}
            title="Copiar mensaje"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              copied
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
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
      : 'text-slate-300 hover:bg-slate-800 hover:text-white';
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
  const { id: tenantId } = useTenant();
  // Duración de franja cacheada por sede → evita el parpadeo del eje "denso" en la primera carga.
  const SLOT_KEY = `agenda_slot_${tenantId}`;
  const [slotMins,      setSlotMins]      = useState(() => Number(localStorage.getItem(SLOT_KEY)) || 30);
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
  const [ctxMenu,       setCtxMenu]       = useState(null);  // { x, y, cita } menú clic derecho sobre una cita
  const [histModal,     setHistModal]     = useState(null);  // cita seleccionada para ver historial/notas
  const [showDifusionModal, setShowDifusionModal] = useState(false);
  const [soloBarbero,   setSoloBarbero]   = useState(null);   // id del barbero enfocado (null = todos)
  const [labelStep,     setLabelStep]     = useState(() => Number(localStorage.getItem(SLOT_KEY)) || 15);     // minutos entre etiquetas visibles en el eje
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

  useEffect(() => {
    withTimeout(getDoc(doc(tenantCol('configuracion'), 'main')), 10000, 'agenda/cfg-main')
      .then(snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.intervaloMinutos) { setSlotMins(data.intervaloMinutos); setLabelStep(data.intervaloMinutos); try { localStorage.setItem(SLOT_KEY, String(data.intervaloMinutos)); } catch { /* noop */ } }
        // Guardamos el horario completo; el rango visible se calcula POR DÍA (abajo),
        // respetando diasConfig (cada día puede cerrar a una hora distinta).
        setCfgHorario({ horarioInicio: data.horarioInicio, horarioFin: data.horarioFin, diasConfig: data.diasConfig || null });
      })
      .catch(() => {});
  }, []);

  // Rango de horas visible según el horario del DÍA seleccionado (respeta diasConfig).
  // Sin esto, la agenda usaba un horarioFin global (el del primer día activo) para
  // todos los días, recortando p. ej. el viernes que cierra más tarde.
  useEffect(() => {
    const c = cfgHorario; if (!c) return;
    const dow = date.getDay();                         // 0=Dom … 6=Sáb
    const dc = c.diasConfig || {};
    const day = dc[dow] ?? dc[String(dow)] ?? null;
    const ini = (day && day.inicio) || c.horarioInicio || '08:00';
    const fin = (day && day.fin)    || c.horarioFin    || '20:00';
    const hi = parseInt(String(ini).split(':')[0], 10);
    const fp = String(fin).split(':').map(Number);
    const hf = fp[0], mf = fp[1] || 0;
    setHourStart(Number.isFinite(hi) ? hi : 8);
    setHourEnd(Number.isFinite(hf) ? (mf > 0 ? hf + 1 : hf) : 20);
  }, [cfgHorario, date]);

  const slotCfg = useMemo(() => buildSlotCfg(slotMins, hourStart, hourEnd), [slotMins, hourStart, hourEnd]);
  const { totalSlots, timeLabels } = slotCfg;

  const dateStr = fmt(date);

  // ── Indicador "ahora" y salto a la hora actual ────────────────
  const isToday     = fmt(now) === dateStr;
  const nowMins     = now.getHours() * 60 + now.getMinutes();
  const nowInRange  = nowMins >= hourStart * 60 && nowMins <= hourEnd * 60;
  const nowOffsetPx = ((nowMins - hourStart * 60) / slotMins) * 40;
  const nowLabel    = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const showNowLine = isToday && nowInRange;

  const scrollToNow = () => {
    if (!isToday) setDate(new Date());
    requestAnimationFrame(() => {
      const el = swimRef.current;
      if (!el) return;
      const target = 40 + ((nowMins - hourStart * 60) / slotMins) * 40 - el.clientHeight / 2;
      el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    });
  };

  // Auto-scroll a la hora actual la primera vez que se ve el día de hoy.
  useEffect(() => {
    if (didAutoScroll.current || !showNowLine) return;
    const el = swimRef.current;
    if (!el) return;
    didAutoScroll.current = true;
    el.scrollTo({ top: Math.max(0, 40 + nowOffsetPx - el.clientHeight / 2), behavior: 'smooth' });
  }, [showNowLine, nowOffsetPx]);

  const { data: rawBarberos, loading: barberosLoading } = useCollection('barberos');
  const { data: citas }       = useCollection('citas',    [where('fecha', '==', dateStr)], [dateStr]);
  const { data: bloqueos }    = useCollection('bloqueos', [where('fecha', '==', dateStr)], [dateStr]);
  const { data: servicios }   = useCollection('servicios');
  const { data: productos }   = useCollection('productos');

  const barberos = useMemo(() =>
    rawBarberos.filter(b => !b._mainDocId && b.disponible !== false && (b.rol !== 'admin' || tenantId === 'delnero')),
  [rawBarberos, tenantId]);

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
    // El arrastre solo arranca desde la manija (⠿) tras mover 6px → no choca con el tap.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
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

  const moveDay = delta => { const d = new Date(date); d.setDate(d.getDate() + delta); setDate(d); };

  const handleDeleteBloqueo = useCallback(async bloqueo => {
    const batch = writeBatch(db);
    batch.delete(doc(db, `${tenantCol('bloqueos').path}/${bloqueo.id}`));
    if (bloqueo.slotLockId) {
      batch.delete(doc(db, `${tenantCol('slotLocks').path}/${bloqueo.slotLockId}`));
    }
    await batch.commit();
  }, []);

  // Al soltar una cita: abre el aviso de la app (no el confirm del navegador).
  // Detecta si el horario destino ya está ocupado → sobrecupo (con precaución).
  const handleDrop = (barberoId, hora) => {
    if (!draggedCita) return;

    // Mismo slot → no hacer nada
    if (draggedCita.barberoId === barberoId && draggedCita.hora === hora) {
      setDraggedCita(null);
      return;
    }

    const targetBarbero = barberos.find(b => b.id === barberoId);
    const barberoNombre = targetBarbero?.nombre || '';

    const ocupada = citas.some(c =>
      c.id !== draggedCita.id &&
      c.barberoId === barberoId &&
      c.hora === hora &&
      c.estado !== 'Cancelada',
    );

    setReagendarModal({ cita: draggedCita, barberoId, barberoNombre, hora, ocupada });
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
    } catch (err) {
      console.error('Error al reagendar cita:', err);
    }
    setReagendarModal(null);
  };

  const openNewCita    = (barberoId, hora) => setCitaModal({ cita: null, barberoId, hora });
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
  const openNewBloqueo = (barberoId, hora) => setBlqModal({ barberoId, hora, tipo: 'parcial' });

  const diaGlobalCerrado = bloqueos.some(b => b.todo_el_dia && !b.barberoId);

  const bloqueosPorBarbero = useCallback((barberoId) =>
    bloqueos.filter(b => !b.barberoId || b.barberoId === barberoId),
  [bloqueos]);

  return (
    <AgendaCtx.Provider value={slotCfg}>
    <div className="flex flex-col h-full gap-3">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="flex items-center gap-2 mr-2">
          <h1 className="text-xl font-bold text-white">Agenda</h1>
          <HelpButton onClick={() => setShowHelp(true)} />
        </span>

        <div className="flex items-center gap-1">
          <button onClick={() => moveDay(-1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><ChevronLeft size={18} /></button>
          <span className="text-sm font-semibold text-white min-w-[150px] text-center capitalize">
            {date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <button onClick={() => moveDay(1)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"><ChevronRight size={18} /></button>
          <button onClick={() => setDate(new Date())} className="ml-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all">Hoy</button>
        </div>

        {/* Reloj en vivo + selector de intervalo */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={scrollToNow}
            title={isToday ? 'Ir a la hora actual' : 'Volver a hoy y a la hora actual'}
            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
          >
            <span className="relative flex h-2 w-2">
              {showNowLine && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />}
              <Clock size={13} className="text-emerald-400 -m-0.5" />
            </span>
            <span className="text-xs font-mono font-semibold text-slate-200 tabular-nums group-hover:text-white">{nowLabel}</span>
          </button>

          <div className="relative flex items-center gap-0.5 border border-slate-700 rounded-lg p-0.5" title="Resolución de la grilla: a menor intervalo, las citas se ordenan con más precisión">
            {[15, 30, 45, 60].map(step => {
              const active = slotMins === step;
              return (
                <button
                  key={step}
                  onClick={() => { setSlotMins(step); setLabelStep(step); try { localStorage.setItem(SLOT_KEY, String(step)); } catch { /* noop */ } }}
                  className={`relative px-2 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors ${
                    active ? 'text-white' : 'text-slate-500 hover:text-slate-200'
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

        {/* Acciones primarias — siempre pegadas a la derecha, incluso si la barra se envuelve */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Acción primaria */}
        <button
          onClick={() => setCitaModal({ cita: null, barberoId: barberos[0]?.id || '', hora: '09:00' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shrink-0"
        >
          <Plus size={14} /> Nueva cita
        </button>

        {/* Menú de acciones secundarias */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
              showMenu || blockMode
                ? 'border-slate-600 bg-slate-800 text-white'
                : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
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
              className="absolute top-3 right-3 px-2.5 py-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg text-xs font-black transition-all z-50 shadow-md animate-pulse"
            >
              ✕
            </button>
            <DifusionPanel
              citas={citas}
              bloqueos={bloqueos}
              barberos={barberos}
              dateStr={dateStr}
              tenantId={tenantId}
            />
          </div>
        </div>
      )}

      {focusBarbero && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 shrink-0">
          <User size={14} />
          <span className="flex-1 font-medium">Mostrando solo la agenda de <strong className="font-bold">{focusBarbero.nombre}</strong></span>
          <button
            onClick={() => setSoloBarbero(null)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-semibold transition-colors"
          >
            <Users size={13} /> Ver todos
          </button>
        </div>
      )}

      {/* Swimlane */}
      <div ref={swimRef} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-auto no-scrollbar">
        <div className="flex min-w-max">

          {/* Time axis */}
          <div className="w-16 shrink-0 sticky left-0 bg-slate-900 z-20 border-r border-slate-800 relative">
            <div className="h-10 border-b border-slate-800" />
            {showNowLine && (
              <div
                className="absolute right-0 z-30 flex justify-end pr-1 pointer-events-none"
                style={{ top: `${40 + nowOffsetPx}px`, transform: 'translateY(-50%)' }}
              >
                <span className="text-[9px] font-mono font-bold text-white bg-red-500 rounded px-1 py-px shadow-[0_0_6px_rgba(239,68,68,0.6)]">
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
              const labelColor = m === 0 ? 'text-slate-400' : m % 30 === 0 ? 'text-slate-500' : 'text-slate-600';
              return (
                <div key={i} className="h-10 relative border-b border-slate-800/60">
                  {showLabel && (
                    <span className={`absolute right-3 top-0.5 text-[10px] font-mono ${labelColor}`}>{t}</span>
                  )}
                  {subMarks.map(({ label, pct }) => (
                    <div key={label} className="absolute inset-x-0 flex items-center justify-end pr-3" style={{ top: `${pct}%`, transform: 'translateY(-50%)' }}>
                      <span className="text-[9px] font-mono text-slate-600">{label}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

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
          ) : (
            <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={handleReorderBarberos}>
              <SortableContext items={barberosVisibles.map(b => b.id)} strategy={horizontalListSortingStrategy}>
                {barberosVisibles.map(b => {
                  const barberCitas    = citas.filter(c => c.barberoId === b.id);
                  const barberBloqueos = bloqueosPorBarbero(b.id);

                  // Layout en columnas por solapamiento real de horarios (no solo misma hora)
                  const layoutCitas = computeOverlapLayout(barberCitas);

                  return (
                    <SortableCol key={b.id} id={b.id}>
                      {({ setNodeRef, style, listeners, attributes, isDragging }) => (
                        <div
                          ref={setNodeRef}
                          style={style}
                          className={`flex-1 min-w-[160px] border-r border-slate-800 last:border-r-0 ${isDragging ? 'shadow-2xl ring-1 ring-emerald-500/40' : ''}`}
                        >
                          {/* Cabecera: tocar = ver solo este barbero. La manija ⠿ (izquierda) = arrastrar para reordenar. */}
                          <div
                            onClick={() => setSoloBarbero(prev => prev === b.id ? null : b.id)}
                            title={focusBarbero?.id === b.id ? 'Mostrar todos los barberos' : `Ver solo la agenda de ${b.nombre}`}
                            className="group h-10 pr-3 flex items-center gap-1.5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10 cursor-pointer hover:bg-slate-800/60 transition-colors"
                          >
                            {/* Manija de arrastre dedicada: aísla el reordenar del tap "ver solo" */}
                            <span
                              {...attributes}
                              {...listeners}
                              onClick={e => e.stopPropagation()}
                              title="Mantén presionado y arrastra para reordenar"
                              aria-label={`Reordenar a ${b.nombre}`}
                              className="shrink-0 h-full pl-2 pr-1 flex items-center text-slate-600 hover:text-emerald-400 cursor-grab active:cursor-grabbing touch-none select-none"
                            >
                              <GripVertical size={15} />
                            </span>
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center shrink-0">
                              {b.foto
                                ? <img src={b.foto} alt={b.nombre} className="w-full h-full object-cover" />
                                : <span className="text-[10px] font-bold text-emerald-400">{b.nombre?.[0] ?? '?'}</span>}
                            </div>
                            <span className="text-xs font-semibold text-white truncate">{b.nombre}</span>
                            {focusBarbero?.id === b.id
                              ? <Users size={13} className="ml-auto shrink-0 text-emerald-400" />
                              : <Eye size={13} className="ml-auto shrink-0 text-slate-600 group-hover:text-emerald-400 transition-colors" />}
                          </div>

                          <div className="relative" style={{ height: `${totalSlots * 40}px` }}>
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
                            {barberBloqueos.map(blq => (
                              <BloqueoBlock key={blq.id} bloqueo={blq} onDelete={handleDeleteBloqueo} />
                            ))}
                            {layoutCitas.map(({ cita, colIndex, colTotal }) => (
                              <AppointmentBlock
                                key={cita.id}
                                cita={cita}
                                colIndex={colIndex}
                                colTotal={colTotal}
                                onClick={openEditCita}
                                onContextMenu={(e, c) => setCtxMenu({ x: e.clientX, y: e.clientY, cita: c })}
                                onDragStart={(e, c) => setDraggedCita(c)}
                                onDragEnd={() => setDraggedCita(null)}
                                onDropOnCita={(c) => handleDrop(c.barberoId, c.hora)}
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
          dateStr={dateStr}
          onClose={() => setCitaModal(null)}
          onComplete={cita => { setCitaModal(null); setReviewCita(cita); }}
        />
      )}
      {blqModal && (
        <BloqueoModal
          barberos={barberos}
          dateStr={dateStr}
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
          onHistorial={() => { setHistModal(ctxMenu.cita); setCtxMenu(null); }}
          onCambiarFecha={() => { openReagendar(ctxMenu.cita); setCtxMenu(null); }}
          onEditar={() => { openEditCita(ctxMenu.cita); setCtxMenu(null); }}
          onWhatsApp={() => { whatsappCita(ctxMenu.cita); setCtxMenu(null); }}
          onCancelar={async () => {
            const c = ctxMenu.cita; setCtxMenu(null);
            if (await confirmDialog(`¿Cancelar la cita de ${c.clienteNombre || 'este cliente'}?`)) cancelarCita(c);
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
          <p>La <strong className="text-white">Agenda</strong> muestra las citas del día por barbero en columnas. Es tu pantalla central de operación.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Navegación</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Flechas ◀ ▶ o botón <em>Hoy</em> para cambiar de día.</li>
              <li>En móvil, los barberos quedan en pestañas; en desktop ves columnas paralelas.</li>
              <li>Toca la <strong className="text-white">cabecera de un barbero</strong> para ver solo su agenda; tocala de nuevo (o <em>Ver todos</em>) para volver.</li>
              <li>Arrastrá la <strong className="text-white">manija ⠿</strong> (a la izquierda del nombre) para <strong className="text-white">reordenar las columnas</strong>. El orden se guarda en este dispositivo.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Crear cita</p>
            <p>Toca un horario vacío. Si escribes un nombre con coincidencia, autocompleta. Si el cliente es <strong className="text-white">"Migrado"</strong>, autocompleta datos pero NO se marca como "Vinculado" al Club (no se ha registrado aún).</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Editar cita</p>
            <p>Toca una cita existente para cambiar barbero, hora, estado, etc. <strong className="text-white">Cambios de barbero u hora también actualizan el bloqueo del slot</strong> automáticamente (no queda el slot viejo bloqueado).</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Productos del Ticket</p>
            <p>En el modal de edición, abajo del Estado, hay una sección <strong className="text-white">"Productos del Ticket"</strong> para sumar productos vendidos junto al servicio. Descuenta stock y se cuentan en Caja/Métricas como ventas reales.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Marcar como Completada</p>
            <p>Cambiá el estado a <em>Completada</em> al final de la atención. Esto dispara:</p>
            <ul className="list-disc ml-4 space-y-1 mt-1">
              <li>+1 sello al cliente (o descuenta uso de membresía).</li>
              <li>Modal de <strong className="text-white">calificación Google</strong> al cliente cuando entre a su dashboard.</li>
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
