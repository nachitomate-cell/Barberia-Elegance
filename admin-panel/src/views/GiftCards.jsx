import { useState, useMemo } from 'react';
import { addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import {
  Gift, Plus, X, Copy, CheckCheck, AlertCircle, Search,
  CreditCard, Banknote, CheckCircle2, Clock, XCircle,
} from 'lucide-react';

/* ── Helpers ──────────────────────────────────────────────────────── */
function formatCLP(n) { return `$${Math.round(n).toLocaleString('es-CL')}`; }
function genCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix.toUpperCase()}-${seg()}-${seg()}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

const STATUS_CONFIG = {
  activa:   { label: 'Activa',   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', Icon: CheckCircle2 },
  usada:    { label: 'Usada',    color: 'text-slate-400   bg-slate-500/10   border-slate-500/20',   Icon: CheckCircle2 },
  vencida:  { label: 'Vencida',  color: 'text-red-400     bg-red-500/10     border-red-500/20',     Icon: XCircle      },
  parcial:  { label: 'Parcial',  color: 'text-amber-400   bg-amber-500/10   border-amber-500/20',   Icon: Clock        },
};

/* ── CreateModal ──────────────────────────────────────────────────── */
function CreateModal({ tenantId, user, onClose, onCreated }) {
  const [valor, setValor] = useState('');
  const [nombre, setNombre] = useState('');
  const [vence, setVence] = useState('');
  const [loading, setLoading] = useState(false);
  const [code] = useState(() => genCode(tenantId.slice(0, 4)));

  const submit = async (e) => {
    e.preventDefault();
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) return;
    setLoading(true);
    try {
      await addDoc(tenantCol('giftCards'), {
        codigo: code,
        valor: Number(valor),
        saldo: Number(valor),
        estado: 'activa',
        nombre: nombre.trim() || 'Sin nombre',
        creadoPor: user?.uid || 'admin',
        creadoEn: serverTimestamp(),
        ...(vence ? { venceEn: vence } : {}),
      });
      onCreated();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <p className="text-sm font-bold text-white">Nueva Gift Card</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Código generado</label>
            <p className="mt-1 font-mono text-sm text-emerald-400 bg-slate-800 px-3 py-2 rounded-lg">{code}</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Valor ($)</label>
            <input
              type="number" min="1000" step="500" value={valor} onChange={e => setValor(e.target.value)}
              placeholder="15000"
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre destinatario</label>
            <input
              type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Vencimiento (opcional)</label>
            <input
              type="date" value={vence} onChange={e => setVence(e.target.value)} min={today()}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all">
            {loading ? 'Creando...' : 'Crear Gift Card'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── RedeemModal ──────────────────────────────────────────────────── */
function RedeemModal({ giftCards, tenantId, user, onClose, onRedeemed }) {
  const [codigo, setCodigo] = useState('');
  const [monto, setMonto] = useState('');
  const [found, setFound] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const buscar = () => {
    setErr('');
    const gc = giftCards.find(g => g.codigo === codigo.trim().toUpperCase());
    if (!gc) { setErr('Código no encontrado.'); setFound(null); return; }
    if (gc.estado === 'usada')   { setErr('Esta gift card ya fue usada completamente.'); setFound(null); return; }
    if (gc.estado === 'vencida') { setErr('Esta gift card está vencida.'); setFound(null); return; }
    if (gc.venceEn && gc.venceEn < today()) { setErr('Esta gift card está vencida.'); setFound(null); return; }
    setFound(gc);
    setMonto(String(gc.saldo));
  };

  const canjear = async () => {
    if (!found) return;
    const amount = Number(monto);
    if (!amount || amount <= 0 || amount > found.saldo) { setErr('Monto inválido.'); return; }
    setLoading(true);
    try {
      const nuevoSaldo = found.saldo - amount;
      const path = tenantId === 'elegance' ? `giftCards/${found.id}` : `tenants/${tenantId}/giftCards/${found.id}`;
      await updateDoc(doc(db, path), {
        saldo: nuevoSaldo,
        estado: nuevoSaldo <= 0 ? 'usada' : 'parcial',
        ultimoUso: serverTimestamp(),
        usadoPor: user?.uid || 'admin',
      });
      onRedeemed();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <p className="text-sm font-bold text-white">Canjear Gift Card</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text" value={codigo} onChange={e => { setCodigo(e.target.value.toUpperCase()); setFound(null); setErr(''); }}
              placeholder="XXXX-XXXX-XXXX"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none uppercase"
            />
            <button onClick={buscar}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all">
              <Search size={14} />
            </button>
          </div>
          {err && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{err}</p>}
          {found && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Destinatario</span>
                <span className="text-white font-medium">{found.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Saldo disponible</span>
                <span className="text-emerald-400 font-bold">{formatCLP(found.saldo)}</span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Monto a descontar ($)</label>
                <input
                  type="number" min="1" max={found.saldo} value={monto} onChange={e => setMonto(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button onClick={canjear} disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all">
                {loading ? 'Canjeando...' : `Descontar ${monto ? formatCLP(Number(monto)) : ''}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── GiftCardRow ──────────────────────────────────────────────────── */
function GiftCardRow({ gc }) {
  const [copied, setCopied] = useState(false);
  const cfg = STATUS_CONFIG[gc.estado] || STATUS_CONFIG.activa;
  const { Icon } = cfg;

  const copy = async () => {
    try { await navigator.clipboard.writeText(gc.codigo); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex-wrap">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cfg.color.split(' ').slice(1).join(' ')} shrink-0`}>
        <Icon size={16} className={cfg.color.split(' ')[0]} />
      </div>
      <div className="flex-1 min-w-[140px]">
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm font-bold text-white">{gc.codigo}</p>
          <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors">
            {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{gc.nombre}</p>
      </div>
      <div className="text-right min-w-[80px]">
        <p className="text-sm font-bold text-white">{formatCLP(gc.saldo)}</p>
        <p className="text-xs text-slate-500">de {formatCLP(gc.valor)}</p>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.color}`}>
        {cfg.label}
      </span>
      {gc.venceEn && <p className="text-xs text-slate-500 shrink-0">Vence {gc.venceEn}</p>}
    </div>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */
export default function GiftCards() {
  const { user } = useAuth();
  const { id: tenantId } = useTenant();
  const [showCreate, setShowCreate] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [filter, setFilter] = useState('todas');
  const [search, setSearch] = useState('');

  const { data: giftCards = [], refresh } = useCollection('giftCards');

  const filtered = useMemo(() => {
    return giftCards
      .filter(g => filter === 'todas' || g.estado === filter)
      .filter(g => !search || g.codigo?.includes(search.toUpperCase()) || g.nombre?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.creadoEn?.toMillis?.() || 0) - (a.creadoEn?.toMillis?.() || 0));
  }, [giftCards, filter, search]);

  const stats = useMemo(() => ({
    activas: giftCards.filter(g => g.estado === 'activa' || g.estado === 'parcial').length,
    saldoTotal: giftCards.filter(g => g.estado !== 'usada' && g.estado !== 'vencida').reduce((s, g) => s + (g.saldo || 0), 0),
    usadas: giftCards.filter(g => g.estado === 'usada').length,
    emitidas: giftCards.length,
  }), [giftCards]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift size={20} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Gift Cards</h1>
          </div>
          <p className="text-sm text-slate-400">Crea y gestiona tarjetas de regalo para tus clientes.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRedeem(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all">
            <CreditCard size={14} />
            Canjear
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all">
            <Plus size={14} />
            Nueva Gift Card
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Emitidas', value: stats.emitidas, icon: Gift, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Activas', value: stats.activas, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Saldo en circulación', value: formatCLP(stats.saldoTotal), icon: Banknote, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Usadas', value: stats.usadas, icon: CheckCircle2, color: 'text-slate-400', bg: 'bg-slate-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
              <Icon size={14} className={color} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-lg font-bold text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {['todas', 'activa', 'parcial', 'usada', 'vencida'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                filter === f ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
          <Search size={13} className="text-slate-500 shrink-0" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar código o nombre..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
          <Gift size={32} className="opacity-30" />
          <p className="text-sm">Sin gift cards{filter !== 'todas' ? ` con estado "${filter}"` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(gc => <GiftCardRow key={gc.id} gc={gc} />)}
        </div>
      )}

      {showCreate && (
        <CreateModal
          tenantId={tenantId}
          user={user}
          onClose={() => setShowCreate(false)}
          onCreated={() => refresh?.()}
        />
      )}
      {showRedeem && (
        <RedeemModal
          giftCards={giftCards}
          tenantId={tenantId}
          user={user}
          onClose={() => setShowRedeem(false)}
          onRedeemed={() => refresh?.()}
        />
      )}
    </div>
  );
}
