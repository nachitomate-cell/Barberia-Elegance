import { useState, useMemo } from 'react';
import {
  HelpCircle, ChevronDown, Search, MessageCircle, LifeBuoy,
  GraduationCap, Sparkles, TrendingUp, Users, Wallet, Bell, Lock,
} from 'lucide-react';

// Número de soporte de SynapTech (mismo que aparece en Soporte y en /agenda.html).
const WA_NUMERO = '56983568212';

/* ── Preguntas frecuentes ─────────────────────────────────────────────
   Agrupadas por tema. Pensadas para el dueño del local, en lenguaje simple. */
const FAQS = [
  {
    cat: 'Agenda y citas',
    items: [
      {
        q: '¿Cómo muevo o reagendo una cita?',
        a: 'Entra a Agenda y arrastra la cita al nuevo horario. Mientras la arrastras se resalta el espacio donde va a caer. También puedes soltarla en otro día desde el selector de fecha del modal de reagendar.',
      },
      {
        q: '¿Puedo poner una hora encima de otra (sobrecupo)?',
        a: 'Sí. Al soltar una cita sobre un horario ya ocupado, el sistema te avisa con una alerta de precaución y te deja confirmar el sobrecupo si realmente lo quieres. Úsalo con criterio para no saturar al barbero.',
      },
      {
        q: '¿Cómo bloqueo un horario o marco un día cerrado?',
        a: 'Los horarios disponibles salen del horario individual de cada barbero (en Equipo). Si un día no debe tomar reservas, ajusta o cierra ese día en el horario del barbero.',
      },
      {
        q: '¿Cómo respondo los mensajes de mis clientes?',
        a: 'En Mensajes ves las conversaciones con tus clientes. El número rojo en el menú indica cuántos mensajes sin leer tienes.',
      },
    ],
  },
  {
    cat: 'Equipo y servicios',
    items: [
      {
        q: '¿Cómo agrego o edito un barbero?',
        a: 'Ve a Equipo → agrega un nuevo integrante o edita uno existente. Ahí defines su nombre, foto, especialidad y su horario de atención, que es el que controla la disponibilidad real de reservas.',
      },
      {
        q: '¿Cómo cambio los horarios de atención?',
        a: 'El horario que ve el cliente al reservar es el de cada barbero (en Equipo). El horario de Configuración es solo una referencia informativa del local.',
      },
      {
        q: '¿Cómo cambio precios o agrego un servicio?',
        a: 'En Servicios puedes crear, editar o eliminar servicios y ajustar sus precios y duración. Los cambios se reflejan al instante en tu página de reservas.',
      },
    ],
  },
  {
    cat: 'Ventas, métricas y contabilidad',
    items: [
      {
        q: '¿Dónde veo los ingresos y las métricas del local?',
        a: 'En Métricas están los ingresos, gastos, utilidad neta y las principales KPIs de tu negocio. Puedes filtrar por período (30 días, mes, año o rango custom) para comparar y decidir con datos.',
      },
      {
        q: '¿Cómo registro un gasto o una compra?',
        a: 'En Gastos agregas cada egreso con categoría y método de pago. Estos gastos se restan de tu utilidad neta en Métricas para darte el número real.',
      },
      {
        q: '¿Cómo calculo la comisión de un barbero?',
        a: 'En Equipo → tab Sueldos, elige el barbero y el período. Verás automáticamente el bruto de servicios y productos, la comisión que le corresponde, sueldo base y propinas. Puedes imprimir el reporte para respaldo.',
      },
    ],
  },
  {
    cat: 'Club de fidelidad',
    items: [
      {
        q: '¿Cómo funciona el club y los sellos?',
        a: 'Los clientes acumulan sellos por cada visita completada. Al juntar suficientes, canjean un premio (producto, servicio gratis o descuento). Tú configuras los premios y el costo en sellos desde Fidelización.',
      },
      {
        q: '¿Cómo apruebo un canje del cliente?',
        a: 'El cliente genera un PIN de 4 dígitos en su app. Ve a Fidelización → Validar Canje, ingresa el PIN y confirma la entrega. El sistema descuenta sellos y actualiza stock automáticamente.',
      },
    ],
  },
  {
    cat: 'Configuración y pagos',
    items: [
      {
        q: '¿Cómo cambio el logo o los datos del local?',
        a: 'Ve a Configuración. Ahí ajustas nombre, dirección, teléfono, logo, redes sociales y todo lo que aparece en tu página pública de reservas.',
      },
      {
        q: '¿Cómo activo el cobro con Mercado Pago o Flow?',
        a: 'En Recibir Pagos conectas tu cuenta de MP o Flow con OAuth. Una vez conectado, los clientes pueden pagar la reserva online (paga anticipo o total según lo configures).',
      },
    ],
  },
];

