import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { addDoc, getDoc, setDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { db, storage } from '../lib/firebase';
import { tenantCol, tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { useCollection } from '../hooks/useCollection';
import { useClubUsers } from '../hooks/useClubUsers';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import GiftCardDigitalExport, { BG_PRESETS, TITLE_FONTS } from '../components/GiftCardDigitalExport';
import {
  Gift, Plus, X, Copy, CheckCheck, AlertCircle, Search,
  CreditCard, Banknote, CheckCircle2, Clock, XCircle, MessageCircle, ExternalLink,
  QrCode, Camera, UserPlus, Loader2, Link2, Download, Sparkles, PartyPopper, ImageDown, Eye,
  ImagePlus, Trash2, Palette,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/* ── Diseño: defaults + paletas ───────────────────────────────────────
   Todo se persiste en `config/giftcards`. Cuando hay templateImageUrl
   se usa la imagen como fondo; bgPreset solo aplica si no hay imagen. */
const DEFAULT_DESIGN = {
  templateImageUrl: '',
  bgPreset:         'default',
  accentColor:      '#10b981',
  textColor:        '#ffffff',
  titleFont:        'playfair',
  customMessage:    '',
  overlayIntensity: 1,
};

const BG_PRESET_LABELS = {
  default: 'Default',
  royal:   'Royal',
  sunset:  'Sunset',
  mono:    'Mono',
  forest:  'Bosque',
};

const ACCENT_COLORS = [
  { id: 'emerald', hex: '#10b981', label: 'Esmeralda' },
  { id: 'amber',   hex: '#f59e0b', label: 'Ámbar'     },
  { id: 'violet',  hex: '#8b5cf6', label: 'Violeta'   },
  { id: 'rose',    hex: '#f43f5e', label: 'Rosa'      },
  { id: 'sky',     hex: '#0ea5e9', label: 'Cielo'     },
  { id: 'white',   hex: '#fafafa', label: 'Blanco'    },
];

/* Paleta de colores para el texto. Incluye opciones oscuras para usar
   con imágenes claras como fondo. */
const TEXT_COLORS = [
  { id: 'white',  hex: '#ffffff', label: 'Blanco'      },
  { id: 'cream',  hex: '#fef3c7', label: 'Crema'       },
  { id: 'gold',   hex: '#fbbf24', label: 'Dorado'      },
  { id: 'sky',    hex: '#bae6fd', label: 'Celeste'     },
  { id: 'slate',  hex: '#cbd5e1', label: 'Pizarra'     },
  { id: 'black',  hex: '#0a0a0a', label: 'Negro'       },
  { id: 'navy',   hex: '#1e293b', label: 'Azul noche'  },
  { id: 'maroon', hex: '#7f1d1d', label: 'Burdeo'      },
];

const TITLE_FONT_OPTIONS = [
  { id: 'playfair',  label: 'Playfair'  },
  { id: 'inter',     label: 'Inter'     },
  { id: 'cormorant', label: 'Cormorant' },
  { id: 'bebas',     label: 'Bebas'     },
];

/** Filtra el objeto de diseño a los campos que conoce el componente Export. */
function pickDesign(d) {
  return {
    templateImageUrl: d.templateImageUrl || '',
    bgPreset:         d.bgPreset         || DEFAULT_DESIGN.bgPreset,
    accentColor:      d.accentColor      || DEFAULT_DESIGN.accentColor,
    textColor:        d.textColor        || DEFAULT_DESIGN.textColor,
    titleFont:        d.titleFont        || DEFAULT_DESIGN.titleFont,
    customMessage:    d.customMessage    || '',
    overlayIntensity: typeof d.overlayIntensity === 'number' ? d.overlayIntensity : DEFAULT_DESIGN.overlayIntensity,
  };
}

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
        <p className="text-sm text-primary font-medium truncate">{value.nombre || 'Cliente'}</p>
        {value.telefono && <p className="text-xs text-slate-400 truncate">{value.telefono}</p>}
      </div>
      <button type="button" onClick={onClear} className="text-slate-500 hover:text-primary shrink-0"><X size={14} /></button>
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
          className="flex-1 bg-transparent text-sm text-primary placeholder-slate-500 focus:outline-none"
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
                <span className="text-sm text-primary truncate">{u.nombre || 'Sin nombre'}</span>
                {u.telefono && <span className="text-xs text-slate-400 shrink-0">{u.telefono}</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── DesignCustomizer ─────────────────────────────────────────────────
   Panel unificado de personalización: fondo (preset o imagen), color de
   acento, tipografía, mensaje personalizado e intensidad del overlay.
   Persiste TODO en `config/giftcards` vía la callback `onUpdate(partial)`
   que vive en el padre (escritura centralizada). La subida de imagen
   reutiliza el path /marketing/ de Storage (mismas reglas: auth + 5MB). */
function DesignCustomizer({ tenantName, tenantLogo, design, onUpdate }) {
  const [uploading,   setUploading]   = useState(false);
  const [removing,    setRemoving]    = useState(false);
  const [uploadError, setUploadError] = useState('');
  // Borrador local del mensaje — debounce de 500ms antes de persistir.
  const [messageDraft, setMessageDraft] = useState(design.customMessage || '');
  const debounceRef = useRef(null);

  useEffect(() => { setMessageDraft(design.customMessage || ''); }, [design.customMessage]);

  useEffect(() => {
    if (messageDraft === (design.customMessage || '')) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdate({ customMessage: messageDraft.slice(0, 50) });
    }, 500);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [messageDraft, design.customMessage, onUpdate]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (!file.type.startsWith('image/')) {
      setUploadError('El archivo debe ser una imagen.');
      if (e.target) e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('La imagen supera los 5 MB. Usa una más liviana.');
      if (e.target) e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const tid      = resolveTenantId();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const prefix   = tid === 'elegance' ? '' : `tenants/${tid}/`;
      const path     = `${prefix}marketing/giftcard-template-${Date.now()}_${safeName}`;
      const snap = await uploadBytes(
        storageRef(storage, path),
        file,
        {
          contentType: file.type || 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      );
      const url = await getDownloadURL(snap.ref);
      await onUpdate({ templateImageUrl: url });
    } catch (err) {
      console.error('[GiftCards/template] upload error:', err);
      setUploadError(err.code === 'storage/unauthorized'
        ? 'Sin permiso para subir. Verifica que tu sesión esté activa.'
        : `Error al subir: ${err.message}`);
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    setUploadError('');
    try {
      await onUpdate({ templateImageUrl: '' });
    } catch (err) {
      console.error('[GiftCards/template] remove error:', err);
      setUploadError('No se pudo quitar la plantilla. Intenta de nuevo.');
    } finally {
      setRemoving(false);
    }
  };

  const hasImage = !!design.templateImageUrl;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
      {/* Encabezado */}
      <div className="flex items-start gap-2">
        <div className="bg-violet-500/10 rounded-xl p-2 shrink-0">
          <Palette size={16} className="text-violet-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-primary">Personalizar diseño</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Estos ajustes se aplican a <span className="text-slate-300">todas</span> tus Gift Cards (nuevas y existentes).
          </p>
        </div>
      </div>

      {/* Preview vivo */}
      <div className="flex items-center justify-center bg-slate-950/40 border border-slate-800/60 rounded-xl py-3">
        <div style={{ width: 280, height: 175 }}>
          <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left' }}>
            <GiftCardDigitalExport
              monto={15000}
              codigo="DEMO-XXXX-XXXX"
              urlQR="https://example.com"
              nombreTenant={tenantName}
              logoTenant={tenantLogo}
              nombreDestinatario="Tu cliente"
              {...pickDesign(design)}
            />
          </div>
        </div>
      </div>

      {/* Fondo — presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Fondo</p>
          {hasImage && (
            <span className="text-[10px] text-slate-500 italic">Usando imagen personalizada</span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(BG_PRESETS).map(([id, p]) => {
            const active = !hasImage && design.bgPreset === id;
            return (
              <button
                key={id} type="button"
                onClick={() => onUpdate({ bgPreset: id })}
                disabled={hasImage}
                title={BG_PRESET_LABELS[id] || id}
                className={`relative aspect-[8/5] rounded-lg border transition-all overflow-hidden ${
                  active ? 'border-violet-400 ring-2 ring-violet-500/30' : 'border-slate-700 hover:border-slate-500'
                } ${hasImage ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{ background: p.gradient }}
              >
                {active && (
                  <span className="absolute top-1 right-1 bg-slate-900/90 rounded-full">
                    <CheckCircle2 size={12} className="text-violet-300" />
                  </span>
                )}
                <span className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-primary/80 tracking-wide">
                  {BG_PRESET_LABELS[id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Imagen personalizada */}
      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Imagen personalizada</p>
          {hasImage && (
            <button
              type="button" onClick={handleRemove} disabled={removing}
              className="text-[11px] text-slate-400 hover:text-red-400 disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              {removing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Quitar
            </button>
          )}
        </div>
        <label className={`block w-full cursor-pointer text-center px-3 py-2.5 rounded-lg text-sm font-bold border transition-all ${
          hasImage
            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'
            : 'bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border-violet-500/30'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          {uploading
            ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Subiendo…</span>
            : hasImage
              ? <span className="inline-flex items-center gap-2"><ImagePlus size={14} /> Cambiar imagen</span>
              : <span className="inline-flex items-center gap-2"><ImagePlus size={14} /> Subir imagen (400×250)</span>}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
        {uploadError && (
          <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5">
            <AlertCircle size={12} /> {uploadError}
          </p>
        )}
        {!uploadError && (
          <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
            Si subes una imagen, reemplaza el fondo predefinido. Deja espacio libre arriba‑derecha (QR) y abajo‑izquierda (monto y código).
          </p>
        )}
      </div>

      {/* Overlay — solo si hay imagen */}
      {hasImage && (
        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Intensidad del overlay</p>
            <span className="text-[11px] text-slate-500 tabular-nums">{Math.round((design.overlayIntensity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05"
            value={design.overlayIntensity ?? 1}
            onChange={e => onUpdate({ overlayIntensity: Number(e.target.value) })}
            className="w-full accent-violet-500"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Más alto = texto más legible. Más bajo = imagen más visible.
          </p>
        </div>
      )}

      {/* Color de acento */}
      <div className="border-t border-slate-800 pt-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Color de acento</p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map(c => {
            const active = design.accentColor === c.hex;
            return (
              <button
                key={c.id} type="button"
                onClick={() => onUpdate({ accentColor: c.hex })}
                title={c.label}
                className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                  active ? 'border-white scale-110 shadow-lg' : 'border-slate-700 hover:border-slate-500'
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {active && <CheckCircle2 size={14} className="text-ink-900 drop-shadow" />}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          Pinta el código de la tarjeta y el destello principal.
        </p>
      </div>

      {/* Color del texto */}
      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Color del texto</p>
          {/* Color picker libre — para tonos que no estén en la paleta. */}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
            <span>Personalizado</span>
            <input
              type="color"
              value={design.textColor || '#ffffff'}
              onChange={e => onUpdate({ textColor: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer bg-transparent border border-slate-600"
              title="Elegir color exacto"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEXT_COLORS.map(c => {
            const active = (design.textColor || '#ffffff').toLowerCase() === c.hex.toLowerCase();
            const isDark = ['#0a0a0a', '#1e293b', '#7f1d1d'].includes(c.hex);
            return (
              <button
                key={c.id} type="button"
                onClick={() => onUpdate({ textColor: c.hex })}
                title={c.label}
                className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                  active ? 'border-white scale-110 shadow-lg' : 'border-slate-700 hover:border-slate-500'
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {active && (
                  <CheckCircle2
                    size={14}
                    className={isDark ? 'text-primary drop-shadow' : 'text-ink-900 drop-shadow'}
                  />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          Afecta el nombre del local, monto y mensaje. Usá tonos oscuros si tu imagen de fondo es clara.
        </p>
      </div>

      {/* Tipografía */}
      <div className="border-t border-slate-800 pt-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Tipografía del nombre</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TITLE_FONT_OPTIONS.map(f => {
            const active = design.titleFont === f.id;
            return (
              <button
                key={f.id} type="button"
                onClick={() => onUpdate({ titleFont: f.id })}
                className={`px-3 py-2 rounded-lg border transition-all text-left ${
                  active ? 'bg-violet-500/15 border-violet-500/40' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                }`}
              >
                <p
                  className="text-base text-primary font-bold truncate leading-tight"
                  style={{ fontFamily: TITLE_FONTS[f.id] }}
                >
                  {tenantName || 'Tu local'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">{f.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mensaje personalizado */}
      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Mensaje (opcional)</p>
          <span className="text-[11px] text-slate-500 tabular-nums">{messageDraft.length}/50</span>
        </div>
        <input
          type="text"
          value={messageDraft}
          maxLength={50}
          onChange={e => setMessageDraft(e.target.value)}
          placeholder='Ej: "Un regalo con estilo"'
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary placeholder-slate-500 focus:border-violet-500 focus:outline-none"
        />
        <p className="text-[10px] text-slate-500 mt-1">
          Aparece como una frase corta sobre el monto. Déjalo vacío para no mostrarlo.
        </p>
      </div>
    </div>
  );
}

/* ── CreateModal ──────────────────────────────────────────────────── */
function CreateModal({ tenantId, tenantName, tenantLogo, design, user, onClose }) {
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
        <p className="text-sm font-bold text-primary">{created ? 'Gift Card creada' : 'Nueva Gift Card'}</p>
        <button onClick={onClose} className="text-slate-500 hover:text-primary"><X size={16} /></button>
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
                {...pickDesign(design)}
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
                  {...pickDesign(design)}
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

            <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-slate-400 hover:text-primary transition-colors">
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
                className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nombre destinatario</label>
              <input
                type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
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
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary focus:border-emerald-500 focus:outline-none"
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
          <p className="text-sm font-bold text-primary">Canjear Gift Card</p>
          <button onClick={onClose} className="text-slate-500 hover:text-primary"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className={`flex items-center gap-2 bg-slate-800 border rounded-lg px-3 transition-colors ${borderColor}`}>
              <input
                type="text" value={codigo}
                onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="flex-1 bg-transparent py-2.5 text-sm font-mono text-primary placeholder-slate-500 focus:outline-none uppercase"
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
                    <span className="text-primary font-medium">{found.nombre}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Saldo disponible</span>
                    <span className="text-emerald-400 font-bold">{formatCLP(found.saldo)}</span>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Monto a descontar ($)</label>
                    <input
                      type="number" min="1" max={found.saldo} value={monto} onChange={e => setMonto(e.target.value)}
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-emerald-500 focus:outline-none"
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
function ViewCardModal({ gc, tenantName, tenantLogo, design, onClose }) {
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
        <p className="text-sm font-bold text-primary">Tarjeta de regalo</p>
        <button onClick={onClose} className="text-slate-500 hover:text-primary"><X size={16} /></button>
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
            {...pickDesign(design)}
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
              {...pickDesign(design)}
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

        <button onClick={onClose} className="w-full py-2 rounded-xl text-sm text-slate-400 hover:text-primary transition-colors">
          Cerrar
        </button>
      </div>
    </ModalShell>
  );
}

/* ── GiftCardRow ──────────────────────────────────────────────────── */
function GiftCardRow({ gc, tenantName, tenantLogo, design }) {
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
            <p className="font-mono text-sm font-bold text-primary">{gc.codigo}</p>
            <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors">
              {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{gc.nombre}</p>
        </div>
        <div className="text-right min-w-[80px]">
          <p className="text-sm font-bold text-primary">{formatCLP(gc.saldo)}</p>
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
            design={design}
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
        <p className="text-sm font-bold text-primary flex items-center gap-1.5">
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
  const [design, setDesign] = useState(DEFAULT_DESIGN);

  // Carga única de TODOS los ajustes de diseño del tenant. Viven en el
  // mismo doc config/giftcards (templateImageUrl + nuevos campos).
  useEffect(() => {
    let alive = true;
    setDesign(DEFAULT_DESIGN); // reset al cambiar tenant
    withTimeout(getDoc(tenantDoc('config', 'giftcards')), 10000, 'giftcards/design')
      .then(snap => {
        if (!alive) return;
        if (!snap.exists()) return;
        const d = snap.data() || {};
        setDesign(prev => ({
          ...prev,
          templateImageUrl: d.templateImageUrl || '',
          bgPreset:         d.bgPreset         || prev.bgPreset,
          accentColor:      d.accentColor      || prev.accentColor,
          textColor:        d.textColor        || prev.textColor,
          titleFont:        d.titleFont        || prev.titleFont,
          customMessage:    d.customMessage    || '',
          overlayIntensity: typeof d.overlayIntensity === 'number' ? d.overlayIntensity : prev.overlayIntensity,
        }));
      })
      .catch(() => { /* sin config: usamos los defaults */ });
    return () => { alive = false; };
  }, [tenantId]);

  /** Actualiza el diseño en memoria y lo persiste en Firestore (merge). */
  const updateDesign = useCallback(async (partial) => {
    setDesign(prev => ({ ...prev, ...partial }));
    try {
      await setDoc(
        tenantDoc('config', 'giftcards'),
        { ...partial, templateUpdatedAt: serverTimestamp() },
        { merge: true },
      );
    } catch (err) {
      console.error('[GiftCards/design] save error:', err);
    }
  }, []);

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
    <div data-view="gift-cards" className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift size={20} className="text-emerald-400" />
            <h1 className="text-xl font-bold text-primary">Gift Cards</h1>
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
            <p className="text-lg font-bold text-primary mt-0.5">{value}</p>
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
                  ? 'bg-slate-700 text-primary font-medium shadow-sm'
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
            className="flex-1 bg-transparent text-sm text-primary placeholder-slate-500 focus:outline-none"
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
              design={design}
            />
          ))}
        </div>
      )}

      {/* Personalización del diseño (fondo, color, tipografía, mensaje) */}
      <DesignCustomizer
        tenantName={tenantName}
        tenantLogo={tenantLogo}
        design={design}
        onUpdate={updateDesign}
      />

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
            design={design}
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
