import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import {
  collection, doc, query, orderBy, onSnapshot,
  addDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';

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
function ChatList({ selectedId, onSelect }) {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    const q = query(chatsCol(), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
        <MessageSquare size={36} />
        <p className="text-sm">Sin conversaciones aún</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-800">
      {chats.map(chat => (
        <li key={chat.id}>
          <button
            onClick={() => onSelect(chat.id, chat.userName)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-800/60 ${
              selectedId === chat.id ? 'bg-slate-800' : ''
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
              <User size={18} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white truncate">{chat.userName || 'Cliente'}</p>
                <span className="text-[10px] text-slate-500 shrink-0">{formatTime(chat.updatedAt)}</span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{chat.lastMessage || '...'}</p>
            </div>
            {chat.hasUnread && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#D4AF37' }} />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── Conversación activa (columna derecha) ───────────────────────
function ChatConversation({ userId, userName }) {
  const [messages, setMessages]   = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending]     = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const q = query(chatMsgsCol(userId), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [userId]);

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
      }, { merge: true });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
          <User size={15} className="text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{userName || 'Cliente'}</p>
          <p className="text-[10px] text-slate-500">Chat en tiempo real</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
        {messages.map(m => {
          const isAdmin = m.sender === 'admin';
          return (
            <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] text-sm rounded-2xl px-4 py-2 leading-snug ${
                  isAdmin
                    ? 'rounded-tr-none font-medium text-black'
                    : 'rounded-tl-none text-white bg-slate-800'
                }`}
                style={isAdmin ? { background: '#D4AF37' } : {}}
              >
                {m.text}
                {m.timestamp && (
                  <span className={`block text-[10px] mt-1 ${isAdmin ? 'text-black/50' : 'text-slate-500'}`}>
                    {formatTime(m.timestamp)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-slate-800 bg-slate-900/60">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Responder..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors"
        />
        <button
          onClick={send}
          disabled={!inputText.trim() || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
          style={{ background: '#D4AF37' }}
        >
          <Send size={16} className="text-black" />
        </button>
      </div>
    </div>
  );
}

// ─── Vista principal ─────────────────────────────────────────────
export default function Chat() {
  const [selectedId,   setSelectedId]   = useState(null);
  const [selectedName, setSelectedName] = useState('');
  const [showHelp,     setShowHelp]     = useState(false);

  const select = (id, name) => {
    setSelectedId(id);
    setSelectedName(name || 'Cliente');
    setDoc(chatDoc(id), { hasUnread: false }, { merge: true }).catch(() => {});
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden rounded-xl border border-slate-800">

      {/* Columna izquierda */}
      <div className="w-1/3 min-w-[220px] flex flex-col bg-slate-900 border-r border-slate-800">
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">Mensajes</h2>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Soporte en tiempo real</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatList selectedId={selectedId} onSelect={select} />
        </div>
      </div>

      {/* Columna derecha */}
      <div className="flex-1 bg-slate-950 flex flex-col">
        {selectedId ? (
          <ChatConversation userId={selectedId} userName={selectedName} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-700">
            <MessageSquare size={48} />
            <p className="text-sm font-medium">Selecciona un chat para comenzar</p>
          </div>
        )}
      </div>
      {showHelp && (
        <HelpModal title="Ayuda — Mensajes" onClose={() => setShowHelp(false)}>
          <p><strong className="text-white">Mensajes</strong> es el chat en tiempo real con tus clientes.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Los clientes pueden escribirte desde la <span className="text-white">app pública</span> de la barbería.</li>
            <li>Selecciona una conversación en la columna izquierda para ver y responder los mensajes.</li>
            <li>El punto rojo en el menú lateral indica que hay <span className="text-white">mensajes sin leer</span>.</li>
            <li>Al abrir un chat el contador se marca como leído automáticamente.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
