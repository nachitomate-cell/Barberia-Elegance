import { useState, useEffect, useRef } from 'react';
import {
  Store, MapPin, Phone, Instagram, Image, Clock, Check, Save, HelpCircle, AlertCircle,
  GraduationCap, Scissors, Ban, Info, Sparkles, Target, Layers,
  Package, Tag, PenLine, Award, Bell, Mail, Users,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { activarNotificaciones } from '../hooks/useFCMToken';
import { tenantCol } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { useCollection } from '../hooks/useCollection';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import { isDailyWelcomeDisabled, setDailyWelcomeDisabled } from '../components/DailyWelcomePanel';

/* Categorías de recompensa del programa de referidos (mismo patrón que Sorteos).
   El submit persiste { categoria, textoDinamico, detalle } para que sea legible
   por el dashboard cliente sin lógica extra. */
const REF_CATEGORIAS = [
  { key: 'SELLOS',    emoji: '⭐', label: 'Sellos gratis',   Icon: Award    },
  { key: 'SERVICIO',  emoji: '✂️', label: 'Servicio gratis', Icon: Scissors },
  { key: 'PRODUCTO',  emoji: '📦', label: 'Producto',        Icon: Package  },
  { key: 'DESCUENTO', emoji: '🏷️', label: 'Descuento',       Icon: Tag      },
  { key: 'OTRO',      emoji: '✍️', label: 'Otro',            Icon: PenLine  },
];

/* ─── Constants ─────────────────────────────────────────────── */
const DIAS_LABELS = { '1':'Lunes','2':'Martes','3':'Miércoles','4':'Jueves','5':'Viernes','6':'Sábado','0':'Domingo' };
const DIAS_ORDER  = ['1','2','3','4','5','6','0'];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  ['00','30'].map(m => `${String(h).padStart(2,'0')}:${m}`)
).flat();

const DEFAULT_FEATURES = {
  hasCourses:     false,
  courses:        { title: 'Cursos de Barbería',    description: '', ctaMsg: '' },
  hasChairRental: false,
  chairRental:    { title: 'Arriendo de Sillones',  description: '', ctaMsg: '' },
  hasAcademiaInternal: false,
  // Permite al cliente elegir más de un servicio al agendar en la pública.
  // El primer servicio queda como principal y los adicionales se concatenan
  // en servicioNombre y suman duración y precio en la cita.
  hasMultiServiceSelect: false,
};

const DEFAULT_SETTINGS = {
  nombre:    '',
  direccion: '',
  telefono:  '',
  whatsapp:  '',
  instagram: '',
  logo:      '',
  // Correo oficial del local para avisos del sistema (mensualidad, etc.).
  // Es DISTINTO del correo con que cada admin inicia sesión: esos viven en
  // barberos/ y en varios locales son inventados, así que no sirven como
  // destinatario. Lo leen las Cloud Functions desde settings/general.
  emailAvisos: '',
  horario: {
    '1': { activo: true,  inicio: '09:00', fin: '20:00' },
    '2': { activo: true,  inicio: '09:00', fin: '20:00' },
    '3': { activo: true,  inicio: '09:00', fin: '20:00' },
    '4': { activo: true,  inicio: '09:00', fin: '20:00' },
    '5': { activo: true,  inicio: '09:00', fin: '20:00' },
    '6': { activo: true,  inicio: '09:00', fin: '14:00' },
    '0': { activo: false, inicio: '10:00', fin: '14:00' },
  },
  features: DEFAULT_FEATURES,
  quienesSomos: { activo: false, texto: '' },
  referralProgram: {
    enabled:     false,
    // LEGACY (backward compat): mostrado si no hay recompensas nuevas cargadas.
    // Sigue guardándose para tenants viejos y para el copy general del programa.
    rewardText:  '¡Gana 1 sello gratis por cada amigo que se registre y agende su primer corte!',
    rewardType:  'stamp',   // 'stamp' | 'discount' | 'custom'  (legacy)
    rewardValue: 1,          // (legacy)

    // ── Nuevo (Fase 1): recompensas estructuradas ────────────────────
    // Mismo formato polimórfico que los premios y sorteos:
    //   { categoria, textoDinamico, detalle }
    // La Cloud Function de otorgamiento (Fase 2) leerá `detalle.*` según
    // categoría (incrementar sellos, crear redemption, aplicar descuento).
    recompensaReferidor: null, // el cliente que INVITÓ (comparte código)
    recompensaReferido:  null, // el cliente que USÓ el código (se registra)
  },
};

/* ─── Helpers ────────────────────────────────────────────────── */
function settingsRef() {
  return doc(tenantCol('settings'), 'general');
}

function confRef() {
  return doc(tenantCol('configuracion'), 'main');
}

function mergeHorario(saved) {
  const base = { ...DEFAULT_SETTINGS.horario };
  if (!saved) return base;
  DIAS_ORDER.forEach(d => { if (saved[d]) base[d] = { ...base[d], ...saved[d] }; });
  return base;
}

function mergeFeatures(saved) {
  const base = { ...DEFAULT_FEATURES, courses: { ...DEFAULT_FEATURES.courses }, chairRental: { ...DEFAULT_FEATURES.chairRental } };
  if (!saved) return base;
  if (typeof saved.hasCourses === 'boolean')     base.hasCourses     = saved.hasCourses;
  if (typeof saved.hasChairRental === 'boolean') base.hasChairRental = saved.hasChairRental;
  if (typeof saved.hasAcademiaInternal === 'boolean') base.hasAcademiaInternal = saved.hasAcademiaInternal;
  if (typeof saved.hasMultiServiceSelect === 'boolean') base.hasMultiServiceSelect = saved.hasMultiServiceSelect;
  if (saved.courses)     base.courses     = { ...base.courses,     ...saved.courses };
  if (saved.chairRental) base.chairRental = { ...base.chairRental, ...saved.chairRental };
  return base;
}

/* ─── Helpers ────────────────────────────────────────────────── */
import { resolveTenantId } from '../lib/tenantUtils';

