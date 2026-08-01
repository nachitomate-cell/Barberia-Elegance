import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Check, Link2, FlaskConical, Power } from 'lucide-react';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { incluyeBot } from '../lib/waPlan';

// Onboarding de 3 pasos — para el local que acaba de contratar el asistente.
//
// Sin esto, el dueño aterriza en una pantalla llena de toggles y no sabe cuál
// tocar primero ni si le falta algo: la reacción típica es no tocar nada y
// esperar a que "alguien lo configure". Los tres pasos son el camino real
// (vincular → probar → encender) y el panel DESAPARECE cuando están los tres:
// un checklist que sigue ahí cuando ya terminaste es ruido.
//
// El paso "probar" se marca en localStorage: es un gesto del dueño, no un dato
// del negocio, y no vale una escritura a Firestore por cada visita al
// simulador.

const LS_KEY = 'wa_onboarding_probado';

export default function WaOnboarding({ onIr }) {
  const tid = resolveTenantId();
  const [cfg, setCfg] = useState(null);
  const [sys, setSys] = useState(null);   // _system/{tid} → plan contratado
  const [probado, setProbado] = useState(() => {
    try { return localStorage.getItem(`${LS_KEY}_${tid}`) === '1'; } catch { return false; }
  });

  useEffect(() => {
    const un  = onSnapshot(doc(db, 'tenants', tid, 'configuracion', 'whatsapp'),
      s => setCfg(s.data() || {}), () => setCfg({}));
    const un2 = onSnapshot(doc(db, '_system', tid),
      s => setSys(s.data() || {}), () => setSys({}));
    return () => { un(); un2(); };
  }, [tid]);

  if (cfg === null || sys === null) return null;

  const conectado = cfg.estadoConexion === 'connected';
  const botOn     = cfg.botEnabled === true;

  // Este checklist es para poner en marcha un módulo YA CONTRATADO. A quien no
  // lo tiene no se le muestra: sus botones (vincular, encender) los rechaza el
  // servidor, y ofrecer pasos que no puede completar se lee como una promesa
  // rota. Ese local ve la tarjeta con "Solicitar activación", que es su camino.
  if (!incluyeBot(sys) && !conectado) return null;

  if (conectado && probado && botOn) return null;   // terminó: fuera del camino

  const marcarProbado = () => {
    try { localStorage.setItem(`${LS_KEY}_${tid}`, '1'); } catch { /* modo incógnito */ }
    setProbado(true);
    onIr?.('simulador');
  };

  const pasos = [
    {
      hecho: conectado,
      Icon: Link2,
      titulo: 'Conecta tu WhatsApp',
      detalle: 'Escanea el QR una vez. Sigues usando tu teléfono normalmente.',
      cta: 'Vincular',
      onClick: () => onIr?.('asistente'),
    },
    {
      hecho: probado,
      Icon: FlaskConical,
      titulo: 'Pruébalo tú primero',
      detalle: 'Habla con tu asistente como si fueras un cliente. No agenda nada ni gasta mensajes.',
      cta: 'Probar ahora',
      onClick: marcarProbado,
    },
    {
      hecho: botOn,
      Icon: Power,
      titulo: 'Enciéndelo para tus clientes',
      detalle: 'Desde ese momento responde y agenda solo, las 24 horas.',
      cta: 'Ir a encenderlo',
      onClick: () => onIr?.('asistente'),
    },
  ];
  const actual = pasos.findIndex(p => !p.hecho);
  const listos = pasos.filter(p => p.hecho).length;

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-primary">Deja tu asistente andando en 3 pasos</p>
        <span className="shrink-0 text-[11px] font-bold text-emerald-400 tabular-nums">{listos}/3</span>
      </div>

      <div className="space-y-2">
        {pasos.map((p, i) => {
          const esActual = i === actual;
          return (
            <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
              p.hecho ? 'border-white/[0.06] bg-white/[0.02]'
                : esActual ? 'border-emerald-500/35 bg-emerald-500/[0.07]'
                : 'border-white/[0.06] bg-white/[0.01] opacity-60'
            }`}>
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                p.hecho ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.06] text-slate-400'
              }`}>
                {p.hecho ? <Check size={13} strokeWidth={3} /> : <p.Icon size={13} />}
              </span>

              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-semibold ${p.hecho ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                  {p.titulo}
                </p>
                {!p.hecho && <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">{p.detalle}</p>}
              </div>

              {!p.hecho && esActual && (
                <button
                  onClick={p.onClick}
                  className="shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11.5px] font-bold text-white transition-colors"
                >
                  {p.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
