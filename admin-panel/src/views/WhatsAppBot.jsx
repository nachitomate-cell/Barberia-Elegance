import {
  Bot, MessageCircle, Clock, TrendingUp, ShieldCheck, Sparkles,
  ExternalLink, Send, CheckCircle2, Zap, Users, DollarSign,
} from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

// Numero de soporte SynapTech — mismo que aparece en Consultas y Soporte
const WA_NUMERO_SUPPORT = '56983568212';

// ── Ícono oficial de WhatsApp — versión grande para el hero ──────
function WhatsAppLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#25D366"
        d="M20.52 3.45C18.24 1.17 15.24 0 12.06 0 5.55 0 .21 5.28.21 11.79c0 2.07.54 4.11 1.62 5.91L.06 24l6.42-1.68c1.71.93 3.66 1.44 5.58 1.44 6.51 0 11.85-5.28 11.85-11.79 0-3.15-1.23-6.15-3.39-8.52z"
      />
      <path
        fill="#FFFFFF"
        d="M17.51 14.31c-.33-.15-1.95-.96-2.25-1.08-.3-.12-.51-.15-.72.15-.21.33-.84 1.08-1.05 1.29-.18.21-.39.24-.72.09-.33-.18-1.41-.51-2.67-1.65-.99-.87-1.65-1.98-1.86-2.31-.18-.33-.03-.51.15-.66.15-.15.33-.39.48-.6.15-.18.21-.33.33-.54.09-.21.06-.42-.03-.6-.09-.18-.72-1.74-.99-2.37-.24-.6-.51-.51-.72-.51-.18 0-.39-.03-.6-.03s-.57.09-.87.42c-.3.33-1.14 1.11-1.14 2.7 0 1.59 1.17 3.15 1.35 3.36.18.21 2.31 3.51 5.61 4.92.78.33 1.41.54 1.89.69.78.24 1.5.21 2.07.12.63-.09 1.95-.81 2.22-1.56.27-.75.27-1.41.21-1.56-.09-.15-.3-.24-.63-.39z"
      />
    </svg>
  );
}

