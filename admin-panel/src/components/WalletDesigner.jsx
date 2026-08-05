import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Loader2, Upload, Save, Sparkles, Star, Check, Heart, Coffee,
  Utensils, Wine, Scissors, MapPin, Eye, EyeOff, Palette, Type,
  Info, Wand2, RefreshCw,
} from 'lucide-react';
import { db, storage } from '../lib/firebase';
import WalletMockup from './WalletMockup';

// Editor visual de la tarjeta Wallet, todo dentro del panel. Reemplaza el
// launcher externo a wallets.bioo.cl (el estudio sigue vivo, pero el 80%
// del uso no necesita salir del panel: los templates + los 4 controles
// clave cubren la personalización real).
//
// Reactivo: onSnapshot de configuracion/wallet → el estado local espeja
// Firestore + los cambios pendientes; al Guardar hacemos setDoc(merge)
// y llamamos walletProvisionarClase para aplicar el branding a la clase
// Google Wallet existente (idempotente).

const cfgPath  = (tid) => (tid === 'elegance' ? 'configuracion/wallet' : `tenants/${tid}/configuracion/wallet`);
const logoPath = (tid) => (tid === 'elegance' ? 'wallet/logo.jpg' : `tenants/${tid}/wallet/logo.jpg`);

const ICONS_LIB = [
  { id: 'check',    label: 'Check',    Icon: Check },
  { id: 'star',     label: 'Estrella', Icon: Star },
  { id: 'scissors', label: 'Tijeras',  Icon: Scissors },
  { id: 'heart',    label: 'Corazón',  Icon: Heart },
  { id: 'coffee',   label: 'Café',     Icon: Coffee },
  { id: 'fork',     label: 'Cubierto', Icon: Utensils },
  { id: 'wine',     label: 'Copa',     Icon: Wine },
];

// Templates por rubro — cada uno aplica paleta + ícono + copy base. El
// dueño puede editar cualquier campo después. Pensados para "quiero uno
// como este" sin sentarse a diseñar.
const TEMPLATES = [
  {
    id: 'barberia-clasica',
    nombre: 'Barbería Clásica',
    tag: 'Dorado sobre negro · elegante',
    preset: {
      programName: 'Club de Fidelidad',
      accent: '#c9a84c',
      bg: '#0a0a0a',
      stampIcon: 'scissors',
    },
  },
  {
    id: 'barberia-neon',
    nombre: 'Barbería Neón',
    tag: 'Verde neón · urbano',
    preset: {
      programName: 'Club',
      accent: '#c6f94e',
      bg: '#0a0f0a',
      stampIcon: 'star',
    },
  },
  {
    id: 'barberia-plata',
    nombre: 'Barbería Plata',
    tag: 'Plata sobre negro · minimalista',
    preset: {
      programName: 'Club',
      accent: '#e5e7eb',
      bg: '#0b0b0b',
      stampIcon: 'scissors',
    },
  },
  {
    id: 'pelu-femenina',
    nombre: 'Peluquería Femenina',
    tag: 'Rosé · cálido',
    preset: {
      programName: 'Club de Amigas',
      accent: '#e0879a',
      bg: '#2b1721',
      stampIcon: 'heart',
    },
  },
  {
    id: 'estetica',
    nombre: 'Estética',
    tag: 'Nude · zen',
    preset: {
      programName: 'Club Beauty',
      accent: '#c9a58a',
      bg: '#1a1210',
      stampIcon: 'star',
    },
  },
  {
    id: 'nails',
    nombre: 'Nails Studio',
    tag: 'Coral · fresh',
    preset: {
      programName: 'Nail Club',
      accent: '#ff7f66',
      bg: '#231218',
      stampIcon: 'heart',
    },
  },
  {
    id: 'spa',
    nombre: 'Spa',
    tag: 'Verde salvia · relajado',
    preset: {
      programName: 'Club Spa',
      accent: '#87a985',
      bg: '#111a13',
      stampIcon: 'star',
    },
  },
  {
    id: 'cafe',
    nombre: 'Café / Postres',
    tag: 'Café · cálido',
    preset: {
      programName: 'Club Cafetería',
      accent: '#c48b56',
      bg: '#1a120a',
      stampIcon: 'coffee',
    },
  },
];

