import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, User, Phone, Trophy, Plus, Minus, Gift, X, RotateCcw, MessageCircle, Cake } from 'lucide-react';
import {
  onSnapshot, updateDoc, setDoc, doc, getDocs, query, where, orderBy as firestoreOrderBy,
  increment, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import SlideOver from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

/* ── Utilidades ── */
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
            filled ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-white/3 border-white/8 text-slate-600'
          }`}>
            {filled ? <i className="ph-fill ph-scissors text-[9px]" /> : n}
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

  /* Load recent appointments (one-time) */
  useEffect(() => {
    if (!init.email) return;
    getDocs(query(tenantCol('citas'), where('clienteEmail', '==', init.email)))
      .then(snap => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        arr.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.hora || '').localeCompare(a.hora || ''));
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

  function calcTier(historicos) {
    if (historicos >= 25) return 'PLATINUM';
    if (historicos >= 10) return 'GOLD';
    return 'SILVER';
  }
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
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Citas recientes</p>
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

/* ── Vista principal Clientes ── */
export default function Clientes() {
  const { data: clientes, loading } = useCollection('users');
  const { data: premios }           = useCollection('premios', [firestoreOrderBy('costoSellos')]);

  const [search,    setSearch]    = useState('');
  const [showHelp,  setShowHelp]  = useState(false);
  const [selected,  setSelected]  = useState(null);

  const sellos = c => c.sellosDisponibles ?? c.stamps ?? 0;

  const sorted = useMemo(() =>
    [...clientes].sort((a, b) => sellos(b) - sellos(a) || (a.nombre || '').localeCompare(b.nombre || '')),
    [clientes]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? sorted.filter(c =>
      c.nombre?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
    ) : sorted;
  }, [sorted, search]);

  const total  = clientes.length;
  const avg    = total ? (clientes.reduce((s, c) => s + sellos(c), 0) / total).toFixed(1) : 0;
  const conPremio = premios.length
    ? clientes.filter(c => sellos(c) >= premios[0]?.costoSellos).length
    : clientes.filter(c => sellos(c) >= 5).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">Clientes y Fidelización</h1>
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
        <p className="text-sm text-slate-500 mt-0.5">Gestiona sellos y premios de cada cliente.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Clientes', value: total,     color: 'text-white' },
          { label: 'Avg Sellos', value: avg,     color: 'text-emerald-400' },
          { label: 'Con premios', value: conPremio, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
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

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-600"><User size={28} className="mb-3" /><p className="text-sm">Sin clientes</p></div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filtered.map(c => {
              const stamps = sellos(c);
              const maxCost = premios.length ? premios[premios.length - 1]?.costoSellos : 10;
              const pct = Math.min(stamps / Math.max(maxCost, 1) * 100, 100);
              const badgeCls = stamps >= (maxCost || 10) ? 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10'
                : stamps >= 5 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                : 'text-slate-500 border-slate-700';
              const hasPrize = premios.some(p => stamps >= p.costoSellos);
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
                      <p className="font-semibold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">{c.nombre || '—'}</p>
                      <p className="text-xs text-slate-500 truncate">{c.email}</p>
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
      </div>

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
