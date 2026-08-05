import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { resolveTenantId } from '../lib/tenantUtils';
import { Crown, AlertCircle, ChevronRight } from 'lucide-react';

/* ── Aviso: conversaciones que no pueden quedar esperando ─────────────
   El badge del sidebar suma TODO lo no leído en un solo número, así que lo
   urgente se pierde entre las consultas sueltas. Aura llegó a 20 chats
   abiertos con 6 sin leer y nada distinguía cuáles importaban.

   Se avisa por dos motivos, que son distintos:

   · **Piden atención humana** (`needsHumanAttention`): el bot no pudo resolver
     y el cliente pidió hablar con alguien. Da igual el canal — es lo más
     urgente que hay en la bandeja.
   · **Del Club sin responder**: cliente registrado, con nombre y correo, que
     escribió desde su propio dashboard. Dejarlo esperando cuesta bastante más
     caro que no contestarle a un visitante anónimo.

   Al revisar la producción los dos criterios resultaron ser conjuntos
   DISJUNTOS: hoy todos los que piden atención vienen del chat público y
   ninguno del Club. Cruzarlos con Y habría dado un aviso que jamás aparece.

   Abrir un chat limpia las dos banderas (Chat.jsx · select), así que el aviso
   se apaga solo al atender. */

function chatsCol() {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, 'chats')
    : collection(db, `tenants/${tid}/chats`);
}

// Misma regla que Chat.jsx: manda el campo `source` y, si falta (chats
// históricos), el correo delata al cliente del Club.
function esDelClub(chat) {
  if (chat.source === 'club') return true;
  if (chat.source === 'public_chat') return false;
  return !!chat.userEmail;
}

export default function ClubAttentionBanner() {
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const unsubRef = useRef(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
      if (!user) { setChats([]); return; }

      // La colección entera y no dos queries filtradas: son unas pocas decenas
      // de documentos por local y así el cálculo queda a la vista, sin depender
      // de que las banderas se mantengan sincronizadas entre sí.
      unsubRef.current = onSnapshot(
        chatsCol(),
        (snap) => setChats(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        (err) => {
          // Un módulo caído no puede verse igual que "no hay nada pendiente".
          console.warn('[club-atencion] sin acceso a los chats del local:', err?.code || err?.message);
          setChats([]);
        },
      );
    });
    return () => {
      authUnsub();
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const atencion = chats.filter(c => c.needsHumanAttention === true);
  // Sin doble conteo: quien ya está en "atención" no se cuenta otra vez acá.
  const clubSinLeer = chats.filter(c => c.hasUnread === true && esDelClub(c) && c.needsHumanAttention !== true);

  // Estando en Mensajes el aviso sobra: la bandeja está a la vista.
  if ((!atencion.length && !clubSinLeer.length) || location.pathname.includes('/mensajes')) return null;

  const a = atencion.length;
  const c = clubSinLeer.length;
  const soloClub = a === 0;

  const texto = a && c
    ? `${a} pide${a === 1 ? '' : 'n'} atención · ${c} del Club sin responder`
    : a
      ? `${a} cliente${a === 1 ? '' : 's'} esperando que lo${a === 1 ? '' : 's'} atiendas`
      : `${c} cliente${c === 1 ? '' : 's'} del Club sin responder`;

  const Icono = soloClub ? Crown : AlertCircle;

  return (
    <div className="mx-3 sm:mx-4 mt-2 mb-2 h-9 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-400 animate-fade-in">
      <span className="font-medium truncate flex items-center gap-1.5 min-w-0">
        <Icono size={13} className="shrink-0" aria-hidden="true" />
        {texto}
      </span>
      <button
        type="button"
        // Se preselecciona el Club solo si es lo único pendiente. Con ambos
        // tipos en juego, filtrar escondería justo la mitad urgente.
        onClick={() => navigate(`/gestion-interna/mensajes${soloClub ? '?origen=club' : ''}`)}
        className="shrink-0 h-9 px-2 -mr-2 font-bold text-amber-300 hover:underline flex items-center gap-0.5"
      >
        Responder
        <ChevronRight size={13} />
      </button>
    </div>
  );
}
