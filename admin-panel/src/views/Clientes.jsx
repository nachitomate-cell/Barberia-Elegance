import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, User, Phone, Trophy, Plus, Minus, Gift, X, RotateCcw, MessageCircle, Cake, UserX, Send, Sparkles, Bot, RefreshCw, ChevronLeft, ChevronRight, Pencil, Check, Trash2, AlertTriangle, Package } from 'lucide-react';
import {
  onSnapshot, updateDoc, setDoc, deleteDoc, doc, getDocs, query, where, orderBy as firestoreOrderBy,
  increment, arrayUnion, serverTimestamp, runTransaction, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
import { useCollection } from '../hooks/useCollection';
import { useClubUsers } from '../hooks/useClubUsers';
import { useTenant } from '../contexts/TenantContext';
import SlideOver from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

function getNinetyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const NINETY_DAYS_AGO = getNinetyDaysAgo();

/* ── Dominio público por tenant ─────────────────────────────────── */
const PROD_DOMAINS = {
  elegance: 'https://barberiaelegance.synaptechspa.cl',
  ferraza:  'https://barberiaferraza.synaptechspa.cl',
  gitana:   'https://gitananails.synaptechspa.cl',
  sionbarberia: 'https://barberiasion.synaptechspa.cl',
  // Kronnos multi-sede (Camino 1.5): los legacy apuntan a su subdominio para
  // que el link de registro lleve al cliente al booking de esa sede. El pool
  // marca comparte users, así que da lo mismo por dónde entren.
  kronnos:            'https://kronnos.synaptechspa.cl',
  kronnos_penablanca: 'https://kronnospenablanca.synaptechspa.cl',
  kronnos_limache:    'https://kronnoslimache.synaptechspa.cl',
  kronnos_woman:      'https://kronnoswoman.synaptechspa.cl',
};

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

/* ── Utilidades ── */
function calcTier(historicos) {
  if (historicos >= 25) return 'PLATINUM';
  if (historicos >= 10) return 'GOLD';
  return 'SILVER';
}
function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0, 2).join('');
}
function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Stamp grid ── */
function StampGrid({ stamps, premios }) {
  const { id: tenantId } = useTenant();
  const isChameleon = tenantId === 'chameleon';
  const maxCost = premios.length ? Math.max(...premios.map(p => p.costoSellos)) : 10;
  const size    = Math.max(maxCost, stamps, 10);
  const cols    = size <= 10 ? 10 : size <= 15 ? 15 : 20;

  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: size }, (_, i) => {
        const n       = i + 1;
        const filled  = n <= stamps;
        const isPrize = premios.some(p => p.costoSellos === n);
        return (
          <div key={n} className={`relative aspect-square rounded-md border flex items-center justify-center text-[9px] font-bold ${
            filled
              ? isChameleon ? 'bg-black border-zinc-700' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : 'bg-white/3 border-white/8 text-slate-600'
          }`}>
            {filled
              ? isChameleon
                ? <img src="/sellochamaleon.png" style={{ width: '75%', height: '75%', objectFit: 'contain' }} alt="sello" />
                : <i className="ph-fill ph-scissors text-[9px]" />
              : n}
            {isPrize && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400 border border-slate-950" />}
          </div>
        );
      })}
    </div>
  );
}

