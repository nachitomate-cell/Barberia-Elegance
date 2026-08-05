import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Check, Sparkles, CreditCard, Loader2, MessageCircle, Gift } from 'lucide-react';

/* Trial self-service de 14 días — gate del panel completo.
   · Días 1-10:  nada (acceso libre).
   · Días 11-14: banner discreto con los días restantes + acceso al selector
     de planes (cerrable).
   · Vencido (status 'trial_expired' o trialFinaliza en el pasado): se
     reemplaza el panel por la ventana de selección de plan. La agenda
     pública ya está en pausa suave a nivel edge (middleware).
   Solo aplica a tenants con doc raíz en trial (self-service); los a-medida
   no tienen `status:'trial'` y pasan directo.

   Flujo de pago (2026-08):
   · CTA principal = Mercado Pago suscripción recurrente automática
     (mpMensualidadCrearLink → preapproval_plan → checkout MP → webhook
     activa tenant sin intervención manual). El dueño ingresa tarjeta una
     vez y MP cobra solo cada mes.
   · CTA secundario = WhatsApp a Ignacio (fallback si el flujo MP falla o
     el dueño prefiere otro medio: transferencia, efectivo).
*/

const SUPERADMIN_EMAIL = 'ignaciiio.mate@gmail.com';
const WA_SYNAPTECH = '56983568212';
const BANNER_DESDE_DIAS = 4;   // días 11-14 de un trial de 14
const REGION = 'us-central1';

const PLANES = [
  {
    id: 'basico',
    nombre: 'Plan Básico',
    precio: '$29.900',
    para: 'Para partir sin complicaciones',
    bullets: [
      'Agenda online con reservas ilimitadas',
      'Club de fidelidad con sellos y premios',
      'Panel completo desde el celular',
      'Un profesional en la agenda',
    ],
  },
  {
    id: 'pro',
    nombre: 'Plan Pro',
    precio: '$49.900',
    para: 'Con IA + Wallet · lo que usan los mejores',
    destacado: true,
    badge: 'IA + Wallet',
    bullets: [
      'Todo lo del Básico + equipo ilimitado',
      'Bot de WhatsApp con IA 24/7',
      'Google & Apple Wallet para tus clientes',
      'Caja, comisiones y métricas del negocio',
    ],
  },
  {
    id: 'anual',
    nombre: 'Plan Anual',
    precio: '$399.000',
    para: 'Ahorra 3 meses · un pago al año',
    ahorro: 'Equivale a 9 meses de Pro',
    bullets: [
      'Todo lo del Pro incluido',
      'Un solo pago, cero recordatorios',
      'Ahorras vs. pagar mes a mes',
      'Ideal para locales establecidos',
    ],
  },
];

export function useTrialEstado() {
  const { id } = useTenant();
  const [estado, setEstado] = useState({ enTrial: false, vencido: false, diasRestantes: null, extensionesUsadas: 0 });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'tenants', id),
      s => {
        if (!s.exists()) { setEstado({ enTrial: false, vencido: false, diasRestantes: null, extensionesUsadas: 0 }); return; }
        const d = s.data();
        const finMs = d.trialFinaliza?.toMillis?.() ?? null;
        const vencido = d.status === 'trial_expired' ||
          (d.status === 'trial' && finMs != null && finMs < Date.now());
        const diasRestantes = finMs != null ? Math.max(0, Math.ceil((finMs - Date.now()) / 86400000)) : null;
        setEstado({
          enTrial: d.status === 'trial' && !vencido,
          vencido,
          diasRestantes,
          extensionesUsadas: Number(d.trialExtensionesUsadas || 0),
        });
      },
      () => setEstado({ enTrial: false, vencido: false, diasRestantes: null, extensionesUsadas: 0 }),
    );
    return unsub;
  }, [id]);

  return estado;
}

/* Regalo "+14 días" en el TrialGate: aparece solo cuando quedan ≤2 días de
   trial (o ya venció) Y el tenant nunca ha extendido. Filtra a los verdaderos
   indecisos sin retrasar el pago de los que ya iban a pagar.
   La extensión se aplica al toque (auto-aprobada, sin depender de Ignacio).
   Motivo es opcional pero recomendado — lo usamos para iterar el onboarding. */
