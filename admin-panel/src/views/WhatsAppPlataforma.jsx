import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { Section, SettingsGroup, SettingRow } from '../components/ui/SettingsPrimitives';
import { ShieldCheck, Smartphone, Clock, Lock, ExternalLink } from 'lucide-react';

const WA_SYNAPTECH = '56983568212';

// Módulo "Confirmaciones por el número de SynapTech" (canal plataforma).
// Vive en su propio archivo —y no dentro de WhatsAppAsistente— para que la
// página pueda ORDENARLO por estado: lo contratado arriba, lo disponible al
// final. Metido dentro de otro componente no se podía mover.
//
// Backend: functions/evolution/plataforma.js. El chip es de SynapTech y lo
// comparten varios locales, así que el dueño no lo vincula ni lo activa: eso
// se hace desde /admin. Acá solo ve el estado y ajusta SU ventana de aviso,
// que sí vive en su propio doc.
export default function WhatsAppPlataforma({ onEstado }) {
  const tid    = resolveTenantId();
  const tenant = useTenant();
  const [sys,  setSys]  = useState(null);
  const [cfg,  setCfg]  = useState(null);
  const [chip, setChip] = useState(null);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, '_system', tid),
      s => setSys(s.exists() ? s.data() : {}), () => setSys({}));
    const u2 = onSnapshot(doc(db, 'tenants', tid, 'configuracion', 'whatsapp'),
      s => setCfg(s.exists() ? s.data() : {}), () => setCfg({}));
    return () => { u1(); u2(); };
  }, [tid]);

  const activo = sys?.waPlataforma === true;

  useEffect(() => {
    if (sys === null) return;                 // aún cargando: no reportar
    onEstado?.(activo ? 'activo' : 'disponible');
  }, [sys, activo, onEstado]);

  // El chip del local NO es siempre el de por defecto: el backend resuelve
  // `_system/{tid}.waPlataformaChip` → `_system/wa_plataforma_{chipId}`
  // (plataforma.js). Leyendo siempre `wa_plataforma`, un local asignado a un
  // chip secundario veía el NÚMERO EQUIVOCADO y un estado que no era el suyo.
  // Ausente = el de por defecto, que es lo que hace que sumar chips no mueva
  // a nadie de lugar. Auditoría 03-08-2026.
  useEffect(() => {
    if (!activo) return undefined;
    const chipId = String(sys?.waPlataformaChip || '').trim().toLowerCase();
    const docId = (!chipId || chipId === 'synaptech') ? 'wa_plataforma' : `wa_plataforma_${chipId}`;
    return onSnapshot(doc(db, '_system', docId),
      s => setChip(s.exists() ? s.data() : {}), () => setChip({}));
  }, [activo, sys?.waPlataformaChip]);

  const patchCfg = (patch) =>
    setDoc(doc(db, 'tenants', tid, 'configuracion', 'whatsapp'), patch, { merge: true }).catch(() => {});

  /* ── No contratado: tarjeta breve, sin prometer nada ── */
  if (!activo) {
    return (
      <Section
        Icon={ShieldCheck}
        title="Confirmaciones sin exponer tu número"
        description="Las enviamos desde un número de SynapTech. Tu WhatsApp no se toca."
      >
        <SettingsGroup>
          <SettingRow
            Icon={Lock}
            title="Módulo SynapTech"
            description="Le preguntamos a tu cliente si viene y liberamos el cupo cuando avisa que no — todo desde nuestro número, sin vincular el tuyo."
          >
            <a
              href={`https://wa.me/${WA_SYNAPTECH}?text=${encodeURIComponent(
                `Hola SynapTech, soy de *${tenant?.name || tid}* y quiero las confirmaciones de cita desde el número de SynapTech (sin usar mi WhatsApp). ¿Cómo lo activamos?`,
              )}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-300 hover:text-sky-200 transition-colors px-3 py-1.5 rounded-full border border-sky-500/30 hover:border-sky-500/60 shrink-0"
            >
              Activarlo <ExternalLink size={12} />
            </a>
          </SettingRow>
        </SettingsGroup>
      </Section>
    );
  }

  // `chip === null` es "todavía cargando", no "caído": mostrar el aviso de
  // reconexión mientras llega el snapshot era una alarma falsa en cada visita.
  const cargandoChip = chip === null;
  const conectado    = chip?.estadoConexion === 'connected';
  // Chip retirado a propósito por SynapTech (plataforma.js `apagado`): no es
  // una caída, y decir "lo estamos reconectando" sería mentira.
  const retirado     = chip?.apagado === true;
  const ventana      = cfg?.recordatorio?.ventanaHoras ?? 24;

  // Si el local ya manda por SU número, el cron de plataforma lo salta para no
  // escribirle dos veces al mismo cliente. Se dice, en vez de mostrar un
  // módulo encendido que en realidad no envía nada.
  const duplicado = cfg?.confirmacionesEnabled === true && cfg?.estadoConexion === 'connected';

  return (
    <Section
      Icon={ShieldCheck}
      title="Confirmaciones por el número de SynapTech"
      description="Tu WhatsApp no se usa ni se expone: los avisos salen desde nuestro número."
    >
      <SettingsGroup divide>
        <SettingRow
          Icon={Smartphone}
          title={conectado && chip?.numeroVinculado ? `+${chip.numeroVinculado}` : 'Número de SynapTech'}
          description={
            cargandoChip ? 'Consultando el estado del número…'
            : conectado  ? 'Activo. Tus clientes reciben el aviso desde este número, con el nombre de tu local en el mensaje.'
            : retirado   ? 'Estamos cambiando el número que atiende tu local. Te avisamos apenas quede listo.'
            : 'Temporalmente fuera de línea. Lo estamos reconectando — no necesitas hacer nada.'}
        >
          <span className={`text-[12px] font-semibold rounded-full px-3 py-1 shrink-0 border ${
            cargandoChip
              ? 'text-slate-400 bg-white/[0.04] border-white/10'
              : conectado
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/20'
          }`}>
            {cargandoChip ? '…' : conectado ? 'Activo' : retirado ? 'En cambio' : 'Reconectando'}
          </span>
        </SettingRow>

        <SettingRow
          Icon={Clock}
          title="Ventana de aviso"
          description="Cuántas horas antes se le pide confirmar al cliente."
        >
          <select
            value={ventana}
            onChange={(e) => patchCfg({ recordatorio: { ...(cfg?.recordatorio || {}), ventanaHoras: Number(e.target.value) } })}
            className="bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5 text-[13px] text-primary focus:outline-none focus:border-emerald-500 shrink-0"
          >
            <option value={12}>12 horas antes</option>
            <option value={24}>24 horas antes</option>
            <option value={48}>48 horas antes</option>
          </select>
        </SettingRow>
      </SettingsGroup>

      {duplicado && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12.5px] text-amber-200 leading-relaxed">
          También tienes las confirmaciones encendidas sobre <b>tu propio número</b>. Para no
          escribirle dos veces al mismo cliente, este módulo se queda en silencio mientras
          eso siga así. Apaga uno de los dos.
        </div>
      )}
    </Section>
  );
}
