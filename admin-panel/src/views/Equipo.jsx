import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Edit2, Trash2, PowerOff, User, ShieldCheck, MessageCircle,
  Upload, ChevronDown, Plus, X, Phone, Mail, Percent, Scissors,
  CalendarOff, Clock, Check, KeyRound, Link2, Copy, GripVertical,
  Users, Printer, Wallet, ArrowDownCircle, AlertTriangle, CheckCircle2, DollarSign,
  Sparkles, Loader2,
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { updateDoc, addDoc, deleteDoc, doc, serverTimestamp, deleteField, writeBatch, Timestamp, query, where, getDocs } from 'firebase/firestore';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../contexts/AuthContext';
import { useSucursales } from '../hooks/useSucursales';
import { useTenant } from '../contexts/TenantContext';
import DropdownMenu from '../components/ui/DropdownMenu';
import SlideOver    from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

/* ─── Constants ───────────────────────────────────────────── */
const SUPPORT_EMAIL = 'ignaciiio.mate@gmail.com';

const TENANT_DOMAINS = {
  elegance:      'barberiaelegance.synaptechspa.cl',
  ferraza:       'barberiaferraza.synaptechspa.cl',
  gitana:        'gitananails.synaptechspa.cl',
  mapubarbershop:'mapubarbershop.synaptechspa.cl',
  chameleon:     'chameleonbarber.synaptechspa.cl',
};

function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function barberPublicUrl(nombre) {
  const tid    = resolveTenantId();
  const domain = TENANT_DOMAINS[tid] ?? window.location.hostname;
  return `https://${domain}/${slugify(nombre)}`;
}

const DIAS_LABELS = { '1':'Lunes','2':'Martes','3':'Miércoles','4':'Jueves','5':'Viernes','6':'Sábado','0':'Domingo' };
const DIAS_ORDER  = ['1','2','3','4','5','6','0'];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  ['00','30'].map(m => `${String(h).padStart(2,'0')}:${m}`)
).flat();

const DEFAULT_DIA = activo => ({ activo, inicio: '09:00', fin: '20:00', descansos: [] });
const DEFAULT_HORARIO = () => ({
  '0': DEFAULT_DIA(false),
  '1': DEFAULT_DIA(true),
  '2': DEFAULT_DIA(true),
  '3': DEFAULT_DIA(true),
  '4': DEFAULT_DIA(true),
  '5': DEFAULT_DIA(true),
  '6': { activo: true, inicio: '09:00', fin: '14:00', descansos: [] },
});

const BARBER_EMPTY = {
  nombre:'', especialidad:'', foto:'', email:'', whatsapp:'',
  comision: 0,
  sueldoBase: 0,
  comisionProductos: 10,
  sucursalId: '',
  serviciosIds: [],
  horario: DEFAULT_HORARIO(),
  ausencias: [],
  permitirSobrecupoPublico: false,
  tramosVip: [], // [{ inicio: 'HH:MM', fin: 'HH:MM' }] declarados explícitamente
};

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ─── Helpers ────────────────────────────────────────────── */
function buildWaUrl(tenantName) {
  const msg = `Hola, te escribo desde la agenda (${tenantName}), necesito ayuda con la agenda/panel administrativo`;
  return `https://wa.me/56983568212?text=${encodeURIComponent(msg)}`;
}

function initHorario(b) {
  const base = DEFAULT_HORARIO();
  if (b.horario) {
    DIAS_ORDER.forEach(d => {
      if (b.horario[d]) base[d] = { ...base[d], ...b.horario[d], descansos: b.horario[d].descansos || [] };
    });
  }
  return base;
}

/* ─── Section accordion ──────────────────────────────────── */
function Section({ title, Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-4 py-3 bg-slate-800/40 hover:bg-slate-800/60 transition-colors text-left">
        {Icon && <Icon size={14} className="text-slate-400 shrink-0" />}
        <span className="flex-1 text-sm font-semibold text-white">{title}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-3 space-y-3 border-t border-slate-800">{children}</div>}
    </div>
  );
}