/* ── Panel de cliente (slide-over) ── */
function ClientePanel({ cliente: init, premios, onClose, esMiembro = true }) {
  const { id: tenantId } = useTenant();
  const [data,        setData]        = useState(init);
  const [citas,       setCitas]       = useState([]);
  const [selPremio,   setSelPremio]   = useState(null);
  const [opLoad,      setOpLoad]      = useState(false);
  const [packRevertLoad, setPackRevertLoad] = useState(null); // idx del pack en reversión
  const [canjeMsg,    setCanjeMsg]    = useState('');
  const [resetOn,     setResetOn]     = useState(false);
  const [fechaCumple, setFechaCumple] = useState(init.fechaNacimiento || '');
  const [cumpleLoad,  setCumpleLoad]  = useState(false);
  const [cumpleMsg,   setCumpleMsg]   = useState('');
  const cumpleTimer = useRef(null);

  const [editMode,    setEditMode]    = useState(false);
  const [editNombre,  setEditNombre]  = useState(init.nombre   || '');
  const [editEmail,   setEditEmail]   = useState(init.email    || '');
  const [editTel,     setEditTel]     = useState(init.telefono || '');
  const [editLoad,    setEditLoad]    = useState(false);
  const [editMsg,     setEditMsg]     = useState('');

  const [delOn,       setDelOn]       = useState(false);
  const [delLoad,     setDelLoad]     = useState(false);
  const [delMsg,      setDelMsg]      = useState('');

  /* Real-time subscription for this client */
  useEffect(() => {
    const ref = doc(tenantCol('users'), init.uid);
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setData({ uid: snap.id, ...d });
        setSelPremio(null);
        // Sync birthday only when input is not focused
        setFechaCumple(prev => document.activeElement?.id === 'cumpleInput-' + snap.id ? prev : (d.fechaNacimiento || ''));
      }
    });
    return unsub;
  }, [init.uid]);

  const guardarCumple = async () => {
    const phone = normalizePhone(data.telefono);
    if (!phone) { setCumpleMsg('Sin teléfono registrado'); return; }
    setCumpleLoad(true);
    try {
      // Escribe en users/{uid} para que la UI lo refleje en onSnapshot
      const userUpdate = { fechaNacimiento: fechaCumple || null, cumpleDia: null };
      if (fechaCumple) {
        const [, m, d] = fechaCumple.split('-');
        userUpdate.cumpleDia = `${m}-${d}`;
      }
      await updateDoc(doc(tenantCol('users'), data.uid), userUpdate);
      // Escribe en clientes/{phone} para que el cron de cumpleaños pueda querying
      const clienteData = {
        nombre:    data.nombre    || '',
        telefono:  data.telefono  || '',
        uid:       data.uid,
        updatedAt: serverTimestamp(),
      };
      if (fechaCumple) {
        const [, m, d] = fechaCumple.split('-');
        clienteData.fechaNacimiento = fechaCumple;
        clienteData.cumpleDia       = `${m}-${d}`;
      } else {
        clienteData.fechaNacimiento = null;
        clienteData.cumpleDia       = null;
      }
      await setDoc(doc(tenantCol('clientes'), phone), clienteData, { merge: true });
      setCumpleMsg('✓ Guardado');
      if (cumpleTimer.current) clearTimeout(cumpleTimer.current);
      cumpleTimer.current = setTimeout(() => setCumpleMsg(''), 2500);
    } catch (e) {
      setCumpleMsg('Error: ' + e.message);
    } finally {
      setCumpleLoad(false);
    }
  };

  const guardarEdicion = async () => {
    const oldPhone = normalizePhone(data.telefono);
    const newPhone = normalizePhone(editTel);
    const nombre   = editNombre.trim();
    const email    = editEmail.trim().toLowerCase();
    const telefono = editTel.trim();

    if (!nombre) { setEditMsg('El nombre no puede estar vacío.'); return; }
    setEditLoad(true);
    setEditMsg('');
    try {
      const userUpdate = { nombre, email, telefono, updatedAt: serverTimestamp() };
      await updateDoc(doc(tenantCol('users'), data.uid), userUpdate);

      const clienteUpdate = { nombre, email, telefono, uid: data.uid, updatedAt: serverTimestamp() };
      if (oldPhone && newPhone && oldPhone !== newPhone) {
        // Teléfono cambió → mover doc en clientes/
        await setDoc(doc(tenantCol('clientes'), newPhone), clienteUpdate, { merge: true });
        try { await deleteDoc(doc(tenantCol('clientes'), oldPhone)); } catch (_) {}
      } else if (newPhone) {
        await setDoc(doc(tenantCol('clientes'), newPhone), clienteUpdate, { merge: true });
      }

      setEditMode(false);
      setEditMsg('');
    } catch (e) {
      setEditMsg('Error: ' + e.message);
    } finally {
      setEditLoad(false);
    }
  };

  const [totalCitas, setTotalCitas] = useState(0);

  /* Load all appointments for this client (one-time) */
  useEffect(() => {
    if (!init.email) return;
    withTimeout(
      getDocs(query(tenantCol('citas'), where('clienteEmail', '==', init.email))),
      15000, 'clientes/citas-cliente'
    )
      .then(snap => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        arr.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.hora || '').localeCompare(a.hora || ''));
        setTotalCitas(arr.length);
        setCitas(arr.slice(0, 10));
      }).catch(() => {});
  }, [init.uid, init.email]);

  // sellosDisponibles = saldo actual para gastar (se descuenta al canjear)
  // sellosHistoricos  = total histórico acumulado (nunca disminuye, determina el nivel)
  const sellosDisponibles = data.sellosDisponibles ?? data.stamps ?? 0;
  const sellosHistoricos  = data.sellosHistoricos  ?? data.stamps ?? 0;
  const stamps = sellosDisponibles; // alias para compatibilidad con UI existente

  const sorted    = [...premios].sort((a, b) => a.costoSellos - b.costoSellos);
  const nextPrize = sorted.find(p => stamps < p.costoSellos);
  const maxCost   = sorted.length ? sorted[sorted.length - 1].costoSellos : 10;
  const denom     = nextPrize ? nextPrize.costoSellos : maxCost;
  const pct       = Math.min(stamps / Math.max(denom, 1) * 100, 100);

  const tier = calcTier(sellosHistoricos);

  const rawTel = (data.telefono || '').replace(/\D/g, '');
  const baseWa = rawTel.length >= 8 ? `56${rawTel.startsWith('56') ? rawTel.slice(2) : rawTel}` : null;
  const waUrl  = baseWa ? `https://wa.me/${baseWa}` : null;
  const waMsg  = baseWa ? (() => {
    const svcTxt = data.servicioFrecuente ? ` tu ${data.servicioFrecuente} favorito` : ' tu próximo servicio';
    const msg = `¡Hola ${data.nombre || ''}! 💈 Llevas ${stamps} sello${stamps !== 1 ? 's' : ''} en tu tarjeta de fidelidad. Te invitamos a realizarte${svcTxt} y seguir acumulando. ¡Te esperamos!`;
    return `https://wa.me/${baseWa}?text=${encodeURIComponent(msg)}`;
  })() : null;

  const accionSello = async delta => {
    setOpLoad(true);
    try {
      await updateDoc(doc(tenantCol('users'), data.uid), {
        // Disponibles siempre se mueve (suma y quita)
        sellosDisponibles: increment(delta),
        // Históricos solo se incrementa — nunca retrocede
        ...(delta > 0 ? { sellosHistoricos: increment(delta), ultimoSello: new Date().toISOString() } : {}),
        // Compatibilidad con campo legacy
        stamps: increment(delta),
        historialSellos: arrayUnion({
          fecha: new Date().toISOString(),
          tipo:  delta > 0 ? 'suma' : 'resta',
          cantidad: delta,
          nota: delta > 0 ? 'Sello añadido manualmente' : 'Sello quitado manualmente',
        }),
      });
    } finally { setOpLoad(false); }
  };

  const canjear = async () => {
    if (!selPremio) { setCanjeMsg('Selecciona un premio primero.'); return; }
    if (sellosDisponibles < selPremio.costoSellos) { setCanjeMsg('Saldo insuficiente.'); return; }
    setOpLoad(true);
    try {
      await updateDoc(doc(tenantCol('users'), data.uid), {
        // Solo se descuenta de disponibles — históricos no se toca
        sellosDisponibles: increment(-selPremio.costoSellos),
        stamps:            increment(-selPremio.costoSellos),
        historialSellos: arrayUnion({
          fecha: new Date().toISOString(), tipo: 'canje',
          cantidad: -selPremio.costoSellos, nota: selPremio.nombre,
        }),
      });
      setCanjeMsg(`✓ ${selPremio.nombre} canjeado`);
    } catch (e) { setCanjeMsg(e.message); }
    finally { setOpLoad(false); }
  };

  const resetSellos = async () => {
    if (!sellosDisponibles) { setResetOn(false); return; }
    setOpLoad(true);
    try {
      // Solo resetea el saldo disponible — el histórico se preserva
      await updateDoc(doc(tenantCol('users'), data.uid), {
        sellosDisponibles: increment(-sellosDisponibles),
        stamps:            increment(-sellosDisponibles),
        historialSellos: arrayUnion({
          fecha: new Date().toISOString(), tipo: 'resta',
          cantidad: -sellosDisponibles, nota: 'Reset manual por admin',
        }),
      });
    } finally { setOpLoad(false); setResetOn(false); }
  };

  /* ── Reversión manual de sesión de pack ─────────────────────────
     Cuando el cliente no llega (no-show) o se cobró por error, el barbero
     devuelve la sesión desde acá. Transacción atómica: suma +1 al saldo del
     pack y escribe un doc `tipo: 'reversion'` en packConsumos con la cita
     que se está revirtiendo (última consumida). Auditoría inmutable → si
     hay disputa, queda el trail. */
  const revertirSesionPack = async (idx) => {
    const p = data.packsActivos?.[idx];
    if (!p) return;
    const total = Math.max(1, Number(p.sesionesTotales) || 1);
    const antes = Number(p.sesionesRestantes || 0);
    const despues = Math.min(total, antes + 1);
    if (despues === antes) return; // ya está al máximo

    const ok = await confirmDialog({
      title: '📦 Devolver sesión',
      message:
        `Se devolverá 1 sesión al pack "${p.nombrePack || 'Pack'}" de ${data.nombre || 'este cliente'}.\n\n` +
        `• Antes:   ${antes} de ${total}\n` +
        `• Después: ${despues} de ${total}\n\n` +
        `Queda registrado en el log (auditoría).\n\n¿Confirmar?`,
      confirmText: 'Devolver sesión',
      cancelText:  'Cancelar',
    });
    if (!ok) return;

    setPackRevertLoad(idx);
    try {
      const userRef = doc(tenantCol('users'), data.uid);
      const logRef  = doc(tenantCol('packConsumos'));
      await runTransaction(db, async (tx) => {
        const uSnap = await tx.get(userRef);
        if (!uSnap.exists()) throw new Error('El cliente ya no existe');
        const uData = uSnap.data() || {};
        const packs = Array.isArray(uData.packsActivos) ? [...uData.packsActivos] : [];
        if (!packs[idx]) throw new Error('El pack ya no existe');

        const totalTx = Math.max(1, Number(packs[idx].sesionesTotales) || 1);
        const antesTx = Number(packs[idx].sesionesRestantes || 0);
        const despuesTx = Math.min(totalTx, antesTx + 1);
        if (despuesTx === antesTx) return; // race — otro proceso ya devolvió

        // Quitamos la última cita consumida para permitir volver a consumirla
        // eventualmente (o quedar como "revertida"). Es el ID de cita que
        // guardamos en el log de reversión para trazar cuál se devolvió.
        const cc = Array.isArray(packs[idx].citasConsumo) ? [...packs[idx].citasConsumo] : [];
        const citaRevertida = cc.length ? cc.pop() : null;

        packs[idx] = {
          ...packs[idx],
          sesionesRestantes: despuesTx,
          citasConsumo:      cc,
          ultimaReversion:   Timestamp.fromMillis(Date.now()),
        };

        tx.update(userRef, { packsActivos: packs, updatedAt: serverTimestamp() });
        tx.set(logRef, {
          tipo:              'reversion',
          userId:            data.uid,
          clienteNombre:     data.nombre || '',
          clienteTelefonoSuf9: (data.telefono ? String(data.telefono).replace(/\D/g, '').slice(-9) : ''),
          packId:            packs[idx].packId || '',
          packNombre:        packs[idx].nombrePack || '',
          sesionesTotales:   totalTx,
          sesionesAntes:     antesTx,
          sesionesDespues:   despuesTx,
          fechaVencimiento:  packs[idx].fechaVencimiento || null,
          citaId:            citaRevertida || '',
          sedeId:            tenantId || '',
          motivo:            'reversion-manual-desde-ficha-cliente',
          createdAt:         serverTimestamp(),
        });
      });
    } catch (e) {
      // Sin toast global en esta vista — mostramos con confirmDialog como aviso.
      await confirmDialog({
        title:       'No se pudo devolver la sesión',
        message:     e.message || 'Intenta nuevamente.',
        confirmText: 'OK',
        cancelText:  '',
      });
    } finally {
      setPackRevertLoad(null);
    }
  };

  const eliminarCliente = async () => {
    setDelLoad(true);
    setDelMsg('');
    try {
      // 1. Perfil principal del Club (sellos, historial, cumpleaños)
      await deleteDoc(doc(tenantCol('users'), data.uid));
      // 2. Doc en clientes/ usado por el cron de cumpleaños (keyed por teléfono).
      //    Para migrados/manuales uid === teléfono, así que se intenta también esa key.
      const phone = normalizePhone(data.telefono);
      if (phone) {
        try { await deleteDoc(doc(tenantCol('clientes'), phone)); } catch (_) {}
      }
      if (data.uid && data.uid !== phone) {
        try { await deleteDoc(doc(tenantCol('clientes'), data.uid)); } catch (_) {}
      }
      onClose();
    } catch (e) {
      setDelMsg('Error: ' + e.message);
      setDelLoad(false);
    }
  };

  const historial = [...(data.historialSellos || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Avatar + info */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
          {data.photoURL
            ? <img src={data.photoURL} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-slate-400">{initials(data.nombre || data.email || '?')}</span>}
        </div>

        {editMode ? (
          <div className="flex-1 min-w-0 space-y-2">
            <input
              autoFocus
              value={editNombre}
              onChange={e => setEditNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
            <input
              type="email"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none transition-colors"
            />
            <input
              type="tel"
              value={editTel}
              onChange={e => setEditTel(e.target.value)}
              placeholder="+56 9 1234 5678"
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-sm text-white font-mono placeholder-slate-500 outline-none transition-colors"
            />
            {editMsg && (
              <p className={`text-xs font-semibold ${editMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>{editMsg}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={guardarEdicion}
                disabled={editLoad}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Check size={12} /> {editLoad ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                onClick={() => { setEditMode(false); setEditMsg(''); setEditNombre(data.nombre || ''); setEditEmail(data.email || ''); setEditTel(data.telefono || ''); }}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{data.nombre || '—'}</p>
              <button
                onClick={() => { setEditNombre(data.nombre || ''); setEditEmail(data.email || ''); setEditTel(data.telefono || ''); setEditMsg(''); setEditMode(true); }}
                className="p-1 rounded-md text-slate-600 hover:text-emerald-400 hover:bg-slate-800 transition-all"
                title="Editar datos del cliente"
              >
                <Pencil size={12} />
              </button>
            </div>
            <p className="text-xs text-slate-500 truncate">{data.email || <span className="italic text-slate-700">Sin correo</span>}</p>
            {data.telefono && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-400">{data.telefono}</p>
                {waUrl && <a href={waUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md hover:bg-emerald-500/10 transition-colors">WA ↗</a>}
                {waMsg && (
                  <a href={waMsg} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-green-400 border border-green-500/30 px-2 py-0.5 rounded-md hover:bg-green-500/10 transition-colors">
                    <MessageCircle size={10} /> Invitar
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Miembro del Club: cuándo se unió */}
      {esMiembro && data.creadoEn && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-emerald-400" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Miembro del Club</p>
            <p className="text-sm text-white font-semibold">Se unió el {formatFecha(data.creadoEn?.toDate ? data.creadoEn.toDate().toISOString() : data.creadoEn)}</p>
          </div>
        </div>
      )}

      {/* Pasado del cliente: AgendaPro / merge legacy */}
      {(data.importedFrom === 'agendapro' || data.fechaRegistroOriginal || data.telefonoAnterior) && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Origen AgendaPro</span>
          </div>
          {data.fechaRegistroOriginal && (
            <p className="text-slate-300">
              <span className="text-slate-500">Cliente desde:</span>{' '}
              <span className="font-semibold text-white">{data.fechaRegistroOriginal}</span>
              <span className="text-slate-600 ml-1">(traído de AgendaPro)</span>
            </p>
          )}
          {data.telefonoAnterior && (
            <p className="text-slate-300">
              <span className="text-slate-500">Teléfono anterior:</span>{' '}
              <span className="font-mono text-white">{data.telefonoAnterior}</span>
              <span className="text-slate-600 ml-1">(antes de registrarse en el Club)</span>
            </p>
          )}
          {data.importedFrom === 'agendapro' && !data.fechaRegistroOriginal && (
            <p className="text-slate-400">Este cliente fue importado desde AgendaPro y fusionado con su cuenta del Club.</p>
          )}
        </div>
      )}

      {/* Fecha de nacimiento */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cake size={13} className="text-slate-500 shrink-0" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cumpleaños</p>
        </div>
        <div className="flex gap-2">
          <input
            id={`cumpleInput-${data.uid}`}
            type="date"
            value={fechaCumple}
            onChange={e => setFechaCumple(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            style={{ colorScheme: 'dark' }}
          />
          <button
            onClick={guardarCumple}
            disabled={cumpleLoad}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-all"
          >
            {cumpleLoad ? '…' : 'Guardar'}
          </button>
        </div>
        {cumpleMsg && (
          <p className={`text-xs mt-1.5 font-semibold ${cumpleMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
            {cumpleMsg}
          </p>
        )}
        {fechaCumple && (
          <p className="text-[10px] text-slate-600 mt-1">
            🎂 Recibirá +1 sello automáticamente el{' '}
            {new Date(fechaCumple + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
          </p>
        )}
      </div>

      {/* Contador de sellos */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black text-emerald-400 leading-none">{stamps}</span>
            <span className="text-lg font-bold text-slate-600 mb-0.5">/{denom}</span>
          </div>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
            tier === 'PLATINUM' ? 'text-violet-300 border-violet-400/30 bg-violet-400/5' :
            tier === 'GOLD'     ? 'text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/5' :
                                  'text-slate-400 border-slate-600/30 bg-slate-800/30'
          }`}>
            {tier} · {sellosHistoricos} hist.
          </span>
        </div>
        <p className="text-[10px] text-slate-500 mb-2">
          {nextPrize ? `${denom - stamps} sello${denom - stamps !== 1 ? 's' : ''} para: ${nextPrize.nombre}` : stamps > 0 ? '¡Premios disponibles!' : 'Sin sellos aún'}
        </p>
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-4">
          <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>

        {/* Stamp grid */}
        <StampGrid stamps={stamps} premios={premios} />

        {/* +/- buttons */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => accionSello(-1)} disabled={opLoad || stamps <= 0}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all">
            <Minus size={13} /> Quitar sello
          </button>
          <button onClick={() => accionSello(1)} disabled={opLoad}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all">
            <Plus size={13} /> Añadir sello
          </button>
        </div>
      </div>

      {/* Canjear premio */}
      {premios.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Canjear premio</p>
          <div className="space-y-1.5 mb-3">
            {premios.map(p => {
              const puede = stamps >= p.costoSellos;
              const sel   = selPremio?.id === p.id;
              return (
                <button key={p.id} disabled={!puede} onClick={() => setSelPremio(sel ? null : p)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all text-left ${
                    sel     ? 'border-yellow-400/60 bg-yellow-400/10 text-white' :
                    puede   ? 'border-slate-700 hover:border-slate-500 bg-slate-800/40 text-white' :
                              'border-slate-800/40 bg-transparent text-slate-600 cursor-not-allowed opacity-50'
                  }`}>
                  <Trophy size={14} className={puede ? 'text-yellow-400' : 'text-slate-600'} />
                  <span className="flex-1">{p.nombre}</span>
                  <span className={`text-xs font-bold ${puede ? 'text-yellow-400' : 'text-slate-600'}`}>{p.costoSellos} ✂</span>
                </button>
              );
            })}
          </div>
          {canjeMsg && <p className={`text-xs text-center font-bold mb-2 ${canjeMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{canjeMsg}</p>}
          <button onClick={canjear} disabled={opLoad || !selPremio}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-40 border border-yellow-500/30 text-yellow-400 text-sm font-semibold rounded-lg transition-all">
            <Gift size={15} /> Canjear premio
          </button>
        </div>
      )}

      {/* ── Packs activos ────────────────────────────────────────────
          Muestra los packs vigentes del cliente con saldo, vencimiento y
          botón para devolver una sesión (no-show, cobro por error, etc.).
          Se pinta en color según estado:
            · violet    — vigente y saludable
            · amber     — vence pronto (≤5 días)
            · red       — vencido
            · slate     — sin saldo (informativo, sin acciones) */}
      {Array.isArray(data.packsActivos) && data.packsActivos.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Package size={11} /> Packs activos
          </p>
          <div className="space-y-2">
            {data.packsActivos.map((p, idx) => {
              const total   = Math.max(1, Number(p.sesionesTotales) || 1);
              const rest    = Number(p.sesionesRestantes || 0);
              const venc    = p.fechaVencimiento?.toDate?.() || null;
              const now     = Date.now();
              const vencido = venc && venc.getTime() < now;
              const dias    = venc ? Math.ceil((venc.getTime() - now) / (1000 * 60 * 60 * 24)) : null;
              const consumidos = (Array.isArray(p.citasConsumo) ? p.citasConsumo.length : 0);
              const puedeRevertir = consumidos > 0 && rest < total;
              const pct = Math.round((rest / total) * 100);
              const compra = p.fechaCompra?.toDate?.() || null;

              // Colores por estado (styles inline porque son dinámicos).
              const paleta = vencido
                ? { text: '#f87171', ring: 'rgba(248,113,113,0.35)', bg: 'rgba(248,113,113,0.06)', bar: '#f87171' }
                : rest === 0
                ? { text: '#94a3b8', ring: 'rgba(148,163,184,0.25)', bg: 'rgba(148,163,184,0.05)', bar: '#94a3b8' }
                : dias !== null && dias <= 5
                ? { text: '#fbbf24', ring: 'rgba(251,191,36,0.35)', bg: 'rgba(251,191,36,0.06)', bar: '#fbbf24' }
                : { text: '#c4b5fd', ring: 'rgba(167,139,250,0.35)', bg: 'rgba(167,139,250,0.06)', bar: '#a78bfa' };

              return (
                <div key={`pack-${idx}`}
                     className="rounded-xl p-3 space-y-2"
                     style={{ background: paleta.bg, border: `1px solid ${paleta.ring}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">{p.nombrePack || 'Pack'}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {compra && `Comprado: ${compra.toLocaleDateString('es-CL')}`}
                        {venc && ` · Vence: ${venc.toLocaleDateString('es-CL')}`}
                      </p>
                    </div>
                    <span className="text-sm font-black shrink-0" style={{ color: paleta.text }}>
                      {rest}<span className="text-xs opacity-70">/{total}</span>
                    </span>
                  </div>
                  {/* Barra de progreso */}
                  <div className="h-1.5 bg-slate-900/60 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${pct}%`, background: paleta.bar }} />
                  </div>
                  {/* Estado / avisos */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold" style={{ color: paleta.text }}>
                      {vencido
                        ? '⚠ Vencido'
                        : rest === 0
                        ? 'Sin saldo'
                        : dias !== null && dias <= 5 && dias > 0
                        ? `⚠ Vence en ${dias} día${dias !== 1 ? 's' : ''}`
                        : dias !== null && dias <= 0
                        ? 'Vence hoy'
                        : ' '}
                    </p>
                    {puedeRevertir && (
                      <button
                        onClick={() => revertirSesionPack(idx)}
                        disabled={packRevertLoad === idx}
                        className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white disabled:opacity-40 transition-colors">
                        <RotateCcw size={10} />
                        {packRevertLoad === idx ? 'Devolviendo…' : 'Devolver 1 sesión'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Historial de sellos</p>
          <div className="space-y-px max-h-44 overflow-y-auto">
            {historial.map((h, i) => {
              const icon  = h.tipo === 'suma' ? 'ph-plus-circle' : h.tipo === 'canje' ? 'ph-gift' : 'ph-minus-circle';
              const color = h.tipo === 'suma' ? 'text-emerald-400' : h.tipo === 'canje' ? 'text-yellow-400' : 'text-red-400';
              const label = h.tipo === 'suma' ? `+${h.cantidad} sello` : h.tipo === 'canje' ? `Canje: ${h.nota}` : `${h.cantidad} sello`;
              return (
                <div key={`${h.fecha}-${h.tipo}-${i}`} className="flex items-start gap-2 py-1.5 border-b border-white/4 last:border-0">
                  <i className={`ph-fill ${icon} ${color} text-sm shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{label}</p>
                    <p className="text-[10px] text-slate-600">{formatFecha(h.fecha)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Citas recientes */}
      {citas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Citas recientes</p>
            {totalCitas > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                {totalCitas} en total
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {citas.map(c => {
              const col = c.estado === 'Completada' ? 'text-emerald-400' : c.estado === 'Cancelada' ? 'text-red-400' : 'text-yellow-400';
              return (
                <div key={c.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{c.servicioNombre || '—'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{c.fecha} · {c.hora} · {c.barbero || '—'}</p>
                  </div>
                  <span className={`text-[10px] font-bold ${col} shrink-0`}>{c.estado}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reset sellos */}
      <div className="pt-2 border-t border-slate-800">
        {!resetOn ? (
          <button onClick={() => setResetOn(true)} disabled={!stamps}
            className="flex items-center gap-2 text-xs text-slate-600 hover:text-red-400 disabled:opacity-30 transition-colors">
            <RotateCcw size={13} /> Resetear todos los sellos
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-400 flex-1">¿Resetear {stamps} sellos a 0?</p>
            <button onClick={() => setResetOn(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button onClick={resetSellos} disabled={opLoad} className="px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all">Confirmar</button>
          </div>
        )}
      </div>

      {/* Zona de peligro: eliminar cliente */}
      <div className="pt-2">
        {!delOn ? (
          <button onClick={() => { setDelOn(true); setDelMsg(''); }}
            className="flex items-center gap-2 text-xs text-slate-600 hover:text-red-400 transition-colors">
            <Trash2 size={13} /> Eliminar cliente
          </button>
        ) : (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-red-400">¿Eliminar a {data.nombre || 'este cliente'}?</p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Se borrarán sus sellos, historial de fidelidad y datos de cumpleaños de forma permanente. Su historial de citas se conserva. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            {delMsg && <p className="text-xs font-semibold text-red-400">{delMsg}</p>}
            <div className="flex items-center gap-2">
              <button onClick={() => setDelOn(false)} disabled={delLoad}
                className="flex-1 px-3 py-2 text-xs font-semibold text-slate-300 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 transition-all">
                Cancelar
              </button>
              <button onClick={eliminarCliente} disabled={delLoad}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 transition-all">
                {delLoad
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Eliminando…</>
                  : <><Trash2 size={13} /> Sí, eliminar</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Modal: agregar nuevo cliente al Club ── */
function NuevoClienteModal({ premios, onClose }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sellosIniciales, setSellosIniciales] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto prefix +56 9 when focus/input
  const handlePhoneFocus = () => {
    if (!telefono.startsWith('+56')) {
      setTelefono('+56 9 ');
    }
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('+56')) {
      val = '+56 9 ';
    }
    setTelefono(val);
  };

  const handlePhoneKeyDown = (e) => {
    if ((e.key === 'Backspace' || e.key === 'Delete') && telefono.length <= 7) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedNombre = nombre.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const cleanPhone = telefono.replace(/\D/g, ''); // 569XXXXXXXX

    if (!trimmedNombre) return setError('El nombre es obligatorio.');
    if (!cleanPhone || cleanPhone.length < 11) {
      return setError('Ingresa un teléfono válido de Chile (ej: +56 9 1234 5678).');
    }

    setLoading(true);
    try {
      // 1. Verificar si el cliente ya existe en users o clientes
      const userSnap = await withTimeout(getDocs(query(tenantCol('users'), where('telefono', '==', telefono.trim()))), 15000, 'clientes/lookup-tel');
      
      if (!userSnap.empty) {
        throw new Error('Ya existe un miembro del Club con este número de teléfono.');
      }

      // 2. Si hay email, verificar que no esté repetido
      if (trimmedEmail) {
        const emailSnap = await withTimeout(getDocs(query(tenantCol('users'), where('email', '==', trimmedEmail))), 15000, 'clientes/lookup-email');
        if (!emailSnap.empty) {
          throw new Error('Ya existe un miembro del Club con este correo electrónico.');
        }
      }

      const numStamps = parseInt(sellosIniciales) || 0;
      const tNow = new Date().toISOString();

      // 3. Preparar documento de users (passive profile: uid === id === cleanPhone)
      const userData = {
        uid: cleanPhone,
        nombre: trimmedNombre,
        telefono: telefono.trim(),
        stamps: numStamps,
        sellosDisponibles: numStamps,
        sellosHistoricos: numStamps,
        creadoEn: serverTimestamp(),
        updatedAt: serverTimestamp(),
        importedFrom: 'admin_manual',
        historialSellos: numStamps > 0 ? [
          {
            fecha: tNow,
            tipo: 'suma',
            cantidad: numStamps,
            nota: 'Sello inicial al crearse la cuenta manualmente',
          }
        ] : [],
      };

      if (fechaNacimiento) {
        const [, m, d] = fechaNacimiento.split('-');
        userData.fechaNacimiento = fechaNacimiento;
        userData.cumpleDia = `${m}-${d}`;
      }

      // 4. Preparar documento de clientes
      const clienteData = {
        uid: cleanPhone,
        nombre: trimmedNombre,
        telefono: telefono.trim(),
        stamps: numStamps,
        sellosDisponibles: numStamps,
        sellosHistoricos: numStamps,
        creadoEn: serverTimestamp(),
        updatedAt: serverTimestamp(),
        importedFrom: 'admin_manual',
      };

      if (trimmedEmail) {
        userData.email = trimmedEmail;
        clienteData.email = trimmedEmail;
      }

      if (fechaNacimiento) {
        const [, m, d] = fechaNacimiento.split('-');
        clienteData.fechaNacimiento = fechaNacimiento;
        clienteData.cumpleDia = `${m}-${d}`;
      }

      // 5. Escribir en Firestore
      await setDoc(doc(tenantCol('users'), cleanPhone), userData);
      await setDoc(doc(tenantCol('clientes'), cleanPhone), clienteData);

      setSuccess('✓ ¡Cliente agregado al Club exitosamente!');
      
      // Limpiar formulario
      setNombre('');
      setTelefono('');
      setEmail('');
      setFechaNacimiento('');
      setSellosIniciales(0);
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      setError(err.message || 'Ocurrió un error al guardar el cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-emerald-400" />
            <h3 className="font-semibold text-white">Nuevo Cliente Club de Fidelidad</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-xs text-red-400 font-semibold text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-xs text-emerald-400 font-semibold text-center">
              {success}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo *</label>
            <input
              type="text"
              required
              placeholder="Nicolás Fabián"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Teléfono *</label>
              <input
                type="tel"
                required
                placeholder="+56 9 1234 5678"
                value={telefono}
                onFocus={handlePhoneFocus}
                onChange={handlePhoneChange}
                onKeyDown={handlePhoneKeyDown}
                className="w-full bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cumpleaños (Opcional)</label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={e => setFechaNacimiento(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico (Opcional)</label>
            <input
              type="email"
              placeholder="cliente@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-850 border border-slate-750 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Sellos Iniciales (Opcional)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="50"
                value={sellosIniciales}
                onChange={e => setSellosIniciales(parseInt(e.target.value) || 0)}
                className="w-20 bg-slate-850 border border-slate-750 rounded-xl px-3 py-2 text-center text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <span className="text-xs text-slate-500">¿Deseas regalarle sellos de cortesía al unirse?</span>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-grow py-3 rounded-xl border border-slate-750 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-grow py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
              Crear miembro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal: clientes sin registro ───────────────────────────────── */
function SinRegistroModal({ sinRegistro, shopName, registroUrl, onClose, mode = 'sinRegistro', tenantId }) {
  const [search, setSearch] = useState('');
  const [sendingKey, setSendingKey] = useState(null);
  const [filtroAntig, setFiltroAntig] = useState('todos'); // 'todos' | 'inactivos90' | 'inactivos180'
  // localSent = clientes marcados como enviados en esta sesión (optimistic UI),
  // que complementa `invitacionEnviadaAt` de Firestore. nextKey señala al
  // siguiente cliente pendiente para el auto-scroll y el ring de "próximo".
  const [localSent, setLocalSent] = useState(() => new Set());
  const [nextKey, setNextKey] = useState(null);
  const waitingReturnRef = useRef(false);
  const cardRefs = useRef(new Map());

  const isMigrados = mode === 'migrados';

  // ── Plantillas de mensaje ──────────────────────────────────────
  const name = shopName.normalize('NFKC');

  const TEMPLATES = isMigrados
    ? {
        estandar:    `¡Hola {nombre}! 👋 Soy de *${name}*. Estamos estrenando nuestro Club de Fidelidad nuevo y, como ya eres cliente, te invitamos a unirte 🎁\n\nEs gratis: por cada visita acumulas sellos que canjeas por premios. Te demoras 1 minuto en activarte 👉 ${registroUrl}\n\n¡Te esperamos!`,
        descuento:   `¡Hola {nombre}! 👋 Soy de *${name}*. Nos dimos cuenta que hace tiempo no nos vemos y queremos invitarte a volver 🤝\n\nTe regalamos un *20% de descuento* en tu próximo corte. Además estamos estrenando nuestro Club de Fidelidad: súmate y por cada visita acumulas sellos para premios gratis 🎁\n\nReclama tu descuento registrándote acá (1 minuto) 👉 ${registroUrl}\n\n¡Te esperamos!`,
        reactivar:   `¡Hola {nombre}! 👋 Soy de *${name}*. Hace un buen rato que no nos vemos por acá y queríamos saber cómo estás 🤝\n\nEstamos con novedades: nuevos servicios, productos exclusivos y un Club de Fidelidad con premios gratis por cada visita.\n\n*Te invitamos a volver con un beneficio especial* — escríbenos por acá y te coordinamos. Mientras tanto súmate al Club en 1 minuto 👉 ${registroUrl}`,
      }
    : {
        estandar:    `¡Hola {nombre}! 👋 Gracias por visitarnos en ${name}. Tenemos un club de fidelidad donde acumulas sellos y ganas premios gratis 🎁. ¡Únete registrándote aquí! 👉 ${registroUrl}`,
        descuento:   `¡Hola {nombre}! 👋 Gracias por visitarnos en ${name}. Como te extrañamos te regalamos un *20% de descuento* en tu próximo corte 🎁. Activa tu Club acá y aprovecha el beneficio 👉 ${registroUrl}`,
      };

  // Persistir el template elegido + custom message en localStorage por tenant.
  const storageKey = `${tenantId || 'elegance'}_invite_msg_${mode}`;
  const [templateId, setTemplateId] = useState(() => {
    try { return localStorage.getItem(storageKey + '_tpl') || 'estandar'; }
    catch { return 'estandar'; }
  });
  const [customMsg, setCustomMsg] = useState(() => {
    try { return localStorage.getItem(storageKey) || TEMPLATES[templateId] || TEMPLATES.estandar; }
    catch { return TEMPLATES.estandar; }
  });

  function aplicarTemplate(id) {
    setTemplateId(id);
    setCustomMsg(TEMPLATES[id] || TEMPLATES.estandar);
    try {
      localStorage.setItem(storageKey + '_tpl', id);
      localStorage.setItem(storageKey, TEMPLATES[id] || TEMPLATES.estandar);
    } catch (_) {}
  }

  function onMsgChange(v) {
    setCustomMsg(v);
    try { localStorage.setItem(storageKey, v); } catch (_) {}
  }

  // ── Filtro por antigüedad (solo aplica a migrados con fechaRegistroOriginal) ──
  function parseFechaAgendapro(s) {
    // Formato "DD/MM/YYYY" del export. Robusto a formatos cercanos.
    if (!s) return null;
    const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    const d = Number(m[1]), mo = Number(m[2]) - 1;
    let y = Number(m[3]); if (y < 100) y += 2000;
    const dt = new Date(y, mo, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ahora = Date.now();
    const cutoff =
      filtroAntig === 'inactivos90'  ? ahora - 90  * 864e5 :
      filtroAntig === 'inactivos180' ? ahora - 180 * 864e5 : null;

    return sinRegistro.filter(c => {
      if (q && !(c.nombre?.toLowerCase().includes(q) || c.telefono?.includes(q))) return false;
      if (cutoff !== null && isMigrados) {
        const fecha = parseFechaAgendapro(c.fechaRegistroOriginal);
        // Si no hay fecha, asumir antiguo (mostrar en inactivos para no descartarlo)
        if (fecha && fecha.getTime() > cutoff) return false;
      }
      return true;
    });
  }, [sinRegistro, search, filtroAntig, isMigrados]);

  const waMsg = (nombre) => (customMsg || TEMPLATES.estandar).replace(/\{nombre\}/g, nombre || 'ahí');

  // Normaliza a formato E.164 chileno (sin +): 56 + 9 dígitos.
  const normalizePhoneCL = (telefono) => {
    const raw = (telefono || '').replace(/\D/g, '');
    if (!raw || raw.length < 8) return null;
    return raw.startsWith('56') ? raw : `56${raw}`;
  };

  // Abre WhatsApp por protocolo nativo (whatsapp://). Si a los 1.5s el
  // navegador sigue visible es que el OS no aceptó el protocolo (no está
  // instalada la app desktop), y caemos a web.whatsapp.com como respaldo.
  // El fallback web usa un target con nombre estático ('whatsapp_tab') para
  // reutilizar siempre la misma pestaña en clics sucesivos y no ensuciar la
  // barra de tareas con ventanas nuevas.
  const openWhatsAppNative = (phone, text) => {
    const encoded = encodeURIComponent(text);
    const native  = `whatsapp://send?phone=${phone}&text=${encoded}`;
    const web     = `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
    try {
      window.location.href = native;
    } catch (_) {
      window.open(web, 'whatsapp_tab', 'noopener,noreferrer');
      return;
    }
    setTimeout(() => {
      if (!document.hidden) {
        window.open(web, 'whatsapp_tab', 'noopener,noreferrer');
      }
    }, 1500);
  };

  // Solo persistimos en Firestore para clientes migrados (su key === id del doc en users/).
  // Para "sin registro" (clientes sin doc en users/), no hay nada donde persistir.
  const persistirInvitacion = async (key) => {
    if (!isMigrados || !key) return;
    setSendingKey(key);
    try {
      await updateDoc(doc(tenantCol('users'), key), {
        invitacionEnviadaAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('[invitar] no se pudo persistir invitacionEnviadaAt:', e.message);
    } finally {
      setSendingKey(null);
    }
  };

  const fechaCorta = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const enviadosCount = useMemo(
    () => sinRegistro.filter(c => c.invitacionEnviadaAt).length,
    [sinRegistro],
  );

  // Considera enviado si ya persistio en Firestore O si se envio en esta sesion.
  const isSent = (c) => !!c.invitacionEnviadaAt || localSent.has(c.key);

  // Flujo "Click & Enter": abre WhatsApp nativo, marca la card como enviada
  // optimistamente, persiste en Firestore, y prepara al siguiente cliente
  // para que el auto-scroll lo enfoque cuando el usuario vuelva al panel.
  const handleEnviar = (c) => {
    const phone = normalizePhoneCL(c.telefono);
    if (!phone) return;

    openWhatsAppNative(phone, waMsg(c.nombre));

    setLocalSent(prev => {
      const next = new Set(prev);
      next.add(c.key);
      return next;
    });
    persistirInvitacion(c.key);

    // Busca al siguiente pendiente en la lista filtrada actual (que tenga
    // telefono valido para que el ring apunte a alguien accionable).
    waitingReturnRef.current = true;
    const idx = filtered.findIndex(x => x.key === c.key);
    const next = filtered.slice(idx + 1).find(x =>
      !x.invitacionEnviadaAt && !localSent.has(x.key) && normalizePhoneCL(x.telefono)
    );
    setNextKey(next?.key || null);
  };

  // Auto-scroll al siguiente al recuperar el foco (Alt+Tab desde WhatsApp).
  // Usa visibilitychange (mas confiable en desktop) + focus (fallback iOS).
  useEffect(() => {
    const onReturn = () => {
      if (document.hidden) return;
      if (!waitingReturnRef.current) return;
      waitingReturnRef.current = false;
      if (!nextKey) return;
      const el = cardRefs.current.get(nextKey);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('focus', onReturn);
    return () => {
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('focus', onReturn);
    };
  }, [nextKey]);

  // Al cambiar filtro/busqueda, limpiar el "proximo" para evitar rings sobre
  // cards que ya no estan en pantalla.
  useEffect(() => {
    setNextKey(null);
    waitingReturnRef.current = false;
  }, [search, filtroAntig]);

  // Templates disponibles en un array (para el segmented control).
  const TEMPLATE_OPTIONS = isMigrados
    ? [
        { id: 'estandar',  label: 'Estándar' },
        { id: 'descuento', label: 'Descuento 20%' },
        { id: 'reactivar', label: 'Reactivación' },
      ]
    : [
        { id: 'estandar',  label: 'Estándar' },
        { id: 'descuento', label: 'Descuento 20%' },
      ];

  const FILTROS_ANTIG = [
    { id: 'todos',        label: 'Todos' },
    { id: 'inactivos90',  label: '+90d sin ver' },
    { id: 'inactivos180', label: '+180d sin ver' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header (fijo) */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isMigrados ? (
                <Send size={15} className="text-amber-400 shrink-0" />
              ) : (
                <UserX size={15} className="text-amber-400 shrink-0" />
              )}
              <h3 className="font-semibold text-white truncate">
                {isMigrados ? 'Invitar clientes migrados' : 'Clientes sin registro'}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 shrink-0">
                {sinRegistro.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {isMigrados
                ? 'Clientes traídos de AgendaPro. Aún no se han unido al Club.'
                : 'Han agendado pero no se han unido al club de fidelidad'}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Scroll container */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Sección 1 · Mensaje (segmented control + burbuja WhatsApp) ── */}
          <div className="px-5 pt-4 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Mensaje que se enviará
            </p>

            {/* Segmented control de plantillas */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-1 text-sm w-full mb-3">
              {TEMPLATE_OPTIONS.map(t => {
                const active = templateId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => aplicarTemplate(t.id)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Burbuja estilo WhatsApp — editable */}
            <div className="relative">
              <textarea
                value={customMsg}
                onChange={e => onMsgChange(e.target.value)}
                rows={6}
                placeholder="Mensaje que se enviará por WhatsApp…"
                className="w-full bg-[#075E54]/20 border border-[#128C7E]/30 rounded-2xl rounded-tl-sm p-4 text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-[#128C7E]/60 resize-y"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              <code className="text-emerald-400/80">{'{nombre}'}</code> se reemplaza por el nombre real del cliente al enviar. Se guarda automáticamente.
            </p>
          </div>

          {/* ── Sección 2 · Búsqueda y filtros (sticky) ── */}
          <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 px-5 py-3 border-y border-slate-800">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o teléfono…"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
              />
            </div>

            {/* Filtros de inactividad (solo migrados) */}
            {isMigrados && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mt-3">
                {FILTROS_ANTIG.map(f => {
                  const active = filtroAntig === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFiltroAntig(f.id)}
                      className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                        active
                          ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                          : 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Contadores */}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-slate-500">
                <span className="text-slate-300 font-semibold">{filtered.length}</span>{' '}
                cliente{filtered.length !== 1 ? 's' : ''}
              </p>
              {isMigrados && enviadosCount > 0 && (
                <p className="text-[11px] text-emerald-400 font-semibold">
                  {enviadosCount} / {sinRegistro.length} ya invitado{enviadosCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* ── Sección 3 · Lista de clientes ── */}
          <div className="flex flex-col gap-2 mt-4 px-5 pb-5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-center">
                <UserX size={28} className="text-slate-700" />
                <p className="text-sm text-slate-500">Sin resultados</p>
              </div>
            ) : filtered.map(c => {
              const phone     = normalizePhoneCL(c.telefono);
              const yaEnviado = isSent(c);
              const isNext    = c.key === nextKey && !yaEnviado;
              const fecha     = c.invitacionEnviadaAt ? fechaCorta(c.invitacionEnviadaAt) : '';
              const sending   = sendingKey === c.key;
              return (
                <div
                  key={c.key}
                  ref={el => {
                    if (el) cardRefs.current.set(c.key, el);
                    else    cardRefs.current.delete(c.key);
                  }}
                  className={`flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/60 border rounded-xl transition-all ${
                    isNext
                      ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900'
                      : yaEnviado
                        ? 'border-emerald-500/30 opacity-80'
                        : 'border-slate-700/50'
                  }`}
                >
                  {/* Avatar + info — flex-1 min-w-0 mr-3 para truncate */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-slate-300">
                        {(c.nombre || '?').trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.nombre || 'Sin nombre'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.telefono && <span className="text-[10px] text-slate-500 truncate">{c.telefono}</span>}
                        {!isMigrados && c.count != null && (
                          <span className="text-[10px] font-bold text-blue-400/80 shrink-0">{c.count} cita{c.count !== 1 ? 's' : ''}</span>
                        )}
                        {isMigrados && yaEnviado && fecha && (
                          <span className="text-[10px] font-bold text-emerald-400/90 shrink-0">✓ {fecha}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón — abre whatsapp:// nativo + marca como enviado.
                      Al enviado queda slate + ✓ pero sigue clickeable para reenviar. */}
                  {phone ? (
                    <button
                      type="button"
                      onClick={() => handleEnviar(c)}
                      disabled={sending}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                        yaEnviado
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                      }`}
                      title={yaEnviado ? `Reenviar a ${c.nombre}` : `Enviar invitación a ${c.nombre}`}
                    >
                      {yaEnviado ? <Check size={13} /> : <Send size={13} />}
                      {yaEnviado ? 'Enviado' : 'Enviar'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600 shrink-0">Sin teléfono</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Modal IA ── */
const LOADING_PHRASES = [
  'Analizando patrones de visita…',
  'Cruzando datos de fidelización…',
  'Calculando oportunidades de retención…',
  'Identificando el mayor impacto…',
];

function buildRecommendations(stats) {
  const recs = [];
  const { total, avg, riesgo, conPremio, totalCitas, cumple, silver, gold, platinum, migradosPendientes, migradosInvitados } = stats;

  if (migradosPendientes >= 10) {
    const pctEstimado = Math.round(migradosPendientes * 0.15);
    recs.push(
      `Tienes ${migradosPendientes} clientes migrados de AgendaPro que aún no se unieron al Club` +
      (migradosInvitados > 0 ? ` (${migradosInvitados} ya invitados).` : '.') +
      ` Activarlos con una campaña de WhatsApp puede convertir ${pctEstimado}–${Math.round(migradosPendientes * 0.25)} ` +
      `en miembros activos esta semana, sumando base de fidelización sin costo de adquisición. ` +
      `Usa el botón "Invitar migrados" arriba para enviarles el link de registro.`
    );
  }

  if (riesgo >= 3) {
    recs.push(
      `Detecté ${riesgo} clientes que llevan más de 30 días sin visitar. ` +
      `Enviarles un mensaje de WhatsApp hoy puede recuperar entre ${Math.round(riesgo * 0.3)} y ${Math.round(riesgo * 0.5)} citas esta semana, ` +
      `ya que los clientes responden mejor al contacto directo en los primeros 45 días de inactividad.`
    );
  }

  if (conPremio >= 2) {
    recs.push(
      `${conPremio} clientes tienen un premio disponible sin canjear. ` +
      `Notificarlos activamente puede aumentar tus reservas de esta semana un 25–30%, ` +
      `ya que un cliente con premio pendiente tiene 3 veces más probabilidad de agendar que uno sin incentivo.`
    );
  }

  if (cumple >= 1) {
    recs.push(
      `${cumple} cliente${cumple > 1 ? 's' : ''} ${cumple > 1 ? 'cumplen' : 'cumple'} años este mes. ` +
      `Ofrecerles un sello de regalo o descuento de cumpleaños genera una tasa de reserva del 80% en el mes correspondiente. ` +
      `Es el momento de mayor disposición emocional para fidelizar.`
    );
  }

  if (parseFloat(avg) < 3 && total >= 5) {
    recs.push(
      `El promedio de ${avg} sellos por cliente indica que muchos abandonan antes de llegar a su primer premio. ` +
      `Reducir el umbral del primer beneficio en 2 sellos puede aumentar la tasa de retorno en un 40% ` +
      `según los patrones de programas de fidelización en servicios de barbería.`
    );
  }

  if (platinum >= 1) {
    recs.push(
      `Tienes ${platinum} cliente${platinum > 1 ? 's' : ''} PLATINUM con alta lealtad comprobada. ` +
      `Contactarlos para invitarlos a referir amigos puede generarte entre 2 y 4 clientes nuevos por cada uno, ` +
      `sin costo de adquisición, aprovechando la confianza que ya construiste.`
    );
  }

  if (total > 0 && totalCitas > 0) {
    const cxc = (totalCitas / total).toFixed(1);
    recs.push(
      `Con ${total} clientes registrados y un promedio de ${cxc} citas por cliente, ` +
      `tu programa de fidelización tiene base sólida. ` +
      `El siguiente paso es activar a los ${Math.max(1, Math.round(total * 0.25))} clientes con más antigüedad y menos visitas recientes: ` +
      `son tu mayor oportunidad de crecimiento sin costo adicional.`
    );
  }

  if (recs.length === 0) {
    recs.push(
      `Aún no hay suficientes datos para un análisis profundo. ` +
      `A medida que más clientes se registren en el club de fidelización, ` +
      `el sistema podrá identificar oportunidades concretas de retención y crecimiento.`
    );
  }

  return recs;
}

function IAModal({ stats, shopName, onClose }) {
  const recs = useRef(buildRecommendations(stats));
  const [idx,       setIdx]       = useState(0);
  const [phase,     setPhase]     = useState('loading'); // loading | typing | done
  const [displayed, setDisplayed] = useState('');
  const [loadLabel, setLoadLabel] = useState(LOADING_PHRASES[0]);

  const fullText = recs.current[idx % recs.current.length] ?? '';

  function startCycle(nextIdx) {
    const next = nextIdx % recs.current.length;
    setIdx(next);
    setDisplayed('');
    setPhase('loading');
    setLoadLabel(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
  }

  /* Fase loading → typing */
  useEffect(() => {
    if (phase !== 'loading') return;
    const t = setTimeout(() => setPhase('typing'), 1700);
    return () => clearTimeout(t);
  }, [phase]);

  /* Efecto typewriter */
  useEffect(() => {
    if (phase !== 'typing') return;
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) { clearInterval(id); setPhase('done'); }
    }, 18);
    return () => clearInterval(id);
  }, [phase, fullText]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-violet-500/20"
        style={{ background: '#0f0f18' }}>

        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 overflow-hidden border-b border-slate-800"
          style={{ background: 'linear-gradient(135deg, #0f0f12 0%, #151200 100%)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at top right, rgba(212,175,55,0.08), transparent 70%)' }} />
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                <img src="/logo1.png" alt="SynapTech" className="w-5 h-5 object-contain" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Synaptech IA</p>
                <h3 className="text-sm font-bold text-white leading-none">Recomendación para {shopName}</h3>
                <p className="text-[9px] text-slate-500 mt-1.5">
                  Analiza {stats.total} cliente{stats.total !== 1 ? 's' : ''} del Club
                  {(stats.migradosPendientes + stats.migradosInvitados) > 0 && (
                    <> · {stats.migradosPendientes + stats.migradosInvitados} migrado{(stats.migradosPendientes + stats.migradosInvitados) !== 1 ? 's' : ''} excluido{(stats.migradosPendientes + stats.migradosInvitados) !== 1 ? 's' : ''}</>
                  )}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 min-h-[9rem] flex items-start">
          {phase === 'loading' ? (
            <div className="w-full space-y-3">
              <div className="flex items-center gap-2 text-violet-400/60 text-xs font-medium mb-1">
                <div className="w-3 h-3 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin shrink-0" />
                {loadLabel}
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full animate-pulse w-full" />
              <div className="h-2.5 bg-slate-800 rounded-full animate-pulse w-4/5" style={{ animationDelay: '0.1s' }} />
              <div className="h-2.5 bg-slate-800 rounded-full animate-pulse w-3/5" style={{ animationDelay: '0.2s' }} />
            </div>
          ) : (
            <div className="flex gap-3 w-full">
              <div className="w-[3px] rounded-full shrink-0 self-stretch"
                style={{ background: 'linear-gradient(180deg, #8b5cf6, #3b82f6)', minHeight: '1rem' }} />
              <p className="text-sm text-slate-200 leading-relaxed">
                {displayed}
                {phase === 'typing' && (
                  <span className="inline-block w-0.5 h-[1em] ml-0.5 align-text-bottom bg-violet-400 animate-pulse" />
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <button
            onClick={() => startCycle(idx + 1)}
            disabled={phase === 'loading' || phase === 'typing'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 hover:bg-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RefreshCw size={11} />
            Otro consejo
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

/* ── Vista principal Clientes ── */
export default function Clientes() {
  const { id: tenantId, name: shopName } = useTenant();
  const { data: clientesRaw, loading } = useClubUsers();
  // Descartamos docs sin nombre (sesiones anónimas / registros incompletos del
  // viejo flujo passwordless que dejaban users/{uid}.nombre = ''). Mismo criterio
  // que ya aplica CorteAlLapiz.jsx en su buscador. Filtramos una sola vez acá
  // para que KPIs, IA, tiers y la lista visible queden todos en sintonía.
  const clientes = useMemo(
    () => clientesRaw.filter(c => (c.nombre || '').trim()),
    [clientesRaw]
  );
  const { data: premios }           = useCollection('premios', [firestoreOrderBy('costoSellos')]);
  const [todasCitas, setTodasCitas] = useState([]);

  useEffect(() => {
    withTimeout(
      getDocs(query(tenantCol('citas'), where('fecha', '>=', NINETY_DAYS_AGO))),
      20000, 'clientes/citas-90d'
    )
      .then(snap => setTodasCitas(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  const [search,                setSearch]                = useState('');
  const [filtro,                setFiltro]                = useState('todos');
  const [showHelp,              setShowHelp]              = useState(false);
  const [selected,              setSelected]              = useState(null);
  const [showSinRegistro,       setShowSinRegistro]       = useState(false);
  const [showInvitarMigrados,   setShowInvitarMigrados]   = useState(false);
  const [showNuevoCliente,      setShowNuevoCliente]      = useState(false);
  const [showIA,                setShowIA]                = useState(false);
  const [page,                  setPage]                  = useState(1);

  useEffect(() => { setPage(1); }, [search, filtro]);

  const registroUrl = `${PROD_DOMAINS[tenantId] || window.location.origin}/registro.html`;

  const sellos = c => c.sellosDisponibles ?? c.stamps ?? 0;

  // Cliente "legacy" = migrado de AgendaPro, NUNCA se registró en el Club.
  // El doc legacy se creó con uid === id (telefono) por la migración. El doc del
  // registro real nunca tiene campo `uid` (Firebase Auth no lo escribe), así que
  // ésta es la única señal univoca. NO usar importedFrom: la dedup-script lo
  // copia al doc real como marca histórica → daría falsos positivos.
  const isLegacy = c => !!c?.uid && c?.uid === c?.id;

  const citasPorEmail = useMemo(() => {
    const map = {};
    todasCitas.forEach(c => {
      if (c.clienteEmail) map[c.clienteEmail] = (map[c.clienteEmail] || 0) + 1;
    });
    return map;
  }, [todasCitas]);

  /* Clientes migrados (legacy de AgendaPro, no se han unido al Club).
     Ordena: NO invitados primero (para que el admin retome donde dejó). */
  const migrados = useMemo(() =>
    clientes
      .filter(isLegacy)
      .map(c => ({
        key:                   c.id,
        nombre:                c.nombre   || '',
        telefono:              c.telefono || c.id || '',
        email:                 c.email    || '',
        fechaRegistroOriginal: c.fechaRegistroOriginal || null,
        invitacionEnviadaAt:   c.invitacionEnviadaAt || null,
      }))
      .sort((a, b) => {
        const aDone = !!a.invitacionEnviadaAt;
        const bDone = !!b.invitacionEnviadaAt;
        if (aDone !== bDone) return aDone ? 1 : -1; // pendientes primero
        return (a.nombre || '').localeCompare(b.nombre || '');
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientes]
  );

  /* Clientes sin registro: han agendado pero no están en /users */
  const sinRegistro = useMemo(() => {
    const regEmails = new Set(clientes.map(c => (c.email || '').toLowerCase()).filter(Boolean));
    const regPhones = new Set(clientes.map(c => normalizePhone(c.telefono)).filter(Boolean));

    const map = {};
    todasCitas.forEach(cita => {
      const phone = normalizePhone(cita.clienteTelefono);
      const email = (cita.clienteEmail || '').toLowerCase();

      // Saltar si ya está registrado
      if (email && regEmails.has(email)) return;
      if (phone && regPhones.has(phone)) return;

      const key = phone || email || cita.clienteNombre;
      if (!key) return;

      if (!map[key]) {
        map[key] = {
          key,
          nombre:   cita.clienteNombre  || '',
          telefono: cita.clienteTelefono || '',
          email:    cita.clienteEmail    || '',
          count:    0,
        };
      }
      map[key].count++;
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [todasCitas, clientes]);

  /* Clientes "reales" del Club = excluye legacies migrados de AgendaPro.
     Se usa para todas las métricas de fidelización (IA, riesgo, tiers, avg de sellos).
     Los legacies inflan el total y meten ceros en el promedio porque NUNCA usaron el Club. */
  const clientesReales = useMemo(() => clientes.filter(c => !isLegacy(c)), [clientes]);

  const clientesEnRiesgo = useMemo(() => {
    const ahora = Date.now();
    return clientesReales
      .filter(c => {
        if (!c.ultimoSello) return false;
        const historicos = c.sellosHistoricos ?? c.stamps ?? 0;
        if (historicos < 1) return false;
        const dias = (ahora - new Date(c.ultimoSello).getTime()) / 864e5;
        return dias >= 30;
      })
      .map(c => ({
        ...c,
        diasSinVisita: Math.floor((ahora - new Date(c.ultimoSello).getTime()) / 864e5),
      }))
      .sort((a, b) => b.diasSinVisita - a.diasSinVisita)
      .slice(0, 5);
  }, [clientesReales]);

  const sorted = useMemo(() =>
    [...clientes].sort((a, b) => sellos(b) - sellos(a) || (a.nombre || '').localeCompare(b.nombre || '')),
    [clientes]
  );

  const mesActual = String(new Date().getMonth() + 1).padStart(2, '0');

  const applyFiltro = c => {
    if (filtro === 'todos') return true;
    if (filtro === 'migrados')    return isLegacy(c);
    if (filtro === 'registrados') return !isLegacy(c);
    const disponibles = c.sellosDisponibles ?? c.stamps ?? 0;
    const historicos  = c.sellosHistoricos  ?? c.stamps ?? 0;
    if (filtro === 'premio') return premios.some(p => disponibles >= p.costoSellos);
    if (filtro === 'cumple') {
      if (c.cumpleDia) return c.cumpleDia.startsWith(mesActual + '-');
      if (c.fechaNacimiento) return c.fechaNacimiento.split('-')[1] === mesActual;
      return false;
    }
    if (filtro === 'silver')   return calcTier(historicos) === 'SILVER';
    if (filtro === 'gold')     return calcTier(historicos) === 'GOLD';
    if (filtro === 'platinum') return calcTier(historicos) === 'PLATINUM';
    if (filtro === 'sin30' || filtro === 'sin60' || filtro === 'sin90') {
      if (isLegacy(c)) return false;
      const dias = filtro === 'sin30' ? 30 : filtro === 'sin60' ? 60 : 90;
      const cutoff = new Date(Date.now() - dias * 864e5);
      const ultimo = c.ultimoSello ? new Date(c.ultimoSello) : null;
      return !ultimo || ultimo < cutoff;
    }
    return true;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sorted.filter(c => {
      const matchSearch = !q ||
        c.nombre?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.telefono?.includes(q);
      return matchSearch && applyFiltro(c);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, search, filtro, premios, mesActual]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* KPIs visibles del panel: incluyen TODOS los clientes (registrados + migrados).
     Es la metrica de "tamaño de la base de contactos" del local. */
  const total  = clientes.length;
  const avg    = total ? (clientes.reduce((s, c) => s + sellos(c), 0) / total).toFixed(1) : 0;
  const conPremio = premios.length
    ? clientes.filter(c => sellos(c) >= premios[0]?.costoSellos).length
    : clientes.filter(c => sellos(c) >= 5).length;
  const totalCitasGlobal = todasCitas.length;

  /* Stats para el analisis IA: SOLO clientes reales del Club (no migrados).
     Asi avg, tiers, cumple, etc. no se inflan con los 595 legacies en 0 sellos.
     migradosPendientes/Invitados se exponen para la recomendacion especifica. */
  const iaStats = useMemo(() => {
    const totalReales      = clientesReales.length;
    const sumSellos        = clientesReales.reduce((s, c) => s + sellos(c), 0);
    const avgReales        = totalReales ? (sumSellos / totalReales).toFixed(1) : 0;
    const conPremioReales  = premios.length
      ? clientesReales.filter(c => sellos(c) >= premios[0]?.costoSellos).length
      : clientesReales.filter(c => sellos(c) >= 5).length;
    const totalMigrados    = clientes.length - totalReales;
    const yaInvitados      = clientes.filter(c => isLegacy(c) && c.invitacionEnviadaAt).length;
    return {
      total:              totalReales,
      avg:                avgReales,
      riesgo:             clientesEnRiesgo.length,
      conPremio:          conPremioReales,
      totalCitas:         totalCitasGlobal,
      cumple:             clientesReales.filter(c => c.cumpleDia?.startsWith(mesActual + '-')).length,
      silver:             clientesReales.filter(c => calcTier(c.sellosHistoricos ?? c.stamps ?? 0) === 'SILVER').length,
      gold:               clientesReales.filter(c => calcTier(c.sellosHistoricos ?? c.stamps ?? 0) === 'GOLD').length,
      platinum:           clientesReales.filter(c => calcTier(c.sellosHistoricos ?? c.stamps ?? 0) === 'PLATINUM').length,
      migradosPendientes: totalMigrados - yaInvitados,
      migradosInvitados:  yaInvitados,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, clientesReales, clientesEnRiesgo.length, totalCitasGlobal, mesActual, premios]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header — mobile-first: apila titulo/botones en columna y wrap en fila */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 w-full mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Clientes y Fidelización</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona sellos y premios de cada cliente.</p>
        </div>
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowNuevoCliente(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 transition-all shrink-0"
          >
            <Plus size={13} />
            Nuevo Cliente
          </button>
          <button
            onClick={() => setShowIA(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#D4AF37]/35 bg-[#D4AF37]/5 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all shrink-0"
          >
            <img src="/logo1.png" alt="Synaptech" className="w-3.5 h-3.5 object-contain opacity-80" />
            Synaptech IA
          </button>
          {migrados.length > 0 && (
            <button
              onClick={() => setShowInvitarMigrados(true)}
              className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition-all shrink-0"
              title="Enviar invitación al Club a clientes migrados de AgendaPro"
            >
              <Send size={13} />
              Invitar migrados
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px]">
                {migrados.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowSinRegistro(true)}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-amber-500/30 bg-amber-400/5 text-amber-400 hover:bg-amber-400/10 transition-all shrink-0"
          >
            <UserX size={13} />
            Sin registro
            {sinRegistro.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black text-[10px]">
                {sinRegistro.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPIs — 2x2 en movil, 4 en tablet+ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full mb-5">
        {[
          { label: 'Clientes',    value: total,            color: 'text-white' },
          { label: 'Citas totales', value: totalCitasGlobal, color: 'text-blue-400' },
          { label: 'Avg sellos',  value: avg,              color: 'text-emerald-400' },
          { label: 'Con premios', value: conPremio,        color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 md:p-4 text-center">
            <p className={`text-2xl md:text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Panel IA — Clientes en riesgo */}
      {clientesEnRiesgo.length > 0 && (
        <div className="relative overflow-hidden bg-slate-900 border border-orange-500/20 rounded-xl p-4 mb-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <Sparkles size={11} className="text-orange-400" />
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">IA detectó</span>
            </div>
            <p className="text-xs font-semibold text-white">
              {clientesEnRiesgo.length} cliente{clientesEnRiesgo.length !== 1 ? 's' : ''} en riesgo de abandono
            </p>
            <button
              onClick={() => setFiltro('sin30')}
              className="ml-auto text-[10px] text-slate-500 hover:text-orange-400 transition-colors"
            >
              Ver todos →
            </button>
          </div>
          <div className="space-y-1.5">
            {clientesEnRiesgo.slice(0, 3).map(c => {
              const raw = normalizePhone(c.telefono);
              const num = raw.length >= 8 ? (raw.startsWith('56') ? raw : `56${raw}`) : null;
              const waHref = num
                ? `https://wa.me/${num}?text=${encodeURIComponent(`¡Hola ${c.nombre || ''}! 💈 Te extrañamos en la barbería. ¿Cuándo te agendamos tu próximo corte?`)}`
                : null;
              return (
                <div key={c.uid || c.id} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-300">{initials(c.nombre || '?')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{c.nombre || '—'}</p>
                    <p className="text-[10px] text-slate-500">Sin visita hace {c.diasSinVisita} días</p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                    c.diasSinVisita >= 90
                      ? 'text-red-400 border-red-400/30 bg-red-400/10'
                      : c.diasSinVisita >= 60
                        ? 'text-orange-400 border-orange-400/30 bg-orange-400/10'
                        : 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
                  }`}>
                    {c.diasSinVisita >= 90 ? 'Crítico' : c.diasSinVisita >= 60 ? 'En riesgo' : 'Seguimiento'}
                  </span>
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 hover:opacity-90 transition-opacity"
                      style={{ background: '#25D366', color: '#fff' }}
                    >
                      <MessageCircle size={9} /> Contactar
                    </a>
                  )}
                </div>
              );
            })}
            {clientesEnRiesgo.length > 3 && (
              <p className="text-[10px] text-slate-500 text-center pt-1">
                +{clientesEnRiesgo.length - 3} más → usa el filtro &quot;Sin visita 30d&quot;
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search — full width en cualquier viewport */}
      <div className="relative mb-3 w-full">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input placeholder="Buscar por nombre, correo o teléfono…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filtros — scroll horizontal nativo con scrollbar oculta */}
      <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 mb-4 w-full no-scrollbar [&::-webkit-scrollbar]:hidden">
        {[
          { id: 'todos',       label: 'Todos' },
          { id: 'registrados', label: 'Registrados Club' },
          { id: 'migrados',    label: 'Migrados' },
          { id: 'premio',   label: '🏆 Con premio' },
          { id: 'cumple',   label: `🎂 Cumple en ${new Date().toLocaleString('es-CL', { month: 'long' })}` },
          { id: 'sin30',    label: 'Sin visita 30d' },
          { id: 'sin60',    label: 'Sin visita 60d' },
          { id: 'sin90',    label: 'Sin visita 90d' },
          { id: 'silver',   label: 'SILVER' },
          { id: 'gold',     label: 'GOLD' },
          { id: 'platinum', label: 'PLATINUM' },
        ].map(f => {
          const active = filtro === f.id;
          const tierColor =
            f.id === 'platinum' ? (active ? 'bg-violet-500/20 border-violet-400 text-violet-300' : 'border-violet-400/20 text-violet-400 hover:bg-violet-500/10') :
            f.id === 'gold'     ? (active ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300' : 'border-yellow-400/20 text-yellow-400 hover:bg-yellow-500/10') :
            f.id === 'silver'   ? (active ? 'bg-slate-500/40 border-slate-400 text-slate-200'    : 'border-slate-600 text-slate-400 hover:bg-slate-700') :
            f.id === 'migrados' ? (active ? 'bg-amber-500/20 border-amber-400 text-amber-300'    : 'border-amber-400/25 text-amber-400/90 hover:bg-amber-500/10') :
            f.id === 'registrados' ? (active ? 'bg-blue-500/20 border-blue-400 text-blue-300'    : 'border-blue-400/25 text-blue-400/90 hover:bg-blue-500/10') :
            active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'border-slate-700 text-slate-400 hover:bg-slate-800';
          return (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${tierColor}`}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Contador cuando hay filtro activo */}
      {filtro !== 'todos' && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500">
            <span className="text-white font-semibold">{filtered.length}</span> cliente{filtered.length !== 1 ? 's' : ''} con este filtro
          </p>
          <button onClick={() => setFiltro('todos')} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
            <X size={11} /> Limpiar filtro
          </button>
        </div>
      )}

      {/* Lista de clientes — mobile-first, cards flex con truncamiento robusto */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-600 bg-slate-900 border border-slate-800 rounded-xl">
          <User size={28} className="mb-3" /><p className="text-sm">Sin clientes</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-4">
          {paged.map(c => {
            const stamps  = sellos(c);
            const maxCost = premios.length ? premios[premios.length - 1]?.costoSellos : 10;
            const stampsPillCls = stamps >= (maxCost || 10)
              ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/40'
              : stamps >= 5
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-slate-400 bg-slate-800 border border-slate-700';
            const hasPrize = premios.some(p => stamps >= p.costoSellos);
            const numCitas = c.email ? (citasPorEmail[c.email] || 0) : 0;
            return (
              <div
                key={c.uid || c.id}
                onClick={() => setSelected(c)}
                className="group flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {c.photoURL
                    ? <img src={c.photoURL} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-slate-400">{initials(c.nombre || c.email || '?')}</span>}
                </div>

                {/* Info — flex-1 min-w-0 es CRÍTICO para el truncate */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm md:text-base font-bold text-white truncate block group-hover:text-emerald-400 transition-colors">
                    {c.nombre || '—'}
                  </span>
                  <span className="text-xs text-slate-400 truncate block">
                    {c.email || c.telefono || '—'}
                  </span>
                  {numCitas > 0 && (
                    <span className="text-[10px] text-blue-400/70 font-semibold">
                      {numCitas} cita{numCitas !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Badges — alineados a la derecha sin competir con el nombre */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isLegacy(c) && (
                    <span
                      title="Cliente importado desde AgendaPro. Aún no se ha registrado en el Club."
                      className="hidden sm:inline-block text-[9px] font-bold tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md uppercase"
                    >
                      Migrado
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap font-semibold ${stampsPillCls}`}>
                    {stamps} sellos
                  </span>
                  {hasPrize && <Trophy size={12} className="text-yellow-400 shrink-0" />}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-1 py-4 mt-2 border-t border-slate-800/60">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={13} /> Anterior
          </button>
          <p className="text-xs text-slate-500">
            Página{' '}
            <span className="text-white font-bold">{page}</span>
            {' '}de{' '}
            <span className="text-white font-bold">{pageCount}</span>
            <span className="text-slate-600 ml-1.5 hidden sm:inline">· {filtered.length} clientes</span>
          </p>
          <button
            onClick={() => setPage(p => Math.min(pageCount, p + 1))}
            disabled={page === pageCount}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            Siguiente <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Modal nuevo cliente */}
      {showNuevoCliente && (
        <NuevoClienteModal
          premios={premios}
          onClose={() => setShowNuevoCliente(false)}
        />
      )}

      {/* Modal sin registro */}
      {showSinRegistro && (
        <SinRegistroModal
          sinRegistro={sinRegistro}
          shopName={shopName}
          registroUrl={registroUrl}
          onClose={() => setShowSinRegistro(false)}
        />
      )}

      {/* Modal invitar migrados al Club */}
      {showInvitarMigrados && (
        <SinRegistroModal
          mode="migrados"
          tenantId={tenantId}
          sinRegistro={migrados}
          shopName={shopName}
          registroUrl={registroUrl}
          onClose={() => setShowInvitarMigrados(false)}
        />
      )}

      {/* Client detail SlideOver */}
      <SlideOver isOpen={!!selected} onClose={() => setSelected(null)}
        title={selected?.nombre || 'Cliente'}
        subtitle={selected?.email}
        maxWidth="max-w-lg">
        {selected && (
          <ClientePanel
            key={selected.uid || selected.id}
            cliente={{ uid: selected.uid || selected.id, ...selected }}
            premios={premios}
            esMiembro={!isLegacy(selected)}
            onClose={() => setSelected(null)}
          />
        )}
      </SlideOver>
      {showIA && (
        <IAModal
          stats={iaStats}
          shopName={shopName}
          onClose={() => setShowIA(false)}
        />
      )}

      {showHelp && (
        <HelpModal title="Cómo usar Clientes y Fidelización" onClose={() => setShowHelp(false)}>
          <p>Acá vives el día a día del <strong className="text-white">Club de Fidelidad</strong>: sellos, premios y campañas para activar a tus clientes.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Buscar y filtrar</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Buscá por <strong className="text-white">nombre, email o teléfono</strong>.</li>
              <li>Filtros: <em>Registrados Club</em> (azul) vs <em>Migrados</em> (ámbar), tiers SILVER/GOLD/PLATINUM, con premio, cumple en este mes, sin visita 30/60/90 días.</li>
              <li>Toca una fila para abrir el detalle: historial, sellos manuales (suma/resta) y canje de premios.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Sellos automáticos</p>
            <p>Al marcar una cita como <strong className="text-white">Completada</strong> en /agenda, la Cloud Function suma 1 sello al cliente (o descuenta un uso si tiene membresía activa). El sello de <strong className="text-white">cumpleaños</strong> se otorga automáticamente.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Badge "MIGRADO" (ámbar)</p>
            <p>Cliente importado de AgendaPro que <strong className="text-white">aún no se registró en el Club</strong>. Cuando se registre, el badge desaparece y sus datos se fusionan automáticamente (sellos, antigüedad).</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Botón "Invitar migrados" (verde)</p>
            <p>Lista de migrados con un botón WhatsApp por cliente. Mensaje precargado con link de registro. Marca persistente en Firestore — al volver, ya sabes a quién enviaste invitación.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Botón "Sin registro" (ámbar)</p>
            <p>Clientes que ya agendaron pero <strong>no abrieron cuenta en el Club</strong>. Misma campaña, mensaje distinto ("gracias por visitarnos").</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Synaptech IA</p>
            <p>Te da recomendaciones accionables (recuperar clientes en riesgo, contactar a los que tienen premio sin canjear, etc.). Analiza <strong className="text-white">solo clientes reales del Club</strong> — excluye migrados para no sesgar promedios.</p>
          </div>

          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Los <strong>KPIs superiores</strong> (Clientes, Avg sellos) sí incluyen migrados — representan el tamaño total de tu base. Si quieres activarlos, "Invitar migrados" es tu palanca.</p>
        </HelpModal>
      )}
    </div>
  );
}
