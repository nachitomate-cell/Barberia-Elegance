import { useState, useEffect, useRef } from 'react';
import {
  Megaphone, Image, Type, AlignLeft, Link2,
  ToggleLeft, ToggleRight, Save, Sparkles, Send,
} from 'lucide-react';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import { getDoc, getDocs, setDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { tenantDoc, tenantCol } from '../lib/tenantUtils';

/* ── Banner form default ────────────────────────────────────── */
const EMPTY = {
  titulo:      '',
  descripcion: '',
  imagen:      '',
  ctaTexto:    'Reservar mi lugar',
  ctaUrl:      'index.html',
  activo:      false,
};

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

/* ── AI: genera respuestas con datos reales ─────────────────── */
function buildResponses(stats) {
  const {
    servicioTop      = 'Corte clásico',
    servicioTopPrecio = 0,
    totalCitasMes    = 0,
    diaTopStr        = 'Viernes',
    diaPublicarStr   = 'Jueves',
    totalMiembros    = 0,
    barberoNombres   = [],
  } = stats;

  const precioStr   = servicioTopPrecio ? `$${servicioTopPrecio.toLocaleString('es-CL')}` : '';
  const precioLabel = precioStr ? ` a ${precioStr}` : '';
  const barberoEj   = barberoNombres[0] || 'tu barbero';

  return {
    'post-ig': `Tu servicio más solicitado este mes es **${servicioTop}**${precioLabel} — exactamente lo que hay que mostrar.\n\nCaption sugerido:\n\n"El favorito del mes no falla. ✂️ ${servicioTop}${precioLabel} y con hora libre esta semana.\n📍 [Tu dirección] — Reserva por el link en bio 👆"\n\n**Mejor momento para publicar:** el día antes de tu día más ocupado. Según tus reservas, ese es el **${diaPublicarStr}** entre 18:00 y 20:30.`,

    'reel': `El formato que más funciona en barberías es **transformación en 15 segundos**.\n\nEstructura:\n1. 2s — cliente llega\n2. 3s — manos de **${barberoEj}** trabajando\n3. 3s — resultado final con zoom out\n4. Texto en pantalla: "¿El tuyo? 👀 Link en bio"\n\n**Audio:** busca en Reels qué canción está "en auge" en Chile esta semana y úsala directamente — Instagram la prioriza en el alcance.`,

    'wsp': `Tienes **${totalMiembros} clientes** con tu número guardado. El estado de WhatsApp Business los alcanza a todos gratis.\n\nIdeas para esta semana:\n\n• "✂️ Horas disponibles **${diaTopStr}** — quedan pocos lugares: [link]"\n• Foto del mejor corte del día + "¿El tuyo para cuándo? 📲"\n• "Solo hoy: trae a un amigo y el segundo tiene 10% off"\n\n**Regla:** 1 estado por día publicado entre 10:00 y 12:00.`,

    'promo': `Con **${totalCitasMes} reservas** este mes tienes una base activa. La fórmula que convierte: **urgencia + beneficio claro + cupos limitados**.\n\nTexto listo para copiar:\n\n"🔥 Solo esta semana:\n${servicioTop}${precioLabel} con 15% de descuento.\n\nÚnicamente **5 cupos** — primero en reservar se lo lleva.\n👉 Agenda ahora: [link de reserva]\n📲 O escribe directo al WhatsApp"\n\n**Tip:** ponle siempre una fecha de término. Sin fecha límite nadie actúa.`,

    'hashtags': `Los hashtags de nicho funcionan mejor que los genéricos. Apunta a rangos de **100K–500K** publicaciones.\n\nSet recomendado:\n**Grandes:** #barbershop #barber #haircut\n**Medianos:** #barberia #cortedecabello #barberlife\n**Local:** #barberiachile #cortemasculino #barberviña\n\n**Regla:** usa entre 8 y 12. Ponlos al final del caption separados con puntos. El primer comentario ya no funciona.`,

    'fidelizar': `El **80% de tus ingresos** viene de quienes ya te conocen — y tienes **${totalMiembros} clientes** en el club.\n\nSecuencia de WhatsApp de 3 pasos:\n\n1. **2h después del corte:** "¿Cómo quedaste, [nombre]? 💈"\n2. **Cada 3-4 semanas:** "Ya va siendo hora del próximo corte 😄"\n3. **Exclusiva frecuentes:** "Esta semana 10% off — solo di el código al llegar"\n\n**Instagram:** pídele al cliente permiso para mencionar su corte. Que él lo comparta es el mejor marketing gratuito que existe.`,
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
      setMsgs(prev => [
        {
          ...prev[0],
          text: `Hola, revisé tus datos del último mes. Tu servicio más solicitado es **${top}** con **${citas} reservas** y tienes **${members} clientes** en el club de fidelidad. ¿Qué trabajamos hoy?`,
        },
        ...prev.slice(1),
      ]);
    }
  }, [statsLoading, stats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  const sendAI = (userText, promptId = null) => {
    setMsgs(m => [...m, { id: Date.now(), role: 'user', text: userText }]);
    setTyping(true);

    setTimeout(() => {
      const responses = buildResponses(stats);
      let reply;

      if (promptId && responses[promptId]) {
        reply = responses[promptId];
      } else {
        const t = userText.toLowerCase();
        if      (t.includes('instagram') || t.includes('post') || t.includes('foto'))             reply = responses['post-ig'];
        else if (t.includes('reel') || t.includes('video') || t.includes('reels'))               reply = responses['reel'];
        else if (t.includes('whatsapp') || t.includes('wsp') || t.includes('estado'))            reply = responses['wsp'];
        else if (t.includes('promo') || t.includes('descuento') || t.includes('oferta'))         reply = responses['promo'];
        else if (t.includes('hashtag') || t.includes('#'))                                        reply = responses['hashtags'];
        else if (t.includes('fidel') || t.includes('cliente') || t.includes('membr'))            reply = responses['fidelizar'];
        else reply = `Para tu barbería, las dos acciones de mayor impacto ahora mismo son:\n\n1. Publicar un **antes/después** en Instagram esta semana\n2. Enviar un estado de WhatsApp con los cupos del **${stats.diaTopStr || 'viernes'}**\n\nUsa los accesos rápidos de arriba para obtener el texto exacto.`;
      }

      setTyping(false);
      setMsgs(m => [...m, { id: Date.now() + 1, role: 'ai', text: reply }]);
    }, 850 + Math.random() * 500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800"
        style={{ background: 'linear-gradient(135deg, #0f0f12 0%, #151200 100%)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          <Sparkles size={15} style={{ color: '#D4AF37' }} />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Asistente IA</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Lee tus datos y aconseja sobre Instagram y WhatsApp</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-slate-500">{statsLoading ? 'cargando…' : 'en línea'}</span>
        </div>
      </div>

      {/* Chips de acceso rápido */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-2">
        {AI_CHIPS.map(c => (
          <button
            key={c.id}
            onClick={() => !typing && sendAI(`${c.emoji} ${c.label}`, c.id)}
            disabled={typing || statsLoading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
          >
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Mensajes */}
      <div className="px-4 py-3 space-y-3 overflow-y-auto" style={{ maxHeight: 340 }}>
        {msgs.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {msg.role === 'ai' && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.2)' }}
              >
                <Sparkles size={10} style={{ color: '#D4AF37' }} />
              </div>
            )}
            <div
              className="max-w-[85%] px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed"
              style={
                msg.role === 'user'
                  ? { background: '#D4AF37', color: '#0a0807', borderBottomRightRadius: 4, fontWeight: 500 }
                  : { background: 'rgba(255,255,255,0.05)', color: '#d1d5db', border: '1px solid rgba(255,255,255,0.07)', borderBottomLeftRadius: 4 }
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
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.2)' }}
            >
              <Sparkles size={10} style={{ color: '#D4AF37' }} />
            </div>
            <div
              className="px-3 py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderBottomLeftRadius: 4 }}
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
      <div className="px-4 pb-4 pt-1 border-t border-slate-800/60">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Pregunta sobre marketing…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !typing && input.trim() && (sendAI(input.trim()), setInput(''))}
            disabled={typing}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => { if (input.trim() && !typing) { sendAI(input.trim()); setInput(''); } }}
            disabled={!input.trim() || typing}
            className="w-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-30"
            style={{
              background: input.trim() && !typing ? '#D4AF37' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Send size={14} style={{ color: input.trim() && !typing ? '#0a0807' : '#555' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Marketing (componente principal) ───────────────────────── */
export default function Marketing() {
  const [form,         setForm]         = useState(EMPTY);
  const [showHelp,     setShowHelp]     = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [stats,        setStats]        = useState({});
  const [statsLoading, setStatsLoading] = useState(true);
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
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone size={20} className="text-[#D4AF37]" />
            Marketing
          </h1>
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestiona el banner publicitario y obtén ideas con el asistente IA.
        </p>
      </div>

      {/* Asistente IA — oculto temporalmente */}
      {/* <AsistenteIA stats={stats} statsLoading={statsLoading} /> */}

      {/* Preview card */}
      {form.imagen && (
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ minHeight: 170, backgroundImage: `url('${form.imagen}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.1) 100%)' }} />
          <div className="relative z-10 p-5 flex flex-col justify-end" style={{ minHeight: 170 }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-[#D4AF37]">Vista previa</p>
            <p className="text-base font-black text-white leading-tight mb-1">{form.titulo || 'Título del anuncio'}</p>
            <p className="text-xs text-white/60 leading-snug mb-3">{form.descripcion}</p>
            <span
              className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black"
              style={{ background: '#D4AF37' }}
            >
              {form.ctaTexto || 'Reservar mi lugar'}
            </span>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">

        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-semibold text-white">Publicar anuncio</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {form.activo ? 'Visible para todos los clientes.' : 'Oculto — los clientes no lo ven.'}
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

        <div className="border-t border-slate-800" />

        <div>
          <label className={lbl}>
            <span className="inline-flex items-center gap-1.5"><Type size={11} /> Título</span>
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
            <span className="inline-flex items-center gap-1.5"><AlignLeft size={11} /> Descripción</span>
          </label>
          <textarea
            className={`${field} resize-none`}
            rows={2}
            placeholder="Ven a ver los partidos con tu barbero favorito."
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          />
        </div>

        <div>
          <label className={lbl}>
            <span className="inline-flex items-center gap-1.5"><Image size={11} /> URL de la imagen</span>
          </label>
          <input
            className={field}
            placeholder="https://images.unsplash.com/..."
            value={form.imagen}
            onChange={e => setForm(f => ({ ...f, imagen: e.target.value }))}
          />
          <p className="text-[10px] text-slate-600 mt-1">
            Usa una imagen horizontal (16:9 o 2:1) con sujeto en la parte superior.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Texto del botón</label>
            <input
              className={field}
              placeholder="Reservar mi lugar"
              value={form.ctaTexto}
              onChange={e => setForm(f => ({ ...f, ctaTexto: e.target.value }))}
            />
          </div>
          <div>
            <label className={lbl}>
              <span className="inline-flex items-center gap-1.5"><Link2 size={11} /> URL del botón</span>
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
            ? <p className="text-xs font-semibold text-emerald-400">✓ Guardado — los clientes verán el cambio en su próxima carga.</p>
            : <span />}
          <button
            onClick={handleSave}
            disabled={saving || !form.titulo}
            className="flex items-center gap-2 px-5 py-2 bg-[#D4AF37] hover:bg-yellow-500 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <Save size={15} />}
            {saving ? 'Guardando…' : 'Guardar y publicar'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-500 leading-relaxed">
        <Megaphone size={14} className="text-slate-600 shrink-0 mt-0.5" />
        <span>
          Al publicar con el banner <strong className="text-slate-400">activo</strong> se genera un nuevo <strong className="text-slate-400">versionId</strong>.
          Esto activa el punto rojo en el ícono de Fidelización de la app del cliente,
          avisándole que hay un anuncio nuevo sin necesidad de push notifications.
        </span>
      </div>

      {showHelp && (
        <HelpModal title="Ayuda — Marketing" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-white">Marketing</strong> configuras el banner que aparece en la app de tus clientes.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>El <span className="text-white">Asistente IA</span> lee tus datos reales (reservas, clientes, servicios) y genera consejos para Instagram y WhatsApp.</li>
            <li>Sube una <span className="text-white">imagen</span> de promoción (descuentos, nuevos servicios, eventos).</li>
            <li>Agrega un <span className="text-white">título</span>, descripción y enlace opcional al que llevar al cliente.</li>
            <li>Guarda los cambios para que el banner se actualice en tiempo real en la app pública.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