/* ── Módulo Academia: previews de lecciones que estamos preparando ─── */
const LECCIONES_PROXIMAS = [
  {
    Icon: Users,
    titulo: 'Convierte el 40% de tus reservas nuevas en clientes recurrentes',
    duracion: '3 min',
    color: 'emerald',
    hint: 'El script exacto post-primera-visita que sube retención',
  },
  {
    Icon: TrendingUp,
    titulo: 'Los 3 KPIs que separan una barbería rentable de una que apenas sobrevive',
    duracion: '4 min',
    color: 'amber',
    hint: 'Ticket promedio · Ocupación · Punto de equilibrio',
  },
  {
    Icon: MessageCircle,
    titulo: 'El WhatsApp que rescata clientes que llevan 30d sin visita',
    duracion: '2 min',
    color: 'blue',
    hint: 'Con templates listos para copiar y pegar',
  },
  {
    Icon: Bell,
    titulo: 'Sellos, rangos y premios: cómo diseñar un club que la gente use',
    duracion: '5 min',
    color: 'purple',
    hint: 'Errores típicos + qué copiar de los mejores clubes',
  },
  {
    Icon: Wallet,
    titulo: 'Corta gastos ocultos: la lectura mensual de Métricas paso a paso',
    duracion: '4 min',
    color: 'rose',
    hint: 'Los 6 números que revisas el 1° de cada mes',
  },
];

const LECCION_COLOR = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/25',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple:  'bg-purple-500/10 text-purple-400 border-purple-500/25',
  rose:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

/* Item colapsable de FAQ. */
function FaqItem({ q, a, open, onToggle }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-800/40 transition-colors"
      >
        <span className="flex-1 text-sm font-semibold text-white">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180 text-emerald-400' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 -mt-0.5">
          <p className="text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">{a}</p>
        </div>
      )}
    </div>
  );
}

