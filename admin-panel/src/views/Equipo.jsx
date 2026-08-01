import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CalendarPlus, Edit2, Trash2, PowerOff, User, ShieldCheck, MessageCircle,
  Upload, ChevronDown, Plus, X, Phone, Mail, Percent, Scissors,
  CalendarOff, Clock, Check, KeyRound, Link2, Copy, GripVertical, Coffee,
  Users, Printer, Wallet, ArrowDownCircle, AlertTriangle, CheckCircle2, DollarSign,
  Sparkles, Loader2, Lock, Globe, Shuffle, HelpCircle, Info, Camera,
} from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { updateDoc, addDoc, deleteDoc, doc, serverTimestamp, deleteField, writeBatch, Timestamp, query, where, getDocs, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getApp } from 'firebase/app';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../lib/firebase';
import { tenantCol, resolveTenantId, tenantDomain } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../contexts/AuthContext';
import { useSucursal } from '../contexts/SucursalContext';
import { useSucursales } from '../hooks/useSucursales';
import { useTenant } from '../contexts/TenantContext';
import DropdownMenu from '../components/ui/DropdownMenu';
import SlideOver    from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import Spinner from '../components/ui/Spinner';
import { SkeletonGrid } from '../components/ui/Skeleton';

/* ─── Constants ───────────────────────────────────────────── */
const SUPPORT_EMAIL = 'ignaciiio.mate@gmail.com';

// El dominio de cada tenant sale de tenantDomain() (deriva de DOMAIN_MAP, la
// misma tabla que resuelve host→tenant). Acá vivía una lista propia de 7
// tenants: para los otros 23 caía a `window.location.hostname`, y en Kronnos
// eso entregaba links rotos — con el selector de sede puedes ver Limache desde
// el dominio de Peñablanca, y el link del barbero salía con el host equivocado.

