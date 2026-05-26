import { useState, useEffect } from 'react';
import { addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Headphones, Send, Check, MessageSquare } from 'lucide-react';
import SynapTechNews from '../components/SynapTechNews';
import { tenantCol } from '../lib/tenantUtils';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

const TIPOS = [
  { id: 'sugerencia', label: 'Sugerencia', color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)'  },
  { id: 'reclamo',    label: 'Reclamo',    color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  { id: 'consulta',   label: 'Consulta',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)'  },
  { id: 'otro',       label: 'Otro',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)'  },
];

const MAX_CHARS = 500;

function formatDate(ts) {
  if (!ts) return '—';
  const d    = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7)  return `Hace ${diff} días`;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function Soporte() {
  const [tipo,      setTipo]      = useState('sugerencia');
  const [mensaje,   setMensaje]   = useState('');
  const [showHelp,  setShowHelp]  = useState(false);
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [sendErr,   setSendErr]   = useState('');
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    const q = query(tenantCol('soporte_mensajes'), orderBy('creadoEn', 'desc'), limit(5));
    return onSnapshot(q, snap =>
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {},
    );
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!mensaje.trim() || sending) return;
    setSendErr('');
    setSending(true);
    try {
      await addDoc(tenantCol('soporte_mensajes'), {
        tipo,
        mensaje:   mensaje.trim(),
        creadoEn:  serverTimestamp(),
        leido:     false,
      });
      setMensaje('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {
      setSendErr('No se pudo enviar. Verifica tu conexión.');
    } finally {
      setSending(false);
    }
  }

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none';

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          Soporte
          <HelpButton onClick={() => setShowHelp(true)} />
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Envía sugerencias, reclamos o consultas directamente a SynapTech
        </p>
      </div>

      {/* ── Formulario ────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
          <MessageSquare size={15} className="text-slate-400 shrink-0" />
          <h2 className="text-sm font-semibold text-white">Nuevo mensaje</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Tipo
            </label>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={tipo === t.id
                    ? { background: t.bg, color: t.color, border: `1px solid ${t.border}` }
                    : { background: 'rgba(255,255,255,0.03)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Mensaje
            </label>
            <textarea
              className={inp}
              rows={4}
              value={mensaje}
              onChange={e => setMensaje(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Describe tu sugerencia, reclamo o consulta…"
            />
            <p className="text-right text-xs text-slate-700 mt-1">{mensaje.length}/{MAX_CHARS}</p>
          </div>

          {sendErr && <p className="text-xs text-red-400">{sendErr}</p>}

          <button
            type="submit"
            disabled={!mensaje.trim() || sending}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : sent ? <Check size={15} /> : <Send size={15} />}
            {sent ? '¡Enviado!' : 'Enviar mensaje'}
          </button>
        </form>
      </div>

      {/* ── Historial ─────────────────────────────────────────── */}
      {historial.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
            <Headphones size={15} className="text-slate-400 shrink-0" />
            <h2 className="text-sm font-semibold text-white">Mensajes enviados</h2>
          </div>
          <div className="divide-y divide-slate-800/60">
            {historial.map(m => {
              const t = TIPOS.find(x => x.id === m.tipo) ?? TIPOS[3];
              return (
                <div key={m.id} className="px-5 py-4 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}
                    >
                      {t.label}
                    </span>
                    <span className="text-[10px] text-slate-600">{formatDate(m.creadoEn)}</span>
                    {m.leido && (
                      <span className="ml-auto text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                        <Check size={10} /> Leído por SynapTech
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{m.mensaje}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Novedades SynapTech ───────────────────────────────── */}
      <SynapTechNews />

      {showHelp && (
        <HelpModal title="Cómo contactarnos" onClose={() => setShowHelp(false)}>
          <p>Acá podés enviarnos sugerencias, reportar errores o pedir nuevas funciones. Llegan directo a nuestro equipo en SynapTech.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Tipos de mensaje</p>
            <ul className="list-disc ml-4 space-y-1">
              <li><strong className="text-white">Sugerencia</strong>: idea o mejora que se te ocurra.</li>
              <li><strong className="text-white">Reclamo</strong>: algo no funciona o no te gusta cómo está hecho.</li>
              <li><strong className="text-white">Consulta</strong>: pregunta operativa o de configuración.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Tiempos de respuesta</p>
            <p>Reportes urgentes: respuesta en <strong className="text-white">horas</strong>. Mejoras y sugerencias: las priorizamos según impacto y volumen. Si es bloqueante, marcalo como reclamo.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Más rápido por WhatsApp</p>
            <p>Para algo urgente: <strong className="text-white">+56 9 8356 8212</strong>. El mismo número aparece en el botón verde de WA en /agenda.html.</p>
          </div>

          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Abajo podés ver el feed de novedades (SynapTech News) — actualizaciones, features nuevas y avisos importantes del producto.</p>
        </HelpModal>
      )}
    </div>
  );
}