/* Tab 1: FAQs. */
function TabFAQs() {
  const [openKey, setOpenKey] = useState(null);
  const [search,  setSearch]  = useState('');

  const term = search.trim().toLowerCase();

  const grupos = useMemo(() => {
    if (!term) return FAQS;
    return FAQS
      .map(g => ({
        ...g,
        items: g.items.filter(it =>
          it.q.toLowerCase().includes(term) || it.a.toLowerCase().includes(term),
        ),
      }))
      .filter(g => g.items.length > 0);
  }, [term]);

  const sinResultados = grupos.length === 0;
  const waLink = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent('Hola SynapTech, tengo una consulta sobre el panel:')}`;

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Busca una duda… (ej: precios, horario, mensualidad)"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* FAQs */}
      {sinResultados ? (
        <div className="text-center py-10 px-4 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-sm text-slate-400">No encontramos una pregunta con <span className="text-white font-semibold">“{search}”</span>.</p>
          <p className="text-xs text-slate-600 mt-1">Prueba con otra palabra o escríbenos por WhatsApp aquí abajo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(grupo => (
            <div key={grupo.cat} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{grupo.cat}</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              {grupo.items.map(it => {
                const key = `${grupo.cat}::${it.q}`;
                return (
                  <FaqItem
                    key={key}
                    q={it.q}
                    a={it.a}
                    open={openKey === key}
                    onToggle={() => setOpenKey(openKey === key ? null : key)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Contacto WhatsApp */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/25 rounded-xl px-5 py-5 text-center">
        <LifeBuoy size={26} className="mx-auto text-emerald-400 mb-2" />
        <h2 className="text-sm font-bold text-white">¿No resolviste tu duda?</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4">Escríbenos por WhatsApp y te ayudamos directo.</p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-all active:scale-[0.98]"
        >
          <MessageCircle size={16} />
          Contactar por WhatsApp
        </a>
      </div>
    </div>
  );
}

/* Tab 2: Academia (placeholder ingenioso). */
function TabAcademia() {
  const waLink = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent('Hola SynapTech, quiero que me avisen cuando la Academia esté lista.')}`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-amber-500/25 rounded-2xl p-6 sm:p-8">
        {/* Decoración: sparkles flotantes */}
        <Sparkles size={14} className="absolute top-6 right-8 text-amber-300/60 animate-sparkle-pop" />
        <Sparkles size={10} className="absolute bottom-8 right-14 text-rose-300/50 animate-sparkle-pop [animation-delay:0.6s]" />
        <Sparkles size={12} className="absolute top-14 right-24 text-yellow-200/50 animate-sparkle-pop [animation-delay:1.2s]" />

        <div className="flex items-start gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/25 to-rose-500/20 border border-amber-500/30 shrink-0">
            <GraduationCap size={22} className="text-amber-300 animate-trophy-glow" />
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1.5">
              <Lock size={9} /> En construcción · próximamente
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              Academia SynapTech
            </h2>
          </div>
        </div>

        <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed max-w-2xl">
          Estamos empaquetando el <strong className="text-white">know-how de las barberías que más facturan</strong> en
          lecciones cortas de 2–5 minutos: agenda, retención, marketing y finanzas.
          Todo aplicable el mismo día que lo ves.
        </p>
        <p className="text-xs text-slate-400 mt-3">
          Sin cursos eternos ni teoría. Solo tácticas concretas, con guiones listos para copiar y ejemplos reales.
        </p>
      </div>

      {/* Preview de lecciones */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Lo que va a estar disponible</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>
        <div className="space-y-2.5">
          {LECCIONES_PROXIMAS.map((l, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg border shrink-0 ${LECCION_COLOR[l.color]}`}>
                  <l.Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Lección {i + 1}
                    </span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] text-slate-500">{l.duracion}</span>
                  </div>
                  <p className="text-sm font-bold text-white leading-tight">{l.titulo}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{l.hint}</p>
                </div>
                <span className="hidden sm:inline text-[10px] text-slate-600 shrink-0 mt-1">Próximamente</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA: avísame */}
      <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-500/25 rounded-xl px-5 py-6 text-center">
        <Bell size={22} className="mx-auto text-amber-300 mb-2" />
        <h3 className="text-sm font-bold text-white">¿Quieres ser el primero en verla?</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Te avisamos por WhatsApp apenas la primera tanda de lecciones esté lista.
        </p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white text-sm font-bold rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
        >
          <MessageCircle size={16} />
          Avísame cuando esté lista
        </a>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'faqs',     label: 'Preguntas frecuentes', Icon: HelpCircle    },
  { key: 'academia', label: 'Academia',             Icon: GraduationCap },
];

export default function Consultas() {
  const [tab, setTab] = useState('faqs');

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle size={20} className="text-emerald-400" />
          Consultas
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Resuelve dudas rápidas o aprende a exprimirle el máximo a tu panel.
        </p>
      </div>

      {/* Toolbar de tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-800">
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                active
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              <t.Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {tab === 'faqs'     && <TabFAQs />}
      {tab === 'academia' && <TabAcademia />}
    </div>
  );
}
