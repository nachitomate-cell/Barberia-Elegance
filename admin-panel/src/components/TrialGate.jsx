import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { Clock, Check, Sparkles } from 'lucide-react';

/* Trial self-service de 14 días — gate del panel completo.
   · Días 1-10:  nada (acceso libre).
   · Días 11-14: banner discreto con los días restantes + acceso al selector
     de planes (cerrable).
   · Vencido (status 'trial_expired' o trialFinaliza en el pasado): se
     reemplaza el panel por la ventana de selección de plan. La agenda
     pública ya está en pausa suave a nivel edge (middleware).
   Solo aplica a tenants con doc raíz en trial (self-service); los a-medida
   no tienen `status:'trial'` y pasan directo. */

const SUPERADMIN_EMAIL = 'ignaciiio.mate@gmail.com';
const WA_SYNAPTECH = '56983568212';
const BANNER_DESDE_DIAS = 4;   // días 11-14 de un trial de 14

const PLANES = [
  {
    id: 'individual',
    nombre: 'Plan Individual',
    precio: '$29.900',
    para: 'Para un profesional independiente',
    bullets: [
      'Agenda online con reservas ilimitadas',
      'Club de fidelidad con sellos y premios',
      'Panel completo desde el celular',
      '1 profesional en la agenda',
    ],
  },
  {
    id: 'local',
    nombre: 'Plan Local',
    precio: '$49.900',
    para: 'Para locales con equipo',
    destacado: true,
    bullets: [
      'Todo lo del Plan Individual',
      'Equipo ilimitado, cada uno con su agenda',
      'Caja, comisiones y liquidaciones',
      'Métricas del negocio',
    ],
  },
];

export function useTrialEstado() {
  const { id } = useTenant();
  const [estado, setEstado] = useState({ enTrial: false, vencido: false, diasRestantes: null });

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'tenants', id),
      s => {
        if (!s.exists()) { setEstado({ enTrial: false, vencido: false, diasRestantes: null }); return; }
        const d = s.data();
        const finMs = d.trialFinaliza?.toMillis?.() ?? null;
        const vencido = d.status === 'trial_expired' ||
          (d.status === 'trial' && finMs != null && finMs < Date.now());
        const diasRestantes = finMs != null ? Math.max(0, Math.ceil((finMs - Date.now()) / 86400000)) : null;
        setEstado({ enTrial: d.status === 'trial' && !vencido, vencido, diasRestantes });
      },
      () => setEstado({ enTrial: false, vencido: false, diasRestantes: null }),
    );
    return unsub;
  }, [id]);

  return estado;
}

function waActivarHref(plan, tenant) {
  const msg = `Hola, terminó mi prueba gratis en SynapTech y quiero activar el ${plan.nombre} (${plan.precio} CLP/mes) para mi local ${tenant.name} (${tenant.id}).`;
  return `https://wa.me/${WA_SYNAPTECH}?text=${encodeURIComponent(msg)}`;
}

function PlanCard({ plan, tenant }) {
  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 text-left ${
      plan.destacado
        ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]'
        : 'border-neutral-800 bg-neutral-900/50'
    }`}>
      {plan.destacado && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-ink-950 text-[11px] font-bold whitespace-nowrap">
          <Sparkles size={11} /> Recomendado
        </span>
      )}
      <p className="text-sm font-semibold text-neutral-400">{plan.para}</p>
      <h3 className="text-lg font-bold text-primary mt-1">{plan.nombre}</h3>
      <p className="mt-3 mb-5">
        <span className="text-3xl font-extrabold text-primary">{plan.precio}</span>
        <span className="text-sm text-neutral-400 font-medium"> CLP/mes</span>
      </p>
      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.bullets.map(b => (
          <li key={b} className="flex items-start gap-2 text-sm text-neutral-300">
            <Check size={15} className={`mt-0.5 shrink-0 ${plan.destacado ? 'text-emerald-400' : 'text-neutral-500'}`} />
            {b}
          </li>
        ))}
      </ul>
      <a
        href={waActivarHref(plan, tenant)}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full text-center font-bold rounded-xl py-3 text-sm transition-all active:scale-[0.98] ${
          plan.destacado
            ? 'bg-emerald-500 hover:bg-emerald-400 text-ink-950'
            : 'bg-neutral-800 hover:bg-neutral-700 text-primary border border-neutral-700'
        }`}
      >
        Activar este plan
      </a>
    </div>
  );
}

function SelectorPlanes({ tenant, titulo, subtitulo, onCerrar }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-[#050505]/95 backdrop-blur-sm">
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
            <Clock size={26} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight mb-2">{titulo}</h1>
          <p className="text-sm text-neutral-400 leading-relaxed mb-8 max-w-md mx-auto">{subtitulo}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 text-left">
            {PLANES.map(p => <PlanCard key={p.id} plan={p} tenant={tenant} />)}
          </div>

          <p className="text-xs text-neutral-500 mt-7 leading-relaxed">
            Al activar un plan tu agenda vuelve a recibir reservas al instante.
            Tus datos, clientes y configuración están intactos.
          </p>
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
  const { enTrial, vencido, diasRestantes } = useTrialEstado();
  const [verPlanes, setVerPlanes] = useState(false);

  const esSuperadmin = (user?.email || '').toLowerCase() === SUPERADMIN_EMAIL;

  // Trial vencido → el panel completo se reemplaza por la selección de plan.
  // El superadmin nunca queda fuera (necesita entrar a reactivar/soportar).
  if (vencido && !esSuperadmin) {
    return (
      <SelectorPlanes
        tenant={tenant}
        titulo="Tu prueba gratuita terminó"
        subtitulo={`La agenda de ${tenant.name} está en pausa y tus clientes no pueden reservar. Activa tu plan para reanudarla al instante — no se borró nada.`}
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
        />
      )}
      {children}
    </>
  );
}