function slugify(str) {
  return String(str)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function barberPublicUrl(nombre) {
  const tid    = resolveTenantId();
  const domain = tenantDomain(tid);
  return `https://${domain}/${slugify(nombre)}`;
}

// Link a la agenda personal del barbero (privada, requiere login).
// Es el mismo /agenda.html para todos — la auth determina qué citas ve.
function barberPersonalUrl() {
  const tid    = resolveTenantId();
  const domain = tenantDomain(tid);
  return `https://${domain}/agenda.html`;
}

/* ─── PersonalAgendaButton ───────────────────────────────────
 * Link a la agenda PRIVADA del barbero (/agenda.html). El barbero
 * inicia sesión con su cuenta y ve solo sus citas. Es el link que
 * el admin le pasa por WhatsApp para que lo instale como PWA.
 */
function PersonalAgendaButton() {
  const [copied, setCopied] = useState(false);
  const url = barberPersonalUrl();

  function copyUrl(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="group w-full flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 py-2 hover:bg-white/[0.08] transition-all duration-200 ease-in-out"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      title={url}>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex-1 flex items-center gap-1.5 text-slate-300 hover:text-primary text-sm truncate transition-colors duration-200 ease-in-out">
        <Lock size={12} className="text-indigo-300 shrink-0" strokeWidth={1.75} />
        <span className="truncate">/agenda.html</span>
      </a>
      <button onClick={copyUrl}
        className="shrink-0 text-slate-500 group-hover:text-slate-300 hover:!text-primary transition-colors duration-200 ease-in-out"
        title="Copiar enlace de agenda personal">
        {copied ? <Check size={14} className="text-emerald-300" strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
      </button>
    </div>
  );
}

const DIAS_LABELS = { '1':'Lunes','2':'Martes','3':'Miércoles','4':'Jueves','5':'Viernes','6':'Sábado','0':'Domingo' };
const DIAS_ORDER  = ['1','2','3','4','5','6','0'];

// Paso de los campos de hora del horario, en segundos. 300 = 5 minutos: un
// local pidió poder entrar a las 10:05 y los desplegables solo ofrecían :00
// y :30. Se usa `<input type="time">` (el reloj nativo del sistema) en vez de
// un <select>: a 5 minutos serían 288 opciones por desplegable, y hay dos por
// día más los descansos. El nativo además abre el selector del teléfono en
// móvil y deja escribir la hora directo en escritorio.
//
// El motor de disponibilidad NO asume múltiplos de 15: genera los cupos como
// `inicio + n*intervalo` (ver getHorasDisponibles en firebaseUtils.js), así que
// una entrada a las 10:05 con intervalo 30 ofrece 10:05, 10:35, 11:05…
const TIME_STEP = 300;

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

// Colores para identificar al barbero en la agenda. Elegidos para distinguirse
// entre sí y leerse sobre fondo oscuro y claro.
// Ojo al elegir: en la agenda el color de FONDO de la cita ya significa estado
// (verde=Confirmada, ámbar=Pendiente, rojo=Cancelada, azul=Completada). El color
// del barbero vive en la barra izquierda, así que no lo pisa — pero por eso no
// hay rojo acá: sería confuso al lado de una cancelada.
const COLORES_BARBERO = [
  '#e91e63', // rosa
  '#8b5cf6', // violeta
  '#6366f1', // índigo
  '#0ea5e9', // celeste
  '#06b6d4', // cian
  '#10b981', // esmeralda — el look por defecto de la agenda
  '#f59e0b', // ámbar
  '#f97316', // naranja
];

/* ── Pestañas del formulario de barbero ───────────────────────────
   Cinco pasos cortos en vez de una columna con ocho secciones. El orden sigue
   el de un alta real: quién es → qué hace → cuándo → cuánto se le paga → cómo
   se ve en la web. `Pago` es solo para admin: ahí vive la plata. */
const TABS_BARBERO = [
  { id: 'datos',     label: 'Datos',     Icon: User                    },
  { id: 'servicios', label: 'Servicios', Icon: Scissors                },
  { id: 'horario',   label: 'Horario',   Icon: Clock                   },
  { id: 'pago',      label: 'Pago',      Icon: Percent, soloAdmin: true },
  { id: 'perfil',    label: 'Perfil',    Icon: Camera                  },
];
// La barra de pestañas queda pegada arriba del panel; necesita fondo propio o
// el contenido se ve pasar por detrás al scrollear.
const SUP_FORM = 'bg-slate-900 [html.light_&]:bg-white';
const BRD_FORM = 'border-slate-800 [html.light_&]:border-slate-200';

const BARBER_EMPTY = {
  nombre:'', especialidad:'', foto:'', email:'', whatsapp:'',
  color: '',   // hex del barbero en la agenda; '' = verde por defecto de siempre
  comision: 0,
  // Override opcional de comisión por servicio: { [servicioId]: pct }. Si el
  // servicio de la cita está acá, se usa ese %; si no, cae al `comision`
  // global. Barberos legacy sin el campo siguen igual (fallback global).
  comisionPorServicio: {},
  // Arriendo por servicio (modelo invertido: barbero cobra el 100% y le
  // paga un fee FIJO al local por servicio). { [servicioId]: monto_al_local }.
  // Solo se activa cuando la cita es de un cliente propio del barbero,
  // detectado por sufijo en el nombre (ver sufijoClientePropio abajo).
  // Sin sufijo configurado, arriendo NUNCA se aplica (fail-safe).
  arriendoPorServicio: {},
  // Sufijo del nombre para reconocer clientes de la cartera propia del
  // barbero (ej: "cp" → "Jorgito xuni cp" matchea). Case-insensitive,
  // admite espacios al final. Si vacío, arriendo desactivado y las citas
  // se cobran a la comisión normal (% override o global). En Oren
  // también se usa para EXCLUIR de sellos a estos clientes (son cartera
  // externa del barbero, no del club de fidelidad del local).
  sufijoClientePropio: '',
  sueldoBase: 0,
  comisionProductos: 10,
  comisionProductosMonto: 0, // monto fijo en $ que se suma al % por cada venta de producto
  // Override opcional de comisión por producto: { [productoId]: pct }. Si la
  // venta es de un producto listado acá, se usa ese %; sino cae al
  // `comisionProductos` global. Mismo patrón que comisionPorServicio.
  comisionPorProducto: {},
  sucursalId: '',
  serviciosIds: [],
  horario: DEFAULT_HORARIO(),
  // Fechas puntuales que HABILITAN al barbero fuera del horario semanal
  // (ej: un sábado que atiende excepcionalmente). Array de strings
  // 'YYYY-MM-DD'. Ver DiasExtraEditor + esDiaLibre en Agenda/Pizarra.
  diasExtra: [],
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

/* ─── DiasExtraEditor ──────────────────────────────────────
   Editor de fechas puntuales que HABILITAN al barbero fuera de su
   horario semanal. Sirve para sábados eventuales, cubrir a un
   compañero, o cualquier turno extraordinario sin tocar la jornada
   base. Guarda un array de strings 'YYYY-MM-DD' en
   barberos/{id}.diasExtra.
   El input soporta agregar de a una fecha; ya guardadas se listan
   como chips removibles. Auto-ordena y evita duplicados. */
function DiasExtraEditor({ value = [], onChange }) {
  const [nueva, setNueva] = useState('');
  const hoy = new Date().toISOString().split('T')[0];
  const fechas = Array.isArray(value) ? [...value].sort() : [];

  const agregar = () => {
    if (!nueva) return;
    if (fechas.includes(nueva)) { setNueva(''); return; }
    onChange([...fechas, nueva].sort());
    setNueva('');
  };
  const quitar = (f) => onChange(fechas.filter(x => x !== f));

  const fmt = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={nueva}
          min={hoy}
          onChange={e => setNueva(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={agregar}
          disabled={!nueva}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
        >
          <Plus size={13} /> Agregar
        </button>
      </div>
      {fechas.length === 0 ? (
        <p className="text-[11.5px] text-slate-600 italic">
          Sin fechas extra. Los días marcados como no laborales en su horario semanal seguirán bloqueados.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {fechas.map(f => (
            <div key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[12px] font-semibold">
              <CalendarPlus size={11} className="shrink-0" />
              <span>{fmt(f)}</span>
              <button
                type="button"
                onClick={() => quitar(f)}
                className="ml-0.5 -mr-0.5 w-5 h-5 flex items-center justify-center rounded-full hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-100"
                aria-label={`Quitar ${fmt(f)}`}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Section accordion ──────────────────────────────────── */
function Section({ title, Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white/[0.02]"
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-4 py-3 hover:bg-white/[0.02] transition-colors duration-200 ease-in-out text-left">
        {Icon && <Icon size={14} className="text-slate-400 shrink-0" strokeWidth={1.75} />}
        <span className="flex-1 text-sm font-medium text-primary tracking-tight">{title}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ease-in-out ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>
      {open && (
        <div
          className="px-4 pb-4 pt-3 space-y-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {children}
        </div>
      )}
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

  // `color-scheme` le dice al navegador de qué color pintar el reloj nativo del
  // <input type="time">. Sin esto el ícono sale negro sobre el fondo oscuro y
  // es invisible; en modo claro se invierte.
  const esquema = '[color-scheme:dark] [html.light_&]:[color-scheme:light]';
  const sel = `bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-primary focus:outline-none focus:border-emerald-500 ${esquema}`;
  // Los campos del descanso viven sobre el fondo ámbar: mismo tamaño que los
  // del día (eran más chicos y por eso el descanso se leía como una nota al pie
  // en vez de como parte de la jornada).
  const selDescanso = `bg-slate-900 border border-amber-500/25 rounded px-1.5 py-1 text-xs text-primary focus:outline-none focus:border-amber-500 ${esquema}`;

  return (
    <div className={`rounded-lg border overflow-hidden ${config.activo ? 'border-slate-700' : 'border-slate-800/60'}`}>
      <div className="flex items-center gap-2.5 px-3 py-2">
        <button type="button" onClick={() => onChange({ ...config, activo: !config.activo })}
          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
            config.activo ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
          {config.activo && <Check size={10} className="text-primary" strokeWidth={3} />}
        </button>
        <span className={`text-xs font-semibold w-20 shrink-0 ${config.activo ? 'text-primary' : 'text-slate-600'}`}>
          {DIAS_LABELS[diaKey]}
        </span>
        {config.activo ? (
          <div className="flex items-center gap-1 flex-1">
            <input type="time" step={TIME_STEP} value={config.inicio}
              onChange={e => onChange({ ...config, inicio: e.target.value })}
              className={sel} aria-label="Entrada" />
            <span className="text-slate-600 text-xs">–</span>
            <input type="time" step={TIME_STEP} value={config.fin}
              onChange={e => onChange({ ...config, fin: e.target.value })}
              className={sel} aria-label="Salida" />
          </div>
        ) : (
          <span className="text-xs text-slate-700 italic">Día libre</span>
        )}
      </div>

      {config.activo && (
        <div className="px-3 pb-2.5 space-y-1.5 border-t border-slate-800/60 pt-2">
          {/* El descanso se pinta ámbar con ícono de café: es el MISMO lenguaje
              visual que la franja de la agenda, así se reconoce sin leer. */}
          {config.descansos.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 shrink-0">
                <Coffee size={12} /> Descanso
              </span>
              <div className="flex items-center gap-1.5">
                <input type="time" step={TIME_STEP} value={d.inicio}
                  onChange={e => upDescanso(i, 'inicio', e.target.value)}
                  className={selDescanso} aria-label="Inicio del descanso" />
                <span className="text-slate-500 text-xs">–</span>
                <input type="time" step={TIME_STEP} value={d.fin}
                  onChange={e => upDescanso(i, 'fin', e.target.value)}
                  className={selDescanso} aria-label="Fin del descanso" />
              </div>
              {/* ml-auto + p-1.5: el target táctil era de 12px, imposible de
                  acertar en el celular sin borrar el descanso de al lado. */}
              <button type="button" onClick={() => rmDescanso(i)} aria-label="Quitar descanso"
                className="ml-auto p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addDescanso}
            className="flex items-center gap-1.5 px-1 py-1 text-[11px] font-medium text-slate-500 hover:text-amber-400 transition-colors">
            <Plus size={12} /> Añadir descanso
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
      className="group w-full flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 py-2 hover:bg-white/[0.08] transition-all duration-200 ease-in-out"
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
      title={url}>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex-1 flex items-center gap-1.5 text-slate-300 hover:text-primary text-sm truncate transition-colors duration-200 ease-in-out">
        <Link2 size={12} className="text-emerald-300 shrink-0" strokeWidth={1.75} />
        <span className="truncate">/{slugify(nombre)}</span>
      </a>
      <button onClick={copyUrl}
        className="shrink-0 text-slate-500 group-hover:text-slate-300 hover:!text-primary transition-colors duration-200 ease-in-out"
        title="Copiar enlace">
        {copied ? <Check size={14} className="text-emerald-300" strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
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
      const tenantDominio = tenantDomain(tenant.id);
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
            className="shrink-0 text-slate-500 group-hover:text-slate-300 hover:!text-primary transition-colors"
            title="Copiar enlace">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
        </div>
        <button onClick={openEditor} disabled={openBusy}
          className="flex items-center gap-1.5 w-full justify-center text-slate-400 hover:text-primary hover:bg-slate-700/50 text-sm font-medium rounded-xl py-2 transition-colors disabled:opacity-60"
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
        className="flex items-center gap-1.5 w-full justify-center text-slate-400 hover:text-primary hover:bg-slate-700/50 text-sm font-medium rounded-xl py-2 transition-colors disabled:opacity-60">
        {busy
          ? <><Loader2 size={14} className="animate-spin" /> Creando bioo…</>
          : <><Sparkles size={14} /> Crear su bioo.cl</>}
      </button>
      {err && <p className="mt-1 text-[10px] text-rose-400 text-center">{err}</p>}
    </div>
  );
}

/* ─── BarberCard ─────────────────────────────────────────── */
function BarberCard({ barber, onEdit, waUrl, onVerAgenda, sucursales = [], dragHandleProps = null, isDragging = false, allowAdminEdit = false, tenant = null, canManageBioo = false, linkedMainDocIds = null }) {
  const isActive      = barber.disponible !== false;
  // isStrictAdmin = admin de local PURO (no atiende). isAdmin = el rol, nada
  // más. Lo que se esconde porque "no corta pelo" tiene que mirar el PRIMERO:
  // con isAdmin a secas, un admin-barbero pierde cosas que sí le sirven.
  const isStrictAdmin = barber.rol === 'admin' && !allowAdminEdit;
  const isAdmin       = barber.rol === 'admin';
  // Toggle desplegable: por default colapsado para no saturar el grid con
  // los mismos 2 párrafos explicativos repetidos en cada card del equipo.
  const [linksOpen, setLinksOpen] = useState(false);
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
    <div
      className={`relative bg-white/[0.02] rounded-2xl p-5 flex flex-col items-center gap-4 transition-all duration-200 ease-in-out ${isDragging ? 'opacity-60' : 'hover:bg-white/[0.04] hover:-translate-y-0.5'}`}
      style={{ border: isDragging ? '1px solid rgba(52,199,89,0.35)' : '1px solid rgba(255,255,255,0.05)', boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.4)' : undefined }}
    >
      {dragHandleProps && (
        <div {...dragHandleProps} className="absolute top-3 left-3 touch-none cursor-grab active:cursor-grabbing text-slate-500 hover:text-primary transition-colors" title="Arrastrar para reordenar">
          <GripVertical size={14} strokeWidth={1.75} />
        </div>
      )}
      {!isStrictAdmin && <div className="absolute top-3 right-3"><DropdownMenu items={menuItems} /></div>}
      {isStrictAdmin  && <div className="absolute top-3 right-3 text-emerald-400/60"><ShieldCheck size={16} strokeWidth={1.75} /></div>}

      <div
        className="w-20 h-20 rounded-full overflow-hidden bg-white/[0.04] shrink-0 mt-1"
        style={{ border: '2px solid rgba(255,255,255,0.1)' }}
      >
        {barber.foto
          ? <img src={barber.foto} alt={barber.nombre} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-slate-500" strokeWidth={1.5} /></div>}
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-primary leading-tight tracking-tight">{barber.nombre}</p>
        {isAdmin && <p className="text-[10px] text-emerald-300 font-medium mt-1 uppercase tracking-[0.1em]">Admin</p>}
        {!isStrictAdmin && barber.especialidad && <p className="text-sm text-slate-400 mt-1">{barber.especialidad}</p>}
        {barber.sucursalId && (() => {
          const suc = sucursales.find(s => s.id === barber.sucursalId);
          return (
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-600"></span>
              {suc ? suc.nombre : barber.sucursalId}
            </p>
          );
        })()}
        {barber.comision > 0 && <p className="text-sm text-slate-400 mt-1 tabular-nums">{barber.comision}% comisión</p>}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-medium ${isActive ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/[0.06] text-slate-400'}`}>
            {isActive?'Activo':'Inactivo'}
          </span>
          {/* 3 estados de acceso web — la detección refleja los 3 caminos
              que agenda.html usa para autenticar al barbero:
                (a) authUid           → creado con crearAccesoStaff (flujo nuevo)
                (b) uid | link-doc | email → cualquier señal de login legacy:
                     • uid explícito en el doc
                     • existe un doc-espejo con _mainDocId apuntando a este
                     • email en el doc (agenda.html hace match por email)
                (c) nada de lo anterior → perfil sin cuenta Firebase Auth */}
          {(() => {
            const hasLinkDoc = !!linkedMainDocIds && linkedMainDocIds.has(barber.id);
            if (barber.authUid) {
              return (
                <span
                  title={`Cuenta creada desde este panel · ${barber.email || 'sin email registrado'}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-400/15 text-emerald-300"
                >
                  🔐 Acceso nativo
                </span>
              );
            }
            if (barber.uid || hasLinkDoc || barber.email) {
              const razon = barber.uid
                ? 'UID legacy vinculado al doc'
                : hasLinkDoc
                  ? 'agenda.html creó un doc-espejo tras el primer login'
                  : 'agenda.html autentica por match de email';
              return (
                <span
                  title={`Puede iniciar sesión (${razon}) — vincula formalmente desde "Editar"`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/15 text-amber-300"
                >
                  ⚠️ Acceso antiguo
                </span>
              );
            }
            return (
              <span
                title="Este barbero no tiene cuenta ni email registrado; no puede iniciar sesión"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-slate-400"
              >
                Sin acceso web
              </span>
            );
          })()}
        </div>
      </div>

      {isSupportAdmin ? (
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 w-full justify-center bg-emerald-400/15 hover:bg-emerald-400/20 text-emerald-200 rounded-full py-2 font-medium text-sm transition-all duration-200 ease-in-out">
          <MessageCircle size={15} strokeWidth={1.75} /> Soporte vía WhatsApp
        </a>
      ) : (
        <button
          onClick={onVerAgenda}
          className="group/agenda flex items-center gap-1.5 w-full justify-center bg-white/[0.03] hover:bg-indigo-400/20 text-slate-200 hover:text-indigo-200 rounded-full py-2 font-medium text-sm transition-all duration-200 ease-in-out"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Calendar size={15} strokeWidth={1.75} className="text-slate-400 group-hover/agenda:text-indigo-200 transition-colors duration-200 ease-in-out" /> Ver agenda
        </button>
      )}

      {/* ── Sección: Links del barbero (desplegable) ───────────────
          Dos links con propósitos MUY distintos:
          1) Agenda personal PRIVADA (/agenda.html) — para el barbero
          2) Página pública de reserva (/{slug}) — para los clientes
          Colapsado por default para no saturar el grid con texto repetido.
          Se muestra a cualquiera que ATIENDA, incluido un admin-barbero: él
          también tiene agenda propia y página pública de reserva. Antes esto
          miraba `isAdmin` y al convertir a un barbero en admin sus links
          desaparecían, aunque siguiera cortando. */}
      {!isSupportAdmin && !isStrictAdmin && barber.nombre && (
        <div className="w-full mt-1">
          {/* Toggle */}
          <button
            type="button"
            onClick={() => setLinksOpen(v => !v)}
            aria-expanded={linksOpen}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.03] rounded-full text-xs font-medium text-slate-300 hover:bg-white/[0.06] transition-all duration-200 ease-in-out"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="flex items-center gap-1.5">
              <Link2 size={12} className="text-slate-400" strokeWidth={1.75} />
              Links del barbero
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-500 transition-transform duration-200 ease-in-out ${linksOpen ? 'rotate-180' : ''}`}
              strokeWidth={1.75}
            />
          </button>

          {/* Contenido colapsable — tooltips (title) en lugar de párrafos */}
          {linksOpen && (
            <div className="w-full mt-3 space-y-2.5">
              {/* PRIVADO: Agenda personal del barbero */}
              <div className="w-full space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Lock size={10} className="text-indigo-300" strokeWidth={1.75} />
                  <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-slate-300">
                    Agenda personal
                  </p>
                  <span
                    title={`Este link se lo pasas al barbero. Es su vista privada para gestionar sus citas del día — inicia sesión con su cuenta y solo ve las suyas.`}
                    className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-slate-500 hover:text-slate-300 transition-colors cursor-help"
                  >
                    <Info size={11} strokeWidth={1.75} />
                  </span>
                </div>
                <PersonalAgendaButton />
              </div>

              {/* PÚBLICO: Página de reserva del barbero */}
              <div className="w-full space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  <Globe size={10} className="text-emerald-300" strokeWidth={1.75} />
                  <p className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-slate-300">
                    Página pública
                  </p>
                  <span
                    title={`Este link es para tus clientes. Al abrirlo, verán la lista de servicios y horarios de ${barber.nombre?.split(' ')[0] || 'este barbero'} y pueden reservar con él directo.`}
                    className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-slate-500 hover:text-slate-300 transition-colors cursor-help"
                  >
                    <Info size={11} strokeWidth={1.75} />
                  </span>
                </div>
                <BookingUrlButton nombre={barber.nombre} />
              </div>
            </div>
          )}
        </div>
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
  const { role, user: _authUser } = useAuth();
  const isAdmin  = role === 'admin';
  // Superadmin (Ignacio) ve el fantasma QA para editarlo/verificarlo; los
  // dueños normales nunca lo ven en la lista de su equipo.
  const _isSuperadmin = (_authUser?.email || '').toLowerCase() === 'ignaciiio.mate@gmail.com';

  const { data: rawBarberos, loading } = useCollection('barberos');
  const { data: servicios }            = useCollection('servicios');
  const { data: productos }            = useCollection('productos');
  const sucursales                     = useSucursales();
  // `sucursalDefault` y no `activeSucursal`: en la vista "Todas" el segundo es
  // null y el barbero nuevo quedaría sin sede.
  const { matchSucursal, sucursalDefault } = useSucursal();
  // Filtra por sede activa: un encargado de sede ve solo su equipo; el dueño
  // (Todas) los ve a todos. Barberos sin sucursalId (atienden en ambas) pasan.
  // Además: fantasma QA (esQA:true) invisible a menos que seas superadmin.
  const barberos = rawBarberos
    .filter(b => !b._mainDocId)
    .filter(b => !b.esQA || _isSuperadmin)
    .filter(matchSucursal);

  /* ── Pestañas (Tabs) ── */
  const [activeTab, setActiveTab] = useState('miembros');

  /* ── Randomizador de barberos ──────────────────────────────────
     Toggle configurable por tenant que hace que la página pública
     de reserva muestre los barberos en orden aleatorio en vez del
     orden manual del drag-and-drop. Guardado en:
       tenants/{tid}/configuracion/main.randomizarBarberos
     Con `null` como estado "no configurado aun" (mientras carga). */
  const [randomBarberos,    setRandomBarberos]    = useState(null);
  const [savingRandom,      setSavingRandom]      = useState(false);
  const [showRandomHelp,    setShowRandomHelp]    = useState(false);
  useEffect(() => {
    const tid = resolveTenantId();
    const cfgRef = tid === 'elegance'
      ? doc(db, 'configuracion', 'main')
      : doc(db, 'tenants', tid, 'configuracion', 'main');
    const unsub = onSnapshot(cfgRef, snap => {
      const data = snap.exists() ? snap.data() : {};
      // Default a false si el campo no existe (opt-in).
      setRandomBarberos(data.randomizarBarberos === true);
    }, () => setRandomBarberos(false));
    return () => unsub();
  }, []);
  async function toggleRandomBarberos() {
    if (savingRandom || randomBarberos === null) return;
    setSavingRandom(true);
    try {
      const tid = resolveTenantId();
      const cfgRef = tid === 'elegance'
        ? doc(db, 'configuracion', 'main')
        : doc(db, 'tenants', tid, 'configuracion', 'main');
      await setDoc(cfgRef, { randomizarBarberos: !randomBarberos }, { merge: true });
    } catch (e) {
      console.error('[Equipo] toggleRandomBarberos:', e);
    } finally {
      setSavingRandom(false);
    }
  }

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
                <td>Comisión por Productos${(barber.comisionProductosMonto ?? 0) > 0 ? ` <span style="font-size:10px;color:#64748b;">(+ $${Math.round(barber.comisionProductosMonto).toLocaleString('es-CL')} fijo/venta)</span>` : ''}</td>
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

  /* ── Set de barberoIds que YA tienen un link-doc apuntándolos ──
     agenda.html, tras el primer login, crea un doc espejo con
     docId=UID y `_mainDocId` apuntando al doc principal del barbero.
     Ese link-doc confirma que el barbero SÍ puede iniciar sesión, aunque
     el doc principal no tenga `authUid` ni `uid`. Precomputamos esto para
     que BarberCard pueda mostrar "Acceso Antiguo" en vez de "Sin acceso"
     para barberos que loguean vía este patrón (Aura, Ferraza, etc.). */
  const linkedMainDocIds = useMemo(
    () => new Set(barberos.filter(b => b._mainDocId).map(b => b._mainDocId)),
    [barberos]
  );

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

  // TouchSensor además del de puntero: sin él, en varios navegadores móviles
  // el arrastre no se activa nunca y las tarjetas no se pueden reordenar desde
  // el teléfono. El delay evita que un scroll normal levante una tarjeta.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 6 } }),
  );

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
  // Cambio directo de contraseña (mini-form inline)
  const [showSetPass, setShowSetPass] = useState(false);
  const [newPass, setNewPass]         = useState('');
  const [setPassSaving, setSetPassSaving] = useState(false);
  const [setPassMsg,    setSetPassMsg]    = useState('');
  // Acceso al panel web (transient — no se guarda password en Firestore)
  const [accesoEnabled,  setAccesoEnabled]  = useState(false);
  const [accesoPassword, setAccesoPassword] = useState('');
  const [accesoMsg,      setAccesoMsg]      = useState('');
  // Toggle para expandir el editor de comisiones por servicio (override).
  const [showSvcComm,    setShowSvcComm]    = useState(false);
  // Toggle para el editor de arriendo por servicio (solo tenant Oren por ahora).
  const [showSvcRent,    setShowSvcRent]    = useState(false);
  // Toggle para expandir el editor de comisiones por producto (override).
  const [showProdComm,   setShowProdComm]   = useState(false);
  const fileRef = useRef(null);

  // Pestaña activa del formulario. Cinco en vez de una columna larga: dar de
  // alta a alguien pasaba por ocho secciones desplegables y era fácil no ver
  // que faltaba algo.
  const [tab, setTab] = useState('datos');

  // Horario de apertura del local, para que un barbero nuevo nazca con el
  // horario real y no con un 09:00–20:00 fijo que casi siempre hay que corregir.
  const [horarioLocal, setHorarioLocal] = useState(null);
  useEffect(() => {
    const ref = tenant.id === 'elegance'
      ? doc(db, 'configuracion', 'main')
      : doc(db, 'tenants', tenant.id, 'configuracion', 'main');
    withTimeout(getDoc(ref), 10000, 'equipo/horario-local')
      .then(s => {
        const d = s.exists() ? s.data() : {};
        if (d.horarioInicio && d.horarioFin) {
          setHorarioLocal({ inicio: d.horarioInicio, fin: d.horarioFin });
        }
      })
      .catch(() => {});   // sin config → se usa el default de siempre
  }, [tenant.id]);

  const horarioDelLocal = () => {
    const h = DEFAULT_HORARIO();
    if (!horarioLocal) return h;
    // El sábado del default sale antes a propósito; se respeta ese criterio y
    // solo se mueve la apertura.
    for (const k of Object.keys(h)) {
      h[k] = { ...h[k], inicio: horarioLocal.inicio, fin: k === '6' ? h[k].fin : horarioLocal.fin };
    }
    return h;
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Alta nueva: se entra con lo que el 99% de los casos necesita, para que dar
  // de alta a alguien que empieza hoy sea guardar y listo.
  //   · todos los servicios marcados — el dueño destilda lo que no hace
  //   · atiende y acepta reservas online
  //   · horario copiado del local (no el 09:00–20:00 fijo, que casi siempre
  //     había que corregir a mano)
  //   · SIN acceso al panel: muchos barberos no lo necesitan, y una cuenta
  //     creada de más es una puerta abierta que nadie usa
  const openNew = () => {
    setEditing(null);
    setPreview('');
    setForm({
      ...BARBER_EMPTY,
      horario: horarioDelLocal(),
      serviciosIds: servicios.map(s => s.id),
      disponible: true,
      sucursalId: sucursalDefault?.id || '',
    });
    setUploadError('');
    setResetMsg('');
    setAccesoEnabled(false);
    setAccesoPassword('');
    setAccesoMsg('');
    setTab('datos');
    setSlide(true);
  };

  const openEdit = b => {
    setEditing(b);
    setPreview(b.foto || '');
    setForm({
      nombre:       b.nombre       || '',
      especialidad: b.especialidad || '',
      foto:         b.foto         || '',
      color:        b.color        || '',
      email:        b.email        || '',
      whatsapp:     b.whatsapp     || '',
      comision:     b.comision     ?? 0,
      comisionPorServicio: (b.comisionPorServicio && typeof b.comisionPorServicio === 'object')
        ? b.comisionPorServicio : {},
      arriendoPorServicio: (b.arriendoPorServicio && typeof b.arriendoPorServicio === 'object')
        ? b.arriendoPorServicio : {},
      sufijoClientePropio: (typeof b.sufijoClientePropio === 'string')
        ? b.sufijoClientePropio : '',
      sueldoBase:   b.sueldoBase   ?? 0,
      comisionProductos:      b.comisionProductos      ?? 10,
      comisionProductosMonto: b.comisionProductosMonto ?? 0,
      comisionPorProducto: (b.comisionPorProducto && typeof b.comisionPorProducto === 'object')
        ? b.comisionPorProducto : {},
      sucursalId:   b.sucursalId   || '',
      serviciosIds: b.serviciosIds || [],
      horario:      initHorario(b),
      diasExtra:    Array.isArray(b.diasExtra) ? b.diasExtra : [],
      ausencias:    b.ausencias    || [],
      permitirSobrecupoPublico: !!b.permitirSobrecupoPublico,
      tramosVip: Array.isArray(b.tramosVip) ? b.tramosVip : [],
      // `disponible` manda si aparece en las dos agendas; sin el campo se asume
      // que sí, que es cómo se comportaban los barberos de antes.
      disponible: b.disponible !== false,
    });
    setTab('datos');
    setUploadError('');
    setResetMsg('');
    setAccesoEnabled(false);
    setAccesoPassword('');
    setAccesoMsg('');
    setShowSvcComm(false);
    setShowSvcRent(false);
    setShowProdComm(false);
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
        {
          contentType: file.type || 'image/jpeg',
          // Cache 1 año inmutable: cada foto tiene un path con timestamp unico
          // (Date.now()_filename), asi que el navegador puede cachearla
          // agresivamente sin revalidacion. Fija el problema de "la foto se
          // recarga cada vez que se abre Agenda/Equipo/etc".
          cacheControl: 'public, max-age=31536000, immutable',
        },
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

    // Si el admin activó "Habilitar acceso al panel web", validamos email y
    // password ANTES de intentar cualquier escritura (auth o firestore).
    const wantsAcceso = accesoEnabled && !editing?.uid && !editing?.authUid;
    if (wantsAcceso) {
      if (!form.email.trim()) {
        setAccesoMsg('Ingresa un email para crear el acceso.');
        return;
      }
      if (!accesoPassword || accesoPassword.length < 6) {
        setAccesoMsg('La contraseña temporal debe tener al menos 6 caracteres.');
        return;
      }
    }

    setSaving(true);
    setAccesoMsg('');
    try {
      // 1) Crear cuenta Firebase Auth (si el toggle está activo).
      //    Lo hacemos vía Cloud Function con Admin SDK para no perder la
      //    sesión del admin actual (createUserWithEmailAndPassword del cliente
      //    loguea al usuario recién creado).
      //    Con `linkIfExists: true`, si el email ya existe (típico en
      //    admins de marca que ahora se agregan como barberos en una sede
      //    específica), la CF devuelve el UID existente en vez de fallar.
      let newUid = null;
      let vinculacion = false; // true si se enlazó a una cuenta preexistente
      if (wantsAcceso) {
        try {
          const call = httpsCallable(getFunctions(undefined, 'us-central1'), 'crearAccesoStaff');
          const res  = await call({
            email:        form.email.trim(),
            password:     accesoPassword,
            displayName:  form.nombre.trim(),
            tenantId:     resolveTenantId(),
            rol:          'barbero',
            linkIfExists: true,
          });
          newUid       = res?.data?.uid || null;
          vinculacion  = !!res?.data?.alreadyExisted;
        } catch (err) {
          const code    = err?.code || '';
          const message = err?.message || '';
          setAccesoMsg((message || 'No se pudo crear la cuenta.').replace(/^\[.*?\]\s*/, ''));
          return; // no seguimos con Firestore si falló Auth
        }
      }

      // 2) Firestore: se preserva el docId original SIEMPRE.
      //    Si hay newUid, se guarda en authUid del doc (no como docId).
      //    Esto evita romper la integridad referencial de citas/comisiones
      //    que apuntan al barberoId original. Las reglas reconocen ambos
      //    caminos: docId == auth.uid (legacy) o authUid == auth.uid (nuevo).
      const accesoFields = newUid ? { authUid: newUid } : {};

      if (editing) {
        const payload = { ...form, ...accesoFields, updatedAt: serverTimestamp() };
        payload.foto = form.foto || deleteField();
        await updateDoc(doc(db, `${tenantCol('barberos').path}/${editing.id}`), payload);
      } else {
        // `disponible` sale del formulario, no forzado a true: ahora el toggle
        // "Acepta reservas en línea" está a la vista al crear, y forzarlo acá
        // hacía que apagarlo no tuviera efecto. El default del alta ya viene en
        // true desde openNew().
        const payload = {
          ...form, ...accesoFields,
          disponible: form.disponible !== false,
          createdAt: serverTimestamp(),
        };
        if (!payload.foto) delete payload.foto;
        await addDoc(tenantCol('barberos'), payload);
      }

      // Feedback si fue vinculación (email preexistente):
      // damos un beat visible antes de cerrar el slide para que el usuario
      // sepa qué pasó (no cambiamos la contraseña de la cuenta original).
      if (vinculacion) {
        setAccesoMsg('✓ Vinculado a la cuenta existente. Este barbero usará su contraseña actual (no la cambiamos).');
        setTimeout(() => setSlide(false), 2200);
      } else {
        setSlide(false);
      }
    } finally { setSaving(false); }
  };

  /* ── Password reset ── */
  const handlePasswordReset = async () => {
    const email = form.email.trim();
    if (!email) return;
    setResetSending(true);
    setResetMsg('');
    try {
      // CF enviarLinkAccesoStaff: link generado server-side y enviado por
      // Resend con plantilla SynapTech en español (el template por defecto de
      // Firebase salía de firebaseapp.com en inglés y caía a SPAM).
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'enviarLinkAccesoStaff');
      await fn({ email, tenantId: resolveTenantId() });
      setResetMsg('✓ Enlace enviado a ' + email);
    } catch (err) {
      setResetMsg(err.code === 'functions/not-found'
        ? 'No existe una cuenta Firebase con ese email.'
        : `Error: ${err.message}`);
    } finally { setResetSending(false); }
  };

  /* ── Cambio directo de contraseña ──────────────────────────
     El admin fija la clave y se la comparte al barbero (WhatsApp,
     voz, etc.). Alternativa al reset por email cuando el barbero
     no tiene acceso a su correo o pidió una clave específica.
     Requiere la CF cambiarPasswordStaff (functions/index.js). */
  const handleSetPassword = async () => {
    const email = (form.email.trim() || editing?.email || '').trim().toLowerCase();
    if (!email) { setSetPassMsg('Falta el email del barbero.'); return; }
    if (newPass.length < 6) { setSetPassMsg('Al menos 6 caracteres.'); return; }
    setSetPassSaving(true);
    setSetPassMsg('');
    try {
      const call = httpsCallable(getFunctions(undefined, 'us-central1'), 'cambiarPasswordStaff');
      await call({ email, nuevaPassword: newPass, tenantId: resolveTenantId() });
      setSetPassMsg('✓ Contraseña actualizada. Compártesela al barbero.');
      setNewPass('');
      setTimeout(() => { setShowSetPass(false); setSetPassMsg(''); }, 2500);
    } catch (err) {
      const message = err?.message || 'No se pudo cambiar la contraseña.';
      setSetPassMsg(message.replace(/^\[.*?\]\s*/, ''));
    } finally { setSetPassSaving(false); }
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
  const field = 'w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:bg-white/[0.05] transition-all duration-200 ease-in-out';
  const lbl   = 'block text-[11px] font-medium text-slate-400 uppercase tracking-[0.08em] mb-1.5';

  // Barbero editado ya tiene cuenta Firebase Auth (authUid nuevo o uid legacy).
  // Fuente única de verdad para la UI del modal: si es true → mostramos read-only
  // + reset. Si es false → mostramos toggle de creación.
  const hasAccess = !!(editing?.authUid || editing?.uid);

  const selectedBarber = barberos.find(b => b.id === sueldoBarberoId);
  const comisionServicioPorc  = selectedBarber ? (selectedBarber.comision || 0) : 0;
  const comisionProductoPorc  = selectedBarber ? (selectedBarber.comisionProductos ?? 10) : 10;
  const comisionProductoMonto = selectedBarber ? (selectedBarber.comisionProductosMonto ?? 0) : 0;
  const comisionPorProductoMap = (selectedBarber?.comisionPorProducto && typeof selectedBarber.comisionPorProducto === 'object')
    ? selectedBarber.comisionPorProducto : {};
  // % aplicable a UNA venta: si el productoId tiene override, se usa ese;
  // sino, cae al % global del barbero.
  const pctProductoPara = (productId) => {
    const raw = comisionPorProductoMap[productId];
    const n = Number(raw);
    return (raw != null && raw !== '' && Number.isFinite(n) && n >= 0) ? n : comisionProductoPorc;
  };
  const sueldoBaseMonto = selectedBarber ? (selectedBarber.sueldoBase || 0) : 0;

  // Precio de referencia por servicio (id o nombre) para citas completadas SIN
  // precio explícito registrado. Mismo fallback que Métricas (Metricas.jsx:589):
  // así la nómina no paga $0 por cortes reales sin precio. Las cortesías
  // (cortesia:true) pagan 0, consistente con el ingreso que muestra Métricas.
  const precioMapSueldo = {};
  (servicios || []).forEach(s => {
    const p = Number(s.precio) || 0;
    if (s.id)     precioMapSueldo[s.id]     = p;
    if (s.nombre) precioMapSueldo[s.nombre] = p;
  });
  const precioCitaSueldo = (c) => c.cortesia
    ? 0
    : (Number(c.precio) || precioMapSueldo[c.servicioId] || precioMapSueldo[c.servicioNombre] || 0);

  const serviciosBruto = citasSueldos.reduce((acc, curr) => acc + precioCitaSueldo(curr), 0);
  const serviciosComision = citasSueldos.reduce((acc, curr) => acc + (precioCitaSueldo(curr) * comisionServicioPorc / 100), 0);

  const productosBruto = ventasSueldos.reduce((acc, curr) => acc + (curr.precioTotal || curr.precio || 0), 0);
  // Comisión por venta = (precio × %) + monto fijo. El monto se aplica una vez por venta.
  // El % puede ser override por producto (comisionPorProducto[productId]) o el global.
  const productosComision = ventasSueldos.reduce(
    (acc, curr) => acc + ((curr.precioTotal || curr.precio || 0) * pctProductoPara(curr.productId) / 100) + comisionProductoMonto,
    0,
  );

  const propinasAcumuladas = citasSueldos.reduce((acc, curr) => acc + (curr.propina || 0), 0);
  const totalPagarCalculado = serviciosComision + productosComision + sueldoBaseMonto;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">Equipo</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeTab === 'miembros' ? `${barberos.length} miembros` : 'Liquidación de haberes y comisiones'}
          </p>
        </div>
        {activeTab === 'miembros' && (
          <button onClick={openNew}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-primary text-sm font-semibold px-4 py-2 rounded-lg transition-colors self-start sm:self-auto">
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
                ? 'bg-emerald-600 text-primary shadow-lg'
                : 'text-slate-400 hover:text-primary hover:bg-slate-800'
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
                ? 'bg-emerald-600 text-primary shadow-lg'
                : 'text-slate-400 hover:text-primary hover:bg-slate-800'
            }`}
          >
            <Percent size={16} /> Liquidación de Sueldos
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonGrid count={8} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />
      ) : activeTab === 'miembros' ? (
        <>
          {/* Filosofía SynapTech: crecimiento sin cobrar por barbero extra */}
          <div
            className="mb-4 bg-white/[0.02] rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="p-1.5 rounded-lg bg-emerald-400/10 ring-1 ring-inset ring-emerald-400/15 shrink-0 mt-0.5">
              <Sparkles size={14} className="text-emerald-300" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary leading-tight tracking-tight">
                En SynapTech creemos que crecer <span className="text-emerald-300">no debería costarte más</span>.
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Suma todos los {memberLabel}s que quieras — <strong className="text-slate-200">nunca cobramos extra por integrantes del equipo</strong>.
                Cuando tu negocio crece, nosotros crecemos contigo.
              </p>
            </div>
          </div>

          {/* Toggle: aleatorizar orden de barberos en la página pública */}
          <div
            className="mb-4 flex items-center justify-between gap-3 bg-white/[0.02] rounded-2xl px-4 py-3"
            style={{ border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ring-1 ring-inset transition-colors duration-200 ease-in-out ${
                randomBarberos ? 'bg-emerald-400/10 ring-emerald-400/15 text-emerald-300' : 'bg-white/[0.03] ring-white/[0.05] text-slate-500'
              }`}>
                <Shuffle size={13} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-primary leading-tight">Aleatorizar orden de {memberLabel}s</p>
                  <button
                    type="button"
                    onClick={() => setShowRandomHelp(true)}
                    className="text-slate-500 hover:text-emerald-400 transition-colors"
                    title="¿Cómo funciona?"
                    aria-label="Cómo funciona el orden aleatorio"
                  >
                    <HelpCircle size={14} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Cuando está activo, cada cliente ve los {memberLabel}s en orden distinto en tu página pública. Nadie queda pegado arriba.
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              onClick={toggleRandomBarberos}
              disabled={savingRandom || randomBarberos === null}
              className="relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-50"
              style={{ background: randomBarberos ? '#10b981' : '#334155' }}
              aria-pressed={!!randomBarberos}
              aria-label="Activar aleatorización de barberos"
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: randomBarberos ? '22px' : '2px' }}
              />
              {savingRandom && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </span>
              )}
            </button>
          </div>

          {/* Modal de ayuda del randomizador */}
          {showRandomHelp && (
            <div
              onClick={() => setShowRandomHelp(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div
                onClick={e => e.stopPropagation()}
                className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl"
              >
                <div className="flex items-start justify-between p-5 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                      <Shuffle size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-primary leading-tight">¿Qué hace el orden aleatorio?</h3>
                      <p className="text-[11px] text-slate-500">Distribuye las oportunidades de forma justa</p>
                    </div>
                  </div>
                  <button onClick={() => setShowRandomHelp(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-800 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5 space-y-4 text-sm text-slate-300 leading-relaxed">
                  <p>
                    Cuando <strong className="text-primary">está apagado</strong>, tus clientes ven los {memberLabel}s siempre en el orden manual que armaste con el drag-and-drop.
                    Los que están arriba tienden a recibir más reservas porque los clientes eligen sin scrollear.
                  </p>
                  <p>
                    Cuando <strong className="text-primary">está encendido</strong>, cada vez que un cliente abre tu página pública ve el orden <strong className="text-emerald-400">aleatorio</strong>. Ningún {memberLabel} queda pegado arriba, todos tienen la misma probabilidad de aparecer primero.
                  </p>
                  <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cuándo activarlo</p>
                    <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                      <li>Querés que las citas se repartan parejo entre todo el equipo</li>
                      <li>Tenés {memberLabel}s nuevos que también merecen visibilidad</li>
                      <li>Prefieres que la elección no dependa de "quién quedó arriba"</li>
                    </ul>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cuándo apagarlo</p>
                    <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                      <li>Querés que el {memberLabel} más experimentado aparezca primero</li>
                      <li>Preferís controlar tú el orden con el drag-and-drop</li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    El cambio se aplica al toque en la página pública — no hace falta guardar ni recargar.
                  </p>
                </div>
                <div className="p-4 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setShowRandomHelp(false)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          )}

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
                    allowAdminEdit={tenant.id === 'delnero' || b.esBarbero === true || b.mostrarEnAgenda === true}
                    tenant={tenant} canManageBioo={isAdmin}
                    linkedMainDocIds={linkedMainDocIds} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <div className="space-y-6">
          {/* SECTOR DE SELECCIÓN DE BARBERO */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
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
                    <span className="text-xs font-semibold text-primary truncate max-w-full">{b.nombre}</span>
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
                  <h3 className="text-sm font-bold text-primary mb-4">Rango de Fechas</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desde</label>
                        <input
                          type="date"
                          value={fechaInicio}
                          onChange={e => setFechaInicio(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hasta</label>
                        <input
                          type="date"
                          value={fechaFin}
                          onChange={e => setFechaFin(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-emerald-500"
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
                  <h3 className="text-sm font-bold text-primary border-b border-slate-800 pb-2">Resumen de Liquidación</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Sueldo Base:</span>
                      <span className="font-semibold text-primary">{fmtCurrency(sueldoBaseMonto)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Comisión Servicios ({comisionServicioPorc}%):</span>
                      <span className="font-semibold text-primary">{fmtCurrency(serviciosComision)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>
                        Comisión Productos ({comisionProductoPorc}%
                        {comisionProductoMonto > 0 && ` + ${fmtCurrency(comisionProductoMonto)}/venta`}):
                      </span>
                      <span className="font-semibold text-primary">{fmtCurrency(productosComision)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2 font-bold text-primary text-base">
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
                    {/* El PAGO vive en Comisiones (flujo único): allá hay
                        idempotencia por período, reapertura con diff,
                        aceptación del barbero y adelantos. Acá quedaba un
                        gasto suelto sin período ni candado — se podía pagar
                        dos veces la misma semana sin que nada avisara. */}
                    <button
                      onClick={() => navigate('/comisiones')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-primary text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Wallet size={14} /> Pagar en Comisiones →
                    </button>
                  </div>
                </div>
              </div>

              {/* DETALLES DE COMISIONES */}
              <div className="lg:col-span-2 space-y-6">
                {/* TABLA SERVICIOS */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Scissors size={16} className="text-emerald-500" /> Servicios Realizados ({citasSueldos.length})
                    </h3>
                    <span className="text-xs text-slate-400">Total Bruto: <strong className="text-primary">{fmtCurrency(serviciosBruto)}</strong></span>
                  </div>

                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <Spinner size={22} className="text-slate-500" />
                    </div>
                  ) : citasSueldos.length === 0 ? (
                    <div className="text-center py-8 bg-slate-800/10 border border-dashed border-slate-800 rounded-lg">
                      <AlertTriangle size={24} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No se encontraron servicios completados en este rango.</p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {citasSueldos.map(c => {
                        const precioEfectivo = precioCitaSueldo(c);
                        const comisionMonto = precioEfectivo * comisionServicioPorc / 100;
                        return (
                          <div key={c.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-800/40 border border-slate-800/80 text-xs text-slate-300">
                            <div>
                              <p className="font-semibold text-primary">{c.clienteNombre || 'Cliente sin nombre'}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{c.servicioNombre} • {c.fecha} {c.hora}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{fmtCurrency(precioEfectivo)}</p>
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
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Percent size={16} className="text-emerald-500" /> Productos Vendidos ({ventasSueldos.length})
                    </h3>
                    <span className="text-xs text-slate-400">Total Bruto: <strong className="text-primary">{fmtCurrency(productosBruto)}</strong></span>
                  </div>

                  {loadingData ? (
                    <div className="flex justify-center py-8">
                      <Spinner size={22} className="text-slate-500" />
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
                        const pctAplicado = pctProductoPara(v.productId);
                        const comisionMonto = precioVenta * pctAplicado / 100 + comisionProductoMonto;
                        const itemDate = v.fecha || v.createdAt || v.creadoEn;
                        const dateStr = typeof itemDate === 'string' ? itemDate.slice(0, 10) : (itemDate?.toDate ? itemDate.toDate().toLocaleDateString('es-CL') : '');
                        return (
                          <div key={v.id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-800/40 border border-slate-800/80 text-xs text-slate-300">
                            <div>
                              <p className="font-semibold text-primary">{v.productName || v.productoNombre || 'Producto'}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Cant: {v.cantidad || 1} • {dateStr}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{fmtCurrency(precioVenta)}</p>
                              <p className="text-[10px] text-emerald-400 mt-0.5">
                                Comisión: {fmtCurrency(comisionMonto)}
                                {pctAplicado !== comisionProductoPorc && (
                                  <span className="ml-1 text-amber-400" title="Override por producto">({pctAplicado}%)</span>
                                )}
                              </p>
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
            <button onClick={() => setSlide(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving || uploading || !form.nombre.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-primary text-sm font-semibold rounded-lg transition-all">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Guardar cambios' : `Crear ${memberLabel}`}
            </button>
          </div>
        }
      >
        {/* ── Pestañas ──────────────────────────────────────────────
            Antes eran ocho secciones desplegables en una sola columna: para
            dar de alta a alguien había que bajar por todas y era fácil no ver
            que faltaba algo. Cada paso ahora cabe en una pantalla.
            `Pago` solo la ve un admin — es donde vive la plata. */}
        <div className={`sticky top-0 z-10 -mx-4 mb-3 flex gap-1 overflow-x-auto border-b px-4 pb-px sm:-mx-5 sm:px-5 ${SUP_FORM} ${BRD_FORM}`}>
          {TABS_BARBERO.filter(t => !t.soloAdmin || isAdmin).map(t => {
            const activa = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative shrink-0 px-3 py-2.5 text-xs font-bold transition-colors ${
                  activa ? 'text-emerald-400' : 'text-slate-400 hover:text-primary'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <t.Icon size={13} /> {t.label}
                </span>
                {activa && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">

          {/* Fuera de las pestañas a propósito: el botón "Subir foto" vive en
              Perfil y usa este ref. Si el input se montara dentro de una
              pestaña, al cambiar de pestaña se desmonta, fileRef queda en null
              y el botón no hace nada. */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

          {tab === 'datos' && (<>
          {/* ── Perfil ── */}
          <Section title="Datos del perfil" Icon={User} defaultOpen>
            <div>
              <label className={lbl}>Nombre *</label>
              <input className={field} placeholder="Nicolás Fabián" value={form.nombre}
                onChange={e => set('nombre', e.target.value)} />
            </div>
            {/* La especialidad se movió a la pestaña Perfil: es copy que ve el
                cliente, no un dato de alta. */}

            {/* ¿Recibe reservas? Es la pregunta que AgendaPro pone arriba y que
                acá estaba enterrada en tres booleanos redundantes. Manda
                `disponible`, que es el que leen las dos agendas (ver
                lib/roles.js). */}
            <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={form.disponible !== false}
                onClick={() => set('disponible', form.disponible === false)}
                className={`mt-0.5 relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  form.disponible !== false ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                  form.disponible !== false ? 'left-[1.125rem]' : 'left-0.5'
                }`} />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-primary">Acepta reservas en línea</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  {form.disponible !== false
                    ? 'Aparece en la página de reservas y como columna en la agenda.'
                    : 'Queda fuera de la reserva pública y de la agenda. Sus citas ya hechas no se borran.'}
                </p>
              </div>
            </div>

            {/* Color en la agenda — se guarda en el perfil (barberos/{id}.color).
                Sin color, la agenda usa el verde de siempre: nada cambia para
                quien no lo configure. */}
            <div>
              <label className={lbl}>Color en la agenda</label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORES_BARBERO.map(c => {
                  const activo = form.color?.toLowerCase() === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('color', activo ? '' : c)}
                      title={activo ? 'Quitar color' : `Usar ${c}`}
                      aria-label={`Color ${c}`}
                      aria-pressed={activo}
                      className="relative w-7 h-7 rounded-full transition-all duration-200 ease-in-out hover:scale-105"
                      style={{
                        backgroundColor: c,
                        outline: activo ? '2px solid rgba(255,255,255,0.85)' : 'none',
                        outlineOffset: activo ? '2px' : '0',
                      }}
                    >
                      {/* text-white literal: va sobre el swatch de color, no debe voltear con el tema */}
                      {activo && <Check size={14} strokeWidth={2.5} className="absolute inset-0 m-auto text-white drop-shadow" />}
                    </button>
                  );
                })}
                <input
                  type="color"
                  value={form.color || '#10b981'}
                  onChange={e => set('color', e.target.value)}
                  title="Elegir otro color"
                  aria-label="Elegir otro color"
                  className="w-7 h-7 rounded-lg bg-transparent cursor-pointer p-0.5 shrink-0"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                />
                {form.color && (
                  <button type="button" onClick={() => set('color', '')}
                    className="text-[11px] text-slate-500 hover:text-primary transition-colors">
                    Quitar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Identifica sus citas y su columna en la agenda. Sin color, usa el verde por defecto.
              </p>
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

          {/* ── Acceso al panel web ──
              Dos estados:
                (a) Barbero YA tiene cuenta (editing.authUid || editing.uid) →
                    read-only: badge "Cuenta activa" + email + botón para enviar
                    recovery vía CF enviarLinkAccesoStaff (email SynapTech).
                (b) Barbero NO tiene cuenta → toggle para habilitar + email +
                    password. Al guardar se llama a crearAccesoStaff (CF) para
                    no perder la sesión del admin actual. */}
          <Section title="Acceso al panel web" Icon={KeyRound}>
            {hasAccess ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-semibold">Cuenta de acceso activa</span>
                </div>

                <div>
                  <label className={lbl}>Email vinculado</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-200 font-mono">
                    <Mail size={13} className="text-slate-500 shrink-0" />
                    <span className="truncate">{form.email || editing.email || '—'}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">
                    El {memberLabel} inicia sesión en el panel con este correo.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handlePasswordReset}
                      disabled={resetSending || !(form.email.trim() || editing.email)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 hover:text-primary text-xs font-semibold rounded-lg transition-all">
                      {resetSending
                        ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        : <KeyRound size={13} />}
                      Enviar enlace por email
                    </button>
                    <button type="button" onClick={() => { setShowSetPass(v => !v); setSetPassMsg(''); }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-primary text-xs font-semibold rounded-lg transition-all">
                      <KeyRound size={13} />
                      Fijar contraseña
                    </button>
                  </div>

                  {resetMsg && (
                    <p className={`text-xs font-semibold ${resetMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {resetMsg}
                    </p>
                  )}

                  {/* Form inline para cambiar contraseña directamente. Se muestra
                      solo si el admin tocó "Fijar contraseña". La comparte por
                      WhatsApp/voz — no envía email de confirmación. */}
                  {showSetPass && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Nueva contraseña
                      </label>
                      <input
                        type="text"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        placeholder="mínimo 6 caracteres"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary font-mono focus:outline-none focus:border-emerald-500"
                        autoComplete="off"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSetPassword}
                          disabled={setPassSaving || newPass.length < 6}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-ink-950 text-xs font-bold transition-colors"
                        >
                          {setPassSaving
                            ? <span className="w-3 h-3 border border-slate-950 border-t-transparent rounded-full animate-spin" />
                            : <>Guardar</>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowSetPass(false); setNewPass(''); setSetPassMsg(''); }}
                          className="px-3 py-2 rounded-lg text-slate-400 hover:text-primary text-xs font-semibold transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                      {setPassMsg && (
                        <p className={`text-xs font-semibold ${setPassMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                          {setPassMsg}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-600 leading-snug">
                        Se aplica al instante. El barbero deberá volver a iniciar sesión.
                        Compártesela por WhatsApp o dísela en persona — no le llega email.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-slate-500 -mt-1 mb-2">
                  Habilita esto si quieres que el {memberLabel} pueda iniciar sesión en el panel con su email.
                </p>
                <button type="button"
                  onClick={() => { setAccesoEnabled(v => !v); setAccesoMsg(''); }}
                  className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                    accesoEnabled
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}>
                  <span className={`w-8 h-4 rounded-full transition-colors relative ${accesoEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${accesoEnabled ? 'left-4' : 'left-0.5'}`} />
                  </span>
                  Habilitar acceso al panel web
                </button>

                {accesoEnabled && (
                  <div className="mt-3 space-y-3 pl-1">
                    <div>
                      <label className={lbl}>Correo electrónico</label>
                      <input className={field} type="email" placeholder="correo@ejemplo.com"
                        value={form.email}
                        onChange={e => set('email', e.target.value)} />
                      <p className="text-[10px] text-slate-600 mt-1">
                        Este será el usuario para iniciar sesión.
                      </p>
                    </div>
                    <div>
                      <label className={lbl}>Contraseña temporal</label>
                      <input className={field} type="password" placeholder="Mínimo 6 caracteres" minLength={6}
                        value={accesoPassword}
                        onChange={e => setAccesoPassword(e.target.value)} />
                      <p className="text-[10px] text-slate-600 mt-1">
                        Compártela con el {memberLabel} — podrá cambiarla desde su email de restablecimiento.
                      </p>
                    </div>
                    {accesoMsg && (
                      <p className="text-xs font-semibold text-red-400 leading-snug">{accesoMsg}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </Section>
          </>)}

          {tab === 'pago' && (<>
          {/* ── Comisión ── */}
          {isAdmin && (
            <Section title="Sueldo y Comisiones" Icon={Percent} defaultOpen>
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

                  {/* Overrides por servicio: si el barbero cobra distinto según
                      el servicio (ej. 80% en corte, 70% en barba), aquí se
                      define el % por servicio. Los servicios sin valor caen al
                      % global de arriba. */}
                  {(() => {
                    const overrides = form.comisionPorServicio || {};
                    const numOvr = Object.values(overrides).filter(v => v != null && v !== '').length;
                    const svcDelBarbero = (form.serviciosIds && form.serviciosIds.length > 0)
                      ? servicios.filter(s => form.serviciosIds.includes(s.id))
                      : servicios;
                    return (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setShowSvcComm(v => !v)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          {showSvcComm ? '−' : '+'} Ajustar por servicio
                          {numOvr > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px]">
                              {numOvr} con % propio
                            </span>
                          )}
                        </button>
                        {showSvcComm && (
                          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
                            <p className="text-[10px] text-slate-500">
                              Servicios sin valor usan el <strong>{Number(form.comision) || 0}%</strong> global. Deja vacío para volver al global.
                            </p>
                            {svcDelBarbero.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic">Sin servicios asignados. Asignalos primero en "Servicios que ofrece".</p>
                            ) : (
                              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {svcDelBarbero.map(s => {
                                  const val = overrides[s.id];
                                  return (
                                    <div key={s.id} className="flex items-center gap-2">
                                      <span className="flex-1 text-[12px] text-slate-300 truncate" title={s.nombre}>
                                        {s.nombre}
                                      </span>
                                      <div className="relative w-24">
                                        <input
                                          type="number" min="0" max="100" step="1"
                                          placeholder={`${Number(form.comision) || 0}`}
                                          value={val ?? ''}
                                          onChange={e => {
                                            const raw = e.target.value;
                                            setForm(f => {
                                              const map = { ...(f.comisionPorServicio || {}) };
                                              if (raw === '' || raw == null) delete map[s.id];
                                              else map[s.id] = Number(raw);
                                              return { ...f, comisionPorServicio: map };
                                            });
                                          }}
                                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[12px] text-slate-200 focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Arriendo por servicio (modelo invertido): el barbero cobra el
                    100% al cliente y le paga un monto fijo al local por cada
                    servicio. Precede al override % y al % global. Visible en
                    Oren (uso real) y delnero (sandbox oficial de tests). */}
                {(tenant?.id === 'oren' || tenant?.id === 'delnero') && (() => {
                  const arriendos = form.arriendoPorServicio || {};
                  const numRent = Object.values(arriendos).filter(v => v != null && v !== '' && Number(v) > 0).length;
                  const svcDelBarbero = (form.serviciosIds && form.serviciosIds.length > 0)
                    ? servicios.filter(s => form.serviciosIds.includes(s.id))
                    : servicios;
                  return (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowSvcRent(v => !v)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                      >
                        {showSvcRent ? '−' : '+'} Arriendo por servicio ($ al local)
                        {numRent > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[10px]">
                            {numRent} con arriendo
                          </span>
                        )}
                      </button>
                      <p className="text-[10px] text-slate-600 mt-1">
                        Modelo invertido: el barbero cobra el 100% al cliente y le paga un monto fijo al local por cada servicio,
                        pero <strong>solo</strong> con los clientes de su cartera propia (identificados por sufijo en el nombre).
                        Los clientes agendados por el local siguen pagando la comisión normal.
                      </p>
                      {showSvcRent && (
                        <div className="mt-2 rounded-lg border border-amber-900/40 bg-amber-950/10 p-3 space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                              Sufijo del nombre de sus clientes propios
                            </label>
                            <input
                              type="text"
                              maxLength="6"
                              placeholder="ej: cp"
                              value={form.sufijoClientePropio || ''}
                              onChange={e => set('sufijoClientePropio', e.target.value.trim())}
                              className="w-32 bg-slate-900 border border-amber-500/40 rounded px-2 py-1 text-[12px] text-amber-100 focus:outline-none focus:border-amber-500/60"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                              Detecta clientes al final del nombre (case-insensitive): "Jorgito xuni <strong>cp</strong>" matchea con sufijo <code>cp</code>.
                              <br/><strong className="text-amber-400/80">Sin sufijo → arriendo desactivado</strong> (fail-safe: no cobra arriendo a clientes del local por error).
                              {tenant?.id === 'oren' && (
                                <><br/><span className="text-amber-400/80">En Oren estos clientes tampoco acumulan sellos del club (cartera externa del barbero).</span></>
                              )}
                            </p>
                          </div>
                          <hr className="border-amber-500/30" />
                          <p className="text-[10px] text-amber-400/80">
                            Monto que el barbero le paga al local por cada servicio a un cliente propio. Deja vacío para NO cobrar arriendo por ese servicio (aunque el cliente sea propio, se cobra la comisión normal).
                          </p>
                          {svcDelBarbero.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic">Sin servicios asignados. Asignalos primero en "Servicios que ofrece".</p>
                          ) : (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                              {svcDelBarbero.map(s => {
                                const val = arriendos[s.id];
                                return (
                                  <div key={s.id} className="flex items-center gap-2">
                                    <span className="flex-1 text-[12px] text-slate-300 truncate" title={s.nombre}>
                                      {s.nombre}
                                    </span>
                                    <div className="relative w-28">
                                      <DollarSign size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                                      <input
                                        type="number" min="0" step="100"
                                        placeholder="0"
                                        value={val ?? ''}
                                        onChange={e => {
                                          const raw = e.target.value;
                                          setForm(f => {
                                            const map = { ...(f.arriendoPorServicio || {}) };
                                            if (raw === '' || raw == null || Number(raw) <= 0) delete map[s.id];
                                            else map[s.id] = Number(raw);
                                            return { ...f, arriendoPorServicio: map };
                                          });
                                        }}
                                        className="w-full bg-slate-900 border border-slate-800 rounded pl-6 pr-2 py-1 text-[12px] text-slate-200 focus:outline-none focus:border-amber-500/50"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <label className={lbl}>Porcentaje de comisión por productos</label>
                  <div className="relative">
                    <input className={field} type="number" min="0" max="100" step="1"
                      placeholder="10" value={form.comisionProductos}
                      onChange={e => set('comisionProductos', Number(e.target.value))} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Porcentaje que recibe el barbero sobre la venta de productos (por defecto 10%).</p>

                  {/* Overrides por producto: si el barbero cobra distinto según
                      el producto (ej. 15% en Pomada, 5% en Perfume), aquí se
                      define el % por producto. Productos sin valor caen al
                      % global de arriba. Espeja comisionPorServicio. */}
                  {(() => {
                    const overrides = form.comisionPorProducto || {};
                    const numOvr = Object.values(overrides).filter(v => v != null && v !== '').length;
                    // Filtra productos activos (los ocultos siguen apareciendo
                    // en la lista para poder ajustar comisiones históricas).
                    const productosOrdenados = [...(productos || [])].sort((a, b) => {
                      const na = (a.nombre || '').toLowerCase();
                      const nb = (b.nombre || '').toLowerCase();
                      return na.localeCompare(nb);
                    });
                    return (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setShowProdComm(v => !v)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                        >
                          {showProdComm ? '−' : '+'} Ajustar por producto
                          {numOvr > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px]">
                              {numOvr} con % propio
                            </span>
                          )}
                        </button>
                        {showProdComm && (
                          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
                            <p className="text-[10px] text-slate-500">
                              Productos sin valor usan el <strong>{Number(form.comisionProductos) || 0}%</strong> global. Deja vacío para volver al global.
                            </p>
                            {productosOrdenados.length === 0 ? (
                              <p className="text-[11px] text-slate-500 italic">Sin productos configurados aún. Crealos primero en Productos.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {productosOrdenados.map(p => {
                                  const val = overrides[p.id];
                                  return (
                                    <div key={p.id} className="flex items-center gap-2">
                                      <span className="flex-1 text-[12px] text-slate-300 truncate" title={p.nombre}>
                                        {p.nombre}
                                        {p.activo === false && (
                                          <span className="ml-1 text-[9px] text-slate-500 uppercase">(oculto)</span>
                                        )}
                                      </span>
                                      <div className="relative w-24">
                                        <input
                                          type="number" min="0" max="100" step="1"
                                          placeholder={`${Number(form.comisionProductos) || 0}`}
                                          value={val ?? ''}
                                          onChange={e => {
                                            const raw = e.target.value;
                                            setForm(f => {
                                              const map = { ...(f.comisionPorProducto || {}) };
                                              if (raw === '' || raw == null) delete map[p.id];
                                              else map[p.id] = Number(raw);
                                              return { ...f, comisionPorProducto: map };
                                            });
                                          }}
                                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[12px] text-slate-200 focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className={lbl}>Monto fijo por venta de producto ($)</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className={`${field} pl-8`} type="number" min="0" step="100"
                      placeholder="0" value={form.comisionProductosMonto}
                      onChange={e => set('comisionProductosMonto', Number(e.target.value))} />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1">Se <strong className="text-slate-400">suma</strong> al porcentaje: cada venta de producto paga <em>(% × precio) + este monto</em>. Deja en 0 para usar solo el %.</p>
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
          </>)}

          {tab === 'horario' && (<>
          {/* ── Horario semanal ── */}
          <Section title="Horario semanal" Icon={Clock} defaultOpen>
            <p className="text-[10px] text-slate-500 -mt-1 mb-2">Configura el horario de cada día. Puedes añadir descansos dentro de cada jornada.</p>
            <div className="space-y-2">
              {DIAS_ORDER.map(d => (
                <DayRow key={d} diaKey={d} config={form.horario[d]}
                  onChange={cfg => setForm(f => ({ ...f, horario: { ...f.horario, [d]: cfg } }))} />
              ))}
            </div>
          </Section>

          {/* ── Días extra (excepciones fuera del horario semanal) ── */}
          <Section title="Días extra" Icon={CalendarPlus}>
            <p className="text-[10px] text-slate-500 -mt-1 mb-2">
              Habilita fechas puntuales aunque su horario semanal las marque como no laborales
              (ej: un sábado que atiende excepcionalmente). No afecta el horario semanal.
            </p>
            <DiasExtraEditor
              value={Array.isArray(form.diasExtra) ? form.diasExtra : []}
              onChange={arr => setForm(f => ({ ...f, diasExtra: arr }))}
            />
          </Section>

          </>)}

          {tab === 'servicios' && (<>
          {/* ── Servicios ── */}
          <Section title="Servicios que realiza" Icon={Scissors} defaultOpen>
            {servicios.length === 0 ? (
              <p className="text-xs text-slate-600 italic">Sin servicios configurados aún.</p>
            ) : (() => {
              const ids = servicios.map(s => s.id);
              const sel = form.serviciosIds || [];
              const todos = ids.length > 0 && ids.every(id => sel.includes(id));
              // Agrupados por categoría, como AgendaPro: con 14+ servicios una
              // lista plana no se lee. Los que no tienen categoría caen en
              // "Servicios", que es lo que la mayoría tiene hoy.
              const grupos = {};
              for (const s of servicios) {
                const g = (s.categoria || '').trim() || 'Servicios';
                (grupos[g] = grupos[g] || []).push(s);
              }
              const setSel = arr => setForm(f => ({ ...f, serviciosIds: arr }));

              return (
                <div className="space-y-2">
                  {/* Seleccionar todo — la casilla que resuelve el 90% de las altas */}
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={todos}
                      onChange={() => setSel(todos ? [] : ids)}
                      className="h-4 w-4 shrink-0 accent-emerald-500"
                    />
                    <span className="flex-1 text-sm font-bold text-primary">Seleccionar todo</span>
                    <span className="text-[11px] tabular-nums text-slate-500">{sel.length}/{ids.length}</span>
                  </label>

                  {Object.entries(grupos).map(([grupo, items]) => {
                    const gIds = items.map(s => s.id);
                    const gTodos = gIds.every(id => sel.includes(id));
                    const gAlgunos = !gTodos && gIds.some(id => sel.includes(id));
                    return (
                      <div key={grupo} className="rounded-lg border border-slate-800 overflow-hidden">
                        <label className="flex cursor-pointer items-center gap-2.5 bg-slate-800/60 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={gTodos}
                            // Indeterminado cuando el grupo va a medias: sin esto
                            // se ve igual que "ninguno" y engaña.
                            ref={el => { if (el) el.indeterminate = gAlgunos; }}
                            onChange={() => setSel(gTodos
                              ? sel.filter(id => !gIds.includes(id))
                              : [...new Set([...sel, ...gIds])])}
                            className="h-4 w-4 shrink-0 accent-emerald-500"
                          />
                          <span className="flex-1 text-xs font-bold text-primary">{grupo}</span>
                          <span className="text-[11px] tabular-nums text-slate-500">({items.length})</span>
                        </label>
                        <div className="grid grid-cols-1 gap-x-3 p-2 sm:grid-cols-2">
                          {items.map(s => (
                            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 hover:bg-slate-800/60">
                              <input
                                type="checkbox"
                                checked={sel.includes(s.id)}
                                onChange={() => toggleServicio(s.id)}
                                className="h-3.5 w-3.5 shrink-0 accent-emerald-500"
                              />
                              <span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-200">{s.nombre}</span>
                              {s.duracion && <span className="shrink-0 text-[10px] text-slate-500">{s.duracion}m</span>}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <p className="text-[10px] leading-relaxed text-slate-500">
                    {sel.length === 0
                      ? 'Sin ninguno marcado queda disponible para TODOS los servicios (comportamiento histórico).'
                      : 'En la reserva pública solo se le puede pedir lo que esté marcado acá.'}
                  </p>
                </div>
              );
            })()}
          </Section>

          </>)}

          {tab === 'horario' && (<>
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
                      <input
                        type="time" step={TIME_STEP}
                        value={t.inicio || ''}
                        onChange={e => set('tramosVip', form.tramosVip.map((x, idx) => idx === i ? { ...x, inicio: e.target.value } : x))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-primary focus:outline-none focus:border-amber-500 [color-scheme:dark] [html.light_&]:[color-scheme:light]"
                        aria-label="Inicio del tramo VIP"
                      />
                      <span className="text-slate-600 text-xs">–</span>
                      <input
                        type="time" step={TIME_STEP}
                        value={t.fin || ''}
                        onChange={e => set('tramosVip', form.tramosVip.map((x, idx) => idx === i ? { ...x, fin: e.target.value } : x))}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-primary focus:outline-none focus:border-amber-500 [color-scheme:dark] [html.light_&]:[color-scheme:light]"
                        aria-label="Fin del tramo VIP"
                      />
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
                className="flex items-center gap-1.5 px-3 py-2 w-full justify-center border border-dashed border-slate-700 text-slate-500 hover:text-primary hover:border-slate-500 rounded-lg text-xs font-medium transition-all">
                <Plus size={13} /> Añadir ausencia
              </button>
            </div>
          </Section>
          </>)}

          {tab === 'perfil' && (<>
          {/* ── Cómo se ve en la web ──────────────────────────────────
              Foto y especialidad viven acá y no en Datos: es lo que ve el
              cliente al elegir con quién se atiende, y se puede dejar para
              después sin bloquear el alta. */}
          <Section title="Foto del profesional" Icon={Camera} defaultOpen>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full overflow-hidden bg-white/[0.04] shrink-0 flex items-center justify-center"
                style={{ border: '2px solid rgba(255,255,255,0.1)' }}
              >
                {preview
                  ? <img src={preview} alt="" className="w-full h-full object-cover" />
                  : <User size={30} className="text-slate-600" />}
              </div>
              <div className="min-w-0">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-semibold text-slate-300 transition-colors">
                  {uploading
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Upload size={13} />}
                  {uploading ? 'Subiendo…' : (preview ? 'Cambiar foto' : 'Subir foto')}
                </button>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  Cuadrada se ve mejor. Mínimo 100×100 px, hasta 3 MB.
                </p>
                {uploadError && <p className="text-[10px] text-rose-400 mt-1">{uploadError}</p>}
              </div>
            </div>
          </Section>

          <Section title="Especialidad" Icon={Sparkles} defaultOpen>
            <label className={lbl}>Cómo se presenta al cliente</label>
            <input className={field} placeholder="Cortes y barba clásica" value={form.especialidad}
              onChange={e => set('especialidad', e.target.value)} />
            <p className="text-[10px] text-slate-500 mt-1.5">
              Sale bajo su nombre en la página de reservas. Se puede dejar vacío.
            </p>
          </Section>
          </>)}

        </div>
      </SlideOver>
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <ArrowDownCircle size={24} />
              <h3 className="text-base font-bold text-primary">Confirmar Registro de Pago</h3>
            </div>

            <p className="text-sm text-slate-400 leading-normal">
              Se registrará un egreso de <strong className="text-primary">{fmtCurrency(payoutModal.amount)}</strong> en el sistema bajo la categoría <strong className="text-primary">Sueldos</strong> para <strong className="text-primary">{payoutModal.barberName}</strong>.
            </p>

            <div className="space-y-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800/60 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Método de Pago</label>
                <select
                  value={payoutMetodo}
                  onChange={e => setPayoutMetodo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-emerald-500"
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
                className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayout}
                disabled={payoutSaving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-primary text-sm font-semibold rounded-lg transition-colors"
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
          <p>En <strong className="text-primary">Equipo</strong> administras los barberos y sus configuraciones.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Agrega barberos con nombre, foto, teléfono y correo.</li>
            <li>Define los <span className="text-primary">días hábiles</span> y el <span className="text-primary">horario</span> de cada barbero.</li>
            <li>Registra <span className="text-primary">ausencias programadas</span> para bloquear su disponibilidad en fechas concretas.</li>
            <li>Asigna el rol <span className="text-primary">Admin</span> para dar acceso completo al panel, o <span className="text-primary">Barbero</span> para acceso limitado.</li>
            <li>Usa el botón de restablecimiento para enviar un correo de cambio de contraseña.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
