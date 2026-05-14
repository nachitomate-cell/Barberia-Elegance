// TVConfig.jsx — Gestión de la pantalla /gestion-interna/tv
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Monitor, ExternalLink, Save, Check, ChevronRight,
  AlertCircle, Eye, Palette, Images, Users, Megaphone, ShoppingBag, QrCode,
  ImagePlus, Trash2, Upload,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { tenantDoc, tenantCol, resolveTenantId } from '../lib/tenantUtils';

/* ── Compresión de imagen vía canvas ─────────────────────────────── */
async function compressImage(file, { maxPx = 1280, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Compresión fallida')),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Debe coincidir con OFERTA_DEFAULT en BarberTV.jsx
const OFERTA_DEFAULT = {
  etiqueta:    'Oferta del Mes',
  titulo1:     'Corte',
  titulo2:     '+ Barba',
  descripcion: 'Lunes a Miércoles — precio especial\npara clientes frecuentes del local.',
  cta:         'Consulta en caja',
};

const CONFIG_DEFAULT = {
  oferta:        { ...OFERTA_DEFAULT },
  duracionSlide: 15,
  slidesActivos: { oferta: true, lookbook: true, equipo: true, productos: true },
  accentColor:   '',
  qr:            { color: '', size: 160 },
};

const QR_SIZE_STEPS = [100, 120, 140, 160, 180, 200, 220, 240];

const ACCENT_PRESETS = [
  { label: 'Dorado',    value: '#D4AF37' },
  { label: 'Blanco',    value: '#e2e8f0' },
  { label: 'Azul neon', value: '#00C8FF' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Rosa',      value: '#f43f5e' },
  { label: 'Naranja',   value: '#f97316' },
  { label: 'Violeta',   value: '#a855f7' },
];

// ── Sub-componentes ───────────────────────────────────────────────

function Card({ icon: Icon, title, badge, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800 bg-slate-800/30">
        <Icon size={15} className="text-slate-400 shrink-0" />
        <h2 className="text-sm font-semibold text-white flex-1">{title}</h2>
        {badge}
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

function SlideToggle({ checked, onChange, label, sublabel }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left"
      style={{
        background:  checked ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
        borderColor: checked ? 'rgba(16,185,129,0.3)'  : 'rgba(255,255,255,0.07)',
      }}
    >
      <div
        className="w-9 h-5 rounded-full relative shrink-0 transition-colors duration-200"
        style={{ background: checked ? '#10b981' : '#334155' }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {sublabel && <p className="text-xs text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </button>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'
    }`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

// Vista previa a escala del slide de anuncio
function AnuncioPreview({ oferta, accentColor }) {
  const gold = accentColor || '#D4AF37';
  const o    = { ...OFERTA_DEFAULT, ...oferta };
  return (
    <div
      className="rounded-xl overflow-hidden relative w-full"
      style={{ background: '#050505', aspectRatio: '16/7' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 80% 80% at 30% 60%, ${gold}12 0%, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="text-center">
          <p
            className="font-black tracking-[0.4em] uppercase mb-2"
            style={{ color: gold, fontSize: '8px' }}
          >
            ✦ {o.etiqueta} ✦
          </p>
          <p
            className="font-black text-white leading-tight"
            style={{ fontSize: 'clamp(1.1rem, 2.8vw, 1.8rem)' }}
          >
            {o.titulo1}
          </p>
          <p
            className="font-black leading-tight mb-2"
            style={{
              fontSize: 'clamp(1.1rem, 2.8vw, 1.8rem)',
              color: gold,
            }}
          >
            {o.titulo2}
          </p>
          <p className="text-slate-500 leading-relaxed mb-3" style={{ fontSize: '8px' }}>
            {o.descripcion.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </p>
          <div
            className="inline-flex items-center rounded-full px-3 py-1"
            style={{ border: `1px solid ${gold}55`, background: `${gold}12` }}
          >
            <span className="font-bold tracking-widest" style={{ color: gold, fontSize: '8px' }}>
              {o.cta}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────

export default function TVConfig() {
  const [config,        setConfig]        = useState(CONFIG_DEFAULT);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [saveErr,       setSaveErr]       = useState('');
  const [dirty,         setDirty]         = useState(false);
  const [lookbookCount,  setLookbookCount]  = useState(null);
  const [barberoCount,   setBarberoCount]   = useState(null);
  const [productosCount, setProductosCount] = useState(null);
  const savedTimer = useRef(null);

  /* ── Background image ───────────────────────────────────────────── */
  const [bgUrl,       setBgUrl]       = useState('');
  const [bgUploading, setBgUploading] = useState(false);
  const [bgErr,       setBgErr]       = useState('');
  const bgInputRef = useRef(null);

  useEffect(() => {
    getDoc(tenantDoc('configuracion', 'tv'))
      .then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          setConfig({
            oferta:        { ...OFERTA_DEFAULT, ...(d.oferta || {}) },
            duracionSlide: d.duracionSlide ?? 15,
            slidesActivos: { oferta: true, lookbook: true, equipo: true, productos: true, ...(d.slidesActivos || {}) },
            accentColor:   d.accentColor || '',
            qr:            { color: '', size: 160, ...(d.qr || {}) },
          });
          if (d.backgroundUrl) setBgUrl(d.backgroundUrl);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getDocs(tenantCol('lookbook'))
      .then(snap => setLookbookCount(snap.size))
      .catch(() => setLookbookCount(0));
  }, []);

  useEffect(() => {
    getDocs(query(tenantCol('barberos'), where('activo', '!=', false)))
      .then(snap =>
        setBarberoCount(
          snap.docs.filter(d => !d.data()._mainDocId && d.data().rol !== 'admin').length
        )
      )
      .catch(() => setBarberoCount(0));
  }, []);

  useEffect(() => {
    getDocs(tenantCol('productos'))
      .then(snap => setProductosCount(snap.size))
      .catch(() => setProductosCount(0));
  }, []);

  const update = (path, value) => {
    setConfig(prev => {
      if (path.includes('.')) {
        const [k, sk] = path.split('.');
        return { ...prev, [k]: { ...prev[k], [sk]: value } };
      }
      return { ...prev, [path]: value };
    });
    setDirty(true);
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgErr('');
    setBgUploading(true);
    try {
      const blob      = await compressImage(file, { maxPx: 1280, quality: 0.7 });
      const tid       = resolveTenantId();
      const sRef      = storageRef(storage, `tenants/${tid}/tv-bg.jpg`);
      await uploadBytes(sRef, blob, { contentType: 'image/jpeg' });
      const url       = await getDownloadURL(sRef);
      await setDoc(tenantDoc('configuracion', 'tv'), { backgroundUrl: url }, { merge: true });
      setBgUrl(url);
    } catch (err) {
      setBgErr('Error al subir la imagen. Intenta con una imagen más pequeña.');
      console.error(err);
    } finally {
      setBgUploading(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  const handleBgRemove = async () => {
    setBgErr('');
    try {
      const tid  = resolveTenantId();
      const sRef = storageRef(storage, `tenants/${tid}/tv-bg.jpg`);
      await deleteObject(sRef).catch(() => {});
      await setDoc(tenantDoc('configuracion', 'tv'), { backgroundUrl: '' }, { merge: true });
      setBgUrl('');
    } catch (err) {
      setBgErr('No se pudo eliminar la imagen.');
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveErr('');
    try {
      await setDoc(tenantDoc('configuracion', 'tv'), {
        oferta:        config.oferta,
        duracionSlide: config.duracionSlide,
        slidesActivos: config.slidesActivos,
        accentColor:   config.accentColor,
        qr:            config.qr,
      }, { merge: true });
      setSaved(true);
      setDirty(false);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveErr(e?.message || 'Error al guardar. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const updateQr = (key, value) => {
    setConfig(prev => ({ ...prev, qr: { ...prev.qr, [key]: value } }));
    setDirty(true);
  };

  const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const gold = config.accentColor || '#D4AF37';
  const qrColor = config.qr.color || gold;

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Pantalla TV</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configura el contenido de la pantalla del local en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/gestion-interna/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600 transition-all"
          >
            <ExternalLink size={13} /> Ver TV
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="relative flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
          >
            {saving
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? 'Guardado' : 'Guardar'}
            {dirty && !saving && !saved && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950" />
            )}
          </button>
        </div>
      </div>

      {saveErr && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-950/50 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle size={15} className="shrink-0" />
          <span className="flex-1">{saveErr}</span>
          <button onClick={() => setSaveErr('')} className="ml-2 text-red-400/50 hover:text-red-400">×</button>
        </div>
      )}

      {/* ── Imagen de fondo ───────────────────────────────────────── */}
      <Card icon={ImagePlus} title="Imagen de Fondo">
        <p className="text-xs text-slate-500 -mt-1">
          Se aplica en toda la pantalla TV con brillo reducido para no tapar el contenido.
          La imagen se comprime automáticamente a máx. 1280px y calidad 70%.
        </p>

        {bgErr && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/50 border border-red-500/30 rounded-lg text-xs text-red-400">
            <AlertCircle size={13} className="shrink-0" />
            {bgErr}
          </div>
        )}

        {bgUrl ? (
          <div className="space-y-3">
            {/* Preview */}
            <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/5' }}>
              <img
                src={bgUrl}
                alt="Fondo TV"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.28) saturate(0.7)' }}
              />
              <div className="absolute inset-0" style={{ background: 'rgba(5,5,5,0.45)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Así se ve en TV
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-600 cursor-pointer transition-all">
                <Upload size={13} />
                Cambiar imagen
                <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={bgUploading} />
              </label>
              <button
                onClick={handleBgRemove}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-900/50 text-xs font-semibold text-red-500 hover:bg-red-950/40 hover:border-red-700/50 transition-all"
              >
                <Trash2 size={13} />
                Quitar fondo
              </button>
            </div>
          </div>
        ) : (
          <label
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-600 cursor-pointer transition-colors py-8"
            style={{ background: bgUploading ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.01)' }}
          >
            {bgUploading ? (
              <>
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Comprimiendo y subiendo…</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <ImagePlus size={22} className="text-slate-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-400">Subir imagen de fondo</p>
                  <p className="text-xs text-slate-600 mt-0.5">JPG, PNG · se comprime automáticamente</p>
                </div>
              </>
            )}
            <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={bgUploading} />
          </label>
        )}
      </Card>

      {/* ── General ───────────────────────────────────────────────── */}
      <Card icon={Monitor} title="Configuración General">

        <Field
          label="Duración de cada slide"
          hint={`El carrusel avanza automáticamente cada ${config.duracionSlide} segundos`}
        >
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={config.duracionSlide}
              onChange={e => update('duracionSlide', Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-white font-mono font-bold tabular-nums w-12 text-center bg-slate-800 rounded-lg py-1.5 text-sm border border-slate-700">
              {config.duracionSlide}s
            </span>
          </div>
        </Field>

        <Field label="Slides activos">
          <div className="space-y-2">
            <SlideToggle
              checked={config.slidesActivos.oferta}
              onChange={v => update('slidesActivos', { ...config.slidesActivos, oferta: v })}
              label="Anuncio / Oferta"
              sublabel="Slide de texto promocional"
            />
            <SlideToggle
              checked={config.slidesActivos.lookbook}
              onChange={v => update('slidesActivos', { ...config.slidesActivos, lookbook: v })}
              label="Lookbook"
              sublabel="Galería de trabajos del local"
            />
            <SlideToggle
              checked={config.slidesActivos.equipo}
              onChange={v => update('slidesActivos', { ...config.slidesActivos, equipo: v })}
              label="Nuestro Equipo"
              sublabel="Presentación de barberos"
            />
            <SlideToggle
              checked={config.slidesActivos.productos}
              onChange={v => update('slidesActivos', { ...config.slidesActivos, productos: v })}
              label="Productos"
              sublabel="Catálogo de productos del local"
            />
          </div>
        </Field>

        <Field label="Color de acento">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              {ACCENT_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  onClick={() => update('accentColor', p.value)}
                  className="w-7 h-7 rounded-lg transition-all duration-150"
                  style={{
                    background:    p.value,
                    outline:       config.accentColor === p.value ? '2px solid #fff' : '2px solid transparent',
                    outlineOffset: '2px',
                    transform:     config.accentColor === p.value ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
              <label className="relative w-7 h-7 cursor-pointer" title="Color personalizado">
                <input
                  type="color"
                  value={gold}
                  onChange={e => update('accentColor', e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: gold, border: '1.5px dashed rgba(255,255,255,0.45)' }}
                >
                  <Palette size={11} className="text-white opacity-80" />
                </div>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md shrink-0 border border-white/10" style={{ background: gold }} />
              <span className="text-xs text-slate-400 font-mono">{gold}</span>
              {config.accentColor && (
                <button
                  type="button"
                  onClick={() => update('accentColor', '')}
                  className="ml-auto text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Restablecer dorado
                </button>
              )}
            </div>
          </div>
        </Field>
      </Card>

      {/* ── QR ────────────────────────────────────────────────────── */}
      <Card icon={QrCode} title="Código QR">
        <p className="text-xs text-slate-500 -mt-1">
          El QR aparece fijo en la esquina inferior derecha del carrusel y apunta al registro del club.
        </p>

        <Field label="Color del QR">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Opción: heredar color de acento */}
              <button
                type="button"
                title="Color de acento (por defecto)"
                onClick={() => updateQr('color', '')}
                className="w-7 h-7 rounded-lg transition-all duration-150 flex items-center justify-center text-[9px] font-black"
                style={{
                  background:    gold,
                  outline:       config.qr.color === '' ? '2px solid #fff' : '2px solid transparent',
                  outlineOffset: '2px',
                  transform:     config.qr.color === '' ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                A
              </button>
              {/* Presets fijos */}
              {[
                { label: 'Blanco',    value: '#e2e8f0' },
                { label: 'Azul neon', value: '#00C8FF' },
                { label: 'Esmeralda', value: '#10b981' },
                { label: 'Rosa',      value: '#f43f5e' },
                { label: 'Naranja',   value: '#f97316' },
                { label: 'Violeta',   value: '#a855f7' },
              ].map(p => (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  onClick={() => updateQr('color', p.value)}
                  className="w-7 h-7 rounded-lg transition-all duration-150"
                  style={{
                    background:    p.value,
                    outline:       config.qr.color === p.value ? '2px solid #fff' : '2px solid transparent',
                    outlineOffset: '2px',
                    transform:     config.qr.color === p.value ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
              ))}
              {/* Picker personalizado */}
              <label className="relative w-7 h-7 cursor-pointer" title="Color personalizado">
                <input
                  type="color"
                  value={qrColor}
                  onChange={e => updateQr('color', e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: qrColor, border: '1.5px dashed rgba(255,255,255,0.45)' }}
                >
                  <Palette size={11} className="text-white opacity-80" />
                </div>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md shrink-0 border border-white/10" style={{ background: qrColor }} />
              <span className="text-xs text-slate-400 font-mono">{qrColor}</span>
              {config.qr.color && (
                <button
                  type="button"
                  onClick={() => updateQr('color', '')}
                  className="ml-auto text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Usar color de acento
                </button>
              )}
            </div>
          </div>
        </Field>

        <Field
          label="Tamaño del QR"
          hint={`El QR se mostrará en ${config.qr.size} × ${config.qr.size} px en la pantalla TV`}
        >
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={QR_SIZE_STEPS.length - 1}
              step={1}
              value={QR_SIZE_STEPS.indexOf(config.qr.size) !== -1
                ? QR_SIZE_STEPS.indexOf(config.qr.size)
                : 3}
              onChange={e => updateQr('size', QR_SIZE_STEPS[Number(e.target.value)])}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-white font-mono font-bold tabular-nums w-16 text-center bg-slate-800 rounded-lg py-1.5 text-sm border border-slate-700">
              {config.qr.size}px
            </span>
          </div>
        </Field>

        {/* Preview */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Eye size={12} className="text-slate-600" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Vista previa
            </span>
          </div>
          <div className="flex justify-center">
            <div
              className="rounded-2xl p-4 flex flex-col items-center gap-2.5"
              style={{
                background:    'rgba(5,5,5,0.88)',
                border:        `1px solid ${qrColor}88`,
                boxShadow:     `0 0 24px ${qrColor}22`,
              }}
            >
              <span className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: qrColor }}>
                ¡Únete al Club!
              </span>
              <QRCodeSVG
                value={`${window.location.origin}/registro.html?local=${resolveTenantId()}`}
                size={config.qr.size}
                fgColor={qrColor}
                bgColor="transparent"
                level="M"
              />
              <p className="text-slate-600 text-[10px] tracking-wide">Escanea y regístrate gratis</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Slide Anuncio ─────────────────────────────────────────── */}
      <Card
        icon={Megaphone}
        title="Slide 1 — Anuncio / Oferta"
        badge={<StatusBadge active={config.slidesActivos.oferta} />}
      >
        <p className="text-xs text-slate-500 -mt-1">
          El texto vacío usa los valores por defecto como ejemplo.
          Escribe el tuyo para que aparezca en pantalla.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Etiqueta superior">
            <input
              className={inp}
              placeholder={OFERTA_DEFAULT.etiqueta}
              value={config.oferta.etiqueta}
              onChange={e => update('oferta.etiqueta', e.target.value)}
            />
          </Field>
          <Field label="Botón / CTA">
            <input
              className={inp}
              placeholder={OFERTA_DEFAULT.cta}
              value={config.oferta.cta}
              onChange={e => update('oferta.cta', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Título línea 1 (blanco)">
            <input
              className={inp}
              placeholder={OFERTA_DEFAULT.titulo1}
              value={config.oferta.titulo1}
              onChange={e => update('oferta.titulo1', e.target.value)}
            />
          </Field>
          <Field label="Título línea 2 (color acento)">
            <input
              className={inp}
              placeholder={OFERTA_DEFAULT.titulo2}
              value={config.oferta.titulo2}
              onChange={e => update('oferta.titulo2', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Descripción" hint="Usa Enter para salto de línea en la pantalla">
          <textarea
            className={`${inp} resize-none`}
            rows={3}
            placeholder={OFERTA_DEFAULT.descripcion}
            value={config.oferta.descripcion}
            onChange={e => update('oferta.descripcion', e.target.value)}
          />
        </Field>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Eye size={12} className="text-slate-600" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Vista previa
            </span>
          </div>
          <AnuncioPreview oferta={config.oferta} accentColor={config.accentColor} />
        </div>
      </Card>

      {/* ── Slide Lookbook ────────────────────────────────────────── */}
      <Card
        icon={Images}
        title="Slide 2 — Lookbook"
        badge={<StatusBadge active={config.slidesActivos.lookbook} />}
      >
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-white">
              {lookbookCount === null
                ? <span className="text-slate-500 animate-pulse">Cargando…</span>
                : `${lookbookCount} foto${lookbookCount !== 1 ? 's' : ''} publicada${lookbookCount !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Las fotos se gestionan en la sección Lookbook</p>
          </div>
          <Link
            to="lookbook"
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            Ir a Lookbook <ChevronRight size={13} />
          </Link>
        </div>
        <p className="text-xs text-slate-600 bg-slate-800/50 rounded-lg px-3 py-2.5 leading-relaxed border border-slate-800">
          La TV muestra las primeras <strong className="text-slate-400">9 fotos</strong> en orden.
          Reordénalas arrastrando desde Lookbook para controlar cuáles aparecen en pantalla.
        </p>
      </Card>

      {/* ── Slide Equipo ──────────────────────────────────────────── */}
      <Card
        icon={Users}
        title="Slide 3 — Nuestro Equipo"
        badge={<StatusBadge active={config.slidesActivos.equipo} />}
      >
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-white">
              {barberoCount === null
                ? <span className="text-slate-500 animate-pulse">Cargando…</span>
                : `${barberoCount} barbero${barberoCount !== 1 ? 's' : ''} activo${barberoCount !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">El equipo se gestiona en la sección Equipo</p>
          </div>
          <Link
            to="equipo"
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            Ir a Equipo <ChevronRight size={13} />
          </Link>
        </div>
        <p className="text-xs text-slate-600 bg-slate-800/50 rounded-lg px-3 py-2.5 leading-relaxed border border-slate-800">
          Muestra todos los barberos activos (máx. 8).
          Los usuarios con rol <strong className="text-slate-400">admin</strong> no aparecen en pantalla.
        </p>
      </Card>

      {/* ── Slide Productos ───────────────────────────────────────── */}
      <Card
        icon={ShoppingBag}
        title="Slide 4 — Productos"
        badge={<StatusBadge active={config.slidesActivos.productos} />}
      >
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-white">
              {productosCount === null
                ? <span className="text-slate-500 animate-pulse">Cargando…</span>
                : `${productosCount} producto${productosCount !== 1 ? 's' : ''} cargado${productosCount !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Los productos se gestionan en la sección Productos</p>
          </div>
          <Link
            to="productos"
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
          >
            Ir a Productos <ChevronRight size={13} />
          </Link>
        </div>
        <p className="text-xs text-slate-600 bg-slate-800/50 rounded-lg px-3 py-2.5 leading-relaxed border border-slate-800">
          Muestra los primeros <strong className="text-slate-400">8 productos</strong> con imagen, precio y disponibilidad de stock.
        </p>
      </Card>

    </div>
  );
}
