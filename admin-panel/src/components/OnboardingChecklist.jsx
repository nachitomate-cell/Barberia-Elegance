import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import {
  CheckCircle2, Circle, X, ChevronDown, ChevronRight, Rocket,
  Image as ImgIcon, Camera, Share2, Users, MessageSquare,
} from 'lucide-react';

/* Onboarding checklist para tenants nuevos (self-service + admin-express).
   Aparece automático al primer login del dueño con una barra de progreso
   colapsable. Cada tarea se detecta en Firestore (logo/fotos) o se marca
   manual (bio IG, primer cliente compartido, bot WA).

   Se oculta cuando:
   · El dueño completa las 5 tareas → celebration + auto-hide 4s.
   · El dueño presiona "Recordar más tarde" → oculto en localStorage 24h.
   · El tenant ya tiene onboardingCompletado = true en Firestore.

   Solo aparece a tenants con origen 'self-service' o 'admin-express'
   (los a-medida no necesitan onboarding: SynapTech los deja listos). */

const ORIGENES = new Set(['self-service', 'admin-express']);
const LS_KEY_HIDE = 'syn_onboarding_hide_until';

async function contarServiciosConImagen(tid) {
  try {
    const q = query(collection(db, `tenants/${tid}/servicios`), limit(20));
    // firestore-safe: lectura opcional del onboarding — si falla o tarda, devolvemos 0 y la UI no rompe
    const snap = await getDocs(q);
    let con = 0;
    snap.forEach((d) => { if (d.data().imagen || d.data().imagenUrl) con++; });
    return con;
  } catch { return 0; }
}

