import { useState, useEffect, useCallback } from 'react';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { RefreshCw, Bot, Hand, MessageSquare, ChevronLeft } from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import { resolveTenantId } from '../lib/tenantUtils';

// Bandeja del local — leer lo que el bot conversó y tomar el control.
//
// Es la pieza que faltaba para que el dueño CONFÍE en el bot: sin poder leer
// una conversación, a la primera queja de un cliente el instinto es apagar el
// módulo entero. Acá ve la transcripción y, si algo se tuerce, toma ese chat
// (pausa el bot 2h solo ahí) o se lo devuelve.
//
// "Tomar el control" no inventa un mecanismo nuevo: escribe el MISMO
// botSilencedUntil que ya activa la anti-colisión cuando el dueño escribe
// desde su teléfono. Un solo interruptor, dos formas de accionarlo.

const fmtHora = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  const hoy = new Date();
  const mismoDia = d.toDateString() === hoy.toDateString();
  return mismoDia
    ? d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
};

export default function WhatsAppBandeja() {
  const [chats,    setChats]    = useState(null);
  const [error,    setError]    = useState('');
  const [abierto,  setAbierto]  = useState(null);   // chatId con la transcripción abierta
  const [operando, setOperando] = useState('');

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setChats(null);
    setError('');
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waMisConversaciones');
      // tenantId explícito: solo lo honra el servidor para operadores, pero sin
      // él un operador viendo otro local recibía los chats de su propio claim.
      const r  = await fn({ limit: 20, tenantId: resolveTenantId() });
      setChats(r.data?.conversaciones || []);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar las conversaciones.');
      // En una recarga silenciosa NO se vacía la lista: el usuario perdía el
      // chat que tenía abierto y caía en "todavía no hay conversaciones", con
      // un error que hablaba de otra cosa. Solo se vacía en la carga inicial.
      if (!silencioso) setChats([]);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Refresco periódico: la pausa dura 2 h y se calcula en el servidor, así que
  // sin esto el chip "Tú tienes el control" seguía mostrándose mucho después de
  // que el bot ya había reanudado. Silencioso para no parpadear la vista.
  useEffect(() => {
    const iv = setInterval(() => { cargar(true); }, 60_000);
    return () => clearInterval(iv);
  }, [cargar]);

  const control = async (chatId, pausar) => {
    setOperando(chatId);
    // Optimista: el botón responde al toque y se corrige solo si el servidor
    // rechaza (misma lección que los toggles de la pestaña Mensajería).
    setChats(cs => cs.map(c => (c.chatId === chatId ? { ...c, pausado: pausar } : c)));
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'waChatControl');
      await fn({ chatId, pausar, tenantId: resolveTenantId() });
      await cargar(true);
    } catch (e) {
      setChats(cs => cs.map(c => (c.chatId === chatId ? { ...c, pausado: !pausar } : c)));
      setError(e.message || 'No se pudo cambiar el control del chat.');
    } finally {
      setOperando('');
    }
  };

  if (chats === null) {
    return <div className="flex justify-center py-16"><Spinner size={28} className="text-slate-500" /></div>;
  }

  const chat = abierto ? chats.find(c => c.chatId === abierto) : null;

  /* ── Transcripción de un chat ── */
  if (chat) {
    return (
      <div className="space-y-4">
        <button onClick={() => setAbierto(null)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={15} /> Volver a la bandeja
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.07]">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-primary truncate">{chat.nombre || 'Cliente'}</p>
              <p className="text-[11px] text-slate-500">{chat.telefono} · {chat.mensajes} mensajes</p>
            </div>
            <button
              onClick={() => control(chat.chatId, !chat.pausado)}
              disabled={operando === chat.chatId}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                chat.pausado
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              }`}
            >
              {chat.pausado ? <><Bot size={13} /> Devolver al bot</> : <><Hand size={13} /> Tomar el control</>}
            </button>
          </div>

          <div className="p-4 space-y-2.5 max-h-[55vh] overflow-y-auto">
            {chat.turnos.length === 0 && (
              <p className="text-[13px] text-slate-500 text-center py-6">Sin mensajes guardados en este chat.</p>
            )}
            {chat.turnos.map((t, i) => (
              <div key={i} className={`flex ${t.de === 'bot' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                  t.de === 'bot'
                    ? 'bg-emerald-500/[0.12] border border-emerald-500/20 text-slate-100'
                    : 'bg-white/[0.05] border border-white/[0.08] text-slate-200'
                }`}>
                  {t.texto}
                </div>
              </div>
            ))}
          </div>
        </div>

        {chat.pausado && (
          <p className="text-[11.5px] text-amber-300/90 leading-relaxed">
            El bot está en pausa en este chat: respóndele tú desde tu WhatsApp. Se reactiva solo en un par de horas, o devuélveselo con el botón de arriba.
          </p>
        )}
      </div>
    );
  }

  /* ── Lista de chats ── */
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-primary">Conversaciones del asistente</p>
          <p className="text-[12px] text-slate-500 mt-0.5">Lee lo que respondió y toma el control cuando quieras contestar tú.</p>
        </div>
        <button onClick={() => cargar()} className="shrink-0 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Actualizar">
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      {chats.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <MessageSquare size={22} className="mx-auto text-slate-600" />
          <p className="text-[13px] text-slate-400 mt-2.5">Todavía no hay conversaciones.</p>
          <p className="text-[11.5px] text-slate-500 mt-1">Aparecerán acá apenas un cliente le escriba a tu WhatsApp.</p>
        </div>
      )}

      {chats.map(c => (
        <button
          key={c.chatId}
          onClick={() => setAbierto(c.chatId)}
          className="w-full text-left rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-white/20 transition-colors p-3.5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13.5px] font-semibold text-primary truncate">
              {c.nombre || 'Cliente'} <span className="font-normal text-slate-500">{c.telefono}</span>
            </p>
            <span className="shrink-0 text-[11px] text-slate-500">{fmtHora(c.actualizado)}</span>
          </div>
          <p className="text-[12px] text-slate-400 mt-1 truncate">
            {c.ultimoDe === 'bot' && <span className="text-emerald-400/80">Bot: </span>}
            {c.ultimoTexto || 'Sin mensajes'}
          </p>
          {c.pausado && (
            <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              <Hand size={10} /> Tú tienes el control
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