function BotonExtenderTrial({ tenant, sePuede }) {
  const [abierto, setAbierto]   = useState(false);
  const [motivo, setMotivo]     = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');
  const [listo, setListo]       = useState(false);

  if (!sePuede) return null;

  async function extender() {
    setCargando(true);
    setError('');
    try {
      const fn = httpsCallable(getFunctions(getApp(), REGION), 'solicitarExtensionTrial');
      const res = await fn({ tenantId: tenant.id, motivo });
      const dias = res?.data?.diasExtendidos || 14;
      setListo(true);
      // El onSnapshot del hook se encarga de refrescar la UI automáticamente.
      setTimeout(() => { setAbierto(false); setListo(false); setMotivo(''); }, 3000);
      // Aviso visible extra por si el snapshot tarda
      console.info(`[trial] extensión aplicada +${dias}d`);
    } catch (e) {
      setError(String(e?.message || 'No pudimos extender el trial.').replace(/^FirebaseError: /, ''));
    } finally {
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <div className="mt-4 mx-auto max-w-md bg-emerald-500/[0.08] border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-200 text-sm font-semibold flex items-center gap-2 justify-center">
        <Gift size={16} className="text-emerald-400" /> ¡Listo! Tienes 14 días más de prueba gratis.
      </div>
    );
  }

  if (!abierto) {
    return (
      <div className="mt-5 text-center">
        <button
          onClick={() => setAbierto(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-purple-200 hover:text-white bg-purple-500/[0.08] hover:bg-purple-500/15 border border-purple-500/30 rounded-xl px-4 py-2.5 transition-colors"
        >
          <Gift size={14} /> ¿Necesitas más tiempo? Te regalamos 14 días extra
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 mx-auto max-w-md bg-neutral-900/60 border border-purple-500/30 rounded-2xl p-5 text-left">
      <div className="flex items-start gap-3 mb-3">
        <Gift size={20} className="text-purple-300 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-white">+14 días extra, gratis</p>
          <p className="text-[12.5px] text-neutral-400 mt-1 leading-relaxed">Los usamos para que termines de ver si te sirve. Opcional: cuéntanos qué te faltó decidir — nos ayuda a mejorar.</p>
        </div>
      </div>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value.slice(0, 300))}
        rows={2}
        placeholder="Ej: no alcancé a subir mis fotos, quiero probar con clientes reales primero…"
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-purple-500/50 resize-none"
      />
      {error && (
        <p className="mt-2 text-[11.5px] text-rose-400 leading-snug">{error}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => { setAbierto(false); setMotivo(''); setError(''); }}
          className="flex-1 text-xs font-semibold text-neutral-400 hover:text-neutral-200 py-2 rounded-lg border border-neutral-800"
        >
          Ahora no
        </button>
        <button
          onClick={extender}
          disabled={cargando}
          className="flex-[2] flex items-center justify-center gap-2 text-sm font-bold text-ink-950 bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-300 hover:to-purple-400 py-2.5 rounded-lg disabled:opacity-60 disabled:cursor-wait"
        >
          {cargando ? <><Loader2 size={14} className="animate-spin" /> Extendiendo…</> : <><Gift size={14} /> Sí, dame 14 días más</>}
        </button>
      </div>
      <p className="mt-3 text-[10.5px] text-neutral-500 leading-relaxed text-center">Solo una vez por local. Después de esta extensión, si necesitas más, hablamos por WhatsApp.</p>
    </div>
  );
}

function waActivarHref(plan, tenant) {
  const sufijoPrecio = plan.id === 'anual' ? 'CLP/año' : 'CLP/mes';
  const msg = `Hola, terminó mi prueba gratis en SynapTech y quiero activar el ${plan.nombre} (${plan.precio} ${sufijoPrecio}) para mi local ${tenant.name} (${tenant.id}) por otro medio de pago.`;
  return `https://wa.me/${WA_SYNAPTECH}?text=${encodeURIComponent(msg)}`;
}

function PlanCard({ plan, tenant }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState('');

  async function pagarConMP() {
    setCargando(true);
    setError('');
    try {
      const fn = httpsCallable(getFunctions(getApp(), REGION), 'mpMensualidadCrearLink');
      const res = await fn({
        tenantId: tenant.id,
        plan:     plan.id,
        origen:   window.location.origin,
      });
      const url = res?.data?.url;
      if (!url) throw new Error('No pudimos crear el link de pago. Intenta de nuevo.');
      // Redirige al checkout de MP en la misma pestaña — al volver, el
      // webhook ya habrá activado el tenant y TrialGate se desmonta solo.
      window.location.assign(url);
    } catch (e) {
      setCargando(false);
      const msg = String(e?.message || e || '').replace(/^FirebaseError: /, '');
      setError(msg || 'Algo falló. Escríbenos por WhatsApp para ayudarte.');
    }
  }

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 text-left ${
      plan.destacado
        ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]'
        : 'border-neutral-800 bg-neutral-900/50'
    }`}>
      {plan.destacado && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-ink-950 text-[11px] font-bold whitespace-nowrap">
          <Sparkles size={11} /> {plan.badge || 'Recomendado'}
        </span>
      )}
      {plan.id === 'anual' && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-ink-950 text-[11px] font-bold whitespace-nowrap">
          🔥 Ahorras 3 meses
        </span>
      )}
      <p className="text-sm font-semibold text-neutral-400">{plan.para}</p>
      <h3 className="text-lg font-bold text-primary mt-1">{plan.nombre}</h3>
      <p className="mt-3 mb-5">
        <span className="text-3xl font-extrabold text-primary">{plan.precio}</span>
        <span className="text-sm text-neutral-400 font-medium"> CLP/{plan.id === 'anual' ? 'año' : 'mes'}</span>
        {plan.ahorro && <span className="block text-xs text-amber-300 font-semibold mt-1">{plan.ahorro}</span>}
      </p>
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.bullets.map(b => (
          <li key={b} className="flex items-start gap-2 text-sm text-neutral-300">
            <Check size={15} className={`mt-0.5 shrink-0 ${plan.destacado ? 'text-emerald-400' : 'text-neutral-500'}`} />
            {b}
          </li>
        ))}
      </ul>

      <button
        onClick={pagarConMP}
        disabled={cargando}
        className={`w-full flex items-center justify-center gap-2 text-center font-bold rounded-xl py-3 text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait ${
          plan.destacado
            ? 'bg-emerald-500 hover:bg-emerald-400 text-ink-950'
            : plan.id === 'anual'
              ? 'bg-amber-500 hover:bg-amber-400 text-ink-950'
              : 'bg-neutral-800 hover:bg-neutral-700 text-primary border border-neutral-700'
        }`}
      >
        {cargando
          ? <><Loader2 size={15} className="animate-spin" /> Preparando pago…</>
          : <><CreditCard size={15} /> {plan.id === 'anual' ? 'Pagar año completo' : 'Pagar con Mercado Pago'}</>}
      </button>
      <p className="mt-2 text-[11px] text-center text-neutral-500 leading-snug">
        {plan.id === 'anual'
          ? 'Un solo pago de $399.000. Sin renovación automática.'
          : 'Suscripción automática. MP cobra solo cada mes. Cancelas cuando quieras.'}
      </p>

      {error && (
        <p className="mt-2 text-[11px] text-center text-rose-400 leading-snug">{error}</p>
      )}

      <a
        href={waActivarHref(plan, tenant)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <MessageCircle size={12} /> Prefiero pagar por otro medio
      </a>
    </div>
  );
}

function SelectorPlanes({ tenant, titulo, subtitulo, onCerrar, puedeExtender }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-[#050505]/95 backdrop-blur-sm">
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
            <Clock size={26} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight mb-2">{titulo}</h1>
          <p className="text-sm text-neutral-400 leading-relaxed mb-8 max-w-md mx-auto">{subtitulo}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 text-left">
            {PLANES.map(p => <PlanCard key={p.id} plan={p} tenant={tenant} />)}
          </div>

          <p className="text-xs text-neutral-500 mt-7 leading-relaxed">
            Al activar un plan tu agenda vuelve a recibir reservas al instante.
            Tus datos, clientes y configuración están intactos.
          </p>
          <BotonExtenderTrial tenant={tenant} sePuede={puedeExtender} />
          {onCerrar && (
            <button
              onClick={onCerrar}
              className="mt-5 text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Seguir usando mi prueba
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TrialGate({ children }) {
  const tenant = useTenant();
  const { user } = useAuth();
  const { enTrial, vencido, diasRestantes, extensionesUsadas } = useTrialEstado();
  const [verPlanes, setVerPlanes] = useState(false);

  const esSuperadmin = (user?.email || '').toLowerCase() === SUPERADMIN_EMAIL;
  // Regalo +14d disponible cuando quedan ≤2 días de trial (o ya venció) y
  // el tenant nunca ha extendido. Filtra a los verdaderos indecisos sin
  // aplazar el pago de los que ya iban a pagar.
  const puedeExtender = extensionesUsadas === 0 && (vencido || (enTrial && diasRestantes != null && diasRestantes <= 2));

  // Trial vencido → el panel completo se reemplaza por la selección de plan.
  // El superadmin nunca queda fuera (necesita entrar a reactivar/soportar).
  if (vencido && !esSuperadmin) {
    return (
      <SelectorPlanes
        tenant={tenant}
        titulo="Tu prueba gratuita terminó"
        subtitulo={`La agenda de ${tenant.name} está en pausa y tus clientes no pueden reservar. Activa tu plan para reanudarla al instante — no se borró nada.`}
        puedeExtender={puedeExtender}
      />
    );
  }

  const mostrarBanner = enTrial && diasRestantes != null && diasRestantes <= BANNER_DESDE_DIAS;

  return (
    <>
      {mostrarBanner && (
        <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 bg-amber-500/10 border-b border-amber-500/25 text-center">
          <p className="text-xs sm:text-[13px] font-medium text-amber-200">
            Te {diasRestantes === 1 ? 'queda' : 'quedan'} <b>{diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}</b> de
            prueba gratuita. Elige tu plan para continuar recibiendo reservas sin interrupción.
          </p>
          <button
            onClick={() => setVerPlanes(true)}
            className="text-xs font-bold text-amber-300 hover:text-amber-100 underline underline-offset-2 transition-colors"
          >
            Elegir mi plan
          </button>
        </div>
      )}
      {verPlanes && (
        <SelectorPlanes
          tenant={tenant}
          titulo="Elige tu plan"
          subtitulo={`Te ${diasRestantes === 1 ? 'queda' : 'quedan'} ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'} de prueba en ${tenant.name}. Activa tu plan ahora y no te preocupes más.`}
          onCerrar={() => setVerPlanes(false)}
          puedeExtender={puedeExtender}
        />
      )}
      {children}
    </>
  );
}