export default function WhatsAppBot() {
  const tenant = useTenant();

  // Mensaje pre-armado para el WhatsApp de soporte SynapTech
  const msg = `Hola SynapTech, soy de *${tenant.name || tenant.id}* y quiero activar el módulo WhatsApp Bot para responder los mensajes de mis clientes automáticamente. ¿Podemos coordinar la configuración guiada?`;
  const waLink = `https://wa.me/${WA_NUMERO_SUPPORT}?text=${encodeURIComponent(msg)}`;

  return (
    <div data-view="whatsapp-bot" className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-16">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-start gap-3 flex-wrap">
        <div className="p-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 shrink-0 shadow-[0_0_20px_-8px_rgba(37,211,102,0.5)]">
          <WhatsAppLogo size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">WhatsApp Bot</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider">
              <Sparkles size={9} /> Requiere activación
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mt-1 max-w-2xl">
            Respuesta automática 24/7 a los mensajes que llegan al WhatsApp de tu barbería.
            Deja de perder clientes por no responder a las 3am.
          </p>
        </div>
      </header>

      {/* ── Hero card: valor + CTA ─────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#25D366]/10 via-emerald-500/5 to-slate-950 border border-[#25D366]/25 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/20">
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-64 h-64 bg-[#25D366]/15 blur-[80px] rounded-full pointer-events-none"
        />
        <div className="relative">
          <h2 className="text-2xl md:text-3xl font-black text-white leading-tight max-w-xl">
            Tu barbería <span className="text-[#25D366]">responde sola</span>. Recupera horas de tu día.
          </h2>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed max-w-2xl">
            Un bot inteligente conectado a tu WhatsApp que responde en segundos a preguntas frecuentes
            (precios, horarios, ubicación, disponibilidad), agenda citas, y solo te avisa cuando algo
            realmente necesita atención humana.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-bold transition-all shadow-[0_0_25px_-5px_rgba(37,211,102,0.6)] active:scale-[0.98]"
            >
              <MessageCircle size={16} />
              Contactar para activar
            </a>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ExternalLink size={12} />
              +56 9 8356 8212
            </a>
          </div>

          <p className="text-[11px] text-slate-500 mt-4 leading-snug max-w-xl">
            Al hacer clic te abrimos un chat de WhatsApp directo con el equipo SynapTech con un mensaje listo.
            Coordinamos una llamada de 30 min para configurar el bot a la medida de tu local.
          </p>
        </div>
      </div>

      {/* ── Qué incluye ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Qué incluye el módulo</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              Icon: Bot,
              color: 'emerald',
              title: 'Bot inteligente 24/7',
              desc: 'Responde con IA a preguntas frecuentes de tus clientes: precios, horarios, ubicación, servicios, disponibilidad. Adaptado al tono de tu marca.',
            },
            {
              Icon: Clock,
              color: 'blue',
              title: 'Contexto real del local',
              desc: 'El bot conoce tus servicios, tu equipo, tus precios, tu horario y hasta las promos vigentes. Responde con información REAL, no genérica.',
            },
            {
              Icon: ShieldCheck,
              color: 'purple',
              title: 'Handoff humano inteligente',
              desc: 'Cuando el bot detecta que algo necesita tu atención (cliente molesto, pedido complejo, situación fuera de guion), te avisa de inmediato.',
            },
            {
              Icon: TrendingUp,
              color: 'amber',
              title: 'Métricas y ahorro medible',
              desc: 'Panel con cuántos mensajes resolvió solo, cuánto tiempo te ahorró, cuántas reservas convirtió desde WhatsApp.',
            },
            {
              Icon: Users,
              color: 'rose',
              title: 'Reserva directo desde el chat (tier PRO)',
              desc: 'El cliente escribe "quiero hora hoy a las 6" y el bot verifica disponibilidad, muestra opciones, agenda la cita y la registra automáticamente.',
            },
            {
              Icon: Zap,
              color: 'cyan',
              title: 'Escalable a todo tu equipo',
              desc: 'Configuramos rutas por barbero, horarios de bot activo/pausado, mensajes automáticos personalizados por horario (día/noche/finde).',
            },
          ].map((f, i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-3">
              <div className={`p-2 rounded-lg shrink-0 h-fit ${
                f.color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                f.color === 'blue'    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                f.color === 'purple'  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/25' :
                f.color === 'amber'   ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                f.color === 'rose'    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25' :
                                        'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25'
              }`}>
                <f.Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">{f.title}</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Proceso de activación ──────────────────────────────── */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Send size={14} className="text-[#25D366]" />
          <h3 className="text-sm font-bold text-white">Cómo activamos el bot en tu barbería</h3>
        </div>
        <div className="space-y-3">
          {[
            {
              n: 1,
              title: 'Contáctanos por WhatsApp',
              desc: 'Con el botón verde de arriba nos escribes. Agendamos una llamada de 30 min sin costo para entender tu caso.',
            },
            {
              n: 2,
              title: 'Preparamos el número dedicado',
              desc: 'Te guiamos: puedes usar tu número actual del local o comprar uno nuevo (~$3.000 CLP inicial + $8k mensual). Recomendamos el nuevo para no perder tu WhatsApp personal.',
            },
            {
              n: 3,
              title: 'Configuramos el bot a tu medida',
              desc: 'Cargamos tus servicios, horarios, equipo, tono de marca. Ajustamos las respuestas hasta que suenen 100% naturales.',
            },
            {
              n: 4,
              title: 'Certificación con Meta (2–3 días)',
              desc: 'Registramos tu negocio en WhatsApp Business API (proceso oficial de Meta). Nosotros manejamos todo el papeleo técnico.',
            },
            {
              n: 5,
              title: 'Prueba y ajustes',
              desc: 'Funciona en modo prueba durante una semana. Ajustamos según lo que veamos. Cuando estés 100% conforme, activamos para todos tus clientes.',
            },
          ].map(step => (
            <div key={step.n} className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#25D366] to-emerald-600 flex items-center justify-center shrink-0 text-white text-xs font-black shadow-md">
                {step.n}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white leading-tight">{step.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Precio ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={14} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Inversión</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tier Básico</p>
            <p className="text-3xl font-black text-white mt-1">
              $15 <span className="text-sm text-slate-500 font-semibold">USD/mes</span>
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                'Respuestas automáticas 24/7',
                'Contexto real del local',
                'Handoff a humano cuando aplica',
                'Panel de métricas',
              ].map((f, i) => (
                <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#25D366]/5 border border-[#25D366]/30 rounded-xl p-5 shadow-[0_0_25px_-10px_rgba(37,211,102,0.4)]">
            <p className="text-[10px] font-bold text-[#25D366] uppercase tracking-wider">Tier PRO</p>
            <p className="text-3xl font-black text-white mt-1">
              $25 <span className="text-sm text-slate-500 font-semibold">USD/mes</span>
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                'Todo lo del tier básico +',
                'Reserva directa desde WhatsApp',
                'Rutas personalizadas por barbero',
                'Auto-follow-ups post-visita',
              ].map((f, i) => (
                <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="text-[#25D366] shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-[10.5px] text-slate-500 leading-relaxed mt-4">
          💡 Precios NO incluyen costos de operador móvil (chip nuevo si eliges esa opción). Sí incluyen: costo de Meta Cloud API, LLM (Claude Haiku), infraestructura, mantenimiento, y actualizaciones sin costo adicional.
        </p>
      </div>

      {/* ── CTA final ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#25D366]/10 via-emerald-500/5 to-transparent border border-[#25D366]/25 rounded-2xl p-6 text-center">
        <WhatsAppLogo size={40} />
        <h3 className="text-lg font-bold text-white mt-3">¿Listo para dejar de responder mensajes a mano?</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-lg mx-auto">
          En 30 min entendemos tu caso y te decimos si te sirve. Sin compromiso.
        </p>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-bold transition-all shadow-[0_0_25px_-5px_rgba(37,211,102,0.6)] active:scale-[0.98]"
        >
          <MessageCircle size={16} />
          Escríbenos ahora al WhatsApp de SynapTech
        </a>
      </div>
    </div>
  );
}