/* ─── Sub-components ─────────────────────────────────────────── */
function Card({ Icon, title, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
        <Icon size={15} className="text-slate-400 shrink-0" />
        <h2 className="text-sm font-semibold text-primary">{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

/**
 * Toggle del panel de bienvenida diaria (DailyWelcomePanel).
 * La preferencia es LOCAL al dispositivo (localStorage) — no se sincroniza
 * entre usuarios ni tenants. Quien lo apagó desde el panel puede reactivarlo
 * acá.
 */
function DailyWelcomeToggleCard() {
  // Negamos el flag almacenado para representar "mostrar" en la UI.
  const [mostrar, setMostrar] = useState(() => !isDailyWelcomeDisabled());

  function toggle() {
    const next = !mostrar;
    setMostrar(next);
    setDailyWelcomeDisabled(!next);
  }

  return (
    <Card Icon={Sparkles} title="Panel de bienvenida diaria">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-primary">Mostrar al abrir el panel</span>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Es el saludo con accesos rapidos (agenda, metricas, marketing). Se muestra una vez al dia.
            Si lo apagaste con &quot;No volver a mostrar&quot;, lo puedes reactivar desde aqui.
          </p>
          <p className="text-[10px] text-slate-600 mt-1.5">
            Esta preferencia se guarda en este dispositivo.
          </p>
        </div>
        <button type="button" onClick={toggle}
          className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${mostrar ? 'bg-emerald-500' : 'bg-slate-700'}`}>
          <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${mostrar ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </Card>
  );
}

/**
 * Notificaciones push del panel (avisos de citas y de mensualidad).
 *
 * Punto de entrada PERMANENTE: antes esto solo se ofrecía en un banner
 * (NotificationBanner) que, al cerrarse, guardaba 'notif-banner-dismissed'
 * y no volvía a aparecer nunca. Locales que lo cerraron una vez quedaban
 * sin push para siempre — y sin tokens, el recordatorio de cobro no tenía
 * a quién enviarle (fallaba en silencio).
 */
function NotificacionesToggleCard() {
  const soportado = typeof window !== 'undefined' && 'Notification' in window;
  const [permiso, setPermiso] = useState(() => (soportado ? Notification.permission : 'unsupported'));
  const [status, setStatus]   = useState('idle'); // idle | loading | error

  // iOS solo permite push web si la PWA está instalada en la pantalla de inicio.
  const esIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const instaladaPWA = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

  async function activar() {
    setStatus('loading');
    const res = await activarNotificaciones({
      uid:      auth.currentUser?.uid,
      tenantId: resolveTenantId(),
    });
    setPermiso(soportado ? Notification.permission : 'unsupported');
    if (res === 'granted') {
      // El banner ya no tiene sentido si el permiso quedó concedido.
      try { localStorage.removeItem('notif-banner-dismissed'); } catch { /* noop */ }
      setStatus('idle');
    } else {
      setStatus(res === 'denied' ? 'idle' : 'error');
    }
  }

  const activo = permiso === 'granted';

  return (
    <Card Icon={Bell} title="Notificaciones del panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-primary">
            {activo ? 'Notificaciones activas' : 'Activar notificaciones'}
          </span>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Avisos de nuevas reservas y del vencimiento de tu mensualidad, aunque tengas el panel cerrado.
          </p>

          {activo && (
            <p className="text-[11px] text-emerald-400 mt-1.5">
              Este dispositivo ya está recibiendo notificaciones.
            </p>
          )}

          {permiso === 'denied' && (
            <p className="text-[11px] text-amber-400 mt-1.5 leading-relaxed">
              Las bloqueaste en el navegador, así que no podemos volver a pedírtelo desde aquí.
              Actívalas en el candado de la barra de direcciones → Notificaciones → Permitir.
            </p>
          )}

          {!soportado && (
            <p className="text-[11px] text-amber-400 mt-1.5">
              Este navegador no soporta notificaciones push.
            </p>
          )}

          {esIOS && !instaladaPWA && !activo && (
            <p className="text-[11px] text-amber-400 mt-1.5 leading-relaxed">
              En iPhone primero debes instalar el panel: Compartir → &quot;Agregar a inicio&quot;.
              Safari no permite notificaciones desde una pestaña normal.
            </p>
          )}

          {status === 'error' && (
            <p className="text-[11px] text-red-400 mt-1.5">
              No se pudo activar. Revisa los permisos del navegador e intenta de nuevo.
            </p>
          )}

          <p className="text-[10px] text-slate-600 mt-1.5">
            Se activan por dispositivo: repite esto en cada teléfono o computador donde uses el panel.
          </p>
        </div>

        {!activo && soportado && permiso !== 'denied' && (
          <button type="button" onClick={activar} disabled={status === 'loading'}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-all">
            {status === 'loading'
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Bell size={12} />}
            {status === 'loading' ? 'Activando…' : 'Activar'}
          </button>
        )}

        {activo && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
            <Check size={11} /> Activas
          </span>
        )}
      </div>
    </Card>
  );
}

/* iOS-style toggle táctil reutilizable. */
function IosToggle({ checked, onChange, size = 'md' }) {
  const dim = size === 'sm'
    ? { track: 'w-9 h-5', dot: 'w-4 h-4', on: 'translate-x-4', off: 'translate-x-0.5' }
    : { track: 'w-11 h-6', dot: 'w-5 h-5', on: 'translate-x-[22px]', off: 'translate-x-0.5' };
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors ${dim.track} ${
        checked ? 'bg-emerald-500' : 'bg-neutral-700'
      }`}>
      <span className={`absolute top-0.5 ${dim.dot} rounded-full bg-white shadow transition-transform ${
        checked ? dim.on : dim.off
      }`} />
    </button>
  );
}

/* Fila de día compacta (h-12) — toggle + nombre + selects h-8 o "Cerrado". */
function DayRow({ diaKey, config, onChange }) {
  const sel = 'h-8 text-xs bg-neutral-900 border border-neutral-700 rounded px-1.5 text-primary focus:outline-none focus:border-emerald-500';
  return (
    <div className="h-12 flex items-center justify-between border-b border-neutral-800/50 py-1.5">
      <div className="flex items-center gap-3 min-w-0">
        <IosToggle
          checked={config.activo}
          onChange={v => onChange({ ...config, activo: v })}
          size="sm"
        />
        <span className={`text-sm font-semibold ${config.activo ? 'text-primary' : 'text-neutral-500'}`}>
          {DIAS_LABELS[diaKey]}
        </span>
      </div>
      {config.activo ? (
        <div className="flex items-center gap-1.5">
          <select value={config.inicio} onChange={e => onChange({ ...config, inicio: e.target.value })} className={sel}>
            {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
          <span className="text-neutral-600 text-xs">–</span>
          <select value={config.fin} onChange={e => onChange({ ...config, fin: e.target.value })} className={sel}>
            {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      ) : (
        <span className="text-xs text-neutral-500 italic">Cerrado</span>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   RecompensaEstructurada — sub-form reutilizable para elegir una
   recompensa del programa de referidos con la misma UX que Premios.
   Emite hacia arriba el objeto polimórfico:
     { categoria, textoDinamico, detalle }
   `textoDinamico` es lo que el dashboard cliente muestra tal cual
   (frase leíble). `detalle.*` es lo que consumirá la CF de otorgamiento
   en Fase 2 (productoId, servicioId, tipo/valor de descuento, sellos).
   ──────────────────────────────────────────────────────────────── */
/* Explicación visual del flujo del programa de referidos (3 pasos). */
function ReferralComoFunciona() {
  const pasos = [
    { n: 1, emoji: '🔗', t: 'Cada cliente recibe su código', d: 'Aparece solo en su app (pestaña Fidelización), con botones para copiar y compartir por WhatsApp.' },
    { n: 2, emoji: '🙋', t: 'Un amigo se registra con el código', d: 'Al crear su cuenta pega el código y queda vinculado al cliente que lo invitó.' },
    { n: 3, emoji: '✅', t: 'El amigo completa su primer corte', d: 'Cuando marcas esa cita como “Completada” en tu agenda, los dos reciben su recompensa automáticamente.' },
  ];
  return (
    <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5">Cómo funciona</p>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {pasos.map(p => (
          <div key={p.n} className="flex gap-2.5 sm:flex-col sm:gap-1.5">
            <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center justify-center shrink-0">{p.n}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary leading-tight">{p.emoji} {p.t}</p>
              <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{p.d}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-amber-400/80 mt-3 flex items-start gap-1.5 leading-relaxed">
        <span className="shrink-0">⚠️</span>
        <span>La recompensa se entrega al <b>completar</b> la primera cita, no solo al reservar — así nadie abusa reservando y cancelando.</span>
      </p>
    </div>
  );
}

/* QR falso decorativo (grid determinista) para el mock de canje. */
function FakeQR() {
  return (
    <div className="w-24 h-24 bg-white rounded-lg p-1.5 grid grid-cols-7 grid-rows-7 gap-[2px]">
      {Array.from({ length: 49 }).map((_, i) => {
        const r = Math.floor(i / 7), c = i % 7;
        const finder = (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3);
        const on = finder ? !((r === 1 && c === 1) || (r === 1 && c === 5) || (r === 5 && c === 1)) : ((i * 13 + 5) % 3 === 0);
        return <div key={i} className={on ? 'bg-black rounded-[1px]' : 'bg-white'} />;
      })}
    </div>
  );
}

/* Vista previa animada del SISTEMA COMPLETO de referidos + canje.
   Un mock de teléfono que cicla las 7 etapas de punta a punta. Usa el nombre
   real del local y las recompensas configuradas donde aplica. */
function ReferralSystemPreview({ nombreLocal, referidor, referido }) {
  const nombre = nombreLocal || 'Tu Barbería';
  const rDor = referidor?.textoDinamico || '3 sellos gratis';
  const rDo  = referido?.textoDinamico || '1 sello gratis';
  const [phase, setPhase] = useState(0);
  const N = 7;

  useEffect(() => {
    const dur = [2900, 2500, 2700, 2700, 2500, 2700, 3100];
    const t = setTimeout(() => setPhase(p => (p + 1) % N), dur[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  const CAPTIONS = [
    '1 · Tu cliente comparte su código',
    '2 · Un amigo se registra con el código',
    '3 · El amigo completa su primer corte',
    '4 · Ambos ganan su recompensa (automático)',
    '5 · El cliente ve su premio en la app',
    '6 · Lo abre: QR + PIN de 4 dígitos',
    '7 · El local lo escanea y lo entrega',
  ];

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">Vista previa · el sistema completo</p>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
        {/* Teléfono */}
        <div className="relative w-[250px] h-[400px] rounded-[2rem] border-[5px] border-neutral-800 bg-black overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-neutral-800 rounded-b-2xl z-20" />
          <div key={phase} className="absolute inset-0 animate-in fade-in duration-500">

            {/* ── 0 · Comparte ── */}
            {phase === 0 && (
              <div className="h-full bg-black p-3.5 pt-8 flex flex-col justify-center">
                <p className="text-center text-[10px] text-primary/40 font-bold tracking-widest mb-3">{nombre.toUpperCase()}</p>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-center">
                  <div className="text-2xl mb-1">🎁</div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Invita y gana</p>
                  <p className="text-[11px] text-primary mt-1.5 leading-snug">Comparte <b>{nombre}</b> y gana <b className="text-emerald-300">{rDor}</b> por cada amigo.</p>
                  <div className="mt-2.5 bg-black/50 border border-neutral-700 rounded-lg py-1.5 text-sm font-black tracking-widest text-primary">IGNA-6072</div>
                  <div className="flex gap-1.5 mt-2.5">
                    <div className="flex-1 bg-neutral-800 rounded-md py-1.5 text-[9px] text-neutral-300 font-bold">📋 Copiar</div>
                    <div className="flex-1 bg-emerald-500 rounded-md py-1.5 text-[9px] text-black font-black">📱 WhatsApp</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 1 · El amigo se registra ── */}
            {phase === 1 && (
              <div className="h-full bg-black p-4 pt-9 flex flex-col">
                <p className="text-sm font-bold text-primary text-center mb-3">Crear cuenta</p>
                <div className="space-y-2">
                  <div className="h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center px-2.5 text-[11px] text-neutral-500">Nombre del amigo</div>
                  <div className="h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center px-2.5 text-[11px] text-neutral-500">+56 9 ····</div>
                  <div className="h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-between px-2.5 animate-pulse">
                    <span className="text-[9px] text-emerald-300/70 uppercase tracking-wide font-bold">Código de referido</span>
                    <span className="text-[12px] font-black tracking-widest text-emerald-300">IGNA-6072</span>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-white text-black text-center py-2 text-[11px] font-bold">Crear cuenta</div>
                <p className="text-[9px] text-neutral-500 text-center mt-2.5">Queda vinculado a quien lo invitó ✓</p>
              </div>
            )}

            {/* ── 2 · Completa su primer corte ── */}
            {phase === 2 && (
              <div className="h-full bg-neutral-950 p-4 pt-9 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-2.5">Agenda del barbero</p>
                <div className="rounded-xl border-l-4 border-emerald-500 bg-neutral-900 p-3">
                  <p className="text-[12px] font-bold text-primary">Amigo nuevo</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Corte · 12:30</p>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                    <span className="animate-pulse">✓</span> Completada
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500 mt-3.5 text-center leading-relaxed">El barbero marca la cita como <b className="text-neutral-300">Completada</b> → se dispara la recompensa.</p>
              </div>
            )}

            {/* ── 3 · Ambos ganan ── */}
            {phase === 3 && (
              <div className="h-full bg-gradient-to-b from-emerald-500/10 to-black p-4 pt-9 flex flex-col items-center text-center">
                <div className="text-3xl mb-1.5">🎉</div>
                <p className="text-sm font-black text-primary">¡Recompensa automática!</p>
                <div className="w-full space-y-2 mt-3">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2">
                    <p className="text-[9px] text-emerald-400/70 uppercase font-bold tracking-wide">Referidor · tu cliente</p>
                    <p className="text-[12px] font-black text-emerald-300">+ {rDor}</p>
                  </div>
                  <div className="rounded-lg bg-sky-500/10 border border-sky-500/25 p-2">
                    <p className="text-[9px] text-sky-400/70 uppercase font-bold tracking-wide">Referido · el amigo</p>
                    <p className="text-[12px] font-black text-sky-300">+ {rDo}</p>
                  </div>
                </div>
                <p className="text-[9px] text-neutral-500 mt-3 leading-relaxed">Si es <b>sellos</b>, se suman al instante. Si es <b>servicio/producto</b>, se canjea así ↓</p>
              </div>
            )}

            {/* ── 4 · Cliente ve su premio ── */}
            {phase === 4 && (
              <div className="h-full bg-black p-4 pt-9 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm font-bold text-primary">Recompensas</p>
                  <span className="text-[9px] font-black bg-amber-500 text-black rounded-full px-1.5 py-0.5">1</span>
                </div>
                <div className="rounded-2xl p-3 flex items-center gap-2.5" style={{ background: 'linear-gradient(135deg,rgba(251,191,36,.12),rgba(251,191,36,.04))', border: '1px solid rgba(251,191,36,.25)' }}>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-base">🎁</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-primary">Corte gratis</p>
                    <p className="text-[9px] text-primary/50">Por invitar a un amigo</p>
                  </div>
                  <span className="text-[9px] font-bold text-primary/70 bg-white/10 rounded-full px-2 py-1">Canjear →</span>
                </div>
                <p className="text-[9px] text-neutral-500 mt-3.5 text-center">El cliente ve su premio en la app y toca “Canjear”.</p>
              </div>
            )}

            {/* ── 5 · QR + PIN ── */}
            {phase === 5 && (
              <div className="h-full bg-black p-4 pt-9 flex flex-col items-center">
                <p className="text-[12px] font-bold text-primary">Corte gratis</p>
                <p className="text-[9px] text-neutral-500 mb-3">Muéstralo en el local</p>
                <FakeQR />
                <div className="mt-3 text-center">
                  <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold">PIN</p>
                  <p className="text-2xl font-black tracking-[0.35em] text-primary">4821</p>
                </div>
                <div className="mt-2 text-[9px] text-red-400/80 font-bold">Expira en 04:58 ⏳</div>
              </div>
            )}

            {/* ── 6 · El local lo valida ── */}
            {phase === 6 && (
              <div className="h-full bg-neutral-950 p-4 pt-9 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-emerald-400 text-sm">🔍</span>
                  <p className="text-sm font-bold text-primary">Canjes · Panel</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-black text-lg font-black">✓</div>
                    <div>
                      <p className="text-[12px] font-bold text-primary">Corte gratis</p>
                      <p className="text-[10px] text-emerald-400">Validado · PIN 4821</p>
                    </div>
                  </div>
                  <div className="mt-2.5 rounded-lg bg-black/40 border border-neutral-800 p-2 text-[10px] text-neutral-300">✂️ “Corte gratis” de regalo · aplicar en la sesión</div>
                </div>
                <p className="text-[9px] text-neutral-500 mt-3.5 text-center leading-relaxed">El staff escanea el QR o teclea el PIN, ve qué entregar, y confirma. ✅</p>
              </div>
            )}

          </div>
        </div>

        {/* Caption + progreso */}
        <p className="text-xs font-semibold text-primary text-center min-h-[2.5rem] flex items-center">{CAPTIONS[phase]}</p>
        <div className="flex gap-1.5">
          {Array.from({ length: N }).map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === phase ? 'w-5 bg-emerald-400' : 'w-1.5 bg-neutral-700'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RecompensaEstructurada({ title, subtitle, value, onChange, productos, servicios }) {
  const inp = 'h-9 text-sm bg-neutral-900 border border-neutral-800 rounded-lg w-full px-3 text-primary placeholder-neutral-500 focus:outline-none focus:border-emerald-500';
  const cat = value?.categoria || null;

  const applyCat = (newCat) => {
    // Al cambiar de categoría, reseteamos el detalle específico pero mantenemos
    // la categoría. `textoDinamico` se recalcula recién al escribir/elegir.
    onChange({ categoria: newCat, textoDinamico: '', detalle: {} });
  };

  const setDetalle = (patch) => {
    const next = { ...(value || {}), detalle: { ...(value?.detalle || {}), ...patch } };
    // Recalcular textoDinamico según la categoría y el detalle actualizado.
    next.textoDinamico = buildTextoRefRecompensa(next);
    onChange(next);
  };

  return (
    <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-3.5 space-y-2.5">
      <div>
        <p className="text-sm font-semibold text-primary">{title}</p>
        {subtitle && <p className="text-[11px] text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {REF_CATEGORIAS.map(c => {
          const active = cat === c.key;
          return (
            <button
              key={c.key} type="button"
              onClick={() => applyCat(c.key)}
              className={`flex items-center justify-center gap-1 h-10 text-xs rounded-lg border transition-all ${
                active
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-primary font-semibold'
                  : 'bg-neutral-900/70 border-neutral-800 text-neutral-400 hover:text-primary'
              }`}
            >
              <span className="text-sm leading-none">{c.emoji}</span>
              <span className="truncate">{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-form dinámico */}
      {cat === 'SELLOS' && (
        <div className="flex items-center gap-2">
          <input
            type="number" min="1" max="20"
            value={value?.detalle?.cantidad ?? ''}
            onChange={e => setDetalle({ cantidad: Math.max(1, Math.min(20, Number(e.target.value) || 0)) })}
            placeholder="1"
            className={inp + ' max-w-[100px]'}
          />
          <span className="text-xs text-neutral-400">sellos</span>
        </div>
      )}

      {cat === 'SERVICIO' && (
        servicios.length > 0 ? (
          <select
            value={value?.detalle?.servicioId || ''}
            onChange={e => {
              const svc = servicios.find(s => s.id === e.target.value);
              setDetalle({ servicioId: svc?.id || '', nombre: svc?.nombre || '' });
            }}
            className={inp}
          >
            <option value="">Selecciona el servicio a regalar…</option>
            {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        ) : (
          <p className="text-xs text-amber-400/80 italic h-9 flex items-center px-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            Cargá al menos un servicio primero.
          </p>
        )
      )}

      {cat === 'PRODUCTO' && (
        productos.length > 0 ? (
          <select
            value={value?.detalle?.productoId || ''}
            onChange={e => {
              const prod = productos.find(p => p.id === e.target.value);
              setDetalle({ productoId: prod?.id || '', nombre: prod?.nombre || '' });
            }}
            className={inp}
          >
            <option value="">Selecciona el producto…</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={value?.detalle?.nombre || ''}
            onChange={e => setDetalle({ nombre: e.target.value, custom: true })}
            placeholder="Sin catálogo — escribe el producto"
            className={inp}
          />
        )
      )}

      {cat === 'DESCUENTO' && (
        <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
          <div className="grid grid-cols-2 p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg h-9">
            {['%', '$'].map(t => (
              <button
                key={t} type="button"
                onClick={() => setDetalle({ tipo: t })}
                className={`text-sm font-bold rounded-md transition-all ${
                  (value?.detalle?.tipo || '%') === t ? 'bg-neutral-800 text-primary' : 'text-neutral-500 hover:text-primary'
                }`}
              >{t}</button>
            ))}
          </div>
          <input
            type="number" min="1"
            value={value?.detalle?.valor ?? ''}
            onChange={e => setDetalle({ valor: Number(e.target.value) || 0 })}
            placeholder={(value?.detalle?.tipo || '%') === '%' ? 'Ej: 20' : 'Ej: 5000'}
            className={inp}
          />
          <select
            value={value?.detalle?.aplicaA || 'SERVICIO'}
            onChange={e => setDetalle({ aplicaA: e.target.value })}
            className={inp + ' max-w-[130px]'}
          >
            <option value="SERVICIO">Servicios</option>
            <option value="PRODUCTO">Productos</option>
          </select>
        </div>
      )}

      {cat === 'OTRO' && (
        <input
          type="text" maxLength="80"
          value={value?.detalle?.texto || ''}
          onChange={e => setDetalle({ texto: e.target.value })}
          placeholder="Ej: Camiseta oficial, café gratis…"
          className={inp}
        />
      )}

      {/* Preview del texto que se mostrará al cliente */}
      {value?.textoDinamico && (
        <p className="text-[11px] text-emerald-300 bg-emerald-500/5 border border-emerald-500/20 rounded-md px-2.5 py-1.5">
          <span className="opacity-60 mr-1">Se mostrará:</span> {value.textoDinamico}
        </p>
      )}
    </div>
  );
}

/* Genera el textoDinamico según categoría + detalle. Se guarda junto al doc
   para que el dashboard cliente no tenga que replicar la lógica. */
function buildTextoRefRecompensa(rec) {
  if (!rec || !rec.categoria) return '';
  const d = rec.detalle || {};
  switch (rec.categoria) {
    case 'SELLOS':    return d.cantidad ? `${d.cantidad} sello${d.cantidad !== 1 ? 's' : ''} gratis` : '';
    case 'SERVICIO':  return d.nombre ? `${d.nombre} gratis` : '';
    case 'PRODUCTO':  return d.nombre || '';
    case 'DESCUENTO': {
      const v = Number(d.valor) || 0;
      if (!v) return '';
      const val = (d.tipo || '%') === '%' ? `${v}%` : `$${v.toLocaleString('es-CL')}`;
      const ap  = d.aplicaA === 'PRODUCTO' ? 'productos' : 'servicios';
      return `${val} OFF en ${ap}`;
    }
    case 'OTRO':      return d.texto || '';
    default:          return '';
  }
}

/* ─── Duración de turnos: presets + rango válido ─────────────────
 * El intervalo alimenta el generador de slots de la reserva pública
 * (booking.service.js). Un valor 0/NaN/negativo/decimal puede romper
 * la generación (incluso un loop infinito con intervalos negativos),
 * por eso se acota SIEMPRE a un entero dentro de [MIN, MAX].          */
const INTERVALO_PRESETS = [15, 30, 45, 60];
const INTERVALO_MIN = 5;
const INTERVALO_MAX = 240;

// Devuelve un entero válido dentro del rango, o null si es irrecuperable.
function sanitizeIntervalo(raw) {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(INTERVALO_MAX, Math.max(INTERVALO_MIN, n));
}

/* ─── Main component ─────────────────────────────────────────── */
export default function Configuracion() {
  // Catálogos del tenant para poblar los <select> de recompensas de referidos.
  // Silencioso si el tenant aún no cargó productos/servicios: la UI degrada a
  // input libre en esas categorías.
  const { data: productos = [] } = useCollection('productos');
  const { data: servicios = [] } = useCollection('servicios');

  const [form,          setForm]          = useState(DEFAULT_SETTINGS);
  const [intervalo,     setIntervalo]     = useState(30);
  const [customMode,    setCustomMode]    = useState(false); // intervalo personalizado activo
  const [customStr,     setCustomStr]     = useState('');    // valor crudo del input (solo dígitos)
  const [minutosLimite, setMinutosLimite] = useState(0);
  // Anti-spam de reservas (lo lee index.html en el paso 4 del flujo público).
  // cooldown: minutos mínimos entre dos reservas del mismo navegador.
  // maxPorDia: máx reservas en 24h por dispositivo.
  const [reservaCooldownMin, setReservaCooldownMin] = useState(30);
  const [reservaMaxPorDia,   setReservaMaxPorDia]   = useState(3);
  // Toggles y mensaje para el flujo de cancelar/reagendar via /chat con código
  const [chatCancelEnabled,   setChatCancelEnabled]   = useState(true);
  const [chatReagendarEnabled, setChatReagendarEnabled] = useState(true);
  const [politicaMensaje,     setPoliticaMensaje]     = useState('');
  // Reservas en grupo (agenda pública): mismo servicio para N personas a la
  // misma hora, en sillones paralelos. index.html lee configuracion/main.reservasGrupo.
  const [grupoEnabled, setGrupoEnabled] = useState(false);
  const [grupoMax,     setGrupoMax]     = useState(4);
  // Metas financieras — inputs como string para distinguir "" (sin definir,
  // usa el fallback automático en Inicio) de 0 (forzar a 0).
  const [metaMensual,   setMetaMensual]   = useState('');
  const [costoDiario,   setCostoDiario]   = useState('');
  const [loading,       setLoading]       = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [dirty,     setDirty]     = useState(false);
  const [saveErr,   setSaveErr]   = useState('');
  const [showHelp,  setShowHelp]  = useState(false);
  // Navegación por 3 pestañas — mobile-first ultra compacto
  const [tab,       setTab]       = useState('local'); // 'local' | 'horarios' | 'prefs'
  const savedTimer = useRef(null);
  const tenantId = resolveTenantId();

  useEffect(() => {
    Promise.all([
      withTimeout(getDoc(settingsRef()), 10000, 'configuracion/settings'),
      withTimeout(getDoc(confRef()), 10000, 'configuracion/conf'),
    ]).then(([settSnap, confSnap]) => {
      if (settSnap.exists()) {
        const d = settSnap.data();
        setForm({
          nombre:    d.nombre    || '',
          direccion: d.direccion || '',
          telefono:  d.telefono  || '',
          whatsapp:  d.whatsapp  || '',
          instagram: d.instagram || '',
          logo:      d.logo      || '',
          emailAvisos: d.emailAvisos || '',
          horario:   mergeHorario(d.horario),
          features:  mergeFeatures(d.features),
          quienesSomos: { activo: !!(d.quienesSomos && d.quienesSomos.activo), texto: (d.quienesSomos && d.quienesSomos.texto) || '' },
          referralProgram: {
            enabled:     !!(d.referralProgram && d.referralProgram.enabled),
            rewardText:  (d.referralProgram && d.referralProgram.rewardText)  || DEFAULT_SETTINGS.referralProgram.rewardText,
            rewardType:  (d.referralProgram && d.referralProgram.rewardType)  || DEFAULT_SETTINGS.referralProgram.rewardType,
            rewardValue: (d.referralProgram && d.referralProgram.rewardValue != null) ? d.referralProgram.rewardValue : DEFAULT_SETTINGS.referralProgram.rewardValue,
            // Nuevas recompensas estructuradas — pueden venir null si el tenant
            // nunca las configuró (default). El UI las trata como "no elegido".
            recompensaReferidor: (d.referralProgram && d.referralProgram.recompensaReferidor) || null,
            recompensaReferido:  (d.referralProgram && d.referralProgram.recompensaReferido)  || null,
          },
        });
      }
      if (confSnap.exists()) {
        const cd = confSnap.data();
        if (cd.intervaloMinutos != null) {
          // Sanea por si en Firestore quedó un valor inválido de antes.
          const safe = sanitizeIntervalo(cd.intervaloMinutos) ?? 30;
          setIntervalo(safe);
          if (!INTERVALO_PRESETS.includes(safe)) {
            setCustomMode(true);
            setCustomStr(String(safe));
          }
        }
        if (cd.minutosLimiteReagendar !== undefined) setMinutosLimite(cd.minutosLimiteReagendar);
        if (cd.reservaCooldownMin !== undefined) setReservaCooldownMin(Number(cd.reservaCooldownMin) || 0);
        if (cd.reservaMaxPorDia   !== undefined) setReservaMaxPorDia(Number(cd.reservaMaxPorDia)   || 0);
        if (cd.chatCancelEnabled !== undefined) setChatCancelEnabled(!!cd.chatCancelEnabled);
        if (cd.chatReagendarEnabled !== undefined) setChatReagendarEnabled(!!cd.chatReagendarEnabled);
        if (cd.reservasGrupo) {
          setGrupoEnabled(cd.reservasGrupo.enabled === true);
          setGrupoMax(Math.max(2, Math.min(6, Number(cd.reservasGrupo.maxPersonas) || 4)));
        }
        if (cd.politicaMensaje !== undefined) setPoliticaMensaje(String(cd.politicaMensaje || ''));
        if (cd.metaMensualVentas != null) setMetaMensual(String(cd.metaMensualVentas));
        if (cd.costoDiarioFijo   != null) setCostoDiario(String(cd.costoDiarioFijo));
      }
    }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const setDia = (d, cfg) => { setForm(f => ({ ...f, horario: { ...f.horario, [d]: cfg } })); setDirty(true); };
  const setFeat      = (k, v) => { setForm(f => ({ ...f, features: { ...f.features, [k]: v } })); setDirty(true); };
  const setFeatCourse = (k, v) => { setForm(f => ({ ...f, features: { ...f.features, courses: { ...f.features.courses, [k]: v } } })); setDirty(true); };
  const setFeatChair  = (k, v) => { setForm(f => ({ ...f, features: { ...f.features, chairRental: { ...f.features.chairRental, [k]: v } } })); setDirty(true); };
  const setQS = (k, v) => { setForm(f => ({ ...f, quienesSomos: { ...f.quienesSomos, [k]: v } })); setDirty(true); };
  const setRef = (k, v) => { setForm(f => ({ ...f, referralProgram: { ...f.referralProgram, [k]: v } })); setDirty(true); };

  /* ── Duración de turnos: selección de preset / personalizado ── */
  const seleccionarPreset = (mins) => { setIntervalo(mins); setCustomMode(false); setDirty(true); };
  const activarCustom = () => { setCustomMode(true); setCustomStr(String(intervalo)); };
  // El input SOLO acepta dígitos (bloquea '-', '.', 'e', letras) y máximo 3 cifras.
  const onCustomChange = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 3);
    setCustomStr(digits);
    const n = parseInt(digits, 10);
    if (Number.isInteger(n) && n >= INTERVALO_MIN && n <= INTERVALO_MAX) { setIntervalo(n); setDirty(true); }
  };
  // Al salir del campo: clampa al rango o revierte al último valor válido.
  const onCustomBlur = () => {
    const safe = sanitizeIntervalo(customStr);
    if (customStr === '' || safe == null) { setCustomStr(String(intervalo)); return; }
    setCustomStr(String(safe));
    setIntervalo(safe);
    setDirty(true);
  };
  const customNum   = parseInt(customStr, 10);
  const customValid = Number.isInteger(customNum) && customNum >= INTERVALO_MIN && customNum <= INTERVALO_MAX;
  const customErr   = customMode && customStr !== '' && !customValid;

  const handleSave = async () => {
    if (saving) return;
    // Blindaje: nunca persistir un intervalo fuera de rango (rompe la reserva pública).
    const intervaloFinal = sanitizeIntervalo(intervalo);
    if (intervaloFinal == null) {
      setSaveErr(`La duración del turno debe ser un número entre ${INTERVALO_MIN} y ${INTERVALO_MAX} minutos.`);
      return;
    }
    setSaving(true);
    setSaveErr('');
    try {
      // Convertir form.horario al formato que usa firebaseUtils / booking.service
      const diasLaborales = [];
      const diasConfig = {};
      let horarioInicio = '09:00';
      let horarioFin    = '20:00';
      let primerDia = true;
      Object.entries(form.horario).forEach(([dia, cfg]) => {
        if (cfg.activo) {
          const n = Number(dia);
          diasLaborales.push(n);
          diasConfig[n] = { inicio: cfg.inicio, fin: cfg.fin };
          if (primerDia) { horarioInicio = cfg.inicio; horarioFin = cfg.fin; primerDia = false; }
        }
      });

      // "" → null para limpiar el campo en Firestore (Inicio lee null como
      // "no definido" y aplica el fallback automático).
      const parsePosInt = (s) => {
        const t = String(s ?? '').trim();
        if (!t) return null;
        const n = Math.round(Number(t));
        return Number.isFinite(n) && n >= 0 ? n : null;
      };

      await Promise.all([
        setDoc(settingsRef(), form, { merge: true }),
        setDoc(confRef(), {
          intervaloMinutos:        intervaloFinal,
          minutosLimiteReagendar:  minutosLimite,
          // Anti-spam de reservas (leído por index.html en el paso 4)
          reservaCooldownMin:      Math.max(0, Math.round(Number(reservaCooldownMin) || 0)),
          reservaMaxPorDia:        Math.max(0, Math.round(Number(reservaMaxPorDia)   || 0)),
          // Toggles del chat (cancelar/reagendar vía código) + mensaje opcional
          chatCancelEnabled:       !!chatCancelEnabled,
          chatReagendarEnabled:    !!chatReagendarEnabled,
          // Reservas en grupo (leído por index.html en el paso 1)
          reservasGrupo: {
            enabled:     !!grupoEnabled,
            maxPersonas: Math.max(2, Math.min(6, Math.round(Number(grupoMax) || 4))),
          },
          politicaMensaje:         String(politicaMensaje || '').trim().slice(0, 500),
          metaMensualVentas:       parsePosInt(metaMensual),
          costoDiarioFijo:         parsePosInt(costoDiario),
          diasLaborales,
          diasConfig,
          horarioInicio,
          horarioFin,
        }, { merge: true }),
      ]);
      setSaved(true);
      setDirty(false);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveErr(e?.message || 'Error al guardar. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div data-view="configuracion" className="max-w-2xl mx-auto pb-8">
      <style>{`
        @keyframes cfgFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .cfg-fade-in { animation: cfgFadeIn 0.18s ease-out; }
      `}</style>

      {/* Header sticky con "Guardar" siempre visible */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 mb-4 bg-slate-950/95 backdrop-blur flex items-center justify-between gap-3 border-b border-slate-800 sm:border-none">
        <h1 className="text-lg sm:text-xl font-bold text-primary flex items-center gap-1.5">
          Configuración
          <HelpButton onClick={() => setShowHelp(true)} />
        </h1>
        <button
          onClick={handleSave}
          disabled={saving || customErr}
          title={customErr ? `Duración entre ${INTERVALO_MIN} y ${INTERVALO_MAX} min.` : undefined}
          className="relative h-9 px-4 text-sm font-semibold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-900/20 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-primary transition-all"
        >
          {saving
            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : saved
              ? <Check size={14} />
              : <Save size={14} />}
          <span>{saved ? 'Guardado' : 'Guardar'}</span>
          {dirty && !saving && !saved && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950" />
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-neutral-900/80 p-1 border border-neutral-800 mb-4">
        {[
          { key: 'local',    label: '🏢 Local' },
          { key: 'horarios', label: '⏰ Horarios' },
          { key: 'prefs',    label: '⚡ Preferencias' },
        ].map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 h-9 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                active
                  ? 'bg-neutral-800 text-primary shadow-sm'
                  : 'text-neutral-400 hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Error banner */}
      {saveErr && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-950/50 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle size={15} className="shrink-0" />
          <span className="flex-1">{saveErr}</span>
          <button onClick={() => setSaveErr('')} className="text-red-400/50 hover:text-red-400 transition-colors">
            <Check size={13} />
          </button>
        </div>
      )}

      {/* ═══ TAB 1 · LOCAL ═══ */}
      {tab === 'local' && (
      <div className="cfg-fade-in space-y-4 sm:space-y-6" key="local">
      {/* Información + Contacto — una sola tarjeta limpia */}
      <Card Icon={Store} title="Datos del local">
        <Field label="Nombre del local">
          <input className={inp} placeholder="Nombre público de tu barbería" value={form.nombre}
            onChange={e => set('nombre', e.target.value)} />
        </Field>
        <Field label="Dirección">
          <input className={inp} placeholder="Calle, número, ciudad" value={form.direccion}
            onChange={e => set('direccion', e.target.value)} />
        </Field>
        {/* Tel + WhatsApp en la misma fila (mobile-first) */}
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Teléfono">
            <input className={inp} inputMode="tel" placeholder="+56 2 1234 5678" value={form.telefono}
              onChange={e => set('telefono', e.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <input className={inp} inputMode="tel" placeholder="+56 9 8765 4321" value={form.whatsapp}
              onChange={e => set('whatsapp', e.target.value)} />
          </Field>
        </div>
        <Field label="Instagram">
          <div className="relative">
            <Instagram size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={`${inp} pl-9`} placeholder="@tu_handle" value={form.instagram}
              onChange={e => set('instagram', e.target.value)} />
          </div>
        </Field>
        <Field label="Logo (URL)">
          <div className="flex gap-3 items-start">
            {form.logo ? (
              <img src={form.logo} alt="logo" className="w-12 h-12 rounded-lg object-contain bg-slate-800 border border-slate-700 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <Image size={18} className="text-slate-600" />
              </div>
            )}
            <input className={inp} placeholder="https://..." value={form.logo}
              onChange={e => set('logo', e.target.value)} />
          </div>
        </Field>
      </Card>

      </div>
      )}

      {/* ═══ TAB 2 · HORARIOS ═══ */}
      {tab === 'horarios' && (
      <div className="cfg-fade-in space-y-4 sm:space-y-6" key="horarios">
      {/* Horario de Atención */}
      <Card Icon={Clock} title="Horario de Atención">
        <p className="text-xs text-slate-500 -mt-1">Referencia informativa del local. La disponibilidad real de reservas la controlan los horarios individuales de cada barbero en <strong className="text-slate-400">Equipo</strong>.</p>
        <div className="mt-2">
          {DIAS_ORDER.map(d => (
            <DayRow key={d} diaKey={d} config={form.horario[d]} onChange={cfg => setDia(d, cfg)} />
          ))}
        </div>
      </Card>

      {/* Duración de Turnos — 4 pills (15/30/45/60) + Personalizado */}
      <Card Icon={Clock} title="Duración de Turnos">
        <p className="text-xs text-slate-500 -mt-1">
          Intervalo entre horas disponibles en la agenda pública de reservas.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2">
          {INTERVALO_PRESETS.map(mins => {
            const active = !customMode && intervalo === mins;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => seleccionarPreset(mins)}
                className={`h-11 rounded-lg text-sm font-semibold transition-all border ${
                  active
                    ? 'border-emerald-500 bg-emerald-500/12 text-emerald-300 shadow-[0_2px_10px_rgba(16,185,129,0.18)]'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-primary hover:border-neutral-500'
                }`}
              >
                {mins} min
              </button>
            );
          })}
          <button
            type="button"
            onClick={activarCustom}
            className={`h-11 rounded-lg text-sm font-semibold transition-all border col-span-3 sm:col-span-1 ${
              customMode
                ? 'border-emerald-500 bg-emerald-500/12 text-emerald-300 shadow-[0_2px_10px_rgba(16,185,129,0.18)]'
                : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-primary hover:border-neutral-500'
            }`}
          >
            Personalizado
          </button>
        </div>

        {/* Input visible solo cuando el modo personalizado está activo */}
        {customMode && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={customStr}
                onChange={e => onCustomChange(e.target.value)}
                onBlur={onCustomBlur}
                placeholder="ej. 20"
                className={`w-32 h-11 rounded-lg border bg-neutral-900 text-primary text-sm font-semibold text-center focus:outline-none transition-colors ${
                  customErr
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-neutral-700 focus:border-emerald-500'
                }`}
              />
              <span className="text-sm text-neutral-400">minutos</span>
            </div>
            {customErr && (
              <p className="text-[11px] text-rose-400 mt-1">
                Debe ser un número entre {INTERVALO_MIN} y {INTERVALO_MAX}.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Política de Cancelación y Reagendamiento */}
      <Card Icon={Ban} title="Política de Cancelación y Reagendamiento">
        <p className="text-xs text-slate-500 -mt-1">
          Reglas que aplican cuando un cliente intenta cancelar o reagendar
          su cita desde el chat público (con su código). El sistema valida
          automáticamente: si el cliente intenta hacerlo fuera de la ventana,
          el bot rechaza la acción y le pide contactar humano.
        </p>

        {/* Tiempo mínimo de anticipación */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Anticipación mínima
          </label>
          <p className="text-[11px] text-slate-500 mb-2.5">
            Tiempo entre AHORA y la cita para que el cliente pueda cancelar/reagendar.
            <strong className="text-slate-400"> Sin límite</strong> permite hacerlo en cualquier momento.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[[0,'Sin límite'],[60,'1 hora'],[120,'2 horas'],[240,'4 horas'],[360,'6 horas'],[480,'8 horas'],[720,'12 horas'],[1440,'24 horas']].map(([mins, label]) => (
              <button
                key={mins}
                type="button"
                onClick={() => { setMinutosLimite(mins); setDirty(true); }}
                className={`flex flex-col items-center py-2.5 px-2 rounded-lg border transition-all ${
                  minutosLimite === mins
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600'
                }`}
              >
                <span className="text-sm font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles para chat */}
        <div className="space-y-2 pt-4 mt-4 border-t border-slate-800">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Acciones permitidas en el chat
          </p>

          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-slate-700/50 bg-slate-800/30">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">Permitir cancelar</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Si está apagado, el bot dice "para cancelar contactanos" en vez de cancelar la cita.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setChatCancelEnabled(v => !v); setDirty(true); }}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${chatCancelEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
              aria-pressed={chatCancelEnabled}
            >
              <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${chatCancelEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-slate-700/50 bg-slate-800/30">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">Permitir reagendar</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Si está apagado, el bot no ofrece el botón "Reagendar" — solo cancelar (si está activo).
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setChatReagendarEnabled(v => !v); setDirty(true); }}
              className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${chatReagendarEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
              aria-pressed={chatReagendarEnabled}
            >
              <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${chatReagendarEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Mensaje informativo opcional */}
        <div className="pt-4 mt-4 border-t border-slate-800">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Mensaje informativo (opcional)
          </label>
          <p className="text-[11px] text-slate-500 mb-2">
            Se muestra al cliente junto con su cita en el chat. Útil para aclarar
            términos (ej. "Las cancelaciones con menos de 2h pueden tener cargo").
          </p>
          <textarea
            value={politicaMensaje}
            onChange={e => { setPoliticaMensaje(e.target.value.slice(0, 500)); setDirty(true); }}
            rows={3}
            placeholder="Ej: Las cancelaciones con menos de 2 horas de anticipación tienen un cargo de $5.000…"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
          <p className="text-[10.5px] text-slate-600 mt-1 text-right">
            {politicaMensaje.length}/500
          </p>
        </div>
      </Card>

      {/* Reservas en grupo en la agenda pública */}
      <Card Icon={Users} title="Reservas en grupo">
        <p className="text-xs text-slate-500 -mt-1 mb-3 leading-relaxed">
          Permite que un cliente reserve para <strong className="text-slate-300">varias personas a la vez</strong> desde
          tu agenda pública: el mismo servicio para todos, atendidos a la misma hora en sillones distintos.
          Los profesionales se asignan automáticamente entre los que estén libres.
        </p>

        <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">Activar reservas en grupo</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Requiere al menos 2 profesionales activos; con menos, el selector no se muestra.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setGrupoEnabled(v => !v); setDirty(true); }}
            className={`relative inline-flex w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${grupoEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
            aria-pressed={grupoEnabled}
          >
            <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${grupoEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {grupoEnabled && (
          <div className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Máximo de personas por reserva</p>
            <div className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setGrupoMax(n); setDirty(true); }}
                  className={`py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                    grupoMax === n
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              💡 El tope real nunca supera la cantidad de profesionales disponibles ese día.
              Las sesiones de pack y los cupos VIP no aplican en reservas grupales.
            </p>
          </div>
        )}
      </Card>

      {/* Anti-spam de reservas en la agenda pública */}
      <Card Icon={Ban} title="Anti-spam de reservas">
        <p className="text-xs text-slate-500 -mt-1">
          Limita cuántas reservas puede hacer el <strong className="text-slate-300">mismo
          dispositivo</strong> en tu agenda pública. Evita que un cliente (o un bot)
          cree muchas reservas seguidas. Es una protección a nivel de navegador
          (localStorage); no bloquea distintos celulares o pestañas incógnitas.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Cooldown entre reservas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Cooldown entre reservas
            </label>
            <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
              Minutos mínimos entre dos reservas seguidas.
              <strong className="text-slate-400"> 0</strong> = sin cooldown.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[[0, 'Sin'], [15, '15 min'], [30, '30 min'], [60, '1 h'], [120, '2 h'], [240, '4 h']].map(([mins, label]) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => { setReservaCooldownMin(mins); setDirty(true); }}
                  className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
                    Number(reservaCooldownMin) === mins
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Máximo de reservas en 24h */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Máx. reservas en 24 h
            </label>
            <p className="text-[11px] text-slate-500 mb-2.5 leading-relaxed">
              Tope de reservas por dispositivo en un día.
              <strong className="text-slate-400"> 0</strong> = sin tope.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 5, 10].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setReservaMaxPorDia(n); setDirty(true); }}
                  className={`py-2 px-2 rounded-lg border text-xs font-semibold transition-all ${
                    Number(reservaMaxPorDia) === n
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-700 text-slate-400 hover:text-primary hover:border-slate-600'
                  }`}
                >{n === 0 ? 'Sin tope' : n}</button>
              ))}
            </div>
          </div>
        </div>

      </Card>

      </div>
      )}

      {/* ═══ TAB 3 · PREFERENCIAS ═══ */}
      {tab === 'prefs' && (
      <div className="cfg-fade-in space-y-4 sm:space-y-6" key="prefs">
      {/* Servicios Extra — Cursos/Arriendo solo Chameleon · Academia solo Elegance */}
      {(tenantId === 'chameleon' || tenantId === 'elegance') && (
      <Card Icon={GraduationCap} title="Servicios Extra">
        {tenantId === 'chameleon' && (<>
        <p className="text-xs text-slate-500 -mt-1">
          Agrega secciones informativas con botón de WhatsApp en tu página pública.
        </p>

        {/* Cursos */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <GraduationCap size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-primary">Cursos de Barbería</span>
            </div>
            <button type="button" onClick={() => setFeat('hasCourses', !form.features.hasCourses)}
              className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${form.features.hasCourses ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.features.hasCourses ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {form.features.hasCourses && (
            <div className="px-4 py-4 space-y-3 border-t border-slate-700/50">
              <Field label="Título">
                <input className={inp} value={form.features.courses.title}
                  onChange={e => setFeatCourse('title', e.target.value)} />
              </Field>
              <Field label="Descripción">
                <textarea className={`${inp} resize-none`} rows={2} value={form.features.courses.description}
                  onChange={e => setFeatCourse('description', e.target.value)} />
              </Field>
              <Field label="Mensaje de WhatsApp">
                <input className={inp} placeholder="Hola, quiero información sobre los cursos…"
                  value={form.features.courses.ctaMsg}
                  onChange={e => setFeatCourse('ctaMsg', e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        {/* Arriendo de Sillones */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <Scissors size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-primary">Arriendo de Sillones</span>
            </div>
            <button type="button" onClick={() => setFeat('hasChairRental', !form.features.hasChairRental)}
              className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${form.features.hasChairRental ? 'bg-emerald-500' : 'bg-slate-700'}`}>
              <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.features.hasChairRental ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {form.features.hasChairRental && (
            <div className="px-4 py-4 space-y-3 border-t border-slate-700/50">
              <Field label="Título">
                <input className={inp} value={form.features.chairRental.title}
                  onChange={e => setFeatChair('title', e.target.value)} />
              </Field>
              <Field label="Descripción">
                <textarea className={`${inp} resize-none`} rows={2} value={form.features.chairRental.description}
                  onChange={e => setFeatChair('description', e.target.value)} />
              </Field>
              <Field label="Mensaje de WhatsApp">
                <input className={inp} placeholder="Hola, me interesa el arriendo de un sillón…"
                  value={form.features.chairRental.ctaMsg}
                  onChange={e => setFeatChair('ctaMsg', e.target.value)} />
              </Field>
            </div>
          )}
        </div>
        </>)}

        {/* Módulo Academia Interno (Solo Elegance) */}
        {tenantId === 'elegance' && (
          <div className="border border-slate-700/50 rounded-lg overflow-hidden mt-4">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <GraduationCap size={15} className="text-slate-400" />
                <span className="text-sm font-semibold text-primary">Módulo Academia (Panel Interno)</span>
              </div>
              <button type="button" onClick={() => setFeat('hasAcademiaInternal', !form.features.hasAcademiaInternal)}
                className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${form.features.hasAcademiaInternal ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.features.hasAcademiaInternal ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {form.features.hasAcademiaInternal && (
              <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900">
                <p className="text-xs text-slate-500">
                  El módulo <strong>Academia</strong> se activará en el menú lateral izquierdo para que puedas administrar cursos, alumnos y material de estudio de forma interna.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
      )}

      {/* Multi-servicio en la reserva pública */}
      <Card Icon={Layers} title="Selección de varios servicios por reserva">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-primary">Permitir agendar más de un servicio</span>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Activa la selección múltiple en la agenda pública. El cliente puede marcar varios servicios y la
              cita queda con todos sumados: el nombre se concatena (<code>Corte + Barba</code>),
              la duración se suma y el precio total también.
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Filtra los barberos compatibles haciendo la <strong className="text-slate-300">intersección</strong> entre los servicios elegidos.
            </p>
          </div>
          <button type="button" onClick={() => setFeat('hasMultiServiceSelect', !form.features.hasMultiServiceSelect)}
            className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${form.features.hasMultiServiceSelect ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.features.hasMultiServiceSelect ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </Card>

      {/* Quiénes somos */}
      <Card Icon={Info} title="Quiénes somos">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-primary">Mostrar en la agenda pública</span>
            <p className="text-xs text-slate-500 mt-0.5">Agrega un botón “Quiénes somos” que muestra este texto a tus clientes.</p>
          </div>
          <button type="button" onClick={() => setQS('activo', !form.quienesSomos.activo)}
            className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${form.quienesSomos.activo ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.quienesSomos.activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {form.quienesSomos.activo && (
          <Field label="Texto">
            <textarea className={`${inp} resize-none`} rows={6}
              placeholder="Cuenta la historia de tu local, qué los hace únicos, su equipo, su experiencia…"
              value={form.quienesSomos.texto} onChange={e => setQS('texto', e.target.value)} />
          </Field>
        )}
      </Card>

      {/* Programa de Referidos — boca a boca autogestionable */}
      <Card Icon={Sparkles} title="🎁 Programa de Referidos (Boca a Boca)">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-primary">Activar programa de referidos</span>
            <p className="text-xs text-slate-500 mt-0.5">
              Convierte a tus clientes en promotores: cada uno recibe un código para invitar amigos, y cuando el amigo completa su primer corte, premias a los dos automáticamente.
            </p>
          </div>
          <button type="button" onClick={() => setRef('enabled', !form.referralProgram.enabled)}
            className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${form.referralProgram.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <span className={`inline-block w-4 h-4 mt-0.5 bg-white rounded-full shadow transform transition-transform duration-200 ${form.referralProgram.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {form.referralProgram.enabled && (
          <div className="space-y-3 mt-4">
            <ReferralComoFunciona />

            <RecompensaEstructurada
              title="🎁 Recompensa para el REFERIDOR"
              subtitle="Lo que gana tu cliente cada vez que un amigo suyo se une y completa su primer corte."
              value={form.referralProgram.recompensaReferidor}
              onChange={v => setRef('recompensaReferidor', v)}
              productos={productos}
              servicios={servicios}
            />
            <RecompensaEstructurada
              title="🙋 Recompensa para el REFERIDO (el amigo nuevo)"
              subtitle="El regalo de bienvenida para quien se registra con el código. Un buen gancho para que acepten la invitación."
              value={form.referralProgram.recompensaReferido}
              onChange={v => setRef('recompensaReferido', v)}
              productos={productos}
              servicios={servicios}
            />

            <ReferralSystemPreview
              nombreLocal={form.nombre}
              referidor={form.referralProgram.recompensaReferidor}
              referido={form.referralProgram.recompensaReferido}
            />

            {/* Texto libre del banner — SOLO fallback. Con recompensas
                estructuradas arriba, la tarjeta del cliente usa esas y este
                texto se ignora (evita el desfase "config dice 3, cliente ve 1"). */}
            <details className="pt-1">
              <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-300">
                Texto personalizado del banner (avanzado — opcional)
              </summary>
              <div className="mt-2">
                <textarea className={`${inp} resize-none`} rows={2}
                  placeholder="Ej: Invita amigos y ambos ganan recompensas."
                  value={form.referralProgram.rewardText}
                  onChange={e => setRef('rewardText', e.target.value)} />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Solo se usa como <b>respaldo</b> si arriba no elegiste ninguna recompensa. Si configuraste “Sellos gratis” (u otra), la tarjeta del cliente muestra esa y este texto se ignora.
                </p>
              </div>
            </details>
          </div>
        )}
      </Card>

      {/* Metas financieras — alimentan la card "Meta del mes" + "Break-even" en Inicio */}
      <Card Icon={Target} title="Metas financieras">
        <Field label="Meta mensual de ventas (CLP)">
          <input
            type="text" inputMode="numeric" className={inp}
            placeholder="Ej: 3500000"
            value={metaMensual}
            onChange={e => {
              setMetaMensual(e.target.value.replace(/\D/g, ''));
              setDirty(true);
            }}
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Lo que apuntas a facturar al mes. Aparece como gauge con proyección de cierre en Inicio. Vacío = sin meta.
          </p>
        </Field>
        <Field label="Costo fijo diario (CLP)">
          <input
            type="text" inputMode="numeric" className={inp}
            placeholder="Ej: 60000 (vacío = automático)"
            value={costoDiario}
            onChange={e => {
              setCostoDiario(e.target.value.replace(/\D/g, ''));
              setDirty(true);
            }}
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Cuánto necesitas facturar al día para cubrir gastos fijos (arriendo, sueldos base, servicios). Si lo dejas vacío, se calcula automáticamente con los gastos del mes anterior ÷ 30.
          </p>
        </Field>
      </Card>

      {/* Preferencias del panel — locales al dispositivo */}
      {/* Correo oficial del local para avisos del sistema. Separado del correo
          de login de cada administrador (ese no se toca desde aquí). */}
      <Card Icon={Mail} title="Correo para avisos">
        <Field label="Correo oficial del local">
          <input
            className={inp}
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="correo@dellocal.cl"
            value={form.emailAvisos}
            onChange={e => set('emailAvisos', e.target.value.trim())}
          />
        </Field>
        <p className="text-xs text-slate-500 leading-relaxed">
          Aquí llegan los avisos importantes de tu cuenta, como el vencimiento de tu mensualidad.
          Usa un correo que revises: si no llega el aviso y el pago se atrasa, se bloquean secciones del panel.
        </p>
        <p className="text-[10px] text-slate-600 leading-relaxed">
          No es el correo con el que inicias sesión. Cambiarlo aquí no afecta el acceso de nadie al panel.
        </p>
        {form.emailAvisos && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailAvisos) && (
          <p className="text-[11px] text-amber-400">Revisa el formato del correo.</p>
        )}
      </Card>

      <NotificacionesToggleCard />

      <DailyWelcomeToggleCard />

      {/* Soporte Técnico */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0d0d0d 0%, #111 100%)',
          border: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 0 40px rgba(212,175,55,0.04)',
        }}
      >
        <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.12)', background: 'rgba(212,175,55,0.04)' }}>
          <HelpCircle size={15} style={{ color: '#D4AF37' }} className="shrink-0" />
          <h2 className="text-sm font-semibold text-primary">Soporte Técnico</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="flex items-start gap-4">
            <img src="/logo1.png" alt="SynapTech" className="w-10 h-10 rounded-xl object-contain shrink-0" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', padding: '6px' }} />
            <div>
              <p className="text-primary font-semibold text-sm">SynapTech SpA</p>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                ¿Tienes dudas o necesitas ayuda? Nuestro equipo de soporte está disponible para asistirte con la plataforma.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href="https://wa.me/56983568212?text=Hola%20SynapTech%2C%20necesito%20soporte%20con%20mi%20panel%20de%20barber%C3%ADa"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: '#25D366', color: '#fff' }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a
              href="mailto:hola@synaptechspa.cl?subject=Soporte%20Panel%20Barber%C3%ADa"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              <HelpCircle size={15} />
              Email
            </a>
          </div>
          <p className="text-center text-xs text-slate-600">
            ⚡ Engineered by{' '}
            <a href="https://www.synaptechspa.cl/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors" style={{ color: 'rgba(212,175,55,0.6)' }}>
              SynapTech SpA
            </a>
            {' '}— software del futuro, hoy.
          </p>
        </div>
      </div>

      </div>
      )}

      {showHelp && (
        <HelpModal title="Ayuda — Configuración" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-primary">Configuración</strong> gestionas la información pública y las reglas de reserva del local.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Actualiza el <span className="text-primary">nombre</span>, dirección, teléfono e Instagram de tu barbería.</li>
            <li>Define el <span className="text-primary">horario de apertura y cierre</span> y los días hábiles del local.</li>
            <li>Configura con cuántos días de <span className="text-primary">anticipación</span> pueden reservar los clientes.</li>
            <li>Guarda los cambios con <span className="text-primary">Guardar cambios</span> — se reflejan en la app pública de inmediato.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