export default function OnboardingChecklist() {
  const tenant = useTenant();
  const [tenantDoc, setTenantDoc] = useState(null);
  const [serviciosConImg, setServiciosConImg] = useState(null);
  const [abierto, setAbierto] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // Subscribe al doc del tenant
  useEffect(() => {
    if (!tenant?.id) return;
    const unsub = onSnapshot(doc(db, 'tenants', tenant.id), (s) => {
      setTenantDoc(s.exists() ? s.data() : null);
    });
    return unsub;
  }, [tenant?.id]);

  // Contar servicios con imagen (una vez, y al reabrir)
  useEffect(() => {
    if (!tenant?.id || !abierto) return;
    contarServiciosConImagen(tenant.id).then(setServiciosConImg);
  }, [tenant?.id, abierto]);

  // Recargar cuenta también al montar para tener % inicial correcto
  useEffect(() => {
    if (tenant?.id) contarServiciosConImagen(tenant.id).then(setServiciosConImg);
  }, [tenant?.id]);

  // Ocultar si el dueño usó "recordar más tarde"
  useEffect(() => {
    const hideUntil = Number(localStorage.getItem(LS_KEY_HIDE) || 0);
    if (hideUntil > Date.now()) setOculto(true);
  }, []);

  const flags   = tenantDoc?.onboarding || {};
  const visible = !!tenantDoc && ORIGENES.has(tenantDoc.origen) && !tenantDoc.onboardingCompletado && !oculto;

  const tareas = tenantDoc ? [
    {
      id: 'logo',
      done: !!tenantDoc.logoUrl,
      titulo: 'Sube tu logo',
      hint: 'Panel → Configuración → Marca',
      auto: true,
      icon: ImgIcon,
      cta: null,
    },
    {
      id: 'fotos',
      done: (serviciosConImg || 0) >= 3,
      titulo: 'Agrega fotos a 3 servicios',
      hint: (serviciosConImg != null ? `${serviciosConImg}/3 con foto` : '') + ' · Panel → Servicios',
      auto: true,
      icon: Camera,
      cta: null,
    },
    {
      id: 'bio_ig',
      done: !!flags.bioIg,
      titulo: 'Pon tu link en la bio de Instagram',
      hint: `https://${tenant.id}.synaptechspa.cl — cópialo y pégalo en tu perfil`,
      auto: false,
      icon: Share2,
      cta: 'Ya lo hice',
    },
    {
      id: 'primer_cliente',
      done: !!flags.primerCliente,
      titulo: 'Compártelo con tu primer cliente',
      hint: 'Mándalo por WhatsApp para que reserve solo',
      auto: false,
      icon: Users,
      cta: 'Ya lo compartí',
    },
    {
      id: 'bot_wa',
      done: !!flags.botWa,
      titulo: 'Configura el bot de WhatsApp',
      hint: 'Panel → WhatsApp → Bot asistente',
      auto: false,
      icon: MessageSquare,
      cta: 'Ir a configurar',
    },
  ] : [];

  const totales    = tareas.length;
  const completas  = tareas.filter((t) => t.done).length;
  const progreso   = totales ? Math.round((completas / totales) * 100) : 0;
  const todoListo  = totales > 0 && completas === totales;

  async function marcarManual(id) {
    if (!tenant?.id) return;
    try {
      await updateDoc(doc(db, 'tenants', tenant.id), {
        [`onboarding.${id}`]: true,
      });
    } catch (e) { console.warn('[onboarding] mark falló', e); }
  }

  async function completarOnboarding() {
    if (!tenant?.id) return;
    setCelebrating(true);
    try {
      await updateDoc(doc(db, 'tenants', tenant.id), {
        onboardingCompletado:   true,
        onboardingCompletadoEn: new Date(),
      });
    } catch (e) { console.warn('[onboarding] complete falló', e); }
    setTimeout(() => setCelebrating(false), 4500);
  }

  // Si terminó, mostrar mensaje breve y programar hide
  useEffect(() => {
    if (todoListo && tenantDoc && !tenantDoc.onboardingCompletado && !celebrating) {
      completarOnboarding();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todoListo, tenantDoc?.onboardingCompletado]);

  function recordarLuego(e) {
    e.stopPropagation();
    localStorage.setItem(LS_KEY_HIDE, String(Date.now() + 24 * 3600 * 1000));
    setOculto(true);
  }

  if (!visible && !celebrating) return null;

  if (celebrating) {
    return (
      <div className="sticky top-0 z-[65] bg-emerald-500/[0.12] border-b border-emerald-500/30 px-4 py-3 flex items-center justify-center gap-2 text-emerald-200 text-sm font-semibold">
        <Rocket size={16} className="text-emerald-400" />
        ¡Panel configurado! Ya está todo listo para recibir clientes. 🚀
      </div>
    );
  }

  return (
    <>
      {/* Banner colapsable en la parte superior */}
      <button
        onClick={() => setAbierto(true)}
        className="sticky top-0 z-[65] w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-purple-500/[0.09] to-emerald-500/[0.09] border-b border-purple-500/25 hover:from-purple-500/[0.14] hover:to-emerald-500/[0.14] transition-colors text-left"
      >
        <Rocket size={16} className="text-purple-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-[13px] font-semibold text-neutral-100 truncate">
            Configura tu local — {completas} de {totales} listo
          </p>
          <div className="mt-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
        <ChevronRight size={16} className="text-neutral-400 shrink-0" />
      </button>

      {/* Modal con las 5 tareas */}
      {abierto && (
        <div className="fixed inset-0 z-[96] bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)]">
              <div className="flex items-start justify-between p-5 border-b border-neutral-800">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-purple-300 mb-1">Configura tu local</p>
                  <h3 className="text-lg font-extrabold text-white leading-snug">Los 5 pasos para arrancar bien</h3>
                  <p className="mt-1.5 text-xs text-neutral-400">Termina esto en el primer día y tus clientes reservan desde el día 2.</p>
                </div>
                <button onClick={() => setAbierto(false)} className="text-neutral-500 hover:text-neutral-200 -mt-1 -mr-1 p-1">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-neutral-300">
                    {completas} / {totales} completado
                  </p>
                  <div className="flex-1 mx-3 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-emerald-300">{progreso}%</p>
                </div>

                <ul className="space-y-2">
                  {tareas.map((t) => {
                    const Icon = t.icon;
                    return (
                      <li key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                        t.done ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-neutral-800 bg-neutral-900/40'
                      }`}>
                        {t.done
                          ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                          : <Circle size={20} className="text-neutral-600 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${t.done ? 'text-emerald-200 line-through decoration-emerald-500/40' : 'text-neutral-100'}`}>
                            <Icon size={13} className="inline mr-1.5 opacity-70" />{t.titulo}
                          </p>
                          <p className="text-[11.5px] text-neutral-400 mt-0.5 leading-relaxed">{t.hint}</p>
                        </div>
                        {!t.done && !t.auto && t.cta && (
                          <button
                            onClick={() => marcarManual(t.id)}
                            className="shrink-0 self-center bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-[11.5px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {t.cta}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5 pt-4 border-t border-neutral-800 flex items-center justify-between">
                  <button
                    onClick={recordarLuego}
                    className="text-[12.5px] text-neutral-400 hover:text-neutral-200 font-medium"
                  >
                    Recordar mañana
                  </button>
                  <button
                    onClick={() => setAbierto(false)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm font-semibold px-4 py-2 rounded-lg"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
