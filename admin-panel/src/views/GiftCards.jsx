import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useClubUsers } from '../hooks/useClubUsers';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import GiftCardDigitalExport from '../components/GiftCardDigitalExport';
import {
  Gift, Plus, X, Copy, CheckCheck, AlertCircle, Search,
  CreditCard, Banknote, CheckCircle2, Clock, XCircle, MessageCircle, ExternalLink,
  QrCode, Camera, UserPlus, Loader2, Link2, Download, Sparkles, PartyPopper, ImageDown, Eye,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/* ── Dominios públicos por tenant (link de venta directa) ───────────── */
const PUBLIC_DOMAINS = {
  elegance:     'https://barberiaelegance.synaptechspa.cl',
  ferraza:      'https://barberiaferraza.synaptechspa.cl',
  gitana:       'https://gitananails.synaptechspa.cl',
  sionbarberia: 'https://barberiasion.synaptechspa.cl',
};
/** URL pública de compra de Gift Card para el tenant actual. */
function publicSaleUrl(tenantId) {
  const base = PUBLIC_DOMAINS[tenantId] || window.location.origin;
  return `${base}/gift-cards`;
}
/** URL pública de consulta de saldo, con el código prefijado. */
function saldoLink(codigo) {
  return `${window.location.origin}/gestion-interna/saldo-gift-card?codigo=${encodeURIComponent(codigo)}`;
}

/* ── Helpers ──────────────────────────────────────────────────────── */
const QUICK_AMOUNTS = [10000, 15000, 25000, 50000];

function formatCLP(n) { return `$${Math.round(n).toLocaleString('es-CL')}`; }
function shareWa(gc, tenantName) {
  const link = saldoLink(gc.codigo);
  const msg = encodeURIComponent(
    `🎁 *Gift Card ${tenantName}*\n\n` +
    `Hola ${gc.nombre}! Tienes una Gift Card de *${formatCLP(gc.valor)}* para usar en ${tenantName}.\n\n` +
    `Tu código es: *${gc.codigo}*\n` +
    `Consulta tu saldo aquí: ${link}\n\n` +
    `Preséntalo en caja al momento de pagar. ✂️`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}
function genCode(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix.toUpperCase()}-${seg()}-${seg()}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

/** Extrae un código de Gift Card del valor crudo de un QR (texto o URL). */
function extractCode(raw) {
  if (!raw) return '';
  const val = String(raw).trim();
  // 1) ¿Es una URL con ?codigo=...?
  try {
    const u = new URL(val);
    const c = u.searchParams.get('codigo');
    if (c) return c.toUpperCase();
  } catch { /* no es URL */ }
  // 2) Patrón PREFIJO-XXXX-XXXX
  const m = val.toUpperCase().match(/[A-Z0-9]{2,6}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  if (m) return m[0];
  // 3) Texto plano
  return val.toUpperCase();
}

async function downloadQR(url, filename) {
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 640, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch { /* noop */ }
}

const STATUS_CONFIG = {
  activa:   { label: 'Activa',   color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', Icon: CheckCircle2 },
  usada:    { label: 'Usada',    color: 'text-slate-400   bg-slate-500/10   border-slate-500/20',   Icon: CheckCircle2 },
  vencida:  { label: 'Vencida',  color: 'text-red-400     bg-red-500/10     border-red-500/20',     Icon: XCircle      },
  parcial:  { label: 'Parcial',  color: 'text-amber-400   bg-amber-500/10   border-amber-500/20',   Icon: Clock        },
};

/* ── Animaciones compartidas ──────────────────────────────────────── */
const backdrop = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
const panel = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit:    { opacity: 0, scale: 0.96, y: 12 },
};
const spring = { type: 'spring', stiffness: 420, damping: 32 };

/* ── ModalShell ───────────────────────────────────────────────────── */
function ModalShell({ children, onClose, maxW = 'max-w-sm' }) {
  return (
    <motion.div
      {...backdrop}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        {...panel} transition={spring}
        className={`bg-slate-900 border border-slate-800 rounded-2xl w-full ${maxW} shadow-2xl overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ── BuyerAutocomplete ────────────────────────────────────────────────
   Buscador de comprador. Solo se monta (y solo entonces useClubUsers
   suscribe la colección `users`) cuando el admin decide vincular. */
function BuyerAutocomplete({ value, onSelect, onClear }) {
  const { data: users = [], loading } = useClubUsers();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const digits = term.replace(/\D/g, '');
    return users
      .filter(u =>
        (u.nombre || '').toLowerCase().includes(term) ||
        (digits && (u.telefono || '').replace(/\D/g, '').includes(digits)) ||
        (u.email || '').toLowerCase().includes(term)
      )
      .slice(0, 6);
  }, [users, q]);

  if (value) return (
    <div className="flex items-center justify-between gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm text-white font-medium truncate">{value.nombre || 'Cliente'}</p>
        {value.telefono && <p className="text-xs text-slate-400 truncate">{value.telefono}</p>}
      </div>
      <button type="button" onClick={onClear} className="text-slate-500 hover:text-white shrink-0"><X size={14} /></button>
    </div>
  );

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 focus-within:border-emerald-500 transition-colors">
        <Search size={13} className="text-slate-500 shrink-0" />
        <input
          type="text" value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar cliente por nombre o teléfono..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        {loading && <Loader2 size={13} className="text-slate-500 animate-spin shrink-0" />}
      </div>
      <AnimatePresence>
        {open && q.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14 }}
            className="absolute z-10 left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
          >
            {results.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-slate-500">Sin coincidencias.</p>
            ) : results.map(u => (
              <button
                key={u.id} type="button"
                onClick={() => { onSelect(u); setOpen(false); setQ(''); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-700/60 transition-colors"
              >
                <span className="text-sm text-white truncate">{u.nombre || 'Sin nombre'}</span>
                {u.telefono && <span className="text-xs text-slate-400 shrink-0">{u.telefono}</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── CreateModal ──────────────────────────────────────────────────── */
function CreateModal({ tenantId, tenantName, tenantLogo, user, onClose }) {
  const [valor, setValor] = useState('');
  const [nombre, setNombre] = useState('');
  const [vence, setVence] = useState('');
  const [comprador, setComprador] = useState(null);
  const [showBuyer, setShowBuyer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [code] = useState(() => genCode(tenantId.slice(0, 4)));
  const cardRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) return;
    setLoading(true);
    try {
      const gc = {
        codigo: code,
        valor: Number(valor),
        saldo: Number(valor),
        estado: 'activa',
        nombre: nombre.trim() || 'Sin nombre',
        creadoPor: user?.uid || 'admin',
        creadoEn: serverTimestamp(),
        ...(vence ? { venceEn: vence } : {}),
        ...(comprador ? {
          compradorId: comprador.id,
          compradorNombre: comprador.nombre || '',
          compradorTelefono: comprador.telefono || '',
        } : {}),
      };
      await addDoc(tenantCol('giftCards'), gc);
      setCreated({ ...gc, nombre: nombre.trim() || 'Sin nombre' });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(saldoLink(created.codigo));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  /** Captura la tarjeta full-size (offscreen) como PNG y la descarga. */
  const handleDownloadImage = async () => {
    if (!cardRef.current || downloadingImg) return;
    setDownloadingImg(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#0b1220',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `gift-card-${created.codigo}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('[GiftCards] export PNG failed:', err);
    } finally {
      setDownloadingImg(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <p className="text-sm font-bold text-white">{created ? 'Gift Card creada' : 'Nueva Gift Card'}</p>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
      </div>

      <AnimatePresence mode="wait">
        {created ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={spring}
            className="p-5 space-y-4"
          >
            {/* Instancia FULL-SIZE oculta — solo existe para que html-to-image
                la capture en su tamaño nominal (400×250). No afecta layout. */}
            <div
              aria-hidden="true"
              style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
            >
              <GiftCardDigitalExport
                ref={cardRef}
                monto={created.valor}
                codigo={created.codigo}
                urlQR={saldoLink(created.codigo)}
                nombreTenant={tenantName}
                logoTenant={tenantLogo}
                nombreDestinatario={created.nombre !== 'Sin nombre' ? created.nombre : undefined}
              />
            </div>

            <div className="flex flex-col items-center text-center gap-2 pt-1">
              <motion.div
                initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ ...spring, delay: 0.05 }}
                className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
              >
                <PartyPopper size={22} className="text-emerald-400" />
              </motion.div>
              <p className="text-sm text-slate-300">¡Lista para regalar!</p>
            </div>

            {/* Previsualización escalada (60% → 240×150). El wrapper recorta
                el ancho/alto reales para que el `transform: scale()` no deje
                espacio fantasma debajo. */}
            <div className="mx-auto" style={{ width: 240, height: 150 }}>
              <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left' }}>
                <GiftCardDigitalExport
                  monto={created.valor}
                  codigo={created.codigo}
                  urlQR={saldoLink(created.codigo)}
                  nombreTenant={tenantName}
                  logoTenant={tenantLogo}
                  nombreDestinatario={created.nombre !== 'Sin nombre' ? created.nombre : undefined}
                />
              </div>
            </div>

            {/* CTA principal: descarga PNG */}
            <button
              onClick={handleDownloadImage}
              disabled={downloadingImg}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all"
            >
              {downloadingImg
                ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
                : <><ImageDown size={15} /> Descargar imagen</>}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => shareWa(created, tenantName)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30 transition-all"
              >
                <MessageCircle size={15} /> WhatsApp
              </button>
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                {copied ? <><CheckCheck size={15} className="text-emerald-400" /> Copiado</> : <><Link2 size={15} /> Copiar enlace</>}
              </button>
            </div>

            <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
              Cerrar
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -24 }}
            transition={spring}
            onSubmit={submit} className="p-5 space-y-4"
          >
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Código generado</label>
              <p className="mt-1 font-mono text-sm text-emerald-400 bg-slate-800 px-3 py-2 rounded-lg">{code}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Valor ($)</label>
              {/* Quick chips */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QUICK_AMOUNTS.map(amt => {
                  const active = Number(valor) === amt;
                  return (
                    <button
                      key={amt} type="button" onClick={() => setValor(String(amt))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      {formatCLP(amt)}
                    </button>
                  );
                })}
              </div>
              <input
                type="number" min="1000" step="500" value={valor} onChange={e => setValor(e.target.value)}
                placeholder="15000"
                className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
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

            {/* Vínculo con comprador (opcional, lazy) */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Comprador (opcional)</label>
              {showBuyer || comprador ? (
                <div className="mt-1">
                  <BuyerAutocomplete value={comprador} onSelect={setComprador} onClear={() => setComprador(null)} />
                </div>
              ) : (
                <button
                  type="button" onClick={() => setShowBuyer(true)}
                  className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm text-slate-400 bg-slate-800/50 border border-dashed border-slate-700 hover:border-slate-600 hover:text-slate-200 transition-all"
                >
                  <UserPlus size={14} /> Vincular un cliente
                </button>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Vencimiento (opcional)</label>
              <input
                type="date" value={vence} onChange={e => setVence(e.target.value)} min={today()}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all">
              {loading ? <><Loader2 size={15} className="animate-spin" /> Creando...</> : <><Sparkles size={15} /> Crear Gift Card</>}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </ModalShell>
  );
}

/* ── QrScanner (nativo, sin dependencias) ─────────────────────────── */
function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!supported) {
      setError('Tu navegador no soporta el escaneo de QR. Ingresa el código manualmente.');
      return;
    }
    let stream = null, raf = null, cancelled = false;

    (async () => {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length) { onResult(codes[0].rawValue); return; }
          } catch { /* frame sin lectura */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
      }
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [supported, onResult]);

  return (
    <motion.div
      {...backdrop}
      className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        {...panel} transition={spring}
        className="relative w-full max-w-xs aspect-square rounded-2xl overflow-hidden border border-slate-700 bg-black"
        onClick={e => e.stopPropagation()}
      >
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle size={28} className="text-amber-400" />
            <p className="text-sm text-slate-300">{error}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            {/* Marco de mira */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 rounded-xl border-2 border-emerald-400/70" />
              <motion.div
                initial={{ top: '12%' }} animate={{ top: '85%' }}
                transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                className="absolute left-8 right-8 h-0.5 bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]"
              />
            </div>
          </>
        )}
      </motion.div>
      <p className="text-xs text-slate-400 mt-4">Apunta la cámara al código QR de la Gift Card</p>
      <button onClick={onClose} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-all">
        Cancelar
      </button>
    </motion.div>
  );
}

/* ── RedeemModal ──────────────────────────────────────────────────── */
function RedeemModal({ giftCards, tenantId, user, onClose }) {
  const [codigo, setCodigo] = useState('');
  const [monto, setMonto] = useState('');
  const [found, setFound] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | checking | valid | invalid
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Validación en tiempo real (debounce 350ms) contra el snapshot vivo de Firestore.
  useEffect(() => {
    const code = codigo.trim().toUpperCase();
    if (!code) { setStatus('idle'); setFound(null); setMessage(''); return; }
    setStatus('checking');
    const t = setTimeout(() => {
      const gc = giftCards.find(g => g.codigo === code);
      if (!gc) { setStatus('invalid'); setFound(null); setMessage('Código no encontrado.'); return; }
      if (gc.estado === 'usada') { setStatus('invalid'); setFound(null); setMessage('Esta Gift Card ya fue usada por completo.'); return; }
      if (gc.estado === 'vencida' || (gc.venceEn && gc.venceEn < today())) {
        setStatus('invalid'); setFound(null); setMessage('Esta Gift Card está vencida.'); return;
      }
      setFound(gc);
      setStatus('valid');
      setMessage(`Saldo disponible: ${formatCLP(gc.saldo)}`);
      setMonto(String(gc.saldo));
    }, 350);
    return () => clearTimeout(t);
  }, [codigo, giftCards]);

  const onScan = useCallback((raw) => {
    setScanning(false);
    setCodigo(extractCode(raw));
  }, []);

  const canjear = async () => {
    if (!found) return;
    const amount = Number(monto);
    if (!amount || amount <= 0 || amount > found.saldo) { setStatus('invalid'); setMessage('Monto inválido.'); return; }
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
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const borderColor =
    status === 'valid'   ? 'border-emerald-500 focus-within:border-emerald-500' :
    status === 'invalid' ? 'border-red-500 focus-within:border-red-500' :
                           'border-slate-700 focus-within:border-emerald-500';

  return (
    <>
      <ModalShell onClose={onClose}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <p className="text-sm font-bold text-white">Canjear Gift Card</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className={`flex items-center gap-2 bg-slate-800 border rounded-lg px-3 transition-colors ${borderColor}`}>
              <input
                type="text" value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="flex-1 bg-transparent py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none uppercase"
              />
              {status === 'checking' && <Loader2 size={15} className="text-slate-500 animate-spin shrink-0" />}
              {status === 'valid'    && <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
              <button
                type="button" onClick={() => setScanning(true)}
                title="Escanear QR"
                className="text-slate-400 hover:text-emerald-400 transition-colors shrink-0 pl-1"
              >
                <Camera size={17} />
              </button>
            </div>
            {/* Feedback en tiempo real */}
            <AnimatePresence mode="wait">
              {message && (
                <motion.p
                  key={message}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`mt-1.5 text-xs flex items-center gap-1 ${status === 'valid' ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {status === 'valid' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {found && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all">
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Canjeando...</> : `Descontar ${monto ? formatCLP(Number(monto)) : ''}`}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ModalShell>

      <AnimatePresence>
        {scanning && <QrScanner onResult={onScan} onClose={() => setScanning(false)} />}
      </AnimatePresence>
    </>
  );
}

/* ── ViewCardModal ────────────────────────────────────────────────────
   Reabre la tarjeta digital de una GC existente para volver a verla
   y descargarla. Misma estructura de captura que CreateModal: la
   instancia full-size se renderiza oculta y la previsualización en
   pantalla es una copia escalada. */
function ViewCardModal({ gc, tenantName, tenantLogo, onClose }) {
  const cardRef = useRef(null);
  const [downloadingImg, setDownloadingImg] = useState(false);

  const handleDownloadImage = async () => {
    if (!cardRef.current || downloadingImg) return;
    setDownloadingImg(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#0b1220',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `gift-card-${gc.codigo}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('[GiftCards] export PNG failed:', err);
    } finally {
      setDownloadingImg(false);
    }
  };

  const destinatario = gc.nombre && gc.nombre !== 'Sin nombre' ? gc.nombre : undefined;

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between p-5 border-b border-slate-800">
        <p className="text-sm font-bold text-white">Tarjeta de regalo</p>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-4">
        {/* Full-size oculta — fuente del PNG */}
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
        >
          <GiftCardDigitalExport
            ref={cardRef}
            monto={gc.valor}
            codigo={gc.codigo}
            urlQR={saldoLink(gc.codigo)}
            nombreTenant={tenantName}
            logoTenant={tenantLogo}
            nombreDestinatario={destinatario}
          />
        </div>

        {/* Preview escalado (60%) */}
        <div className="mx-auto" style={{ width: 240, height: 150 }}>
          <div style={{ transform: 'scale(0.6)', transformOrigin: 'top left' }}>
            <GiftCardDigitalExport
              monto={gc.valor}
              codigo={gc.codigo}
              urlQR={saldoLink(gc.codigo)}
              nombreTenant={tenantName}
              logoTenant={tenantLogo}
              nombreDestinatario={destinatario}
            />
          </div>
        </div>

        {/* Saldo actual (en vivo) — útil al revisar una tarjeta usada parcialmente */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Saldo disponible</span>
          <span className="font-bold text-emerald-400">{formatCLP(gc.saldo)}</span>
        </div>

        <button
          onClick={handleDownloadImage}
          disabled={downloadingImg}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:opacity-50 transition-all"
        >
          {downloadingImg
            ? <><Loader2 size={15} className="animate-spin" /> Generando...</>
            : <><ImageDown size={15} /> Descargar imagen</>}
        </button>

        <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
          Cerrar
        </button>
      </div>
    </ModalShell>
  );
}

/* ── GiftCardRow ──────────────────────────────────────────────────── */
function GiftCardRow({ gc, tenantName, tenantLogo }) {
  const [copied, setCopied] = useState(false);
  const [viewing, setViewing] = useState(false);
  const cfg = STATUS_CONFIG[gc.estado] || STATUS_CONFIG.activa;
  const { Icon } = cfg;

  const copy = async () => {
    try { await navigator.clipboard.writeText(gc.codigo); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
  };

  return (
    <>
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
        <button
          onClick={() => setViewing(true)}
          className="text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
          title="Ver tarjeta digital"
        >
          <Eye size={14} />
        </button>
        {(gc.estado === 'activa' || gc.estado === 'parcial') && (
          <button onClick={() => shareWa(gc, tenantName)} className="text-slate-500 hover:text-green-400 transition-colors shrink-0" title="Enviar por WhatsApp">
            <MessageCircle size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {viewing && (
          <ViewCardModal
            gc={gc}
            tenantName={tenantName}
            tenantLogo={tenantLogo}
            onClose={() => setViewing(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── PublicLinkCard — bloque reutilizable (saldo / venta) ─────────── */
function PublicLinkCard({ icon: Icon, title, desc, url, qrFilename, accent = 'emerald' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
      <div className="bg-white p-2 rounded-lg shrink-0">
        <QRCodeSVG value={url} size={64} level="M" includeMargin={false} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white flex items-center gap-1.5">
          <Icon size={14} className={`text-${accent}-400`} />
          {title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        <div className="mt-4 pt-4 border-t border-slate-800/50 flex flex-wrap gap-3 items-center">
          <button
            onClick={copy}
            className={`px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm flex items-center gap-1.5 text-${accent}-400`}
          >
            {copied ? <><CheckCheck size={13} /> Copiado</> : <><Copy size={13} /> Copiar enlace</>}
          </button>
          <button
            onClick={() => downloadQR(url, qrFilename)}
            className="px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm flex items-center gap-1.5 text-slate-300"
          >
            <Download size={13} /> Descargar QR
          </button>
          <a
            href={url} target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-sm flex items-center gap-1.5 text-slate-400"
          >
            <ExternalLink size={13} /> Abrir
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */
export default function GiftCards() {
  const { user } = useAuth();
  const { id: tenantId, name: tenantName, logo: tenantLogo } = useTenant();
  const saldoUrl = `${window.location.origin}/gestion-interna/saldo-gift-card`;
  const ventaUrl = publicSaleUrl(tenantId);
  const [showCreate, setShowCreate] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [filter, setFilter] = useState('todas');
  const [search, setSearch] = useState('');

  const { data: giftCards = [] } = useCollection('giftCards');

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
            <div className={`${bg} rounded-xl p-2.5 w-fit mb-3`}>
              <Icon size={16} className={color} />
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
              className={`px-3 py-1.5 rounded-md text-xs transition-all capitalize ${
                filter === f
                  ? 'bg-slate-700 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 font-medium'
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
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Gift size={32} className="opacity-30" />
          <p className="text-sm mt-2">Sin gift cards{filter !== 'todas' ? ` con estado "${filter}"` : ''}.</p>
          <p className="text-slate-400 text-sm mt-2 text-center max-w-xs">
            Las gift cards son una excelente forma de asegurar ingresos futuros.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all"
          >
            <Plus size={14} />
            Crear primera Gift Card
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(gc => (
            <GiftCardRow
              key={gc.id}
              gc={gc}
              tenantName={tenantName}
              tenantLogo={tenantLogo}
            />
          ))}
        </div>
      )}

      {/* Links públicos */}
      <div className="grid sm:grid-cols-2 gap-3">
        <PublicLinkCard
          icon={QrCode}
          title="Consulta de saldo para clientes"
          desc="Comparte este QR para que tus clientes consulten su saldo sin llamar."
          url={saldoUrl}
          qrFilename={`saldo-giftcard-${tenantId}.png`}
          accent="emerald"
        />
        <PublicLinkCard
          icon={Sparkles}
          title="Link de Venta Pública"
          desc="Enlace de compra directa de Gift Cards. Pégalo en tu bio o imprime el QR en el local."
          url={ventaUrl}
          qrFilename={`venta-giftcard-${tenantId}.png`}
          accent="amber"
        />
      </div>

      <AnimatePresence>
        {showCreate && (
          <CreateModal
            key="create"
            tenantId={tenantId}
            tenantName={tenantName}
            tenantLogo={tenantLogo}
            user={user}
            onClose={() => setShowCreate(false)}
          />
        )}
        {showRedeem && (
          <RedeemModal
            key="redeem"
            giftCards={giftCards}
            tenantId={tenantId}
            user={user}
            onClose={() => setShowRedeem(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
