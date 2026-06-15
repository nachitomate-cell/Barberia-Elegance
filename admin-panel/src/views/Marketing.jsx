import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Megaphone, Image, Type, AlignLeft, Link2,
  ToggleLeft, ToggleRight, Save, Sparkles, Send,
  Cpu, Plus, RefreshCw, Share2, Download, X, Upload
} from 'lucide-react';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import { getDoc, getDocs, setDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { tenantDoc, tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { STORY_FONT, STORY_BG_PRESETS, lum, loadImg, drawCover, wrapLines } from '../lib/storyCanvas';

/* ── Banner form default ────────────────────────────────────── */
const EMPTY = {
  titulo:      '',
  descripcion: '',
  imagen:      '',
  ctaTexto:    'Reservar mi lugar',
  ctaUrl:      'index.html',
  estilo:      'panel',
  activo:      false,
};

/* Estilos de banner: cómo se trata el texto para que se lea sobre la imagen */
const ESTILOS_BANNER = [
  { id: 'panel',     label: 'Panel oscuro',    desc: 'Texto en recuadro glass' },
  { id: 'degradado', label: 'Degradado',       desc: 'Foto + sombra de texto' },
  { id: 'bloque',    label: 'Bloque de color', desc: 'Imagen arriba, color abajo' },
  { id: 'wash',      label: 'Wash de marca',   desc: 'Lavado de color sobre foto' },
];

/* ── Helpers ────────────────────────────────────────────────── */
const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/* ── AI: chips de acceso rápido ─────────────────────────────── */
const AI_CHIPS = [
  { id: 'post-ig',   emoji: '📸', label: 'Post para Instagram' },
  { id: 'reel',      emoji: '🎬', label: 'Idea para Reel'      },
  { id: 'wsp',       emoji: '💬', label: 'Estado de WhatsApp'  },
  { id: 'promo',     emoji: '🔥', label: 'Texto de promoción'  },
  { id: 'hashtags',  emoji: '#',  label: 'Hashtags barber'     },
  { id: 'fidelizar', emoji: '🎯', label: 'Fidelizar clientes'  },
];

/* ── AI: variantes de respuestas pre-hechas (con datos reales) ──
   Cada categoría devuelve varias variantes; el asistente rota entre
   ellas para que cada consulta se sienta distinta, fresca y útil. */
function buildResponseVariants(stats) {
  const {
    servicioTop       = 'Corte clásico',
    servicioTopPrecio = 0,
    totalCitasMes     = 0,
    diaTopStr         = 'Viernes',
    diaPublicarStr    = 'Jueves',
    totalMiembros     = 0,
    barberoNombres    = [],
  } = stats;

  const precioStr   = servicioTopPrecio ? `$${servicioTopPrecio.toLocaleString('es-CL')}` : '';
  const precioLabel = precioStr ? ` a ${precioStr}` : '';

  // Evita usar cuentas administrativas como "ejemplo de barbero"
  const adminRe        = /admin|administ|recep|geren|due[ñn]|owner|staff|sistema|equipo/i;
  const barberosReales = barberoNombres.filter(n => n && !adminRe.test(n));
  const barberoEj      = barberosReales[0] || 'tu barbero';
  const barbero2       = barberosReales[1] || barberosReales[0] || 'tu equipo';

  return {
    'post-ig': [
      `Tu servicio estrella este mes es **${servicioTop}**${precioLabel}. Eso es lo que la gente quiere ver.\n\n📸 **Caption listo:**\n"Hay cortes que hablan por ti. ✂️\n${servicioTop} — y todavía queda hora esta semana.\n📍 Reserva por el link en bio 👆"\n\n**Publica el ${diaPublicarStr}** entre 18:00 y 20:30: es la antesala de tu día más cargado (${diaTopStr}) y ahí la gente agenda.`,

      `Formato que más guarda la gente: **carrusel antes/después**.\n\n🖼️ **Estructura (3 fotos):**\n1. El "antes", sin filtro, con luz natural\n2. Una toma a mitad del proceso\n3. El resultado final en primer plano\n\n**Caption:**\n"El cambio está en los detalles. ${servicioTop} por ${barberoEj}.\n¿Te toca a ti? Link en bio."\n\nLos carruseles ganan más alcance que una foto sola: Instagram los vuelve a mostrar a quien no deslizó la primera vez.`,

      `No todo es el corte: **vende la experiencia**.\n\n📸 Sube una foto cercana de un detalle — la línea de la barba, el degradado, las herramientas sobre la toalla.\n\n**Caption:**\n"Precisión en cada pasada. Así trabajamos en cada cita.\n${servicioTop}${precioLabel} · Reserva en bio."\n\nEste tipo de post construye marca y justifica tu precio sin tener que hablar de descuentos.`,

      `Tienes **${totalCitasMes} reservas** este mes — úsalas como prueba social.\n\n📸 **Idea:** foto del local con gente + caption de comunidad:\n"Gracias a los ${totalCitasMes} que pasaron este mes por la silla. 🙌\nLa próxima semana hay horas nuevas — agéndate en bio."\n\nMostrar que estás lleno genera más reservas que cualquier oferta: la gente quiere ir donde ya van otros.`,
    ],

    'reel': [
      `El formato rey en barbería: **transformación en 15 segundos**.\n\n🎬 **Guion:**\n1. 2s — cliente llega serio\n2. 3s — manos de **${barberoEj}** trabajando (close-up)\n3. 3s — detalle del degradado\n4. 4s — giro final + sonrisa\n5. Texto: "¿El tuyo? 👀 Link en bio"\n\n🎵 **Audio:** usa una canción que esté en tendencia en Reels esta semana — Instagram prioriza el alcance de los audios en auge.`,

      `Tendencia que funciona: **Reel en POV (primera persona)**.\n\n🎬 Graba desde el punto de vista del cliente: entra al local, lo reciben, se sienta, ve el resultado en el espejo.\n\n**Texto al inicio:** "POV: por fin encontraste tu barbería"\n**Cierre:** "${servicioTop} — reserva en bio"\n\nEl POV genera identificación inmediata: quien mira se imagina ahí. Que dure máximo 12s.`,

      `Reel **ASMR de barbería** — corto y adictivo.\n\n🎬 Solo sonidos reales: la tijera, la máquina, el cepillo, el spray final. Sin música, audio limpio.\n\nTomas:\n• Tijera cortando en cámara lenta\n• La máquina perfilando la nuca\n• La toalla caliente\n\n**Texto final:** "Tu momento de la semana. Reserva en bio."\n\nEste contenido retiene hasta el final, y la retención es lo que más empuja el alcance.`,

      `Reel que te posiciona como experto: **un tip rápido**.\n\n🎬 Ejemplo: "3 errores al pedir un degradado" o "Cómo estirar tu corte 2 semanas más".\n\nFormato: tú a cámara, texto grande, 1 idea por toma, máximo 20s.\n\n**Cierre:** "¿Quieres el tuyo bien hecho? Agenda con ${barberoEj} en bio."\n\nEl contenido educativo se comparte por privado — y cada vez que alguien lo manda a un amigo, es un cliente nuevo potencial.`,
    ],

    'wsp': [
      `Tienes **${totalMiembros} clientes** con tu número guardado. El estado de WhatsApp los alcanza gratis a todos.\n\n💬 **Estado de hoy:**\n"✂️ Quedan pocas horas para el ${diaTopStr}.\nSi no quieres quedar fuera, escríbeme ahora 👇"\n\n+ foto del mejor corte del día.\n\n**Regla de oro:** 1 estado al día, entre 10:00 y 12:00, cuando la gente revisa el teléfono en el primer break.`,

      `El estado no siempre tiene que vender — **muestra el día a día**.\n\n💬 Ideas para esta semana:\n• Video corto del local abriendo: "Listos para hoy 💈"\n• El café antes del primer cliente\n• Un corte en proceso: "Trabajo en curso…"\n\nGenera cercanía y te mantiene presente sin parecer publicidad. Deja la venta directa para 1 de cada 3 estados.`,

      `El estado es perfecto para **ofertas relámpago** que no quieres dejar fijas en Instagram.\n\n💬 "🔥 Solo por hoy: trae a un amigo y el segundo corte tiene 20% off.\nVálido hasta el cierre. Escríbeme para tu hora."\n\nLa urgencia del "solo hoy" + que desaparece en 24h hace que la gente actúe. Úsalo en tus días flojos, no el ${diaTopStr}.`,

      `Usa el estado para **traer de vuelta a los que ya conoces**.\n\n💬 "¿Hace cuánto no pasas? 👀\nUn buen corte dura 3 semanas. Si ya va siendo hora, tengo cupos esta semana."\n\nDe tus ${totalMiembros} contactos siempre hay un grupo "vencido". Este mensaje los activa sin sonar insistente — habla de su corte, no de tu agenda.`,
    ],

    'promo': [
      `Con **${totalCitasMes} reservas** este mes tienes base activa. La fórmula que convierte: **urgencia + beneficio claro + cupos limitados**.\n\n🔥 **Texto listo:**\n"Solo esta semana:\n${servicioTop}${precioLabel} con 15% de descuento.\nÚnicamente **5 cupos** — primero en reservar, primero en la silla.\n👉 Agenda en bio."\n\n**Tip:** ponle siempre fecha de término. Sin deadline, nadie actúa.`,

      `En vez de bajar el precio, **sube el valor**: arma un combo.\n\n🔥 "Pack completo: ${servicioTop} + perfilado de barba + lavado.\nTodo junto, precio especial solo este mes."\n\nEl combo aumenta tu ticket promedio sin sentir que regalas tu trabajo. El cliente percibe que gana más, no que pagas menos.`,

      `Tu día más cargado es el **${diaTopStr}**. La promo no va ahí — va a llenar los días vacíos.\n\n🔥 "CLUB DAYS: lunes y martes con 10% off.\nMismos cortes, misma calidad, mejor precio por venir temprano en la semana."\n\nMover reservas del ${diaTopStr} a inicios de semana equilibra tu carga y te deja huecos premium para clientes nuevos en tu día fuerte.`,

      `Capta clientes nuevos con una **oferta de primera visita**.\n\n🔥 "¿Primera vez con nosotros? Tu ${servicioTop} con 20% off.\nVente, y si te gusta, te quedas."\n\nEse descuento es marketing puro: si el corte es bueno, vuelve a precio completo. Un cliente nuevo vale mucho más que una sola visita.`,
    ],

    'hashtags': [
      `Los hashtags de nicho rinden más que los genéricos. Apunta a **100K–500K** publicaciones.\n\n#️⃣ **Set general:**\n**Grandes:** #barbershop #barber #haircut\n**Medianos:** #barberia #cortedecabello #barberlife\n**Local:** #barberiachile #cortemasculino #fadechile\n\n**Regla:** 8 a 12, al final del caption, separados con puntos. El primer comentario ya no rinde como antes.`,

      `Set enfocado en **degradados y estilo** (para cuando subes un buen fade):\n\n#️⃣ #fade #fadehaircut #degradado #skinfade #barberlife #barbershopconnect #menshair #cortehombre #barberiachile #peluqueriamasculina\n\nMezcla siempre 1 término local. Eso te pone frente a gente que sí puede llegar a tu silla, no solo a likes de otro país.`,

      `Set para contenido de **barba y afeitado**:\n\n#️⃣ #barba #beard #beardstyle #afeitado #barberia #barbergang #beardgang #cuidadodebarba #barbalook #barberiachile\n\n**Pro tip:** rota tus sets. Instagram penaliza repetir exactamente los mismos hashtags en cada post — ten 3 o 4 listas y ve cambiando.`,
    ],

    'fidelizar': [
      `El **80% de tus ingresos** viene de quienes ya te conocen — y tienes **${totalMiembros}** en el club.\n\n🎯 **Secuencia de WhatsApp (3 pasos):**\n1. **2h después del corte:** "¿Cómo quedaste, [nombre]? 💈"\n2. **A las 3 semanas:** "Ya va siendo hora del próximo 😄"\n3. **Al frecuente:** "Esta semana 10% off, solo di tu nombre al llegar."\n\nNada de esto es magia automática: agéndalo en tu calendario y conviértelo en hábito.`,

      `Convierte visitas sueltas en **costumbre** con un sistema de sellos.\n\n🎯 "Cada 5 cortes, el 6º va por la casa."\n\nDe tus ${totalMiembros} clientes, quienes entran al sistema visitan más seguido para "no perder el avance". El truco: regala el primer sello al inscribirse — sentir que ya empezaron los hace volver.`,

      `El mensaje que más cariño genera: el de **cumpleaños**.\n\n🎯 "¡Feliz cumpleaños, [nombre]! 🎉 Este mes tu corte tiene un regalo de nuestra parte. Pásate cuando quieras."\n\nPide la fecha al registrar al cliente. Es un detalle que casi nadie hace en barbería y que la gente recuerda — y comenta.`,

      `Mira quién **no vuelve hace 2 meses** y recupéralo antes de perderlo.\n\n🎯 "Te tenemos abandonado 😅. Tu silla sigue aquí — esta semana, un 15% por volver."\n\nRecuperar a un cliente que ya te conoció cuesta mucho menos que conseguir uno nuevo. Ese grupo es oro que ya tienes guardado en el teléfono.`,
    ],

    'precios': [
      `Hablar de precios es hablar de **valor percibido**, no de números.\n\n💰 Tres reglas:\n1. Nunca pongas el precio solo — ponlo junto a lo que incluye.\n2. Ofrece 3 opciones (básico / completo / premium): la mayoría elige la del medio.\n3. Sube precios de a poco y avisa con anticipación a tus frecuentes.\n\nTu ${servicioTop}${precioLabel} es tu ancla — el resto se compara contra él.`,

      `Si sientes que cobras poco, **no bajes — diferénciate**.\n\n💰 El cliente paga más por: puntualidad, un local cuidado, que recuerdes su nombre y su corte, y una experiencia (música, bebida, conversación).\n\nNada de eso cuesta mucho, y todo justifica un precio más alto que el de la esquina. Compite por experiencia, no por ser el más barato.`,
    ],

    'agenda': [
      `¿Huecos en la agenda? Llénalos sin malgastar tu día fuerte.\n\n📅 Jugadas:\n• Estado de WhatsApp: "Tengo 3 horas libres hoy, primero que escriba"\n• Ofertas SOLO para lunes/martes\n• "Happy hour": descuento en el horario más muerto del día\n\nTus ${totalCitasMes} reservas se concentran el ${diaTopStr}; el objetivo es repartir, no amontonar.`,

      `La agenda vacía se llena con **anticipación, no con suerte**.\n\n📅 Al terminar cada corte, agenda el siguiente ahí mismo: "¿Te dejo la hora para dentro de 3 semanas?".\n\nEs la técnica que más estabiliza una barbería: en vez de esperar que el cliente se acuerde, sales de la cita con la próxima ya reservada. Pruébalo una semana y mira la diferencia.`,
    ],

    'general': [
      `Para tu barbería, las dos jugadas de mayor impacto ahora mismo:\n\n1. Un **antes/después** en Instagram esta semana, con ${servicioTop} de protagonista.\n2. Un **estado de WhatsApp** con los cupos del ${diaTopStr}.\n\nUsa los accesos rápidos de arriba para el texto exacto de cada uno.`,

      `Te lo ordeno por prioridad según tus datos:\n\n📅 **Esta semana:** publica el ${diaPublicarStr} (antesala de tu día fuerte).\n💬 **Diario:** 1 estado de WhatsApp entre 10:00 y 12:00.\n🎯 **De fondo:** una secuencia de fidelización para tus ${totalMiembros} clientes.\n\n¿Por cuál partimos? Toca un acceso rápido y te doy el contenido listo.`,

      `Pregúntame lo que necesites y te doy contenido listo para copiar. Ejemplos:\n\n• "Dame un caption para Instagram"\n• "Idea de Reel para esta semana"\n• "Texto de promoción para el ${diaTopStr}"\n• "Cómo hago volver a mis clientes"\n\nTodo lo armo con tus datos reales: ${totalCitasMes} reservas y ${totalMiembros} clientes en el club.`,

      `Mi recomendación base, sin importar el día: **constancia**.\n\n3 publicaciones a la semana > 10 publicaciones un día y nada el resto. El algoritmo premia a quien aparece seguido.\n\nUn plan simple:\n• Lun: Reel\n• Mié: antes/después\n• Vie: estado de WhatsApp con los cupos del finde\n\nToca un acceso rápido y te doy el contenido de cada uno.`,
    ],
  };
}

/* ── Renderiza **negrita** y saltos de línea ────────────────── */
function renderMd(text) {
  return text.split('\n').map((line, li, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((chunk, ci) => {
      if (chunk.startsWith('**') && chunk.endsWith('**'))
        return <strong key={ci} className="text-white font-semibold">{chunk.slice(2, -2)}</strong>;
      return chunk;
    });
    return (
      <span key={li}>
        {parts}
        {li < arr.length - 1 && <br />}
      </span>
    );
  });
}

/* ── Asistente IA ───────────────────────────────────────────── */
function AsistenteIA({ stats, statsLoading }) {
  const [msgs, setMsgs]   = useState([{ id: 0, role: 'ai', text: 'Analizando tus datos…' }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef  = useRef(null);
  const welcomeSet = useRef(false);

  // Actualiza el saludo una vez que llegan los datos reales
  useEffect(() => {
    if (!statsLoading && !welcomeSet.current) {
      welcomeSet.current = true;
      const top     = stats.servicioTop     || 'Corte clásico';
      const citas   = stats.totalCitasMes   || 0;
      const members = stats.totalMiembros   || 0;
      const welcomes = [
        `Hola, revisé tus números del último mes 👀. Tu servicio más pedido es **${top}** con **${citas} reservas**, y tienes **${members} clientes** en el club de fidelidad. ¿Qué armamos hoy?`,
        `Listo, ya analicé tu mes 💈. **${citas} reservas**, **${members} clientes** en el club y **${top}** como tu corte estrella. Dime qué necesitas o toca un acceso rápido.`,
        `Hola 👋. Con tus datos a mano: **${top}** lidera tus reservas (**${citas}** este mes) y tu club ya suma **${members} clientes**. ¿Por dónde partimos — Instagram, WhatsApp o fidelización?`,
      ];
      setMsgs(prev => [
        {
          ...prev[0],
          text: welcomes[Math.floor(Math.random() * welcomes.length)],
        },
        ...prev.slice(1),
      ]);
    }
  }, [statsLoading, stats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  // Rota entre las variantes de cada categoría evitando repetir la última
  const variantIdx = useRef({});
  const pickVariant = (id, variants) => {
    const arr = variants[id] || variants['general'];
    if (!arr || !arr.length) return '';
    const last = variantIdx.current[id] ?? -1;
    let next = Math.floor(Math.random() * arr.length);
    if (arr.length > 1 && next === last) next = (next + 1) % arr.length;
    variantIdx.current[id] = next;
    return arr[next];
  };

  // Detecta la intención de un mensaje libre y la mapea a una categoría
  const routeIntent = (text) => {
    const t = text.toLowerCase();
    if      (/instagram|post|foto|feed|publicaci/.test(t))            return 'post-ig';
    else if (/reel|video|reels|tiktok|grabar/.test(t))               return 'reel';
    else if (/whatsapp|wsp|estado|difus|status/.test(t))             return 'wsp';
    else if (/promo|descuent|oferta|rebaja|2x1|cup[oó]n/.test(t))     return 'promo';
    else if (/hashtag|#|etiqueta/.test(t))                           return 'hashtags';
    else if (/fidel|client|membr|club|lealtad|recurr|vuelv/.test(t)) return 'fidelizar';
    else if (/precio|cobr|tarifa|valor|caro|barato/.test(t))         return 'precios';
    else if (/agenda|hora libre|cupo|vac[ií]o|llenar|flojo/.test(t)) return 'agenda';
    return 'general';
  };

  const sendAI = (userText, promptId = null) => {
    setMsgs(m => [...m, { id: Date.now(), role: 'user', text: userText }]);
    setTyping(true);

    setTimeout(() => {
      const variants = buildResponseVariants(stats);
      const id = (promptId && variants[promptId]) ? promptId : routeIntent(userText);
      const reply = pickVariant(id, variants);

      setTyping(false);
      setMsgs(m => [...m, { id: Date.now() + 1, role: 'ai', text: reply }]);
    }, 850 + Math.random() * 500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">

      {/* Header */}
      <div
        className="chat-header-synaptech flex items-center gap-2.5 px-4 py-3 border-b border-slate-800"
        style={{ background: 'linear-gradient(135deg, #0f0f12 0%, #151200 100%)' }}
      >
        <div
          className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700"
        >
          <img src="/logo1.png" alt="SynapTech" className="w-5 h-5 object-contain" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Asistente Synaptech IA</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Caption e ideas para tus redes</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-slate-500">{statsLoading ? 'cargando…' : 'activo'}</span>
        </div>
      </div>

      {/* Chips de acceso rápido */}
      <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-2 bg-slate-900/50">
        {AI_CHIPS.map(c => (
          <button
            key={c.id}
            onClick={() => !typing && sendAI(`${c.emoji} ${c.label}`, c.id)}
            disabled={typing || statsLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-slate-800/80 border border-slate-700/50 text-slate-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all disabled:opacity-40"
          >
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Mensajes */}
      <div className="px-4 py-3 space-y-3 overflow-y-auto bg-slate-900/20" style={{ maxHeight: 220 }}>
        {msgs.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'ai' && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-[#D4AF37]/20 bg-[#D4AF37]/10"
              >
                <Sparkles size={10} style={{ color: '#D4AF37' }} />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-[12px] leading-relaxed ${msg.role === 'ai' ? 'chat-bubble-ai' : ''}`}
              style={
                msg.role === 'user'
                  ? { background: '#D4AF37', color: '#0a0807', borderBottomRightRadius: 4, fontWeight: 500 }
                  : { background: 'rgba(255,255,255,0.04)', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 }
              }
            >
              {renderMd(msg.text)}
            </div>
          </div>
        ))}

        {/* Indicador de escritura */}
        {typing && (
          <div className="flex justify-start gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-[#D4AF37]/20 bg-[#D4AF37]/10"
            >
              <Sparkles size={10} style={{ color: '#D4AF37' }} />
            </div>
            <div
              className="px-3 py-3 rounded-2xl bg-slate-800 border border-slate-700/60"
              style={{ borderBottomLeftRadius: 4 }}
            >
              <div className="flex gap-1 items-center h-3">
                {[0, 150, 300].map(delay => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-3 pt-2 border-t border-slate-800/60 bg-slate-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Pregunta sobre marketing…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !typing && input.trim() && (sendAI(input.trim()), setInput(''))}
            disabled={typing}
            className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37] transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => { if (input.trim() && !typing) { sendAI(input.trim()); setInput(''); } }}
            disabled={!input.trim() || typing}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 self-center"
            style={{
              background: input.trim() && !typing ? '#D4AF37' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Send size={12} style={{ color: input.trim() && !typing ? '#0a0807' : '#555' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── RecomendadorBannersIA (Módulo AI Nuevo) ────────────────── */
function RecomendadorBannersIA({ stats, statsLoading, onApply }) {
  const [loading, setLoading] = useState(false);
  const [aiStep, setAiStep]   = useState(0);

  const steps = [
    'Leyendo métricas comerciales del local...',
    'Comparando tasas de conversión por día...',
    'Generando copys de alta persuasión...',
    'Diseñando esquemas CTA optimizados...'
  ];

  const triggerScan = () => {
    setLoading(true);
    setAiStep(0);
    let cur = 0;
    const interval = setInterval(() => {
      cur += 1;
      if (cur < steps.length) {
        setAiStep(cur);
      } else {
        clearInterval(interval);
        setLoading(false);
      }
    }, 550);
  };

  useEffect(() => {
    triggerScan();
  }, []);

  const campaigns = useMemo(() => {
    const {
      servicioTop = 'Corte clásico',
      servicioTopPrecio = 0,
      totalCitasMes = 0,
      diaTopStr = 'Viernes',
      totalMiembros = 0,
    } = stats;

    const precioStr = servicioTopPrecio ? ` a $${servicioTopPrecio.toLocaleString('es-CL')}` : '';

    return [
      {
        id: 'star-service',
        label: 'Campaña: Servicio Estrella',
        titulo: '¡VIVE NUESTRO CORTE ESTRELLA!',
        descripcion: `Prueba el servicio favorito de la casa: ${servicioTop}${precioStr}. ¡Reserva hoy!`,
        imagen: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800',
        ctaTexto: 'Reservar mi lugar',
        ctaUrl: 'index.html',
        tag: 'Alta Conversión',
        analisis: `Promociona tu servicio más solicitado (${servicioTop}, con ${totalCitasMes} citas). Ideal para captar nuevos clientes con imagen de alta calidad.`
      },
      {
        id: 'low-days',
        label: 'Campaña: Nivelación de Tráfico',
        titulo: 'CLUB DAYS: 10% DE DESCUENTO',
        descripcion: `Agenda tu hora para Lunes o Martes y obtén un descuento exclusivo en tu cita de la semana.`,
        imagen: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800',
        ctaTexto: 'Reservar con 10% Off',
        ctaUrl: 'index.html',
        tag: 'Balancear Flujo',
        analisis: `Tus días de mayor afluencia son los ${diaTopStr}. Sugerimos incentivar reservas a principios de semana para balancear la carga operativa.`
      },
      {
        id: 'club-fidelidad',
        label: 'Campaña: Club de Fidelidad',
        titulo: '¡SÚMATE AL CLUB Y GANA!',
        descripcion: `Acumula sellos en cada visita y canjéalos por cortes y productos gratis de regalo.`,
        imagen: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&q=80&w=800',
        ctaTexto: 'Registrarme al Club',
        ctaUrl: 'registro.html',
        tag: 'Fidelización',
        analisis: `Tienes ${totalMiembros} clientes en el club. Este banner incentiva la lealtad y el valor del ciclo de vida del cliente frecuente.`
      }
    ];
  }, [stats]);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
            <img src="/logo1.png" alt="SynapTech" className="w-4 h-4 object-contain" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">SYNAPTECH IA™</h3>
            <p className="text-[9px] text-[#D4AF37] font-bold font-mono tracking-wider">BANNER ADVISOR v1.2</p>
          </div>
        </div>
        <button 
          onClick={triggerScan} 
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-[#D4AF37] hover:bg-slate-800/50 transition-colors disabled:opacity-30"
          title="Recalcular análisis">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#D4AF37]/10 animate-ping" />
              <Cpu size={20} className="text-[#D4AF37] animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-white tracking-wide font-sans">Analizando agendas...</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed animate-pulse">{steps[aiStep]}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-500 leading-normal">
              Selecciona una plantilla de campaña recomendada para rellenar instantáneamente el banner promocional:
            </p>

            <div className="space-y-3">
              {campaigns.map((camp) => (
                <button
                  key={camp.id}
                  onClick={() => onApply(camp)}
                  className="w-full text-left bg-slate-900/65 hover:bg-slate-800/40 border border-slate-800/80 hover:border-[#D4AF37]/35 rounded-xl p-3 flex flex-col gap-2 transition-all group relative overflow-hidden">
                  
                  <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-bl-2xl group-hover:from-[#D4AF37]/15 transition-all" />
                  
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider">{camp.label}</span>
                    <span className="text-[8px] px-1.5 py-0.5 bg-slate-800 border border-slate-700/60 rounded-full text-slate-400 group-hover:text-[#D4AF37] transition-all font-semibold font-mono">
                      {camp.tag}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-white truncate group-hover:text-[#D4AF37] transition-colors">{camp.titulo}</h5>
                    <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">{camp.descripcion}</p>
                  </div>

                  <div className="border-t border-slate-800/60 my-0.5 pt-1.5">
                    <p className="text-[9px] text-slate-500 leading-normal">
                      <strong className="text-slate-400">Auditoría IA:</strong> {camp.analisis}
                    </p>
                  </div>

                  <div className="absolute bottom-2 right-2 p-1 bg-slate-800 border border-slate-700 text-slate-400 group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] group-hover:text-black rounded-lg transition-all flex items-center justify-center">
                    <Plus size={10} className="stroke-[3]" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-slate-950/70 border-t border-slate-800/60 flex items-center gap-1.5 text-[9px] text-slate-500 justify-center">
        <span>🛡️</span>
        <span>Recomendaciones cruzadas con el club de fidelidad y visitas.</span>
      </div>
    </div>
  );
}

/* ── Marketing (componente principal) ───────────────────────── */
/* ── Generador de imagen para Historia de Instagram (campaña) ───── */
function drawCampaignStory(canvas, { titulo, descripcion, ctaTexto, showCta, showDesc, bgColor, shopName, heroImg, logoImg }) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const dark  = lum(bgColor) > 0.6;
  const fg    = dark ? '#111827' : '#FFFFFF';
  const muted = dark ? 'rgba(17,24,39,0.6)' : 'rgba(255,255,255,0.65)';
  const ph    = dark ? 'rgba(17,24,39,0.08)' : 'rgba(255,255,255,0.10)';
  const ctaBg = dark ? '#111827' : '#FFFFFF';
  const ctaTx = dark ? '#FFFFFF' : '#111827';
  const PAD = 90;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  // Cabecera: logo + nombre
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let tx = PAD;
  if (logoImg) { const LS = 88; drawCover(ctx, logoImg, PAD, 96, LS, LS, LS / 2); tx = PAD + LS + 24; }
  ctx.fillStyle = fg;
  ctx.font = `800 38px ${STORY_FONT}`;
  ctx.fillText(wrapLines(ctx, shopName || '', W - tx - PAD, 1)[0] || '', tx, 142);

  // Hero (imagen de la campaña)
  let y = 230;
  const heroH = 760, heroW = W - PAD * 2;
  if (heroImg) {
    drawCover(ctx, heroImg, PAD, y, heroW, heroH, 36);
  } else {
    ctx.fillStyle = ph;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(PAD, y, heroW, heroH, 36); else ctx.rect(PAD, y, heroW, heroH);
    ctx.fill();
    ctx.fillStyle = muted; ctx.textAlign = 'center'; ctx.font = `700 36px ${STORY_FONT}`;
    ctx.fillText('Sin imagen', W / 2, y + heroH / 2);
    ctx.textAlign = 'left';
  }
  y += heroH + 70;

  // Eyebrow
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = muted; ctx.font = `800 28px ${STORY_FONT}`;
  ctx.fillText('PROMOCIÓN', PAD, y);
  y += 56;

  // Título (hasta 3 líneas)
  ctx.fillStyle = fg; ctx.font = `800 66px ${STORY_FONT}`;
  const tLines = wrapLines(ctx, titulo || 'Título de la campaña', W - PAD * 2, 3);
  tLines.forEach(l => { ctx.fillText(l, PAD, y); y += 78; });
  y += 8;

  // Descripción (hasta 4 líneas)
  if (showDesc && descripcion) {
    ctx.fillStyle = muted; ctx.font = `400 36px ${STORY_FONT}`;
    const dLines = wrapLines(ctx, descripcion, W - PAD * 2, 4);
    dLines.forEach(l => { ctx.fillText(l, PAD, y); y += 50; });
    y += 16;
  }

  // CTA pill
  if (showCta && (ctaTexto || '').trim()) {
    const label = ctaTexto.trim();
    ctx.font = `800 38px ${STORY_FONT}`;
    const tw = ctx.measureText(label).width;
    const padX = 44, pillH = 92, pillW = Math.min(W - PAD * 2, tw + padX * 2 + 50);
    ctx.fillStyle = ctaBg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(PAD, y, pillW, pillH, pillH / 2); else ctx.rect(PAD, y, pillW, pillH);
    ctx.fill();
    ctx.fillStyle = ctaTx; ctx.textBaseline = 'middle';
    ctx.fillText(label, PAD + padX, y + pillH / 2);
    // flecha
    ctx.font = `800 40px ${STORY_FONT}`;
    ctx.fillText('→', PAD + padX + tw + 18, y + pillH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // Pie: marca abajo a la derecha
  ctx.textAlign = 'right';
  ctx.fillStyle = muted; ctx.font = `700 30px ${STORY_FONT}`;
  ctx.fillText('SynapTech Spa', W - PAD, H - 90);
  ctx.textAlign = 'left';
}

function CampaignStoryGenerator({ campaign, shopName, logoUrl, onClose }) {
  const canvasRef = useRef(null);
  const [showCta,  setShowCta]  = useState(true);
  const [showDesc, setShowDesc] = useState(true);
  const [bgColor,  setBgColor]  = useState('#0F172A');
  const [heroImg,  setHeroImg]  = useState(null);
  const [logoImg,  setLogoImg]  = useState(null);
  const [loadingImgs, setLoadingImgs] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoadingImgs(true);
    (async () => {
      const [hero, lg] = await Promise.all([loadImg(campaign.imagen), loadImg(logoUrl)]);
      if (!alive) return;
      setHeroImg(hero); setLogoImg(lg); setLoadingImgs(false);
    })();
    return () => { alive = false; };
  }, [campaign.imagen, logoUrl]);

  useEffect(() => {
    if (canvasRef.current) {
      drawCampaignStory(canvasRef.current, {
        titulo: campaign.titulo, descripcion: campaign.descripcion, ctaTexto: campaign.ctaTexto,
        showCta, showDesc, bgColor, shopName, heroImg, logoImg,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCta, showDesc, bgColor, campaign, heroImg, logoImg]);

  const descargar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let url;
    try { url = canvas.toDataURL('image/png'); }
    catch {
      drawCampaignStory(canvas, { titulo: campaign.titulo, descripcion: campaign.descripcion, ctaTexto: campaign.ctaTexto, showCta, showDesc, bgColor, shopName, heroImg: null, logoImg: null });
      try { url = canvas.toDataURL('image/png'); } catch { alert('No se pudo exportar la imagen.'); return; }
    }
    const link = document.createElement('a');
    link.download = `historia-campana-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = url; link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto no-scrollbar rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg transition-colors">
          <X size={16} />
        </button>

        <div className="p-5 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Share2 size={18} className="text-[#D4AF37]" /> Imagen para Historia</h3>
          <p className="text-xs text-slate-500 mt-0.5">Genera una imagen 9:16 de tu campaña para subir a Instagram.</p>
        </div>

        <div className="p-5 grid md:grid-cols-2 gap-6">
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="rounded-xl border border-slate-800 shadow-lg" style={{ width: 260, height: 'auto' }} />
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Mostrar</p>
              <div className="space-y-2">
                <label className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                  <span className="text-sm text-white flex items-center gap-2"><AlignLeft size={14} className="text-[#D4AF37]" /> Descripción</span>
                  <input type="checkbox" checked={showDesc} onChange={e => setShowDesc(e.target.checked)} className="w-4 h-4 accent-[#D4AF37]" />
                </label>
                <label className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                  <span className="text-sm text-white flex items-center gap-2"><Link2 size={14} className="text-[#D4AF37]" /> Botón (CTA)</span>
                  <input type="checkbox" checked={showCta} onChange={e => setShowCta(e.target.checked)} className="w-4 h-4 accent-[#D4AF37]" />
                </label>
              </div>
              {loadingImgs && (
                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-slate-600 border-t-[#D4AF37] rounded-full animate-spin" /> Cargando imagen…
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Color de fondo</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {STORY_BG_PRESETS.map(c => (
                  <button key={c} onClick={() => setBgColor(c)} title={c}
                    className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${bgColor.toLowerCase() === c.toLowerCase() ? 'border-[#D4AF37]' : 'border-slate-700'}`}
                    style={{ background: c }} />
                ))}
              </div>
              <label className="flex items-center gap-3 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 bg-transparent border-0 cursor-pointer" />
                <span className="text-sm text-slate-300">Color personalizado</span>
                <span className="ml-auto text-xs font-mono text-slate-500">{bgColor.toUpperCase()}</span>
              </label>
            </div>

            <button onClick={descargar} className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-yellow-500 text-black text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
              <Download size={16} /> Descargar imagen (PNG)
            </button>
            <p className="text-[11px] text-slate-600 text-center">Formato 1080×1920</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Marketing() {
  const tenant = useTenant();
  const [form,         setForm]         = useState(EMPTY);
  const [showHelp,     setShowHelp]     = useState(false);
  const [storyOpen,    setStoryOpen]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [stats,        setStats]        = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const fileInputRef = useRef(null);
  const savedTimer = useRef(null);

  /* Carga config del banner */
  useEffect(() => {
    getDoc(tenantDoc('config', 'anuncio'))
      .then(snap => { if (snap.exists()) setForm({ ...EMPTY, ...snap.data() }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Carga estadísticas para el asistente IA */
  useEffect(() => {
    async function loadStats() {
      try {
        const desde = daysAgoStr(30);
        const [citasSnap, usersSnap, serviciosSnap, barberosSnap] = await Promise.all([
          getDocs(query(tenantCol('citas'), where('fecha', '>=', desde))),
          getDocs(tenantCol('users')),
          getDocs(tenantCol('servicios')),
          getDocs(tenantCol('barberos')),
        ]);

        const citas = citasSnap.docs.map(d => d.data());

        // Servicio más popular
        const svcCount = {};
        const svcPrice = {};
        citas.forEach(c => {
          if (!c.servicioNombre) return;
          svcCount[c.servicioNombre] = (svcCount[c.servicioNombre] || 0) + 1;
          if (c.precio) svcPrice[c.servicioNombre] = c.precio;
        });
        const [[servicioTop] = []] = Object.entries(svcCount).sort((a, b) => b[1] - a[1]);

        // Día más ocupado
        const dayCounts = {};
        citas.forEach(c => {
          if (!c.fecha) return;
          const dow = new Date(c.fecha + 'T12:00:00').getDay();
          dayCounts[dow] = (dayCounts[dow] || 0) + 1;
        });
        const [[busiestDow] = []] = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
        const diaTopStr      = busiestDow !== undefined ? DIAS[+busiestDow]           : 'Viernes';
        const prevDow        = busiestDow !== undefined ? ((+busiestDow + 6) % 7)     : 4;
        const diaPublicarStr = DIAS[prevDow];

        // Barberos activos
        const barberoNombres = barberosSnap.docs
          .map(d => d.data())
          .filter(b => b.activo !== false && !b._mainDocId)
          .map(b => b.nombre);

        const fallbackServicio = serviciosSnap.docs[0]?.data().nombre || 'Corte clásico';

        setStats({
          totalCitasMes:     citas.length,
          servicioTop:       servicioTop || fallbackServicio,
          servicioTopPrecio: servicioTop ? (svcPrice[servicioTop] || 0) : 0,
          diaTopStr,
          diaPublicarStr,
          totalMiembros:     usersSnap.size,
          barberoNombres,
        });
      } catch {
        setStats({
          servicioTop: 'Corte clásico',
          totalCitasMes: 0,
          totalMiembros: 0,
          diaTopStr: 'Viernes',
          diaPublicarStr: 'Jueves',
          barberoNombres: [],
        });
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = { ...form, updatedAt: serverTimestamp() };
      if (form.activo) payload.versionId = Date.now().toString();
      await setDoc(tenantDoc('config', 'anuncio'), payload);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  /* Sube una imagen desde el dispositivo a Storage y la usa como imagen del banner */
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (!file.type.startsWith('image/')) {
      setUploadError('El archivo debe ser una imagen.');
      if (e.target) e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen supera los 5 MB. Usa una más liviana.');
      if (e.target) e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const tid      = resolveTenantId();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const prefix   = tid === 'elegance' ? '' : `tenants/${tid}/`;
      const path     = `${prefix}marketing/${Date.now()}_${safeName}`;
      const snap     = await uploadBytes(
        storageRef(storage, path),
        file,
        { contentType: file.type || 'image/jpeg' },
      );
      const url = await getDownloadURL(snap.ref);
      setForm(f => ({ ...f, imagen: url }));
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.code === 'storage/unauthorized'
        ? 'Sin permiso para subir. Verifica que tu sesión esté activa.'
        : `Error al subir: ${err.message}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleApplyCampaign = (camp) => {
    setForm(f => ({
      ...f,
      titulo: camp.titulo,
      descripcion: camp.descripcion,
      imagen: camp.imagen,
      ctaTexto: camp.ctaTexto,
      ctaUrl: camp.ctaUrl,
      activo: true, // Lo activamos por defecto al aplicar para mayor comodidad
    }));
  };

  const field = 'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Megaphone size={20} className="text-[#D4AF37]" />
              Marketing & Campañas
            </h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona el banner publicitario de la app y optimiza tus campañas con recomendaciones IA en tiempo real.
          </p>
        </div>
        <button
          onClick={() => setStoryOpen(true)}
          title="Generar imagen para historia de Instagram"
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors shrink-0"
        >
          <Share2 size={16} className="text-[#D4AF37]" /> Imagen historia
        </button>
      </div>

      {storyOpen && (
        <CampaignStoryGenerator
          campaign={form}
          shopName={tenant.name || 'Campaña'}
          logoUrl={tenant.logo || ''}
          onClose={() => setStoryOpen(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Formulario y Vista Previa (col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Preview card */}
          {form.imagen && (() => {
            const estilo = form.estilo || 'panel';
            const GOLD = '#D4AF37', GOLD_RGB = '212,175,55', ON_GOLD = '#1a1208';
            const bgImg = { backgroundImage: `url('${form.imagen}')`, backgroundSize: 'cover', backgroundPosition: 'center' };

            // Contenido reutilizable (etiqueta, título, descripción, CTA)
            const Content = ({ titleClr, descClr, eyebrowClr, ctaBg, ctaTxt, shadow }) => (
              <>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1 font-mono" style={{ color: eyebrowClr }}>Buzón de Anuncios — Vista Previa en Vivo</p>
                <p className="text-base font-black leading-tight mb-1" style={{ color: titleClr, textShadow: shadow ? '0 2px 8px rgba(0,0,0,0.7)' : undefined }}>{form.titulo || 'Título del anuncio'}</p>
                {form.descripcion && <p className="text-xs leading-snug mb-3 max-w-xl" style={{ color: descClr, textShadow: shadow ? '0 1px 4px rgba(0,0,0,0.6)' : undefined }}>{form.descripcion}</p>}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md cursor-default" style={{ background: ctaBg, color: ctaTxt }}>
                  {form.ctaTexto || 'Reservar mi lugar'}
                </span>
              </>
            );

            if (estilo === 'bloque') return (
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex flex-col">
                <div style={{ height: 92, ...bgImg }} />
                <div style={{ background: GOLD, padding: '14px 16px' }}>
                  <Content titleClr={ON_GOLD} descClr="rgba(26,18,8,0.8)" eyebrowClr="rgba(26,18,8,0.6)" ctaBg="#111111" ctaTxt={GOLD} />
                </div>
              </div>
            );
            if (estilo === 'wash') return (
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-800" style={{ minHeight: 180, ...bgImg }}>
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, rgba(${GOLD_RGB},0.93) 0%, rgba(${GOLD_RGB},0.80) 100%)` }} />
                <div className="relative z-10 p-5 flex flex-col justify-end" style={{ minHeight: 180 }}>
                  <Content titleClr={ON_GOLD} descClr="rgba(26,18,8,0.8)" eyebrowClr="rgba(26,18,8,0.65)" ctaBg="#111111" ctaTxt={GOLD} />
                </div>
              </div>
            );
            if (estilo === 'degradado') return (
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-800" style={{ minHeight: 180, ...bgImg }}>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%)' }} />
                <div className="relative z-10 p-5 flex flex-col justify-end" style={{ minHeight: 180 }}>
                  <Content titleClr="#fff" descClr="rgba(255,255,255,0.85)" eyebrowClr={GOLD} ctaBg={GOLD} ctaTxt={ON_GOLD} shadow />
                </div>
              </div>
            );
            // panel (por defecto)
            return (
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-800" style={{ minHeight: 180, ...bgImg }}>
                <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.30)' }} />
                <div className="relative z-10 p-4 flex flex-col justify-end" style={{ minHeight: 180 }}>
                  <div className="rounded-xl p-4" style={{ background: 'rgba(12,14,20,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <Content titleClr="#fff" descClr="rgba(255,255,255,0.75)" eyebrowClr={GOLD} ctaBg={GOLD} ctaTxt={ON_GOLD} />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-md">

            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-semibold text-white">Publicar Anuncio en App</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {form.activo ? 'El banner es visible de forma inmediata en la app de reservas de tus clientes.' : 'Oculto — los clientes no lo ven.'}
                </p>
              </div>
              <button
                onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                  form.activo
                    ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {form.activo
                  ? <><ToggleRight size={18} /> Activo</>
                  : <><ToggleLeft  size={18} /> Inactivo</>}
              </button>
            </div>

            <div className="border-t border-slate-800/80" />

            <div>
              <label className={lbl}>
                <span className="inline-flex items-center gap-1.5"><Type size={11} /> Título de Campaña</span>
              </label>
              <input
                className={field}
                placeholder="¡VIVE EL MUNDIAL EN ELEGANCE!"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>

            <div>
              <label className={lbl}>
                <span className="inline-flex items-center gap-1.5"><AlignLeft size={11} /> Mensaje / Descripción</span>
              </label>
              <textarea
                className={`${field} resize-none`}
                rows={2.5}
                placeholder="Ven a ver los partidos con tu barbero favorito y una cerveza helada de cortesía."
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>

            <div>
              <label className={lbl}>
                <span className="inline-flex items-center gap-1.5"><Image size={11} /> Imagen promocional</span>
              </label>

              {/* Dos opciones disponibles: subir un archivo del dispositivo o pegar una URL */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50 shrink-0"
                >
                  {uploading
                    ? <span className="w-3.5 h-3.5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    : <Upload size={14} />}
                  {uploading ? 'Subiendo…' : 'Subir imagen'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <input
                  className={field}
                  placeholder="…o pega una URL: https://images.unsplash.com/..."
                  value={form.imagen}
                  onChange={e => setForm(f => ({ ...f, imagen: e.target.value }))}
                />
              </div>

              {uploadError
                ? <p className="text-[10px] text-red-400 mt-1">{uploadError}</p>
                : <p className="text-[10px] text-slate-600 mt-1">
                    Sube una foto desde tu dispositivo o pega una URL. Usa una imagen horizontal (16:9 o 2:1); el estilo de abajo asegura que el texto se lea con cualquier imagen.
                  </p>}
            </div>

            <div>
              <label className={lbl}>Estilo del banner</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ESTILOS_BANNER.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, estilo: s.id }))}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                      (form.estilo || 'panel') === s.id
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <span className={`block text-xs font-bold ${(form.estilo || 'panel') === s.id ? 'text-white' : 'text-slate-300'}`}>{s.label}</span>
                    <span className="block text-[10px] text-slate-500 leading-tight mt-0.5">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Texto de Llamado a Acción (CTA)</label>
                <input
                  className={field}
                  placeholder="Reservar mi lugar"
                  value={form.ctaTexto}
                  onChange={e => setForm(f => ({ ...f, ctaTexto: e.target.value }))}
                />
              </div>
              <div>
                <label className={lbl}>
                  <span className="inline-flex items-center gap-1.5"><Link2 size={11} /> Enlace de destino (CTA URL)</span>
                </label>
                <input
                  className={field}
                  placeholder="index.html"
                  value={form.ctaUrl}
                  onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {saved
                ? <p className="text-xs font-semibold text-emerald-400">✓ Anuncio guardado con éxito. Cambios aplicados en tiempo real.</p>
                : <span />}
              <button
                onClick={handleSave}
                disabled={saving || !form.titulo}
                className="flex items-center gap-2 px-5 py-2 bg-[#D4AF37] hover:bg-yellow-500 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
              >
                {saving
                  ? <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : <Save size={15} />}
                {saving ? 'Guardando…' : 'Guardar y Publicar'}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 px-4 py-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-500 leading-relaxed shadow-sm">
            <Megaphone size={14} className="text-slate-600 shrink-0 mt-0.5" />
            <span>
              Al guardar con el banner <strong className="text-slate-400">activo</strong> se genera un nuevo identificador de versión (<strong className="text-slate-400">versionId</strong>).
              Esto dibuja automáticamente una notificación circular sobre el icono del Club en la app del cliente,
              indicándole la existencia de una novedad comercial en el local.
            </span>
          </div>

        </div>

        {/* Columna Derecha: Asistente IA (Chat) y Recomendador de Banners (col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Módulo Nuevo: Recomendador IA de Banners */}
          <RecomendadorBannersIA 
            stats={stats} 
            statsLoading={statsLoading} 
            onApply={handleApplyCampaign} 
          />

          {/* Asistente IA (Chat) de Marketing */}
          <AsistenteIA 
            stats={stats} 
            statsLoading={statsLoading} 
          />

        </div>

      </div>

      {showHelp && (
        <HelpModal title="Ayuda — Marketing" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-white">Marketing</strong> configuras el banner que aparece en la app de tus clientes.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>El <span className="text-white">Asistente Synaptech IA</span> lee tus datos reales (reservas, clientes, servicios) y genera captions listos para copiar en tus publicaciones.</li>
            <li>El <span className="text-white">Synaptech IA™ Banner Advisor</span> analiza las reservas de tu local y propone estrategias promocionales y de nivelación de tráfico de alta conversión.</li>
            <li>Haz clic en <span className="text-[#D4AF37] font-semibold">auto-completar</span> sobre cualquier recomendación de campaña para rellenar los datos de tu anuncio de forma instantánea.</li>
            <li>Configura un <span className="text-white">anuncio activo</span> con imagen, título y enlace para captar la atención de tus clientes.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
