import { useState, useMemo } from 'react';
import { HelpCircle, ChevronDown, Search, MessageCircle, LifeBuoy } from 'lucide-react';

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
        q: '¿Dónde veo cuántos clientes atendí y cuánto vendí en el mes?',
        a: 'En Métricas ves el resumen del mes (clientes y ventas). En Caja y Comisiones tienes el detalle por servicio, por barbero y por forma de pago.',
      },
      {
        q: '¿Puedo exportar los datos para mi contador?',
        a: 'Sí. En Comisiones y en Caja puedes exportar el detalle del período para cuadrar con tu contador o tu declaración.',
      },
      {
        q: '¿El sistema emite las boletas del SII?',
        a: 'El panel te entrega el resumen de ventas del mes para cuadrar, pero la boleta electrónica la emite un facturador aparte (manual desde tu facturador, o automático si se integra uno). El SII pide una boleta por cada venta, no una sola por todo el mes.',
      },
    ],
  },
  {
    cat: 'Página pública y reservas online',
    items: [
      {
        q: '¿Cómo comparto mi link de reserva?',
        a: 'Abajo en el menú está el botón "Ver agenda pública": ese es tu link para reservar. Cópialo y compártelo por WhatsApp, Instagram o donde quieras.',
      },
      {
        q: '¿Cómo funciona la política de cancelación?',
        a: 'En Configuración defines con cuánta anticipación mínima un cliente puede cancelar o reagendar. Con "Sin límite" pueden hacerlo en cualquier momento.',
      },
    ],
  },
  {
    cat: 'Cuenta y diseño',
    items: [
      {
        q: '¿Cómo pago mi mensualidad?',
        a: 'En Mensualidad ves tu estado de pago, el monto y la fecha. Si tienes un pago próximo o atrasado, el sistema te avisa con un banner.',
      },
      {
        q: '¿Puedo cambiar el diseño de la agenda por mi cuenta?',
        a: 'El día a día (tu info, logo, horarios, servicios, precios, política de cancelación) lo cambias tú desde el panel. El diseño y la estructura de la agenda (cómo se ve, agregar o quitar módulos, colores) lo hace el equipo de SynapTech: nos lo pides por WhatsApp y lo dejamos andando, así nadie rompe la agenda sin querer.',
      },
      {
        q: '¿Cómo activo las notificaciones en el celular?',
        a: 'Instala el panel como app (PWA) desde el aviso que aparece en pantalla y acepta las notificaciones. Así te llegan avisos de nuevas reservas y recordatorios directo al celular.',
      },
    ],
  },
];

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
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

export default function Consultas() {
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
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle size={20} className="text-emerald-400" />
          Consultas
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Las dudas más comunes y cómo resolverlas. Si no encuentras lo que buscas, escríbenos.
        </p>
      </div>

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