/* ─── DayRow ─────────────────────────────────────────────── */
function DayRow({ diaKey, config, onChange }) {
  const addDescanso = () => onChange({ ...config, descansos: [...config.descansos, { inicio:'13:00', fin:'14:00' }] });
  const rmDescanso  = i  => onChange({ ...config, descansos: config.descansos.filter((_,x) => x !== i) });
  const upDescanso  = (i, k, v) => onChange({
    ...config, descansos: config.descansos.map((d, x) => x === i ? { ...d, [k]: v } : d),
  });

  const sel = 'bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-emerald-500';

  return (
    <div className={`rounded-lg border overflow-hidden ${config.activo ? 'border-slate-700' : 'border-slate-800/60'}`}>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <button type="button" onClick={() => onChange({ ...config, activo: !config.activo })}
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
            config.activo ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
          {config.activo && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
        <span className={`text-xs font-semibold w-20 shrink-0 ${config.activo ? 'text-white' : 'text-slate-600'}`}>
          {DIAS_LABELS[diaKey]}
        </span>
        {config.activo ? (
          <div className="flex items-center gap-1 flex-1">
            <select value={config.inicio} onChange={e => onChange({...config, inicio: e.target.value})} className={sel}>
              {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
            <span className="text-slate-600 text-xs">–</span>
            <select value={config.fin} onChange={e => onChange({...config, fin: e.target.value})} className={sel}>
              {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        ) : (
          <span className="text-xs text-slate-700 italic">Día libre</span>
        )}
      </div>

      {config.activo && (
        <div className="px-3 pb-2.5 space-y-1.5 border-t border-slate-800/60 pt-2">
          {config.descansos.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 w-14 shrink-0">Descanso</span>
              <select value={d.inicio} onChange={e => upDescanso(i,'inicio',e.target.value)} className={sel}>
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              <span className="text-slate-600 text-xs">–</span>
              <select value={d.fin} onChange={e => upDescanso(i,'fin',e.target.value)} className={sel}>
                {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              <button type="button" onClick={() => rmDescanso(i)} className="text-red-400/50 hover:text-red-400 transition-colors ml-0.5">
                <X size={12} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addDescanso}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-400 transition-colors">
            <Plus size={10} /> Añadir descanso
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── BookingUrlButton ───────────────────────────────────── */
function BookingUrlButton({ nombre }) {
  const [copied, setCopied] = useState(false);
  const url = barberPublicUrl(nombre);

  function copyUrl(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="group w-full flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 hover:border-slate-600 transition-colors"
      title={url}>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex-1 flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm truncate transition-colors">
        <Link2 size={12} className="text-slate-500 shrink-0" />
        <span className="truncate">/{slugify(nombre)}</span>
      </a>
      <button onClick={copyUrl}
        className="shrink-0 text-slate-500 group-hover:text-slate-300 hover:!text-white transition-colors"
        title="Copiar enlace">
        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
}

/* ─── BiooBarberoButton ──────────────────────────────────────
 * Crea (o muestra) el bioo.cl del barbero. Llama a la callable
 * biooProvisionBarbero que ya pre-llena la página con nombre,
 * foto, WhatsApp, link "Reservar conmigo" e Instagram del tenant.
 */
function BiooBarberoButton({ barber, tenant, canManage }) {
  const [busy, setBusy]     = useState(false);
  const [openBusy, setOpen] = useState(false);
  const [err, setErr]       = useState('');
  const [copied, setCopied] = useState(false);
  const handle = barber.biooHandle || '';
  const url    = handle ? `https://bioo.cl/${handle}` : '';

  if (!canManage) return null;

  const create = async () => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'biooProvisionBarbero');
      const tenantDominio = TENANT_DOMAINS[tenant.id] || `${tenant.id}.synaptechspa.cl`;
      await fn({
        tenantId: tenant.id,
        barberoId: barber.id,
        tenantNombre: tenant.name,
        tenantDominio,
        tenantInstagram: tenant.instagramHandle || tenant.instagram || '',
      });
      // El doc se actualiza via onSnapshot → la card re-renderiza con el handle.
    } catch (e) {
      setErr(e?.message || 'No se pudo crear el bioo.');
    } finally {
      setBusy(false);
    }
  };

  const openEditor = async () => {
    if (openBusy) return;
    setOpen(true); setErr('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'biooOpenBarberoEditor');
      const { data } = await fn({ tenantId: tenant.id, barberoId: barber.id });
      if (data?.editorUrl) window.open(data.editorUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setErr(e?.message || 'No se pudo abrir el editor.');
    } finally {
      setOpen(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  if (handle) {
    return (
      <div className="w-full space-y-2">
        <div
          className="group w-full flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 hover:border-violet-500/40 transition-colors"
          title={url}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center gap-1.5 text-slate-400 hover:text-violet-300 text-sm truncate transition-colors">
            <Sparkles size={12} className="text-violet-400/70 shrink-0" />
            <span className="truncate">bioo.cl/{handle}</span>
          </a>
          <button onClick={copy}
            className="shrink-0 text-slate-500 group-hover:text-slate-300 hover:!text-white transition-colors"
            title="Copiar enlace">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
        <button onClick={openEditor} disabled={openBusy}
          className="flex items-center gap-1.5 w-full justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 text-sm font-medium rounded-xl py-2 transition-colors disabled:opacity-60"
          title="Abrir editor del bioo como este barbero (SSO)">
          {openBusy
            ? <><Loader2 size={14} className="animate-spin" /> Abriendo…</>
            : <><Edit2 size={14} /> Editar su bioo</>}
        </button>
        {err && <p className="text-[10px] text-rose-400 text-center">{err}</p>}
      </div>
    );
  }

  return (
    <div className="w-full">
      <button onClick={create} disabled={busy}
        className="flex items-center gap-1.5 w-full justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 text-sm font-medium rounded-xl py-2 transition-colors disabled:opacity-60">
        {busy
          ? <><Loader2 size={14} className="animate-spin" /> Creando bioo…</>
          : <><Sparkles size={14} /> Crear su bioo.cl</>}
      </button>
      {err && <p className="mt-1 text-[10px] text-rose-400 text-center">{err}</p>}
    </div>
  );
}

/* ─── BarberCard ─────────────────────────────────────────── */
function BarberCard({ barber, onEdit, waUrl, onVerAgenda, sucursales = [], dragHandleProps = null, isDragging = false, allowAdminEdit = false, tenant = null, canManageBioo = false }) {
  const isActive      = barber.disponible !== false;
  const isStrictAdmin = barber.rol === 'admin' && !allowAdminEdit;
  const isAdmin       = barber.rol === 'admin' || barber.rol === 'jefe';
  const isSupportAdmin= (barber.email || '').toLowerCase().trim() === SUPPORT_EMAIL;
  const colPath       = tenantCol('barberos').path;

  const toggleStatus = () => updateDoc(doc(db,`${colPath}/${barber.id}`),{ disponible:!isActive });
  const handleDelete = async () => {
    if (!(await confirmDialog(`¿Eliminar a ${barber.nombre}?`))) return;
    await deleteDoc(doc(db,`${colPath}/${barber.id}`));
  };

  const menuItems = [
    { label:'Editar datos',       Icon:Edit2,    onClick:() => onEdit(barber) },
    { label:'Configurar horario', Icon:Clock,    onClick:() => onEdit(barber) },
    'separator',
    { label: isActive?'Desactivar':'Activar', Icon:PowerOff, onClick:toggleStatus },
    { label:'Eliminar', Icon:Trash2, onClick:handleDelete, danger:true },
  ];

  return (
    <div className={`relative bg-slate-800 border rounded-2xl p-5 flex flex-col items-center gap-4 transition-all duration-200 ${isDragging ? 'border-emerald-500/40 opacity-60 shadow-xl' : 'border-slate-700/50 hover:border-slate-500 hover:-translate-y-0.5'}`}>
      {dragHandleProps && (
        <div {...dragHandleProps} className="absolute top-3 left-3 touch-none cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors" title="Arrastrar para reordenar">
          <GripVertical size={14} />
        </div>
      )}
      {!isStrictAdmin && <div className="absolute top-3 right-3"><DropdownMenu items={menuItems} /></div>}
      {isStrictAdmin  && <div className="absolute top-3 right-3 text-emerald-500/60"><ShieldCheck size={16} /></div>}

      <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-900 ring-2 ring-slate-700 ring-offset-2 ring-offset-slate-800 shrink-0 mt-1">
        {barber.foto
          ? <img src={barber.foto} alt={barber.nombre} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-slate-600" /></div>}
      </div>

      <div className="text-center">
        <p className="text-lg font-bold text-white leading-tight">{barber.nombre}</p>
        {isAdmin && <p className="text-xs text-emerald-400/80 font-semibold mt-1 uppercase tracking-wide">{barber.rol==='jefe'?'Jefe':'Admin'}</p>}
        {!isAdmin && barber.especialidad && <p className="text-sm text-slate-400 mt-1">{barber.especialidad}</p>}
        {barber.sucursalId && (() => {
          const suc = sucursales.find(s => s.id === barber.sucursalId);
          return (
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              {suc ? suc.nombre : barber.sucursalId}
            </p>
          );
        })()}
        {barber.comision > 0 && <p className="text-sm text-slate-400 mt-1">{barber.comision}% comisión</p>}
        <div className="mt-2.5">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/50 text-slate-400 border-slate-600/30'}`}>
            {isActive?'Activo':'Inactivo'}
          </span>
        </div>
      </div>

      {isSupportAdmin ? (
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 w-full justify-center bg-green-600 hover:bg-green-700 text-white rounded-xl py-2 font-medium text-sm transition-colors">
          <MessageCircle size={15} /> Soporte vía WhatsApp
        </a>
      ) : (
        <button onClick={onVerAgenda}
          className="flex items-center gap-1.5 w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 font-medium text-sm transition-colors">
          <Calendar size={15} /> Ver Agenda
        </button>
      )}

      {!isSupportAdmin && barber.nombre && (
        <BookingUrlButton nombre={barber.nombre} />
      )}

      {!isSupportAdmin && tenant && (
        <BiooBarberoButton barber={barber} tenant={tenant} canManage={canManageBioo} />
      )}
    </div>
  );
}

/* ─── SortableBarberCard ─────────────────────────────────── */
function SortableBarberCard({ barber, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: barber.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined };
  return (
    <div ref={setNodeRef} style={style}>
      <BarberCard barber={barber} {...props} dragHandleProps={{ ...attributes, ...listeners }} isDragging={isDragging} />
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function Equipo() {
  const navigate = useNavigate();
  const tenant   = useTenant();
  const waUrl    = buildWaUrl(tenant.name);
  const { role } = useAuth();
  const isAdmin  = role === 'admin' || role === 'jefe';

  const { data: rawBarberos, loading } = useCollection('barberos');
  const { data: servicios }            = useCollection('servicios');
  const sucursales                     = useSucursales();
  const barberos = rawBarberos.filter(b => !b._mainDocId);

  /* ── Pestañas (Tabs) ── */
  const [activeTab, setActiveTab] = useState('miembros');

  /* ── Sueldos y Comisiones State ── */
  const [sueldoBarberoId, setSueldoBarberoId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [fechaFin, setFechaFin] = useState(localDateStr);
  const [citasSueldos, setCitasSueldos] = useState([]);
  const [ventasSueldos, setVentasSueldos] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  /* ── Payout Modal State ── */
  const [payoutModal, setPayoutModal] = useState(null); // { amount, barberName }
  const [payoutMetodo, setPayoutMetodo] = useState('Efectivo');
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState('');

  /* ── Date range presets ── */
  const setHoy = () => {
    const t = localDateStr();
    setFechaInicio(t);
    setFechaFin(t);
  };
  const setEstaSemana = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const startStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    setFechaInicio(startStr);
    setFechaFin(localDateStr());
  };
  const setEsteMes = () => {
    const d = new Date();
    setFechaInicio(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
    setFechaFin(localDateStr());
  };
  const setMesPasado = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const firstDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const lastDayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setFechaInicio(firstDay);
    setFechaFin(lastDayStr);
  };

  /* ── Payout Handlers ── */
  const handleOpenPayoutModal = (amount, barberName) => {
    setPayoutModal({ amount, barberName });
    setPayoutMetodo('Efectivo');
    setPayoutSuccess('');
  };

  const handleConfirmPayout = async () => {
    if (!payoutModal) return;
    setPayoutSaving(true);
    setPayoutSuccess('');
    try {
      const desc = `Pago Sueldo ${payoutModal.barberName} — Período ${fechaInicio} al ${fechaFin}`;
      await addDoc(tenantCol('gastos'), {
        descripcion: desc,
        monto: payoutModal.amount,
        categoria: 'Sueldos',
        metodoPago: payoutMetodo,
        fecha: Timestamp.now(),
        creadoEn: serverTimestamp(),
      });
      setPayoutSuccess('✓ ¡Pago registrado en Gastos correctamente!');
      setTimeout(() => {
        setPayoutModal(null);
        setPayoutSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error al registrar gasto sueldo:', err);
      alert('Error al registrar el gasto: ' + err.message);
    } finally {
      setPayoutSaving(false);
    }
  };

  /* ── Load Sueldos Data ── */
  const fetchSueldosData = async () => {
    if (!sueldoBarberoId) return;
    setLoadingData(true);
    try {
      // 1. Citas completadas en el rango
      const qCitas = query(
        tenantCol('citas'),
        where('fecha', '>=', fechaInicio),
        where('fecha', '<=', fechaFin)
      );
      const snapCitas = await withTimeout(getDocs(qCitas), 20000, 'equipo/citas-sueldo');
      const allCitas = snapCitas.docs.map(d => ({ id: d.id, ...d.data() }));
      const filteredCitas = allCitas.filter(c => c.barberoId === sueldoBarberoId && c.estado === 'Completada');
      setCitasSueldos(filteredCitas);

      // 2. Reservas de productos entregadas
      const qVentas = query(
        tenantCol('product_reservations'),
        where('status', '==', 'delivered')
      );
      const snapVentas = await withTimeout(getDocs(qVentas), 20000, 'equipo/ventas-sueldo');
      const allVentas = snapVentas.docs.map(d => ({ id: d.id, ...d.data() }));
      const filteredVentas = allVentas.filter(v => {
        if (v.barberoId !== sueldoBarberoId) return false;
        const vDate = v.fecha || v.createdAt || v.creadoEn;
        if (!vDate) return false;
        const dateStr = typeof vDate === 'string' ? vDate.slice(0, 10) : (vDate.toDate ? vDate.toDate().toISOString().slice(0, 10) : '');
        return dateStr >= fechaInicio && dateStr <= fechaFin;
      });
      setVentasSueldos(filteredVentas);
    } catch (err) {
      console.error('Error al cargar datos de sueldos:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sueldos' && sueldoBarberoId) {
      fetchSueldosData();
    }
  }, [activeTab, sueldoBarberoId, fechaInicio, fechaFin]);

  /* ── Helper para formatear moneda ── */
  const fmtCurrency = (n) => {
    return '$' + Math.round(n || 0).toLocaleString('es-CL');
  };

  /* ── Imprimir Liquidación ── */
  const handlePrint = (barber, data, range) => {
    const printWindow = window.open('', '_blank');
    const content = `
      <html>
        <head>
          <title>Liquidación de Sueldo - ${barber.nombre}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #111; font-size: 24px; }
            .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .info-table td { padding: 8px 0; font-size: 14px; }
            .info-table td.label { font-weight: bold; color: #555; width: 30%; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .details-table th { background: #f4f5f7; border-bottom: 2px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #4a5568; }
            .details-table td { border-bottom: 1px solid #edf2f7; padding: 12px; font-size: 14px; }
            .details-table tr.total td { font-weight: bold; font-size: 16px; border-top: 2px solid #e2e8f0; border-bottom: none; background: #fafafa; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #ccc; width: 40%; text-align: center; padding-top: 10px; font-size: 12px; color: #666; }
            .propina-note { margin-top: 20px; font-size: 12px; color: #eab308; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${tenant.name.toUpperCase()}</h1>
            <p>Liquidación de Sueldos y Comisiones</p>
          </div>
          <table class="info-table">
            <tr>
              <td class="label">Empleado:</td>
              <td>${barber.nombre}</td>
              <td class="label">Período:</td>
              <td>${range.start} al ${range.end}</td>
            </tr>
            <tr>
              <td class="label">Especialidad:</td>
              <td>${barber.especialidad || 'No especificada'}</td>
              <td class="label">Fecha Emisión:</td>
              <td>${new Date().toLocaleDateString('es-CL')}</td>
            </tr>
          </table>

          <table class="details-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th style="text-align: right;">Base / Monto Bruto</th>
                <th style="text-align: right;">Detalle / Porcentaje</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sueldo Base Mensual</td>
                <td style="text-align: right;">$${Math.round(barber.sueldoBase || 0).toLocaleString('es-CL')}</td>
                <td style="text-align: right;">Fijo</td>
                <td style="text-align: right;">$${Math.round(barber.sueldoBase || 0).toLocaleString('es-CL')}</td>
              </tr>
              <tr>
                <td>Comisión por Servicios</td>
                <td style="text-align: right;">$${Math.round(data.serviciosTotal).toLocaleString('es-CL')}</td>
                <td style="text-align: right;">${barber.comision || 0}%</td>
                <td style="text-align: right;">$${Math.round(data.serviciosComision).toLocaleString('es-CL')}</td>
              </tr>
              <tr>
                <td>Comisión por Productos</td>
                <td style="text-align: right;">$${Math.round(data.productosTotal).toLocaleString('es-CL')}</td>
                <td style="text-align: right;">${barber.comisionProductos ?? 10}%</td>
                <td style="text-align: right;">$${Math.round(data.productosComision).toLocaleString('es-CL')}</td>
              </tr>
              <tr class="total">
                <td>Total Neto a Pagar</td>
                <td></td>
                <td></td>
                <td style="text-align: right; color: #10b981;">$${Math.round(data.totalPagar).toLocaleString('es-CL')}</td>
              </tr>
            </tbody>
          </table>

          ${data.propinasTotal > 0 ? `
            <div class="propina-note">
              * Nota: El empleado acumuló un total de $${Math.round(data.propinasTotal).toLocaleString('es-CL')} en propinas en este período, entregadas íntegramente por los clientes.
            </div>
          ` : ''}

          <div class="footer" style="margin-top: 100px;">
            <div class="signature">Firma del Empleador</div>
            <div class="signature">Firma del Recibí Conforme</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const memberLabel = resolveTenantId() === 'gitana' ? 'profesional' : 'barbero';
  const memberLabelCap = memberLabel.charAt(0).toUpperCase() + memberLabel.slice(1);

  /* ── Orden drag-and-drop ── */
  const [orderedBarberos, setOrderedBarberos] = useState([]);
  const isDraggingRef  = useRef(false);
  const migratedRef    = useRef(false);

  // Sincroniza con Firestore cuando no hay drag activo
  useEffect(() => {
    if (isDraggingRef.current) return;
    const sorted = [...barberos].sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999));
    setOrderedBarberos(sorted);
  }, [barberos]);

  // Migración: asigna orden inicial a barberos que no tienen el campo
  useEffect(() => {
    if (migratedRef.current || !barberos.length) return;
    const needsOrden = barberos.filter(b => b.orden === undefined || b.orden === null);
    if (!needsOrden.length) { migratedRef.current = true; return; }
    migratedRef.current = true;
    const col   = tenantCol('barberos');
    const batch = writeBatch(db);
    barberos.forEach((b, i) => {
      if (b.orden === undefined || b.orden === null) {
        batch.update(doc(db, col.path, b.id), { orden: i });
      }
    });
    batch.commit().catch(err => console.error('[Equipo] migración orden:', err));
  }, [barberos]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function handleDragEnd({ active, over }) {
    isDraggingRef.current = false;
    if (!over || active.id === over.id) return;
    setOrderedBarberos(prev => {
      const oldIdx  = prev.findIndex(b => b.id === active.id);
      const newIdx  = prev.findIndex(b => b.id === over.id);
      const newOrder = arrayMove(prev, oldIdx, newIdx);
      // Batch write en Firestore
      const col   = tenantCol('barberos');
      const batch = writeBatch(db);
      newOrder.forEach((b, i) => batch.update(doc(db, col.path, b.id), { orden: i }));
      batch.commit().catch(err => console.error('[Equipo] reordenarBarberos:', err));
      return newOrder;
    });
  }

  const [slide,     setSlide]     = useState(false);
  const [showHelp,  setShowHelp]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(BARBER_EMPTY);
  const [preview,   setPreview]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [resetMsg,  setResetMsg]  = useState('');
  const [resetSending, setResetSending] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setPreview('');
    setForm({ ...BARBER_EMPTY, horario: DEFAULT_HORARIO() });
    setUploadError('');
    setResetMsg('');
    setSlide(true);
  };

  const openEdit = b => {
    setEditing(b);
    setPreview(b.foto || '');
    setForm({
      nombre:       b.nombre       || '',
      especialidad: b.especialidad || '',
      foto:         b.foto         || '',
      email:        b.email        || '',
      whatsapp:     b.whatsapp     || '',
      comision:     b.comision     ?? 0,
      sueldoBase:   b.sueldoBase   ?? 0,
      comisionProductos: b.comisionProductos ?? 10,
      sucursalId:   b.sucursalId   || '',
      serviciosIds: b.serviciosIds || [],
      horario:      initHorario(b),
      ausencias:    b.ausencias    || [],
      permitirSobrecupoPublico: !!b.permitirSobrecupoPublico,
      tramosVip: Array.isArray(b.tramosVip) ? b.tramosVip : [],
    });
    setUploadError('');
    setResetMsg('');
    setSlide(true);
  };

  /* ── Photo upload ── */
  const handleFileChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const tid      = resolveTenantId();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path     = tid === 'elegance'
        ? `barberos/${Date.now()}_${safeName}`
        : `tenants/${tid}/barberos/${Date.now()}_${safeName}`;
      const snap = await uploadBytes(
        storageRef(storage, path),
        file,
        { contentType: file.type || 'image/jpeg' },
      );
      const url = await getDownloadURL(snap.ref);
      set('foto', url);
      setPreview(url);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.code === 'storage/unauthorized'
        ? 'Sin permiso para subir. Verificá que tu sesión esté activa.'
        : `Error al subir: ${err.message}`);
      setPreview(form.foto);
    } finally {
      setUploading(false);
    }
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.nombre.trim() || saving) return;
    setSaving(true);
    try {
      if (editing) {
        const payload = { ...form, updatedAt: serverTimestamp() };
        payload.foto = form.foto || deleteField();
        await updateDoc(doc(db, `${tenantCol('barberos').path}/${editing.id}`), payload);
      } else {
        const payload = { ...form, disponible: true, createdAt: serverTimestamp() };
        if (!payload.foto) delete payload.foto;
        await addDoc(tenantCol('barberos'), payload);
      }
      setSlide(false);
    } finally { setSaving(false); }
  };

  /* ── Password reset ── */
  const handlePasswordReset = async () => {
    const email = form.email.trim();
    if (!email) return;
    setResetSending(true);
    setResetMsg('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMsg('✓ Enlace enviado a ' + email);
    } catch (err) {
      setResetMsg(err.code === 'auth/user-not-found'
        ? 'No existe una cuenta Firebase con ese email.'
        : `Error: ${err.message}`);
    } finally { setResetSending(false); }
  };

  /* ── Servicios toggle ── */
  const toggleServicio = id =>
    set('serviciosIds', form.serviciosIds.includes(id)
      ? form.serviciosIds.filter(s => s !== id)
      : [...form.serviciosIds, id]);

  /* ── Ausencias ── */
  const today = localDateStr();
  const addAusencia = () => set('ausencias', [...form.ausencias, {
    id: Date.now().toString(36),
    fechaInicio: today,
    fechaFin:    today,
    motivo: '',
  }]);
  const rmAusencia  = id => set('ausencias', form.ausencias.filter(a => a.id !== id));
  const upAusencia  = (id, k, v) =>
    set('ausencias', form.ausencias.map(a => a.id === id ? { ...a, [k]: v } : a));

  /* ── Shared styles ── */
  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  const selectedBarber = barberos.find(b => b.id === sueldoBarberoId);
  const comisionServicioPorc = selectedBarber ? (selectedBarber.comision || 0) : 0;
  const comisionProductoPorc = selectedBarber ? (selectedBarber.comisionProductos ?? 10) : 10;
  const sueldoBaseMonto = selectedBarber ? (selectedBarber.sueldoBase || 0) : 0;

  const serviciosBruto = citasSueldos.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const serviciosComision = citasSueldos.reduce((acc, curr) => acc + ((curr.precio || 0) * comisionServicioPorc / 100), 0);

  const productosBruto = ventasSueldos.reduce((acc, curr) => acc + (curr.precioTotal || curr.precio || 0), 0);
  const productosComision = ventasSueldos.reduce((acc, curr) => acc + ((curr.precioTotal || curr.precio || 0) * comisionProductoPorc / 100), 0);

  const propinasAcumuladas = citasSueldos.reduce((acc, curr) => acc + (curr.propina || 0), 0);
  const totalPagarCalculado = serviciosComision + productosComision + sueldoBaseMonto;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Equipo</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === 'miembros' ? `${barberos.length} miembros` : 'Liquidación de haberes y comisiones'}
          </p>
        </div>
        {activeTab === 'miembros' && (
          <button onClick={openNew}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors self-start sm:self-auto">
            <Plus size={16} /> Nuevo {memberLabel}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="flex space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-lg mb-6 self-start w-fit">
          <button
            onClick={() => { setActiveTab('miembros'); setSueldoBarberoId(''); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'miembros'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users size={16} /> Miembros del Equipo
          </button>
          <button
            onClick={() => {
              setActiveTab('sueldos');
              if (barberos.length > 0 && !sueldoBarberoId) {
                setSueldoBarberoId(barberos[0].id);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeTab === 'sueldos'
                ? 'bg-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Percent size={16} /> Liquidación de Sueldos
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'miembros' ? (
        <>
          <p className="text-xs text-slate-600 mb-3 flex items-center gap-1.5">
            <GripVertical size={11} /> Arrastra las tarjetas para cambiar el orden en la vista de clientes
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => { isDraggingRef.current = true; }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => { isDraggingRef.current = false; }}
          >
            <SortableContext items={orderedBarberos.map(b => b.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {orderedBarberos.map(b => (
                  <SortableBarberCard key={b.id} barber={b} onEdit={openEdit} waUrl={waUrl}
                    sucursales={sucursales} onVerAgenda={() => navigate('/agenda')}
                    allowAdminEdit={tenant.id === 'delnero'}
                    tenant={tenant} canManageBioo={isAdmin} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <div className="space-y-6">
          {/* SECTOR DE SELECCIÓN DE BARBERO */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={16} className="text-emerald-500" /> Selecciona un Miembro del Equipo
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {barberos.map(b => {
                const isSelected = sueldoBarberoId === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSueldoBarberoId(b.id)}
                    className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/5'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border border-slate-700 mb-2">
                      {b.foto ? (
                        <img src={b.foto} alt={b.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User size={20} className="text-slate-500" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white truncate max-w-full">{b.nombre}</span>
                    <span className="text-[10px] text-slate-500 truncate mt-0.5">{b.especialidad || memberLabelCap}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedBarber ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* FILTROS Y RESUMEN */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-white mb-4">Rango de Fechas</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desde</label>
                        <input
                          type="date"
                          value={fechaInicio}
                          onChange={e => setFechaInicio(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hasta</label>
                        <input
                          type="date"
                          value={fechaFin}
                          onChange={e => setFechaFin(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button onClick={setHoy} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-md transition-colors">Hoy</button>
                      <button onClick={setEstaSemana} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-md transition-colors">Esta Semana</button>
                      <button onClick={setEsteMes} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-md transition-colors">Este Mes</button>
                      <button onClick={setMesPasado} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-md transition-colors">Mes Pasado</button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">Resumen de Liquidación</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Sueldo Base:</span>
                      <span className="font-semibold text-white">{fmtCurrency(sueldoBaseMonto)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Comisión Servicios ({comisionServicioPorc}%):</span>
                      <span className="font-semibold text-white">{fmtCurrency(serviciosComision)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Comisión Productos ({comisionProductoPorc}%):</span>
                      <span className="font-semibold text-white">{fmtCurrency(productosComision)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2 font-bold text-white text-base">
                      <span>Total a Pagar:</span>
                      <span className="text-emerald-400">{fmtCurrency(totalPagarCalculado)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs border-t border-dashed border-slate-800 pt-2 italic">
                      <span>Propinas Acumuladas *:</span>
                      <span className="text-yellow-500 font-medium">{fmtCurrency(propinasAcumuladas)}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-600 leading-normal">
                    * Las propinas se muestran a modo informativo y no forman parte del total neto a pagar por la empresa (son entregadas de forma directa).
                  </p>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => handlePrint(selectedBarber, {
                        serviciosTotal: serviciosBruto,
                        serviciosComision: serviciosComision,
                        productosTotal: productosBruto,
                        productosComision: productosComision,
                        totalPagar: totalPagarCalculado,
                        propinasTotal: propinasAcumuladas,
                      }, { start: fechaInicio, end: fechaFin })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                    >
                      <Printer size={14} /> Imprimir
                    </button>
                    <button
                      onClick={() => handleOpenPayoutModal(totalPagarCalculado, selectedBarber.nombre)}
                      disabled={totalPagarCalculado <= 0}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Wallet size={14} /> Pagar Sueldo
                    </button>
                  </div>
                </div>
              </div>

              {/* DETALLES DE COMISIONES */}
              <div className="lg:col-span-2 space-y-6">
                {/* TABLA SERVICIOS */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Scissors size={16} className="text-emerald-500" /> Servicios Realizados ({citasSueldos.length})
                    </h3>
                    <span className="text-xs text-slate-400">Total Bruto: <strong className="text-white">{fmtCurrency(serviciosBruto)}</strong></span>
                  </div>

                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : citasSueldos.length === 0 ? (
                    <div className="text-center py-8 bg-slate-800/10 border border-dashed border-slate-800 rounded-lg">
                      <AlertTriangle size={24} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No se encontraron servicios completados en este rango.</p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {citasSueldos.map(c => {
                        const comisionMonto = (c.precio || 0) * comisionServicioPorc / 100;
                        return (
                          <div key={c.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-800/40 border border-slate-800/80 text-xs text-slate-300">
                            <div>
                              <p className="font-semibold text-white">{c.clienteNombre || 'Cliente sin nombre'}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{c.servicioNombre} • {c.fecha} {c.hora}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-white">{fmtCurrency(c.precio)}</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5">Comisión: {fmtCurrency(comisionMonto)}</p>
                              {c.propina > 0 && <p className="text-[9px] text-yellow-500 mt-0.5">Propina: {fmtCurrency(c.propina)}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* TABLA PRODUCTOS */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Percent size={16} className="text-emerald-500" /> Productos Vendidos ({ventasSueldos.length})
                    </h3>
                    <span className="text-xs text-slate-400">Total Bruto: <strong className="text-white">{fmtCurrency(productosBruto)}</strong></span>
                  </div>

                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : ventasSueldos.length === 0 ? (
                    <div className="text-center py-8 bg-slate-800/10 border border-dashed border-slate-800 rounded-lg">
                      <AlertTriangle size={24} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No se encontraron productos entregados en este rango.</p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {ventasSueldos.map(v => {
                        const precioVenta = v.precioTotal || v.precio || 0;
                        const comisionMonto = precioVenta * comisionProductoPorc / 100;
                        const itemDate = v.fecha || v.createdAt || v.creadoEn;
                        const dateStr = typeof itemDate === 'string' ? itemDate.slice(0, 10) : (itemDate?.toDate ? itemDate.toDate().toLocaleDateString('es-CL') : '');
                        return (
                          <div key={v.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-800/40 border border-slate-800/80 text-xs text-slate-300">
                            <div>
                              <p className="font-semibold text-white">{v.productName || v.productoNombre || 'Producto'}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Cant: {v.cantidad || 1} • {dateStr}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-white">{fmtCurrency(precioVenta)}</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5">Comisión: {fmtCurrency(comisionMonto)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-xl">
              <User size={48} className="text-slate-700 mx-auto mb-4 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-400">Sin Selección</h3>
              <p className="text-xs text-slate-500 mt-1">Por favor selecciona un miembro del equipo para liquidar.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SlideOver ── */}
      <SlideOver isOpen={slide} onClose={() => setSlide(false)}
        title={editing ? `Editar ${memberLabel}` : `Nuevo ${memberLabel}`}
        maxWidth="max-w-lg"
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setSlide(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving || uploading || !form.nombre.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Guardar cambios' : `Crear ${memberLabel}`}
            </button>
          </div>
        }
      >
        <div className="space-y-3">

          {/* ── Perfil ── */}
          <Section title="Datos del perfil" Icon={User} defaultOpen>
            <div className="flex items-center gap-4 mb-1">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center">
                {preview
                  ? <img src={preview} alt="" className="w-full h-full object-cover" />
                  : <User size={24} className="text-slate-600" />}
              </div>
              <div className="flex-1 space-y-1.5">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                  {uploading ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"/> : <Upload size={12} />}
                  {uploading ? 'Subiendo...' : 'Subir foto'}
                </button>
                {uploadError && <p className="text-xs text-red-400 leading-snug">{uploadError}</p>}
                <input className={`${field} text-xs`} placeholder="https://..." value={form.foto}
                  onChange={e => { set('foto', e.target.value); setPreview(e.target.value); }} />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            <div>
              <label className={lbl}>Nombre *</label>
              <input className={field} placeholder="Nicolás Fabián" value={form.nombre}
                onChange={e => set('nombre', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Especialidad</label>
              <input className={field} placeholder="Cortes y barba clásica" value={form.especialidad}
                onChange={e => set('especialidad', e.target.value)} />
            </div>

            {sucursales.length > 0 && (
              <div>
                <label className={lbl}>Sucursal</label>
                <select className={field} value={form.sucursalId || ''}
                  onChange={e => set('sucursalId', e.target.value)}>
                  <option value="">Todas las sucursales</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-600 mt-1">
                  "Todas" significa que aparece disponible en cualquier sucursal.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}><Mail size={10} className="inline mr-1" />Email</label>
                <input className={field} type="email" placeholder="correo@ejemplo.com" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className={lbl}><Phone size={10} className="inline mr-1" />WhatsApp</label>
                <input className={field} placeholder="+56 9..." value={form.whatsapp}
                  onChange={e => set('whatsapp', e.target.value)} />
              </div>
            </div>
          </Section>

          {/* ── Seguridad ── */}
          {editing && (
            <Section title="Seguridad" Icon={KeyRound}>
              <p className="text-xs text-slate-500 -mt-1">
                Envía un enlace al email del {memberLabel} para que restablezca su contraseña. Requiere que tenga cuenta Firebase Auth con ese email.
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handlePasswordReset}
                  disabled={resetSending || !form.email.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all">
                  {resetSending
                    ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <KeyRound size={13} />}
                  Enviar enlace de restablecimiento
                </button>
              </div>
              {resetMsg && (
                <p className={`text-xs font-semibold ${resetMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {resetMsg}
                </p>
              )}
              {!form.email.trim() && (
                <p className="text-[10px] text-slate-600 italic">El barbero necesita un email para usar esta función.</p>
              )}
            </Section>
          )}

          {/* ── Comisión ── */}
          {isAdmin && (
            <Section title="Sueldo y Comisiones" Icon={Percent}>
              <div className="space-y-4">
                <div>
                  <label className={lbl}>Porcentaje de comisión por servicio</label>
                  <div className="relative">
                    <input className={field} type="number" min="0" max="100" step="1"
                      placeholder="0" value={form.comision}
                      onChange={e => set('comision', Number(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Porcentaje que recibe el barbero sobre cada servicio realizado.</p>
                </div>

                <div>
                  <label className={lbl}>Porcentaje de comisión por productos</label>
                  <div className="relative">
                    <input className={field} type="number" min="0" max="100" step="1"
                      placeholder="10" value={form.comisionProductos}
                      onChange={e => set('comisionProductos', Number(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Porcentaje que recibe el barbero sobre la venta de productos (por defecto 10%).</p>
                </div>

                <div>
                  <label className={lbl}>Sueldo Base Mensual ($)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className={`${field} pl-8`} type="number" min="0" step="100"
                      placeholder="0" value={form.sueldoBase}
                      onChange={e => set('sueldoBase', Number(e.target.value))} />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Sueldo fijo base mensual del barbero (para empleados con contrato mixto).</p>
                </div>
              </div>
            </Section>
          )}

          {/* ── Horario semanal ── */}
          <Section title="Horario semanal" Icon={Clock}>
            <p className="text-[10px] text-slate-500 -mt-1 mb-2">Configura el horario de cada día. Puedes añadir descansos dentro de cada jornada.</p>
            <div className="space-y-2">
              {DIAS_ORDER.map(d => (
                <DayRow key={d} diaKey={d} config={form.horario[d]}
                  onChange={cfg => setForm(f => ({ ...f, horario: { ...f.horario, [d]: cfg } }))} />
              ))}
            </div>
          </Section>

          {/* ── Servicios ── */}
          <Section title="Servicios que realiza" Icon={Scissors}>
            <p className="text-[10px] text-slate-500 -mt-1 mb-2">Si no seleccionas ninguno, aparecerá disponible para todos los servicios.</p>
            {servicios.length === 0 ? (
              <p className="text-xs text-slate-600 italic">Sin servicios configurados aún.</p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {servicios.map(s => {
                  const checked = form.serviciosIds.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors">
                      <input type="checkbox" checked={checked} onChange={() => toggleServicio(s.id)}
                        className="w-4 h-4 accent-emerald-500 shrink-0" />
                      <span className="text-sm text-white flex-1">{s.nombre}</span>
                      {s.duracion && <span className="text-[10px] text-slate-500">{s.duracion}min</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Sobrecupos VIP en agenda pública ── */}
          <Section title="Sobrecupos VIP en agenda pública" Icon={Clock}>
            <p className="text-[10px] text-slate-500 -mt-1 mb-2">
              Permite que los clientes reserven <span className="text-amber-400">cupos VIP</span> sobre horarios
              ocupados o fuera del turno normal, cobrando un recargo extra por servicio.
            </p>
            <button type="button"
              onClick={() => set('permitirSobrecupoPublico', !form.permitirSobrecupoPublico)}
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                form.permitirSobrecupoPublico
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
              <span className={`w-8 h-4 rounded-full transition-colors relative ${form.permitirSobrecupoPublico ? 'bg-amber-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${form.permitirSobrecupoPublico ? 'left-4' : 'left-0.5'}`} />
              </span>
              Ofrecer Sobrecupos VIP en Agenda Pública
            </button>
            {form.permitirSobrecupoPublico && (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3 space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-300/80">
                    Tramos VIP declarados
                  </label>
                  <p className="text-[11px] text-slate-500 leading-normal mt-1">
                    Define bloques horarios específicos donde ofreces cupos VIP con recargo.
                    Solo estos tramos se muestran como VIP en la agenda pública — cualquier otro
                    horario (aunque esté ocupado) sigue el flujo normal.
                  </p>
                </div>

                <div className="space-y-1.5">
                  {(form.tramosVip || []).map((t, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-slate-900/60 rounded-lg px-2 py-1.5 border border-slate-700/50">
                      <span className="text-[10px] text-amber-300/60 w-10 shrink-0 font-semibold">VIP</span>
                      <select
                        value={t.inicio || ''}
                        onChange={e => set('tramosVip', form.tramosVip.map((x, idx) => idx === i ? { ...x, inicio: e.target.value } : x))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">--:--</option>
                        {TIME_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                      <span className="text-slate-600 text-xs">–</span>
                      <select
                        value={t.fin || ''}
                        onChange={e => set('tramosVip', form.tramosVip.map((x, idx) => idx === i ? { ...x, fin: e.target.value } : x))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">--:--</option>
                        {TIME_OPTIONS.map(o => <option key={o}>{o}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => set('tramosVip', form.tramosVip.filter((_, idx) => idx !== i))}
                        className="text-red-400/50 hover:text-red-400 transition-colors ml-auto"
                        aria-label="Eliminar tramo VIP"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => set('tramosVip', [...(form.tramosVip || []), { inicio: '20:00', fin: '21:00' }])}
                    className="flex items-center gap-1 text-[11px] text-amber-300/70 hover:text-amber-300 transition-colors mt-1"
                  >
                    <Plus size={11} /> Añadir tramo VIP
                  </button>

                  {(form.tramosVip || []).length === 0 && (
                    <p className="text-[10.5px] text-slate-600 italic leading-normal mt-1">
                      Sin tramos declarados: no se ofrece VIP aunque el toggle esté activo.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* ── Ausencias ── */}
          <Section title="Ausencias y vacaciones" Icon={CalendarOff}>
            <p className="text-[10px] text-slate-500 -mt-1 mb-2">Fechas en que el barbero no estará disponible (vacaciones, licencias, etc.).</p>
            <div className="space-y-2">
              {form.ausencias.map(a => (
                <div key={a.id} className="border border-slate-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div>
                        <p className="text-[10px] text-slate-500 mb-1">Desde</p>
                        <input type="date" value={a.fechaInicio}
                          onChange={e => upAusencia(a.id,'fechaInicio',e.target.value)}
                          className={`${field} text-xs`} />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 mb-1">Hasta</p>
                        <input type="date" value={a.fechaFin}
                          onChange={e => upAusencia(a.id,'fechaFin',e.target.value)}
                          className={`${field} text-xs`} />
                      </div>
                    </div>
                    <button type="button" onClick={() => rmAusencia(a.id)}
                      className="self-end mb-0.5 text-red-400/50 hover:text-red-400 transition-colors p-1">
                      <X size={14} />
                    </button>
                  </div>
                  <input className={`${field} text-xs`} placeholder="Motivo (vacaciones, licencia…)"
                    value={a.motivo} onChange={e => upAusencia(a.id,'motivo',e.target.value)} />
                </div>
              ))}
              <button type="button" onClick={addAusencia}
                className="flex items-center gap-1.5 px-3 py-2 w-full justify-center border border-dashed border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 rounded-lg text-xs font-medium transition-all">
                <Plus size={13} /> Añadir ausencia
              </button>
            </div>
          </Section>

        </div>
      </SlideOver>
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <ArrowDownCircle size={24} />
              <h3 className="text-base font-bold text-white">Confirmar Registro de Pago</h3>
            </div>

            <p className="text-sm text-slate-400 leading-normal">
              Se registrará un egreso de <strong className="text-white">{fmtCurrency(payoutModal.amount)}</strong> en el sistema bajo la categoría <strong className="text-white">Sueldos</strong> para <strong className="text-white">{payoutModal.barberName}</strong>.
            </p>

            <div className="space-y-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/60 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Método de Pago</label>
                <select
                  value={payoutMetodo}
                  onChange={e => setPayoutMetodo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
                {payoutMetodo === 'Efectivo' && (
                  <p className="text-[10px] text-amber-500 font-medium mt-1">
                    ⚠️ Si seleccionas Efectivo, se restará automáticamente del saldo de la Caja Activa de hoy.
                  </p>
                )}
              </div>
            </div>

            {payoutSuccess && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 size={14} />
                <span>{payoutSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPayoutModal(null)}
                disabled={payoutSaving}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayout}
                disabled={payoutSaving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {payoutSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <HelpModal title="Ayuda — Equipo" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-white">Equipo</strong> administras los barberos y sus configuraciones.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Agrega barberos con nombre, foto, teléfono y correo.</li>
            <li>Define los <span className="text-white">días hábiles</span> y el <span className="text-white">horario</span> de cada barbero.</li>
            <li>Registra <span className="text-white">ausencias programadas</span> para bloquear su disponibilidad en fechas concretas.</li>
            <li>Asigna el rol <span className="text-white">Admin</span> para dar acceso completo al panel, o <span className="text-white">Barbero</span> para acceso limitado.</li>
            <li>Usa el botón de restablecimiento para enviar un correo de cambio de contraseña.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
