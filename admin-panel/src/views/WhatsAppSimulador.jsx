import { useState, useRef, useEffect } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Send, RotateCcw, FlaskConical } from 'lucide-react';
import { resolveTenantId } from '../lib/tenantUtils';

// Simulador — "prueba tu bot antes de soltarlo con clientes reales".
//
// Corre el cerebro COMPLETO (mismo prompt, tu catálogo, tus horas reales) pero
// con las herramientas que escriben neutralizadas en el servidor: no crea
// citas, no gasta bolsa, no aparece en la bandeja. Es lo que convierte el
// módulo de "algo que espero que funcione" a "lo probé y hace esto".
//
// El historial vive acá, en el navegador: es una prueba, no una conversación
// que haya que guardar.

const SUGERENCIAS = [
  'Hola, ¿tienen hora para mañana?',
  '¿Cuánto sale el corte?',
  'Quiero cancelar mi cita',
  '¿Atienden los domingos?',
];

export default function WhatsAppSimulador() {
  const [msgs, setMsgs]       = useState([]);
  const [texto, setTexto]     = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError]     = useState('');
  const finRef = useRef(null);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, pensando]);

  const enviar = async (t) => {
    const mensaje = String(t ?? texto).trim();
    if (!mensaje || pensando) return;
    setTexto('');
    setError('');
    const historial = msgs.map(m => ({ role: m.de === 'bot' ? 'assistant' : 'user', content: m.texto }));
    setMsgs(m => [...m, { de: 'cliente', texto: mensaje }]);
    setPensando(true);
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waSimularBot');
      // tenantId explícito (solo lo honra el servidor para operadores): sin él,
      // probar el bot desde el panel de un local ejecutaba el bot de OTRO.
      const r  = await fn({ texto: mensaje, historial, tenantId: resolveTenantId() });
      if (r.data?.ok === false) {
        setError(r.data.motivo || 'El simulador no está disponible ahora.');
      } else {
        setMsgs(m => [...m, { de: 'bot', texto: r.data?.respuesta || '', tools: r.data?.herramientas || [] }]);
      }
    } catch (e) {
      setError(e.message || 'No se pudo simular la respuesta.');
    } finally {
      setPensando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-primary flex items-center gap-2">
            <FlaskConical size={16} className="text-emerald-400" /> Prueba tu asistente
          </p>
          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
            Escríbele como si fueras un cliente. Usa tu catálogo y tus horas reales, pero <b className="text-slate-400">no agenda nada ni gasta mensajes</b>.
          </p>
        </div>
        {msgs.length > 0 && (
          <button onClick={() => { setMsgs([]); setError(''); }}
            className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-white transition-colors">
            <RotateCcw size={13} /> Reiniciar
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="p-4 space-y-2.5 min-h-[280px] max-h-[52vh] overflow-y-auto">
          {msgs.length === 0 && !pensando && (
            <div className="py-8 text-center">
              <p className="text-[13px] text-slate-400">Empieza la conversación 👇</p>
              <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                {SUGERENCIAS.map(s => (
                  <button key={s} onClick={() => enviar(s)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11.5px] text-slate-300 hover:border-white/25 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.de === 'bot' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                m.de === 'bot'
                  ? 'bg-emerald-500/[0.12] border border-emerald-500/20 text-slate-100'
                  : 'bg-white/[0.06] border border-white/[0.08] text-slate-200'
              }`}>
                {m.texto}
                {m.de === 'bot' && m.tools?.length > 0 && (
                  <p className="mt-1.5 pt-1.5 border-t border-white/10 text-[10px] text-emerald-400/70">
                    Consultó: {[...new Set(m.tools)].join(' · ').replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            </div>
          ))}

          {pensando && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/15 px-4 py-3">
                <span className="inline-flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        <div className="border-t border-white/[0.07] p-2.5 flex items-center gap-2">
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') enviar(); }}
            placeholder="Escribe como cliente…"
            disabled={pensando}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-full px-4 py-2.5 text-[13px] text-primary placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={() => enviar()}
            disabled={pensando || !texto.trim()}
            className="shrink-0 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center text-white transition-colors"
            aria-label="Enviar"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Lo que ves acá es exactamente lo que respondería en WhatsApp. Si algo no te gusta, cámbialo en la pestaña <b className="text-slate-400">Asistente IA</b> (estilo de conversación) o avísanos.
      </p>
    </div>
  );
}
