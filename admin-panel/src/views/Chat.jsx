import { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare, Send, User, Crown, Globe, Mail, Phone,
  Copy, Check, QrCode, Instagram, ExternalLink, Bell, Sparkles, ArrowRight, ArrowLeft,
  Bot, AlertCircle, Trash2, Loader2,
} from 'lucide-react';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import {
  collection, doc, query, orderBy, onSnapshot,
  addDoc, setDoc, serverTimestamp, getDocs, writeBatch, deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { confirmDialog } from '../lib/confirmDialog';
import { withTimeout } from '../lib/firestore-helpers';

// ── Origen del chat ────────────────────────────────────────────────
// Dos canales distintos llegan a la misma colección Firestore:
//   • 'club'         → cliente registrado escribiendo desde su dashboard
//                      (campos típicos: userEmail).
//   • 'public_chat'  → cliente anónimo escribiendo desde /chat
//                      (campos típicos: userPhone, sin userEmail).
// chat.source lo marcamos explícitamente en los publishers, pero hay docs
// históricos sin marca: para esos deducimos por la shape del doc.
function getChatSource(chat) {
  if (chat.source === 'club' || chat.source === 'public_chat') return chat.source;
  if (chat.userEmail) return 'club';
  if (chat.userPhone && !chat.userEmail) return 'public_chat';
  return 'club'; // default histórico
}

const SOURCE_META = {
  club: {
    label:       'Club',
    Icon:        Crown,
    pill:        'bg-amber-500/15 text-amber-300 ring-amber-400/25',
    pillCompact: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    dot:         'bg-amber-400',
    desc:        'Cliente del Club · escribió desde su dashboard',
  },
  public_chat: {
    label:       'Chat público',
    Icon:        Globe,
    pill:        'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25',
    pillCompact: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    dot:         'bg-emerald-400',
    desc:        'Visitante anónimo · escribió desde el link de Instagram',
  },
};

// Avatar de Syna (bot). BASE_URL respeta el base config de Vite
// ('/gestion-interna/'), así sirve igual en dev (Vite 5173), build estático
// y producción.
const SYNA_AVATAR = `${import.meta.env.BASE_URL || '/'}syna.png`;

function SourcePill({ source, compact = false }) {
  const meta = SOURCE_META[source] || SOURCE_META.club;
  const { Icon } = meta;
  if (compact) {
    // Píldora minúscula tipo SaaS premium — sin icono, solo texto uppercase.
    return (
      <span className={`inline-flex items-center rounded-md font-bold uppercase tracking-wider px-2 py-0.5 text-[9px] ${meta.pillCompact}`}>
        {meta.label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ring-1 font-bold px-2 py-0.5 text-[10px] ${meta.pill}`}>
      <Icon size={11} />
      <span className="uppercase tracking-wider">{meta.label}</span>
    </span>
  );
}

// Mapa nombre-de-accent (Tailwind) → hex. Usado como fallback cuando el tenant
// no expone tenant.brand.hex (solo los Kronnos lo tienen hoy).
const ACCENT_HEX = {
  emerald: '#10b981', amber:  '#f59e0b', cyan:   '#06b6d4',
  red:     '#ef4444', orange: '#f97316', pink:   '#ec4899',
  purple:  '#a855f7', lime:   '#84cc16', zinc:   '#a1a1aa',
  slate:   '#94a3b8',
};

// Devuelve texto blanco/negro según luminancia del hex — evita texto negro
// sobre acentos oscuros (zinc, slate) y texto blanco sobre acentos claros.
function textOnAccent(hex) {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return '#000000';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55 ? '#ffffff' : '#000000';
}

function useAccent() {
  const tenant = useTenant();
  // tenant.brand.hex tiene prioridad (Kronnos), si no lo encontramos cae al
  // mapa de Tailwind. Fallback final: dorado Elegance.
  const hex = tenant.brand?.hex || ACCENT_HEX[tenant.accent] || '#D4AF37';
  return { hex, text: textOnAccent(hex) };
}

function chatDoc(userId) {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? doc(db, 'chats', userId)
    : doc(db, `tenants/${tid}/chats/${userId}`);
}

function chatMsgsCol(userId) {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, 'chats', userId, 'messages')
    : collection(db, `tenants/${tid}/chats/${userId}/messages`);
}

function chatsCol() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, 'chats')
    : collection(db, `tenants/${tid}/chats`);
}

// Elimina un chat completo: todos sus mensajes + el doc.
// Firestore no borra subcolecciones automáticamente, así que recogemos
// todos los mensajes y los borramos en batches de 500 (límite de Firestore).
async function deleteChatCascade(chatId) {
  const msgsCol = chatMsgsCol(chatId);
  const msgsSnap = await withTimeout(getDocs(msgsCol), 15000, 'delete-chat-cascade');
  const docs = [...msgsSnap.docs];
  // Borrar mensajes en chunks de 499 (dejamos 1 lugar libre para el doc raíz
  // en el último chunk, así todo va en transacciones atómicas).
  while (docs.length > 0) {
    const chunk = docs.splice(0, 499);
    const batch = writeBatch(db);
    chunk.forEach(d => batch.delete(d.ref));
    if (docs.length === 0) batch.delete(chatDoc(chatId));
    await batch.commit();
  }
  // Si la subcolección estaba vacía, el doc raíz nunca se borró arriba.
  if (msgsSnap.docs.length === 0) {
    await deleteDoc(chatDoc(chatId));
  }
}

function formatTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffMin = (now - d) / 60000;
  if (diffMin < 1)  return 'ahora';
  if (diffMin < 60) return `${Math.floor(diffMin)}m`;
  if (diffMin < 1440) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

// ─── Lista de chats (columna izquierda) ──────────────────────────
function ChatList({ selectedId, onSelect, chats, filter }) {
  const accent = useAccent();
  const filtered = useMemo(() => {
    if (filter === 'all') return chats;
    return chats.filter(c => getChatSource(c) === filter);
  }, [chats, filter]);

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3 px-6 text-center">
        <MessageSquare size={36} />
        <p className="text-sm">Sin conversaciones aún</p>
        <p className="text-[11px] text-slate-700 leading-relaxed">
          Cuando un cliente te escriba desde el Club o el chat público
          aparecerá acá.
        </p>
      </div>
    );
  }

  if (filtered.length === 0) {
    const meta = SOURCE_META[filter];
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3 px-6 text-center">
        {meta?.Icon ? <meta.Icon size={32} /> : <MessageSquare size={32} />}
        <p className="text-sm">Sin mensajes de {meta?.label || filter}</p>
        <p className="text-[11px] text-slate-700 leading-relaxed">{meta?.desc}</p>
      </div>
    );
  }

  return (
    <ul className="p-2">
      {filtered.map(chat => {
        const source = getChatSource(chat);
        const meta   = SOURCE_META[source] || SOURCE_META.club;
        const contact = chat.userEmail || chat.userPhone;
        const needsHuman = !!chat.needsHumanAttention;
        const isSelected = selectedId === chat.id;
        return (
          <li key={chat.id} className="mb-1 last:mb-0">
            <button
              onClick={() => onSelect(chat.id, chat.userName)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-slate-800'
                  : needsHuman
                    ? 'bg-amber-500/[0.05] hover:bg-amber-500/10'
                    : 'hover:bg-slate-800/50'
              }`}
            >
              {/* Avatar + dot de estado. El border del dot matchea el bg del
                  container (slate-900) para que "resalte" como en apps nativas. */}
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <User size={20} className="text-slate-400" />
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${meta.dot}`}
                  title={meta.label}
                />
              </div>

              {/* Info — flex-1 min-w-0 crítico para el truncate */}
              <div className="flex-1 min-w-0">
                {/* Fila 1: nombre + fecha */}
                <div className="flex justify-between items-baseline mb-0.5">
                  <p className="font-bold text-slate-100 text-base truncate">{chat.userName || 'Cliente'}</p>
                  <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">{formatTime(chat.updatedAt)}</span>
                </div>

                {/* Fila 2: badges + contacto */}
                <div className="flex items-center gap-2 mb-1">
                  <SourcePill source={source} compact />
                  {needsHuman && (
                    <span className="inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wider px-2 py-0.5 text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <AlertCircle size={9} />
                      Atender
                    </span>
                  )}
                  {contact && (
                    <span className="text-[11px] text-slate-500 truncate">{contact}</span>
                  )}
                </div>

                {/* Fila 3: último mensaje */}
                <span className={`text-sm truncate w-full block ${
                  chat.hasUnread ? 'font-semibold text-primary' : 'text-slate-400'
                }`}>{chat.lastMessage || '...'}</span>
              </div>

              {chat.hasUnread && (
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent.hex }} />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Tabs de filtro por origen (segmented control iOS) ─────────
function SourceFilterTabs({ value, onChange, counts }) {
  const tabs = [
    { id: 'all',         label: 'Todos',        count: counts.all },
    { id: 'club',        label: 'Club',         count: counts.club        ?? 0 },
    { id: 'public_chat', label: 'Chat público', count: counts.public_chat ?? 0 },
  ];
  return (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl w-full overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const active = value === t.id;
          const meta = SOURCE_META[t.id];
          const Icon = meta?.Icon;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-slate-700 text-primary shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {Icon && <Icon size={13} />}
              <span>{t.label}</span>
              <span className={`tabular-nums px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                active ? 'bg-slate-600 text-slate-100' : 'bg-slate-800 text-slate-300'
              }`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Conversación activa (columna derecha) ───────────────────────
function ChatConversation({ userId, userName, chatMeta, onBack, onDeleted }) {
  const [messages, setMessages]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending]     = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const accent = useAccent();
  const source  = chatMeta ? getChatSource(chatMeta) : 'club';
  const contact = chatMeta?.userEmail || chatMeta?.userPhone;
  const ContactIcon = chatMeta?.userEmail ? Mail : Phone;

  const handleDelete = async () => {
    if (deleting) return;
    const ok = await confirmDialog({
      title: 'Eliminar conversación',
      message: `Vas a borrar toda la conversación con ${userName || 'este cliente'}. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteChatCascade(userId);
      onDeleted?.();
    } catch (err) {
      console.error('[chat] delete failed:', err);
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const q = query(chatMsgsCol(userId), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [userId]);

  // Estado del bot en ESTE chat (doc.botDisabled = fuente de verdad
  // compartida con chat.html). Al responder un humano se pausa solo;
  // desde aquí se puede reactivar.
  const [botPausado, setBotPausado] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(chatDoc(userId), snap => {
      setBotPausado(snap.exists() && snap.data().botDisabled === true);
    });
    return unsub;
  }, [userId]);

  const toggleBot = async () => {
    if (!userId) return;
    await setDoc(chatDoc(userId), { botDisabled: !botPausado }, { merge: true });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = inputText.trim();
    if (!text || sending || !userId) return;
    setSending(true);
    setInputText('');
    try {
      const ts = serverTimestamp();
      await addDoc(chatMsgsCol(userId), { text, sender: 'admin', timestamp: ts });
      await setDoc(chatDoc(userId), {
        lastMessage: text,
        updatedAt:   ts,
        hasUnread:   false,
        // Takeover automático: si responde un humano, el bot se pausa en
        // este chat (server-side, aplica en todos los dispositivos del
        // cliente). Se reactiva con el botón del header.
        botDisabled: true,
      }, { merge: true });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-900/60"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.625rem)' }}
      >
        {/* Back button — solo mobile */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden -ml-1 w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 active:scale-95 transition-all shrink-0"
            aria-label="Volver a la lista"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
            <User size={16} className="text-slate-400" />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-900 ${SOURCE_META[source].dot}`}
            title={SOURCE_META[source].label}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-primary truncate">{userName || 'Cliente'}</p>
            <SourcePill source={source} compact />
          </div>
          {contact ? (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
              <ContactIcon size={10} />
              <span className="truncate">{contact}</span>
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">Chat en tiempo real</p>
          )}
        </div>

        {/* Toggle del bot en este chat */}
        <button
          type="button"
          onClick={toggleBot}
          className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl active:scale-95 transition-all ${
            botPausado
              ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              : 'text-emerald-400 hover:bg-emerald-500/10'
          }`}
          aria-label={botPausado ? 'Reactivar bot en este chat' : 'Pausar bot en este chat'}
          title={botPausado ? 'Bot pausado (respondes tú) — toca para reactivarlo' : 'Bot activo en este chat — toca para pausarlo'}
        >
          <Bot size={17} />
        </button>

        {/* Botón eliminar conversación */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-500/10 active:scale-95 transition-all disabled:opacity-50"
          aria-label="Eliminar conversación"
          title="Eliminar conversación"
        >
          {deleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 flex flex-col gap-2.5 sm:gap-3 overscroll-contain">
        {messages.map((m, i) => {
          const isAdmin = m.sender === 'admin';
          const isBot   = m.sender === 'bot';
          // El bot va a la izquierda como el cliente, pero con tinte distintivo
          const side = isAdmin ? 'right' : 'left';
          // Avatar de Syna solo en el primer mensaje de un bloque consecutivo
          // del bot (si el anterior NO es del bot mostramos avatar). Los demás
          // muestran un spacer para alinear las burbujas.
          const prevSender = i > 0 ? messages[i - 1].sender : null;
          const isFirstOfBotBlock = isBot && prevSender !== 'bot';
          return (
            <div key={m.id} className={`flex items-end gap-2 ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
              {isBot && (
                isFirstOfBotBlock
                  ? <img
                      src={SYNA_AVATAR}
                      alt="Syna"
                      loading="lazy"
                      className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-cyan-500/30 bg-slate-800 mb-1"
                    />
                  : <span className="w-6 shrink-0" aria-hidden />
              )}
              <div className={`flex flex-col ${isBot ? 'items-start' : isAdmin ? 'items-end' : 'items-start'} max-w-[80%] sm:max-w-[65%] min-w-0`}>
                {isFirstOfBotBlock && (
                  <div className="flex items-center gap-1 mb-0.5 ml-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">
                    <Bot size={10} />
                    <span>Syna · Bot</span>
                  </div>
                )}
                <div
                  className={`w-fit text-left text-[14px] sm:text-sm rounded-2xl px-3.5 sm:px-4 py-2 leading-snug break-words ${
                    isAdmin
                      ? 'rounded-tr-none font-medium'
                      : isBot
                        ? 'rounded-tl-none text-cyan-50 bg-cyan-900/40 border border-cyan-500/20'
                        : 'rounded-tl-none text-primary bg-slate-800'
                  }`}
                  style={isAdmin ? { background: accent.hex, color: accent.text, whiteSpace: 'pre-wrap' } : { whiteSpace: 'pre-wrap' }}
                >
                  {m.imageUrl && (
                    <a href={m.imageUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
                      <img
                        src={m.imageUrl}
                        alt="Foto del cliente"
                        loading="lazy"
                        className="max-w-[220px] max-h-[260px] w-full object-cover rounded-xl"
                      />
                    </a>
                  )}
                  {m.text}
                  {m.timestamp && (
                    <span
                      className={`block text-[10px] mt-1 ${isAdmin ? '' : isBot ? 'text-cyan-300/60' : 'text-slate-500'}`}
                      style={isAdmin ? { color: accent.text, opacity: 0.55 } : {}}
                    >
                      {formatTime(m.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input — focus border/ring se inyectan via CSS var local del tenant */}
      <div
        className="shrink-0 flex items-end gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-slate-800 bg-slate-900/85 backdrop-blur"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.625rem)',
          '--accent-tenant': accent.hex,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Responder..."
          enterKeyHint="send"
          autoComplete="off"
          autoCapitalize="sentences"
          className="flex-1 min-h-[44px] bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-[15px] sm:text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-[var(--accent-tenant)] focus:ring-1 focus:ring-[var(--accent-tenant)] transition-colors"
        />
        <button
          onClick={send}
          disabled={!inputText.trim() || sending}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          style={{ background: accent.hex }}
          aria-label="Enviar mensaje"
        >
          <Send size={17} style={{ color: accent.text }} />
        </button>
      </div>
    </div>
  );
}

// ─── Dominio público de chat por tenant ─────────────────────────
// El subdominio "canónico" para compartir el link de chat. En dev (localhost
// del Vite admin) caemos al puerto :3000 que sirve los HTMLs públicos.
const PUBLIC_DOMAIN = {
  elegance:             'barberiaelegance.synaptechspa.cl',
  ferraza:              'barberiaferraza.synaptechspa.cl',
  gitana:               'gitananails.synaptechspa.cl',
  mapubarbershop:       'mapubarbershop.synaptechspa.cl',
  chameleon:            'chameleonbarber.synaptechspa.cl',
  deluxeperfumes:       'deluxeperfumes.synaptechspa.cl',
  lumen:                'djonesbarberia.synaptechspa.cl',
  delnero:              'delnerobarber.synaptechspa.cl',
  marcelo_hairdressing: 'marcelopalma.synaptechspa.cl',
  aura:                 'aurasalon.synaptechspa.cl',
  latincaribe:          'latincaribe.synaptechspa.cl',
  machos:               'machos.synaptechspa.cl',
  infinity:             'infinity.synaptechspa.cl',
  sionbarberia:         'studiodieciseis.synaptechspa.cl',
  memphis:              'memphissalon.synaptechspa.cl',
  yugen:                'yugenstudio.cl',
  kronnos_penablanca:   'kronnospenablanca.synaptechspa.cl',
  kronnos_limache:      'kronnoslimache.synaptechspa.cl',
  kronnos_woman:        'kronnoswoman.synaptechspa.cl',
  omegastudio:          'omegastudio.synaptechspa.cl',
  alfamen:              'alfamen.synaptechspa.cl',
  barbersclub:          'barbersclub.synaptechspa.cl',
  elbarberomoderno:     'elbarberomoderno.synaptechspa.cl',
};

function getPublicChatUrl(tenantId) {
  const domain = PUBLIC_DOMAIN[tenantId];
  if (domain) return `https://${domain}/chat`;
  // Fallback dev: el panel corre en :5173, el chat público en :3000
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `http://localhost:3000/chat?local=${tenantId}`;
  }
  // Fallback prod: patrón wildcard {tenantId}.synaptechspa.cl (funciona para
  // tenants nuevos que sigan el naming simple). ANTES caía a synaptechspa.cl
  // que es un repo Next.js distinto y no tiene /chat → 404.
  console.warn('[Chat] Tenant no está en PUBLIC_DOMAIN, usando wildcard fallback:', tenantId);
  return `https://${tenantId}.synaptechspa.cl/chat`;
}

// ─── Banner compacto con el link público — siempre visible arriba
//     de la lista. Acceso rápido para copiar/compartir sin abrir la guía.
function PublicLinkBanner({ onOpenQR }) {
  const tenant   = useTenant();
  const publicUrl = getPublicChatUrl(tenant.id);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* sin clipboard */ }
  };

  // Mostramos el dominio sin "https://" para que se vea más compacto
  const displayUrl = publicUrl.replace(/^https?:\/\//, '');

  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Instagram size={11} className="text-slate-500" />
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          Tu link público
        </p>
      </div>
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-2 pl-4 flex items-center justify-between gap-2">
        <code className="flex-1 text-slate-300 text-sm truncate font-mono min-w-0" title={publicUrl}>
          {displayUrl}
        </code>
        <button
          type="button"
          onClick={copy}
          className="bg-indigo-600 hover:bg-indigo-700 text-primary rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 shrink-0"
          aria-label={copied ? 'Link copiado' : 'Copiar link'}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
        <button
          type="button"
          onClick={onOpenQR}
          className="text-slate-400 hover:text-primary p-2 rounded-lg transition-colors shrink-0"
          aria-label="Ver código QR"
          title="Ver QR para imprimir"
        >
          <QrCode size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Modal QR — bottom sheet en mobile, centrado en desktop ─────
function QRModal({ open, onClose }) {
  const tenant   = useTenant();
  const accent   = useAccent();
  const publicUrl = getPublicChatUrl(tenant.id);
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(publicUrl)}`;

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.25rem)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sheet handle visual */}
        <div className="sm:hidden h-1 w-10 rounded-full bg-slate-700 mx-auto mb-4" />

        <div className="text-center mb-3">
          <h3 className="text-base font-bold text-primary">QR para tu link de chat</h3>
          <p className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">
            Imprime y pega este código en tu local. Tus clientes escanean y entran a chatear.
          </p>
        </div>

        <div className="bg-white rounded-xl p-3 mx-auto" style={{ width: 'fit-content' }}>
          <img
            src={qrUrl}
            alt={`QR para ${publicUrl}`}
            className="w-56 h-56 sm:w-64 sm:h-64 block"
          />
        </div>

        <p className="mt-3 text-center text-[11px] font-mono text-slate-500 break-all px-2">
          {publicUrl.replace(/^https?:\/\//, '')}
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <a
            href={qrUrl}
            download={`qr-chat-${tenant.id}.png`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold transition-all active:scale-95"
            style={{ background: accent.hex, color: accent.text }}
          >
            <QrCode size={14} />
            Descargar PNG
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Guía / onboarding del módulo Mensajes ──────────────────────
// Reemplaza el empty state cuando NO hay chat seleccionado. Explica los
// dos canales, da el link público listo para Instagram + QR para imprimir
// en el local, y deja tips claros.
function MensajesGuide() {
  const tenant   = useTenant();
  const accent   = useAccent();
  const publicUrl = getPublicChatUrl(tenant.id);
  const igCopy    = `📩 Escríbenos directo aquí 👇\n${publicUrl}`;
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(publicUrl)}`;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIg,   setCopiedIg]   = useState(false);
  const [showQR,     setShowQR]     = useState(false);

  const copy = async (text, setFlag) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    } catch { /* sin clipboard */ }
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">

        {/* ── Hero ── */}
        <header className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/70 ring-1 ring-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
            <Sparkles size={11} style={{ color: accent.hex }} />
            Guía rápida
          </div>
          <h2 className="text-2xl font-black tracking-tight text-primary sm:text-[26px]">
            Cómo funcionan los <span style={{ color: accent.hex }}>Mensajes</span>
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Una sola bandeja para los dos canales por los que tus clientes te escriben.
            Sin pasar por WhatsApp.
          </p>
        </header>

        {/* ── 2 canales ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="text-amber-300" />
              <h3 className="text-sm font-bold text-primary">Club</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clientes <b className="text-amber-200">ya registrados</b> que te escriben desde
              su dashboard del Club. Llegan con su nombre y email.
            </p>
            <p className="text-[11px] text-amber-200/70 mt-2">Punto amarillo en el avatar.</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-emerald-300" />
              <h3 className="text-sm font-bold text-primary">Chat público</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Visitantes <b className="text-emerald-200">anónimos</b> que entran al link
              que dejaste en Instagram. Solo dan nombre y teléfono opcional.
            </p>
            <p className="text-[11px] text-emerald-200/70 mt-2">Punto verde en el avatar.</p>
          </div>
        </section>

        {/* ── Tu link público ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 ring-1 ring-slate-700 shrink-0">
              <Instagram size={16} style={{ color: accent.hex }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-primary">Tu link para Instagram</h3>
              <p className="text-[11.5px] text-slate-400 mt-0.5">
                Pégalo en tu bio o en tus Stories. Cuando un cliente lo toque,
                entrará a chatear contigo directo.
              </p>
            </div>
          </div>

          {/* URL display + copiar */}
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-950/80 ring-1 ring-slate-800 px-3 py-2.5">
            <code className="flex-1 text-[12.5px] font-mono text-slate-200 truncate">
              {publicUrl}
            </code>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:text-primary hover:bg-slate-800 transition-colors"
              title="Abrir en nueva pestaña"
            >
              <ExternalLink size={13} />
            </a>
            <button
              type="button"
              onClick={() => copy(publicUrl, setCopiedLink)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-all active:scale-95"
              style={{ background: accent.hex, color: accent.text }}
            >
              {copiedLink ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {/* Acciones extras */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => copy(igCopy, setCopiedIg)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-[11.5px] font-bold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {copiedIg ? <Check size={12} /> : <Instagram size={12} />}
              <span>{copiedIg ? 'Texto copiado' : 'Copiar texto IG'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQR(v => !v)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-[11.5px] font-bold text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <QrCode size={12} />
              <span>{showQR ? 'Ocultar QR' : 'Ver QR para imprimir'}</span>
            </button>
          </div>

          {/* QR expandible */}
          {showQR && (
            <div className="mt-4 flex flex-col items-center gap-2 p-4 rounded-xl bg-white">
              <img
                src={qrUrl}
                alt={`QR para ${publicUrl}`}
                className="w-44 h-44"
              />
              <p className="text-[11px] text-slate-700 font-semibold text-center">
                Imprime y pega este QR en tu local — los clientes lo escanean y entran a chatear.
              </p>
              <a
                href={qrUrl}
                download={`qr-chat-${tenant.id}.png`}
                className="text-[11px] font-bold text-slate-700 underline underline-offset-2 hover:text-black"
              >
                Descargar PNG ↓
              </a>
            </div>
          )}
        </section>

        {/* ── Tips ── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 mb-3">
            Tips de uso
          </h3>
          <ul className="space-y-2.5">
            <li className="flex gap-2.5">
              <Bell size={14} className="shrink-0 mt-0.5" style={{ color: accent.hex }} />
              <span className="text-xs text-slate-300 leading-relaxed">
                <b className="text-primary">Activá las notificaciones push</b> del panel para que te avise apenas llega un mensaje, sin tener que estar mirando.
              </span>
            </li>
            <li className="flex gap-2.5">
              <ArrowRight size={14} className="shrink-0 mt-0.5" style={{ color: accent.hex }} />
              <span className="text-xs text-slate-300 leading-relaxed">
                <b className="text-primary">Filtrá por origen</b> con los tabs de arriba si querés enfocarte solo en clientes del Club o solo en chat público.
              </span>
            </li>
            <li className="flex gap-2.5">
              <ArrowRight size={14} className="shrink-0 mt-0.5" style={{ color: accent.hex }} />
              <span className="text-xs text-slate-300 leading-relaxed">
                <b className="text-primary">El punto del color del local</b> al lado del nombre indica que ese chat tiene mensajes <i>sin leer</i>.
              </span>
            </li>
            <li className="flex gap-2.5">
              <ArrowRight size={14} className="shrink-0 mt-0.5" style={{ color: accent.hex }} />
              <span className="text-xs text-slate-300 leading-relaxed">
                <b className="text-primary">El cliente del Chat público</b> puede dejar su teléfono opcional — si lo hace, lo ves al lado del nombre y podés contactarlo después por WhatsApp.
              </span>
            </li>
            <li className="flex gap-2.5">
              <ArrowRight size={14} className="shrink-0 mt-0.5" style={{ color: accent.hex }} />
              <span className="text-xs text-slate-300 leading-relaxed">
                Si entrás a un chat, <b className="text-primary">se marca como leído automáticamente</b> en cuanto la conversación se abre.
              </span>
            </li>
          </ul>
        </section>

        <p className="text-center text-[10.5px] text-slate-600 pt-2">
          Selecciona una conversación de la lista lateral para empezar a responder.
        </p>
      </div>
    </div>
  );
}

// ─── Vista principal ─────────────────────────────────────────────
export default function Chat() {
  const [selectedId,   setSelectedId]   = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [showHelp,     setShowHelp]     = useState(false);
  const [showQR,       setShowQR]       = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [chats,        setChats]        = useState([]);

  // Stream de chats centralizado (lo usa la lista + el header de conversación)
  useEffect(() => {
    const q = query(chatsCol(), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const counts = useMemo(() => {
    const c = { all: chats.length, club: 0, public_chat: 0 };
    for (const ch of chats) {
      const s = getChatSource(ch);
      if (s in c) c[s] += 1;
    }
    return c;
  }, [chats]);

  const chatMeta = useMemo(
    () => (selectedId ? chats.find(c => c.id === selectedId) : null),
    [chats, selectedId],
  );

  const select = (id, name) => {
    setSelectedId(id);
    setSelectedName(name || 'Cliente');
    // Al abrir un chat se marca como leído y, si tenía bandera de "necesita
    // atención humana" del bot, también se limpia: el dueño está atendiendo.
    setDoc(chatDoc(id), {
      hasUnread: false,
      needsHumanAttention: false,
    }, { merge: true }).catch(() => {});
  };

  return (
    <div data-view="mensajes" className="flex h-[calc(100dvh-4rem)] lg:h-[calc(100vh-4rem)] -mx-5 -my-5 lg:-m-7 overflow-hidden lg:rounded-xl lg:border lg:border-slate-800">

      {/* Columna izquierda — lista de chats.
          Mobile: pantalla completa cuando NO hay chat seleccionado.
          Desktop (lg+): siempre visible al 33%. */}
      <div
        className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col bg-slate-900 w-full lg:w-1/3 lg:min-w-[260px] lg:border-r lg:border-slate-800`}
      >
        <div
          className="px-4 py-3 border-b border-slate-800 shrink-0"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-primary">Mensajes</h2>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Club + chat público en una sola bandeja</p>
        </div>
        <PublicLinkBanner onOpenQR={() => setShowQR(true)} />
        <SourceFilterTabs value={filter} onChange={setFilter} counts={counts} />
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <ChatList
            selectedId={selectedId}
            onSelect={select}
            chats={chats}
            filter={filter}
          />
        </div>
      </div>

      {/* Columna derecha — conversación o guía.
          Mobile: pantalla completa cuando HAY chat seleccionado, oculta
                  si no (la guía solo se ve en desktop).
          Desktop: siempre visible, muestra conversación o guía según haya
                   selección. */}
      <div
        className={`${selectedId ? 'flex' : 'hidden lg:flex'} bg-slate-950 flex-col w-full lg:flex-1`}
      >
        {selectedId ? (
          <ChatConversation
            userId={selectedId}
            userName={selectedName}
            chatMeta={chatMeta}
            onBack={() => setSelectedId(null)}
            onDeleted={() => { setSelectedId(null); setSelectedName(''); }}
          />
        ) : (
          <MensajesGuide />
        )}
      </div>
      <QRModal open={showQR} onClose={() => setShowQR(false)} />
      {showHelp && (
        <HelpModal title="Ayuda — Mensajes" onClose={() => setShowHelp(false)}>
          <p><strong className="text-primary">Mensajes</strong> centraliza dos canales en una sola bandeja:</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>
              <SourcePill source="club" compact /> <span className="text-primary">Club</span>: clientes registrados que te escriben desde su dashboard.
            </li>
            <li>
              <SourcePill source="public_chat" compact /> <span className="text-primary">Chat público</span>: visitantes anónimos que entran por el link <code className="text-slate-300">/chat</code> (típicamente desde Instagram).
            </li>
            <li>Los tabs arriba filtran por origen.</li>
            <li>El punto al lado del avatar indica el canal: <span className="text-amber-300 font-bold">amarillo</span> = Club, <span className="text-emerald-300 font-bold">verde</span> = Chat público.</li>
            <li>El punto del color del local indica que hay <span className="text-primary">mensajes sin leer</span>.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