async function compressToJpeg(file, maxPx = 800, quality = 0.9) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      // Cuadrado: el logo se ve redondo en Wallet — recortamos al lado corto.
      const size = Math.min(width, height);
      const sx = (width  - size) / 2;
      const sy = (height - size) / 2;
      const out = Math.min(maxPx, size);
      const c = document.createElement('canvas');
      c.width = out; c.height = out;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, sx, sy, size, size, 0, 0, out, out);
      c.toBlob(b => resolve(b ?? file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function WalletDesigner({ tenantId }) {
  const [cfg, setCfg]     = useState(null);    // config remota (Firestore)
  const [draft, setDraft] = useState(null);    // borrador local editando
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]     = useState('');
  const [err, setErr]     = useState('');

  const fileInput = useRef(null);

  // Subscribe a la config remota.
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, cfgPath(tenantId)),
      (snap) => {
        const data = snap.exists() ? (snap.data() || {}) : {};
        setCfg(data);
        // Al recibir cambios remotos (otro tab, superadmin, …), si no hay
        // edición local pendiente refrescamos el draft. Si sí hay, dejamos
        // el draft y avisamos al fondo con Info.
        setDraft(prev => (prev == null || !dirty) ? data : prev);
      },
      () => { setCfg({}); setDraft({}); },
    );
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  function mut(patch) {
    setDraft(d => ({ ...(d || {}), ...patch }));
    setDirty(true);
    setMsg(''); setErr('');
  }

  function aplicarTemplate(tpl) {
    // El template SOBREESCRIBE los campos del preset sin tocar geo, target,
    // ni enabled — el dueño ya los configuró en algún paso.
    mut({ ...tpl.preset });
    setMsg(`Template "${tpl.nombre}" aplicado. Ajusta los detalles y guarda.`);
  }

  async function subirLogo(file) {
    if (!file || uploading) return;
    if (file.size > 6 * 1024 * 1024) { setErr('El logo debe pesar menos de 6 MB.'); return; }
    setUploading(true); setErr(''); setMsg('');
    try {
      const blob = await compressToJpeg(file, 660, 0.92);
      const path = logoPath(tenantId);
      const ref  = storageRef(storage, path);
      // cacheControl corto (1h): si el dueño reemplaza el logo, el path es
      // fijo y necesitamos que Google Wallet refresque razonablemente rápido.
      const task = uploadBytesResumable(ref, blob, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=3600',
      });
      const url = await new Promise((resolve, reject) => {
        task.on('state_changed', null, reject, async () => {
          resolve(await getDownloadURL(task.snapshot.ref));
        });
      });
      // Cache-buster para que el mockup del panel se refresque de inmediato
      // (Google Wallet respeta el cacheControl del path, no del query).
      mut({ logoUrl: `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` });
      setMsg('Logo subido. No olvides guardar y provisionar.');
    } catch (e) {
      setErr(e?.message || 'No pudimos subir el logo. Intenta con otra imagen.');
    } finally {
      setUploading(false);
    }
  }

  async function guardar() {
    if (saving || !draft) return;
    setSaving(true); setMsg(''); setErr('');
    try {
      // 1. Persistir la config completa (merge).
      await setDoc(doc(db, cfgPath(tenantId)), {
        ...draft,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Provisionar la clase Google Wallet con la config nueva. Es
      //    idempotente (upsert), así que se puede llamar cada vez que se
      //    guarda sin efectos raros.
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'walletProvisionarClase');
      await fn({ tenantId, config: draft });

      setDirty(false);
      setMsg('¡Guardado! Tu tarjeta ya refleja los cambios en el celular de cada cliente.');
    } catch (e) {
      setErr(e?.message || 'No pudimos guardar. Revisa los campos e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  function descartar() {
    setDraft(cfg || {});
    setDirty(false);
    setMsg(''); setErr('');
  }

  const geoLat = useMemo(() => {
    if (draft?.locations?.[0]?.lat != null) return draft.locations[0].lat;
    return draft?.location?.lat ?? '';
  }, [draft]);
  const geoLng = useMemo(() => {
    if (draft?.locations?.[0]?.lng != null) return draft.locations[0].lng;
    return draft?.location?.lng ?? '';
  }, [draft]);
  const geoRadius = useMemo(() => {
    if (draft?.locations?.[0]?.radius != null) return draft.locations[0].radius;
    return draft?.geoRadius ?? 200;
  }, [draft]);

  function setGeo({ lat, lng, radius }) {
    const nueva = {
      lat: lat === '' ? '' : Number(lat),
      lng: lng === '' ? '' : Number(lng),
      radius: radius === '' ? 200 : Number(radius),
    };
    // Escribimos el formato NUEVO (locations[]) y el LEGACY (location + geoRadius)
    // para que triggers viejos que aún lean legacy no se rompan.
    mut({
      locations: [nueva],
      location: { lat: nueva.lat, lng: nueva.lng },
      geoRadius: nueva.radius,
    });
  }

  if (!draft) {
    return (
      <div className="rounded-2xl bg-white/[0.02] p-8 flex justify-center">
        <Loader2 size={22} className="animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.02] [html.light_&]:bg-white overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Header con título + acciones (dirty state visible) */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-2 min-w-0">
          <Wand2 size={18} className="text-amber-300 shrink-0" strokeWidth={1.8} />
          <h3 className="font-semibold text-primary [html.light_&]:text-ink-900 tracking-tight">
            Diseña tu tarjeta
          </h3>
          {dirty && (
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 [html.light_&]:bg-amber-100 [html.light_&]:text-amber-700">
              Cambios sin guardar
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={descartar}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200"
            >
              Descartar
            </button>
          )}
          <button
            type="button"
            onClick={guardar}
            disabled={!dirty || saving}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              dirty && !saving
                ? 'bg-amber-400 hover:bg-amber-300 text-ink-900 shadow-[0_8px_20px_-6px_rgba(251,191,36,0.55)]'
                : 'bg-white/5 [html.light_&]:bg-ink-100 text-slate-500 [html.light_&]:text-ink-500 cursor-not-allowed'
            }`}
          >
            {saving
              ? <>Guardando… <Loader2 size={14} className="animate-spin" /></>
              : <>Guardar y provisionar <Save size={14} /></>}
          </button>
        </div>
      </div>

      {/* Layout 2 columnas: editor a la izquierda, preview sticky derecha */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-6 p-5 sm:p-6">
        {/* ── EDITOR ──────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Templates */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles size={14} className="text-amber-300" />
              <h4 className="text-sm font-semibold text-primary [html.light_&]:text-ink-900">
                Empieza con un template
              </h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => aplicarTemplate(t)}
                  className="text-left p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${t.preset.bg} 0%, ${t.preset.bg} 60%, ${t.preset.accent}22 100%)`,
                    border: `1px solid ${t.preset.accent}30`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.preset.accent }} />
                    <p className="text-[11px] font-bold text-white truncate">{t.nombre}</p>
                  </div>
                  <p className="text-[9.5px] text-white/60 leading-tight">{t.tag}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Identidad */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Type size={14} className="text-slate-400" />
              <h4 className="text-sm font-semibold text-primary [html.light_&]:text-ink-900">Identidad</h4>
            </div>
            <div className="grid gap-3">
              <label className="block">
                <span className="text-[11.5px] text-slate-400 [html.light_&]:text-ink-600 mb-1 block">Nombre del programa</span>
                <input
                  type="text"
                  maxLength={30}
                  value={draft.programName || ''}
                  onChange={e => mut({ programName: e.target.value })}
                  placeholder="Ej: Club de Fidelidad"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 [html.light_&]:bg-slate-100 border border-white/10 [html.light_&]:border-ink-200 text-sm text-white [html.light_&]:text-ink-900 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50"
                />
                <span className="text-[10px] text-slate-500">{(draft.programName || '').length}/30 · aparece grande en la tarjeta</span>
              </label>
              <label className="block">
                <span className="text-[11.5px] text-slate-400 [html.light_&]:text-ink-600 mb-1 block">Emisor (arriba, chico)</span>
                <input
                  type="text"
                  maxLength={20}
                  value={draft.issuerName || ''}
                  onChange={e => mut({ issuerName: e.target.value })}
                  placeholder="Ej: Barbería Providencia"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/60 [html.light_&]:bg-slate-100 border border-white/10 [html.light_&]:border-ink-200 text-sm text-white [html.light_&]:text-ink-900 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/50"
                />
              </label>
            </div>
          </section>

          {/* Logo (upload) */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Upload size={14} className="text-slate-400" />
              <h4 className="text-sm font-semibold text-primary [html.light_&]:text-ink-900">Logo</h4>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-900/60 [html.light_&]:bg-slate-100 shrink-0 ring-1 ring-white/10">
                {draft.logoUrl && (
                  <img src={draft.logoUrl} alt="logo" className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => { const f = e.target.files?.[0]; if (f) subirLogo(f); e.target.value=''; }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 [html.light_&]:bg-ink-100 [html.light_&]:text-ink-900 hover:bg-white/15 disabled:opacity-60"
                >
                  {uploading
                    ? <>Subiendo… <Loader2 size={12} className="animate-spin" /></>
                    : draft.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                </button>
                <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">
                  Cuadrado, PNG o JPG. Lo recortamos al centro. Peso máx 6 MB.
                </p>
              </div>
            </div>
          </section>

          {/* Colores */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Palette size={14} className="text-slate-400" />
              <h4 className="text-sm font-semibold text-primary [html.light_&]:text-ink-900">Colores</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11.5px] text-slate-400 [html.light_&]:text-ink-600 mb-1 block">Color acento</span>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={draft.accent || '#c9a84c'}
                    onChange={e => mut({ accent: e.target.value })}
                    className="w-11 h-9 rounded-md bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft.accent || '#c9a84c'}
                    onChange={e => mut({ accent: e.target.value })}
                    className="flex-1 px-2.5 py-2 rounded-lg bg-slate-900/60 [html.light_&]:bg-slate-100 border border-white/10 text-xs font-mono text-white [html.light_&]:text-ink-900 uppercase focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-[11.5px] text-slate-400 [html.light_&]:text-ink-600 mb-1 block">Color fondo</span>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={draft.bg || '#0a0a0a'}
                    onChange={e => mut({ bg: e.target.value })}
                    className="w-11 h-9 rounded-md bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft.bg || '#0a0a0a'}
                    onChange={e => mut({ bg: e.target.value })}
                    className="flex-1 px-2.5 py-2 rounded-lg bg-slate-900/60 [html.light_&]:bg-slate-100 border border-white/10 text-xs font-mono text-white [html.light_&]:text-ink-900 uppercase focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </label>
            </div>
          </section>

          {/* Ícono de sello */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <Star size={14} className="text-slate-400" />
              <h4 className="text-sm font-semibold text-primary [html.light_&]:text-ink-900">Ícono de sello</h4>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {ICONS_LIB.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => mut({ stampIcon: id })}
                  title={label}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    (draft.stampIcon || 'check') === id
                      ? 'ring-2 ring-amber-400 bg-amber-400/10'
                      : 'bg-slate-900/40 [html.light_&]:bg-slate-100 hover:bg-slate-900/60'
                  }`}
                  style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <Icon size={20} className={(draft.stampIcon || 'check') === id ? 'text-amber-300' : 'text-slate-400'} />
                  <span className="text-[9px] text-slate-500 truncate max-w-full px-1">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Meta de sellos */}
          <section>
            <label className="block">
              <span className="text-[11.5px] text-slate-400 [html.light_&]:text-ink-600 mb-1 block">Meta de sellos (para el próximo premio)</span>
              <input
                type="number"
                min="3"
                max="30"
                value={draft.sellosTarget || 10}
                onChange={e => mut({ sellosTarget: Math.max(3, Math.min(30, Number(e.target.value) || 10)) })}
                className="w-28 px-3 py-2 rounded-lg bg-slate-900/60 [html.light_&]:bg-slate-100 border border-white/10 text-sm text-white [html.light_&]:text-ink-900 focus:outline-none focus:border-amber-400/50"
              />
              <span className="text-[10.5px] text-slate-500 ml-2">
                Es visual — los premios reales viven en Panel → Fidelización.
              </span>
            </label>
          </section>

          {/* Ubicación para geo-push */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <MapPin size={14} className="text-slate-400" />
              <h4 className="text-sm font-semibold text-primary [html.light_&]:text-ink-900">Ubicación del local</h4>
              <span className="text-[10px] text-slate-500">(para el geo-push)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[10.5px] text-slate-500">Latitud</span>
                <input
                  type="number"
                  step="0.000001"
                  value={geoLat}
                  onChange={e => setGeo({ lat: e.target.value, lng: geoLng, radius: geoRadius })}
                  placeholder="-33.4260"
                  className="w-full px-2.5 py-1.5 mt-1 rounded-lg bg-slate-900/60 [html.light_&]:bg-slate-100 border border-white/10 text-xs font-mono text-white [html.light_&]:text-ink-900 focus:outline-none focus:border-amber-400/50"
                />
              </label>
              <label className="block">
                <span className="text-[10.5px] text-slate-500">Longitud</span>
                <input
                  type="number"
                  step="0.000001"
                  value={geoLng}
                  onChange={e => setGeo({ lat: geoLat, lng: e.target.value, radius: geoRadius })}
                  placeholder="-70.6156"
                  className="w-full px-2.5 py-1.5 mt-1 rounded-lg bg-slate-900/60 [html.light_&]:bg-slate-100 border border-white/10 text-xs font-mono text-white [html.light_&]:text-ink-900 focus:outline-none focus:border-amber-400/50"
                />
              </label>
              <label className="block">
                <span className="text-[10.5px] text-slate-500">Radio (m)</span>
                <input
                  type="number"
                  min="100"
                  max="2000"
                  step="50"
                  value={geoRadius}
                  onChange={e => setGeo({ lat: geoLat, lng: geoLng, radius: e.target.value })}
                  className="w-full px-2.5 py-1.5 mt-1 rounded-lg bg-slate-900/60 [html.light_&]:bg-slate-100 border border-white/10 text-xs font-mono text-white [html.light_&]:text-ink-900 focus:outline-none focus:border-amber-400/50"
                />
              </label>
            </div>
            <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${geoLat || ''}%2C${geoLng || ''}`}
                target="_blank" rel="noopener noreferrer"
                className="text-amber-300 [html.light_&]:text-amber-700 hover:underline"
              >Ver en Google Maps</a> · Truco: haz clic derecho en tu local en Maps → aparece "lat, lng" arriba, cópialo acá.
            </p>
          </section>

          {/* Visibilidad para clientes */}
          <section className="pt-2">
            <button
              type="button"
              onClick={() => mut({ enabled: !(draft.enabled === true) })}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-colors ${
                draft.enabled === true
                  ? 'bg-emerald-500/[0.08] border border-emerald-500/25'
                  : 'bg-slate-900/40 [html.light_&]:bg-slate-100 border border-white/10'
              }`}
            >
              {draft.enabled === true
                ? <Eye size={18} className="text-emerald-300 shrink-0" />
                : <EyeOff size={18} className="text-slate-500 shrink-0" />}
              <div className="text-left flex-1 min-w-0">
                <p className={`text-sm font-semibold ${draft.enabled === true ? 'text-emerald-200 [html.light_&]:text-emerald-700' : 'text-primary [html.light_&]:text-ink-900'}`}>
                  {draft.enabled === true ? 'Visible para tus clientes' : 'Oculta para tus clientes'}
                </p>
                <p className="text-[11.5px] text-slate-400 [html.light_&]:text-ink-600 mt-0.5 leading-relaxed">
                  {draft.enabled === true
                    ? 'Verán el botón "Añadir a Wallet" en su vista de sellos.'
                    : 'Actívala cuando el diseño esté como quieres.'}
                </p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                draft.enabled === true
                  ? 'bg-emerald-400/20 text-emerald-200'
                  : 'bg-white/10 text-slate-400'
              }`}>
                {draft.enabled === true ? 'ON' : 'OFF'}
              </span>
            </button>
          </section>

          {/* Mensajes */}
          {(msg || err) && (
            <div className={`rounded-xl px-4 py-3 text-xs flex items-start gap-2 ${
              err ? 'bg-rose-500/[0.08] text-rose-300' : 'bg-emerald-500/[0.08] text-emerald-300'
            }`}>
              <Info size={14} className="shrink-0 mt-px" />
              <span>{err || msg}</span>
            </div>
          )}
        </div>

        {/* ── PREVIEW (sticky en desktop) ────────────────────── */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl p-5 bg-gradient-to-b from-slate-900/40 to-slate-900/20 [html.light_&]:from-slate-100 [html.light_&]:to-white"
            style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-1.5 mb-3">
              <RefreshCw size={12} className="text-slate-500 animate-spin" style={{ animationDuration: '4s' }} />
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Vista previa en vivo</p>
            </div>
            <WalletMockup
              cfg={draft}
              nombreCliente="María P."
              sellosDisp={Math.min(3, draft.sellosTarget || 10)}
              target={draft.sellosTarget || 10}
              rango="Silver"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
