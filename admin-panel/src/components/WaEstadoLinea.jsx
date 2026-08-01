import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { CheckCircle2, AlertTriangle, PauseCircle, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { tienePlan } from '../lib/waPlan';

// Línea de estado del canal — una sola frase que responde "¿está todo bien?".
//
// La información existía, pero repartida en cuatro pestañas: el dueño tenía
// que armar el puzzle (¿está conectado? ¿el bot encendido? ¿me quedan
// mensajes?) para saber si su WhatsApp está trabajando. Acá se resuelve en una
// línea, con el peor problema primero — que es el que hay que accionar.
//
// Estimación de días restantes: se calcula sobre lo YA consumido de la bolsa,
// no sobre un promedio inventado. Si no hay consumo aún, no se estima nada:
// una proyección falsa sobre 2 mensajes es peor que ninguna.

export default function WaEstadoLinea({ onIr }) {
  const [cfg, setCfg]     = useState(null);   // configuracion/whatsapp
  const [notif, setNotif] = useState(null);   // waNotifEstado
  const [sys, setSys]     = useState(null);   // _system/{tid} → plan contratado
  const tid = resolveTenantId();

  useEffect(() => {
    const un  = onSnapshot(doc(db, 'tenants', tid, 'configuracion', 'whatsapp'),
      s => setCfg(s.data() || {}), () => setCfg({}));
    const un2 = onSnapshot(doc(db, '_system', tid),
      s => setSys(s.data() || {}), () => setSys({}));
    httpsCallable(getFunctions(getApp(), 'us-central1'), 'waNotifEstado')({})
      .then(r => setNotif(r.data || {}))
      .catch(() => setNotif({}));
    return () => { un(); un2(); };
  }, [tid]);

  if (cfg === null || notif === null || sys === null) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center gap-2.5">
        <Loader2 size={15} className="animate-spin text-slate-500" />
        <span className="text-[13px] text-slate-500">Revisando el estado de tu canal…</span>
      </div>
    );
  }

  const conectado = cfg.estadoConexion === 'connected';
  const botOn     = cfg.botEnabled === true;
  const saldo     = Number(notif.bolsaSaldo) || 0;
  const usados    = Number(notif.bolsaUsados) || 0;
  const oficialOn = !!notif.planCliente || !!notif.planRecordatorio;

  // Sin NADA contratado no se muestra esta línea. Ofrecerle "Activar" a un
  // local que no compró el módulo es prometerle un botón que el servidor va a
  // rechazar: el plan lo escribe solo SynapTech en _system/{tid}. La tarjeta
  // del módulo ya le ofrece "Solicitar activación", que es el camino real.
  if (!tienePlan(sys) && !oficialOn && !conectado) return null;

  // Peor problema primero: lo que está roto manda sobre lo que está bien.
  let tono, Icon, titulo, detalle, accion = null;

  if (oficialOn && saldo <= 0) {
    tono = 'rojo'; Icon = AlertTriangle;
    titulo = 'Tus avisos están detenidos';
    detalle = 'Se acabaron los mensajes de tu bolsa: las confirmaciones y recordatorios no están saliendo.';
    accion = { txt: 'Recargar', tab: 'facturacion' };
  } else if (botOn && !conectado) {
    tono = 'rojo'; Icon = AlertTriangle;
    titulo = 'Tu WhatsApp está desconectado';
    detalle = 'El asistente está encendido pero no puede responder: hay que volver a vincular el número.';
    accion = { txt: 'Reconectar', tab: 'asistente' };
  } else if (oficialOn && saldo > 0 && saldo <= 10) {
    tono = 'ambar'; Icon = AlertTriangle;
    titulo = `Te quedan ${saldo} mensaje${saldo === 1 ? '' : 's'}`;
    detalle = 'Cuando lleguen a cero, tus clientes dejan de recibir confirmaciones y recordatorios.';
    accion = { txt: 'Recargar', tab: 'facturacion' };
  } else if (!botOn && !oficialOn) {
    tono = 'gris'; Icon = PauseCircle;
    titulo = 'Tu canal está en pausa';
    detalle = 'Ni el asistente ni los avisos automáticos están activos. Enciéndelos cuando quieras.';
    accion = { txt: 'Activar', tab: 'asistente' };
  } else {
    tono = 'verde'; Icon = CheckCircle2;
    titulo = 'Todo en orden';
    const partes = [];
    if (botOn && conectado) partes.push('tu asistente está respondiendo');
    if (oficialOn) partes.push(`${saldo} mensaje${saldo === 1 ? '' : 's'} disponibles`);
    detalle = partes.join(' · ') || 'Tu canal está funcionando.';
    // Proyección solo con consumo real detrás.
    if (oficialOn && usados >= 5 && saldo > 0) {
      const porDia = usados / Math.max(1, new Date().getDate());
      const dias = Math.floor(saldo / Math.max(porDia, 0.1));
      if (dias <= 14) detalle += ` · al ritmo actual te alcanzan ~${dias} día${dias === 1 ? '' : 's'}`;
    }
  }

  const estilos = {
    verde: 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300',
    ambar: 'border-amber-500/30 bg-amber-500/[0.07] text-amber-300',
    rojo:  'border-red-500/30 bg-red-500/[0.07] text-red-300',
    gris:  'border-white/10 bg-white/[0.03] text-slate-300',
  }[tono];

  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${estilos}`}>
      <Icon size={17} className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-tight">{titulo}</p>
        <p className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">{detalle}</p>
      </div>
      {accion && onIr && (
        <button
          onClick={() => onIr(accion.tab)}
          className="shrink-0 rounded-full border border-current/30 px-3 py-1.5 text-[11.5px] font-bold hover:bg-white/5 transition-colors"
        >
          {accion.txt}
        </button>
      )}
    </div>
  );
}
