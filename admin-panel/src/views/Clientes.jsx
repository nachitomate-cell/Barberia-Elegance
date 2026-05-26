import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, User, Phone, Trophy, Plus, Minus, Gift, X, RotateCcw, MessageCircle, Cake, UserX, Send, Sparkles, Bot, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  onSnapshot, updateDoc, setDoc, doc, getDocs, query, where, orderBy as firestoreOrderBy,
  increment, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
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
function ClientePanel({ cliente: init, premios, onClose }) {
  const [data,        setData]        = useState(init);
  const [citas,       setCitas]       = useState([]);
  const [selPremio,   setSelPremio]   = useState(null);
  const [opLoad,      setOpLoad]      = useState(false);
  const [canjeMsg,    setCanjeMsg]    = useState('');
  const [resetOn,     setResetOn]     = useState(false);
  const [fechaCumple, setFechaCumple] = useState(init.fechaNacimiento || '');
  const [cumpleLoad,  setCumpleLoad]  = useState(false);
  const [cumpleMsg,   setCumpleMsg]   = useState('');
  const cumpleTimer = useRef(null);

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
      await updateDoc(doc(tenantCol('users'), data.uid), {
        fechaNacimiento: fechaCumple || null,
      });
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

  const [totalCitas, setTotalCitas] = useState(0);

  /* Load all appointments for this client (one-time) */
  useEffect(() => {
    if (!init.email) return;
    getDocs(query(tenantCol('citas'), where('clienteEmail', '==', init.email)))
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
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">{data.nombre || '—'}</p>
          <p className="text-xs text-slate-500 truncate">{data.email}</p>
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
          <p className="text-[10px] text-slate-600 mt-1">Miembro desde {formatFecha(data.creadoEn?.toDate ? data.creadoEn.toDate().toISOString() : data.creadoEn)}</p>
        </div>
      </div>

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
    </div>
  );
}

/* ── Modal: clientes sin registro ───────────────────────────────── */
function SinRegistroModal({ sinRegistro, shopName, registroUrl, onClose, mode = 'sinRegistro' }) {
  const [search, setSearch] = useState('');
  const [enviados, setEnviados] = useState(() => new Set());

  const isMigrados = mode === 'migrados';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sinRegistro;
    return sinRegistro.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
    );
  }, [sinRegistro, search]);

  const waMsg = (nombre) => {
    const name = shopName.normalize('NFKC');
    if (isMigrados) {
      return `¡Hola ${nombre || 'ahí'}! 👋 Soy de *${name}*. Estamos estrenando nuestro Club de Fidelidad nuevo y, como ya eres cliente, te invitamos a unirte 🎁\n\nEs gratis: por cada visita acumulas sellos que canjeas por premios. Te demoras 1 minuto en activarte 👉 ${registroUrl}\n\n¡Te esperamos!`;
    }
    return `¡Hola ${nombre || 'ahí'}! 👋 Gracias por visitarnos en ${name}. Tenemos un club de fidelidad donde acumulas sellos y ganas premios gratis 🎁. ¡Únete registrándote aquí! 👉 ${registroUrl}`;
  };

  const waUrl = (telefono, nombre) => {
    const raw = (telefono || '').replace(/\D/g, '');
    if (!raw || raw.length < 8) return null;
    const num = raw.startsWith('56') ? raw : `56${raw}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(waMsg(nombre))}`;
  };

  const marcarEnviado = (key) => setEnviados(s => new Set([...s, key]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              {isMigrados ? (
                <Send size={15} className="text-amber-400" />
              ) : (
                <UserX size={15} className="text-amber-400" />
              )}
              <h3 className="font-semibold text-white">
                {isMigrados ? 'Invitar clientes migrados' : 'Clientes sin registro'}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400">
                {sinRegistro.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMigrados
                ? 'Clientes traídos de AgendaPro. Aún no se han unido al Club.'
                : 'Han agendado pero no se han unido al club de fidelidad'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors"
            />
          </div>
          <div className="flex items-center justify-between mt-2 mb-1">
            <p className="text-xs text-slate-600">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</p>
            {isMigrados && enviados.size > 0 && (
              <p className="text-xs text-emerald-400 font-semibold">{enviados.size} invitación{enviados.size !== 1 ? 'es' : ''} enviada{enviados.size !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 mt-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-center">
              <UserX size={28} className="text-slate-700" />
              <p className="text-sm text-slate-500">Sin resultados</p>
            </div>
          ) : filtered.map(c => {
            const url = waUrl(c.telefono, c.nombre);
            const yaEnviado = enviados.has(c.key);
            return (
              <div key={c.key} className={`flex items-center gap-3 bg-slate-800/50 border rounded-xl px-4 py-3 transition-all ${yaEnviado ? 'border-emerald-500/30 opacity-60' : 'border-slate-800'}`}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-slate-300">
                    {(c.nombre || '?').trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.nombre || 'Sin nombre'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.telefono && <span className="text-[10px] text-slate-500">{c.telefono}</span>}
                    {!isMigrados && c.count != null && (
                      <span className="text-[10px] font-bold text-blue-400/80">{c.count} cita{c.count !== 1 ? 's' : ''}</span>
                    )}
                    {isMigrados && c.email && (
                      <span className="text-[10px] text-slate-600 truncate">{c.email}</span>
                    )}
                  </div>
                </div>

                {/* Botón WA */}
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => marcarEnviado(c.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all hover:opacity-90 active:scale-95"
                    style={yaEnviado
                      ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.4)' }
                      : { background: '#25D366', color: '#fff' }}
                    title={`Enviar invitación a ${c.nombre}`}
                  >
                    <Send size={11} />
                    {yaEnviado ? 'Reenviar' : 'Invitar'}
                  </a>
                ) : (
                  <span className="text-[10px] text-slate-600 shrink-0">Sin teléfono</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer: mensaje de referencia */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-800/20 rounded-b-2xl">
          <p className="text-[10px] text-slate-500 font-semibold mb-1">Mensaje que se enviará:</p>
          <p className="text-[10px] text-slate-600 leading-relaxed whitespace-pre-wrap">
            {waMsg('{nombre}').replace(registroUrl, '👉 ' + registroUrl)}
          </p>
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
  const { total, avg, riesgo, conPremio, totalCitas, cumple, silver, gold, platinum } = stats;

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
  const { data: clientes, loading } = useCollection('users');
  const { data: premios }           = useCollection('premios', [firestoreOrderBy('costoSellos')]);
  const [todasCitas, setTodasCitas] = useState([]);

  useEffect(() => {
    getDocs(query(tenantCol('citas'), where('fecha', '>=', NINETY_DAYS_AGO)))
      .then(snap => setTodasCitas(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  const [search,                setSearch]                = useState('');
  const [filtro,                setFiltro]                = useState('todos');
  const [showHelp,              setShowHelp]              = useState(false);
  const [selected,              setSelected]              = useState(null);
  const [showSinRegistro,       setShowSinRegistro]       = useState(false);
  const [showInvitarMigrados,   setShowInvitarMigrados]   = useState(false);
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

  /* Clientes migrados (legacy de AgendaPro, no se han unido al Club) */
  const migrados = useMemo(() =>
    clientes
      .filter(isLegacy)
      .map(c => ({
        key:      c.id,
        nombre:   c.nombre   || '',
        telefono: c.telefono || c.id || '',
        email:    c.email    || '',
      }))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')),
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

  const clientesEnRiesgo = useMemo(() => {
    const ahora = Date.now();
    return clientes
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
  }, [clientes]);

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
    if (filtro === 'cumple') return c.cumpleDia?.startsWith(mesActual + '-');
    if (filtro === 'silver')   return calcTier(historicos) === 'SILVER';
    if (filtro === 'gold')     return calcTier(historicos) === 'GOLD';
    if (filtro === 'platinum') return calcTier(historicos) === 'PLATINUM';
    if (filtro === 'sin30' || filtro === 'sin60' || filtro === 'sin90') {
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

  const total  = clientes.length;
  const avg    = total ? (clientes.reduce((s, c) => s + sellos(c), 0) / total).toFixed(1) : 0;
  const conPremio = premios.length
    ? clientes.filter(c => sellos(c) >= premios[0]?.costoSellos).length
    : clientes.filter(c => sellos(c) >= 5).length;
  const totalCitasGlobal = todasCitas.length;

  const iaStats = useMemo(() => ({
    total,
    avg,
    riesgo:     clientesEnRiesgo.length,
    conPremio,
    totalCitas: totalCitasGlobal,
    cumple:     clientes.filter(c => c.cumpleDia?.startsWith(mesActual + '-')).length,
    silver:     clientes.filter(c => calcTier(c.sellosHistoricos ?? c.stamps ?? 0) === 'SILVER').length,
    gold:       clientes.filter(c => calcTier(c.sellosHistoricos ?? c.stamps ?? 0) === 'GOLD').length,
    platinum:   clientes.filter(c => calcTier(c.sellosHistoricos ?? c.stamps ?? 0) === 'PLATINUM').length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [total, avg, clientesEnRiesgo.length, conPremio, totalCitasGlobal, clientes.length]);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Clientes y Fidelización</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona sellos y premios de cada cliente.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIA(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-[#D4AF37]/35 bg-[#D4AF37]/5 text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
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

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Clientes',    value: total,            color: 'text-white' },
          { label: 'Citas totales', value: totalCitasGlobal, color: 'text-blue-400' },
          { label: 'Avg sellos',  value: avg,              color: 'text-emerald-400' },
          { label: 'Con premios', value: conPremio,        color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
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

      {/* Search */}
      <div className="relative mb-3">
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

      {/* Filtros */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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
              className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${tierColor}`}>
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

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-600"><User size={28} className="mb-3" /><p className="text-sm">Sin clientes</p></div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {paged.map(c => {
              const stamps = sellos(c);
              const maxCost = premios.length ? premios[premios.length - 1]?.costoSellos : 10;
              const pct = Math.min(stamps / Math.max(maxCost, 1) * 100, 100);
              const badgeCls = stamps >= (maxCost || 10) ? 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10'
                : stamps >= 5 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                : 'text-slate-500 border-slate-700';
              const hasPrize = premios.some(p => stamps >= p.costoSellos);
              const numCitas = c.email ? (citasPorEmail[c.email] || 0) : 0;
              return (
                <div key={c.uid || c.id} onClick={() => setSelected(c)}
                  className="grid grid-cols-12 items-center px-5 py-4 hover:bg-white/2 transition-colors cursor-pointer group">
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      {c.photoURL
                        ? <img src={c.photoURL} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold text-slate-400">{initials(c.nombre || c.email || '?')}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">{c.nombre || '—'}</p>
                        {isLegacy(c) && (
                          <span
                            title="Cliente importado desde AgendaPro. Aún no se ha registrado en el Club."
                            className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 uppercase tracking-wider"
                          >
                            Migrado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{c.email}</p>
                      {numCitas > 0 && (
                        <p className="text-[10px] text-blue-400/70 font-semibold">{numCitas} cita{numCitas !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 hidden sm:block">
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1"><Phone size={10} /> {c.telefono || '—'}</p>
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeCls}`}>{stamps} sellos</span>
                      {hasPrize && <Trophy size={11} className="text-yellow-400" />}
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1"><div className="h-1 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-600 group-hover:text-emerald-400 transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
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
              <span className="text-slate-600 ml-1.5">· {filtered.length} clientes</span>
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
      </div>

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
        <HelpModal title="Ayuda — Clientes y Fidelización" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-white">Clientes</strong> gestionas el programa de fidelización por sellos.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Busca clientes por nombre o teléfono con la barra de búsqueda.</li>
            <li>Haz clic en un cliente para ver su historial y <span className="text-white">agregar o retirar sellos</span> manualmente.</li>
            <li>Los sellos se acumulan automáticamente al completar citas con precio definido.</li>
            <li>Al alcanzar el costo de un <span className="text-white">Premio</span>, el sistema lo desbloquea para el cliente.</li>
            <li>El sello de <span className="text-white">cumpleaños</span> se otorga automáticamente el día del cumpleaños del cliente.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
