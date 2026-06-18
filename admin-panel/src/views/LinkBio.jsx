import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Link2, Calendar, MessageCircle, Instagram, Star, MapPin, Type, AlignLeft,
  Share2, Youtube, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Lock,
  ExternalLink, Copy, Check, GripVertical, ChevronRight, BarChart3,
  Users, Mail, Building2, QrCode, Download, Crown,
} from 'lucide-react';
import QRCode from 'qrcode';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

/* ── Catálogo de tipos de bloque (tier: free | pro | studio) ──── */
const TIPOS = {
  reserva:   { nombre: 'Reservar hora',      icon: Calendar,      tier: 'free',   fields: ['label'] },
  whatsapp:  { nombre: 'WhatsApp',           icon: MessageCircle, tier: 'free',   fields: ['label', 'mensaje'] },
  instagram: { nombre: 'Instagram',          icon: Instagram,     tier: 'free',   fields: ['label', 'gridPro'] },
  reviews:   { nombre: 'Reseñas Google',     icon: Star,          tier: 'free',   fields: ['label'] },
  maps:      { nombre: 'Cómo llegar',        icon: MapPin,        tier: 'free',   fields: ['label'] },
  link:      { nombre: 'Link personalizado', icon: Link2,         tier: 'pro',    fields: ['label', 'url'] },
  heading:   { nombre: 'Encabezado',         icon: Type,          tier: 'pro',    fields: ['texto'] },
  paragraph: { nombre: 'Texto',              icon: AlignLeft,     tier: 'pro',    fields: ['texto'] },
  socials:   { nombre: 'Fila de redes',      icon: Share2,        tier: 'pro',    fields: ['redes'] },
  video:     { nombre: 'Video YouTube',      icon: Youtube,       tier: 'pro',    fields: ['url'] },
  barberos:        { nombre: 'Reserva con tu barbero', icon: Users,     tier: 'studio', fields: ['label'] },
  reviewsCarousel: { nombre: 'Carrusel de reseñas',    icon: Star,      tier: 'studio', fields: [] },
  leads:           { nombre: 'Captura de leads',       icon: Mail,      tier: 'studio', fields: ['label', 'cta'] },
  sedes:           { nombre: 'Multi-sede',             icon: Building2, tier: 'studio', fields: ['label'] },
};
const ORDEN_MENU = ['reserva', 'whatsapp', 'instagram', 'reviews', 'maps', 'link', 'heading', 'paragraph', 'socials', 'video', 'barberos', 'reviewsCarousel', 'leads', 'sedes'];
const TIER_RANK = { free: 0, pro: 1, studio: 2 };
const REDES = ['instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp', 'x', 'web', 'email'];

const uid = () => 'b_' + Math.random().toString(36).slice(2, 9);

/* ── Handle público para bioo.cl/<handle> ── */
const RESERVED_HANDLES = ['registro','login','editor','admin','api','bio','dashboard','agenda','app','www','links','synaptech','bioo','soporte','ayuda','help','about','terminos','privacidad','catalogo','membresia','kronnos'];
const normHandle  = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._-]/g, '');
const validHandle = v => v.length >= 3 && v.length <= 30 && /^[a-z0-9][a-z0-9._-]{2,29}$/.test(v) && !RESERVED_HANDLES.includes(v);

function labelDefault(tipo) {
  return ({
    reserva: 'Reservar hora', whatsapp: 'Escríbenos por WhatsApp', instagram: 'Síguenos en Instagram',
    reviews: 'Déjanos tu reseña ⭐', maps: 'Cómo llegar', link: 'Mi enlace',
    barberos: 'Reserva con tu barbero', leads: '¡Únete y entérate de promos!', sedes: 'Nuestras sedes',
  })[tipo] || '';
}
function newBlock(tipo) {
  const b = { id: uid(), tipo, activo: true };
  if (TIPOS[tipo].fields.includes('label')) b.label = labelDefault(tipo);
  if (tipo === 'reserva') b.featured = true;
  if (tipo === 'socials') b.redes = [{ red: 'instagram', url: '' }];
  if (tipo === 'heading') b.texto = 'Mis enlaces';
  if (tipo === 'paragraph') b.texto = '';
  if (tipo === 'leads') b.cta = 'Quiero enterarme';
  return b;
}
function seedDefault() {
  return [
    newBlock('reserva'),
    { ...newBlock('whatsapp') },
    { ...newBlock('instagram') },
    { ...newBlock('reviews') },
    { ...newBlock('maps') },
  ];
}

const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
const lbl   = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1';

export default function LinkBio() {
  const tid = resolveTenantId();
  const ref = useMemo(() => tenantDoc('settings', 'linkbio'), [tid]);

  const [cfg, setCfg]       = useState(null);   // { perfil, bloques, enabled }
  const [plan, setPlan]     = useState('free'); // free | pro | studio — lo decide el superadmin en _system/{tenant}.bioPlan
  const [loading, setLoad]  = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);
  const [copied, setCopied] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [stats, setStats]   = useState({ views: 0, clicks: {} });
  const origHandleRef = useRef('');   // handle guardado (para detectar cambios)

  // Carga inicial: config del bio + estado Pro (controlado por el superadmin)
  useEffect(() => {
    let alive = true;
    getDoc(doc(db, '_system', tid))
      .then(s => {
        if (!alive) return;
        const d = s.exists() ? s.data() : {};
        setPlan(d.bioPlan || (d.bioPro === true ? 'pro' : 'free'));
      })
      .catch(() => {});
    getDoc(ref).then(snap => {
      if (!alive) return;
      const d = snap.exists() ? snap.data() : {};
      origHandleRef.current = d.handle || '';
      setCfg({
        perfil:  d.perfil  || {},
        bloques: (Array.isArray(d.bloques) && d.bloques.length) ? d.bloques : seedDefault(),
        enabled: d.enabled !== false,
        handle:  d.handle || '',
      });
      setLoad(false);
    }).catch(() => { setCfg({ perfil: {}, bloques: seedDefault(), enabled: true, handle: '' }); setLoad(false); });
    return () => { alive = false; };
  }, [ref, tid]);

  // Analytics en vivo (views + clicks por bloque)
  useEffect(() => {
    const unsub = onSnapshot(ref, s => {
      const d = s.exists() ? s.data() : {};
      setStats({ views: d.views || 0, clicks: d.clicks || {} });
    }, () => {});
    return unsub;
  }, [ref]);

  const isPro    = plan === 'pro' || plan === 'studio';
  const isStudio = plan === 'studio';

  /* ── Mutaciones ── */
  const update = patch => { setCfg(c => ({ ...c, ...patch })); setDirty(true); };
  const setBlock = (i, patch) => update({ bloques: cfg.bloques.map((b, j) => j === i ? { ...b, ...patch } : b) });
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= cfg.bloques.length) return;
    const arr = [...cfg.bloques];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    update({ bloques: arr });
  };
  const remove = i => update({ bloques: cfg.bloques.filter((_, j) => j !== i) });
  const add = tipo => {
    if (TIER_RANK[TIPOS[tipo].tier] > TIER_RANK[plan]) return;   // bloqueado por plan
    if (!isPro && cfg.bloques.length >= 6) return;               // Free: máx 6
    update({ bloques: [...cfg.bloques, newBlock(tipo)] });
    setAddOpen(false);
  };

  const save = async () => {
    const h = (cfg.handle || '').trim();
    if (h && !validHandle(h)) {
      alert('El nombre para bioo.cl debe tener 3 a 30 caracteres (letras, números, punto o guion), empezar con letra/número y no ser una palabra reservada.');
      return;
    }
    setSaving(true);
    try {
      // No tocamos clicks/views (página pública) ni pro (lo controla el superadmin).
      await setDoc(ref, {
        perfil:  cfg.perfil || {},
        bloques: cfg.bloques,
        enabled: cfg.enabled !== false,
        handle:  h || null,
      }, { merge: true });

      // Registro público del handle → bioo.cl/<handle>
      const prev = origHandleRef.current;
      if (h && h !== prev) {
        await setDoc(doc(db, 'bio_handles', h), { tenantId: tid, host: window.location.host, createdAt: serverTimestamp() });
        if (prev && prev !== h) await deleteDoc(doc(db, 'bio_handles', prev)).catch(() => {});
        origHandleRef.current = h;
      } else if (!h && prev) {
        await deleteDoc(doc(db, 'bio_handles', prev)).catch(() => {});
        origHandleRef.current = '';
      }
      setDirty(false);
    } catch (e) {
      alert(e.code === 'permission-denied'
        ? `El nombre "bioo.cl/${h}" ya está en uso por otra cuenta. Prueba con otro.`
        : 'No se pudo guardar: ' + e.message);
    } finally { setSaving(false); }
  };

  const handle = (cfg?.handle || '').trim();
  const bioUrl = handle ? `https://bioo.cl/${handle}` : `${window.location.origin}/bio`;
  const copyLink = () => {
    navigator.clipboard.writeText(bioUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  // QR de la bio con el logo del local al centro (Studio).
  const downloadQR = async () => {
    try {
      const S = 1024, canvas = document.createElement('canvas');
      canvas.width = S; canvas.height = S;
      await QRCode.toCanvas(canvas, bioUrl, { width: S, margin: 2, errorCorrectionLevel: 'H', color: { dark: '#0f172a', light: '#ffffff' } });
      const ctx = canvas.getContext('2d');
      const box = S * 0.2, x = (S - box) / 2, pad = 14, r = 26;
      // recuadro blanco redondeado para el logo
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(x - pad, x - pad, box + pad * 2, box + pad * 2, r);
      ctx.fill();
      const logo = cfg.perfil?.avatar;
      if (logo) {
        await new Promise(res => {
          const img = new Image(); img.crossOrigin = 'anonymous';
          img.onload = () => { try { ctx.drawImage(img, x, x, box, box); } catch {} res(); };
          img.onerror = res; img.src = logo;
        });
      }
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png'); a.download = `bio-${tid}-qr.png`; a.click();
    } catch (e) { alert('No se pudo generar el QR: ' + e.message); }
  };

  if (loading || !cfg) {
    return <div className="p-8 text-center text-slate-500 text-sm">Cargando tu Link in Bio…</div>;
  }

  const limiteAlcanzado = !isPro && cfg.bloques.length >= 6;

  return (
    <div className="max-w-6xl mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Link2 className="text-emerald-400" size={20} />
          <h1 className="text-lg font-bold text-white">Link in Bio</h1>
          <HelpButton onClick={() => setShowHelp(true)} />
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            plan === 'studio' ? 'bg-amber-500/15 text-amber-400'
            : plan === 'pro'  ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-slate-800 text-slate-400'}`}>Plan {plan}</span>
        </div>
        <div className="flex items-center gap-2">
          {isStudio && (
            <button onClick={downloadQR} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors">
              <QrCode size={14} /> QR
            </button>
          )}
          <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} {copied ? 'Copiado' : 'Copiar link'}
          </button>
          <a href={bioUrl} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
            <ExternalLink size={14} /> Ver página
          </a>
        </div>
      </div>

      {/* Dirección pública en bioo.cl */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-4">
        <label className={lbl}>Tu dirección en bioo.cl</label>
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3 focus-within:border-emerald-500 transition-colors">
          <span className="text-sm text-slate-500 select-none">bioo.cl/</span>
          <input
            className="flex-1 bg-transparent py-2.5 pl-0.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            value={cfg.handle || ''}
            placeholder="tunegocio"
            maxLength={30}
            onChange={e => update({ handle: normHandle(e.target.value) })}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          {cfg.handle
            ? <>Tu link público será <span className="text-emerald-400 font-semibold">bioo.cl/{cfg.handle}</span> (guarda para aplicarlo).</>
            : <>Elige un nombre corto para compartir. Mientras tanto tu link sigue siendo el de tu subdominio.</>}
        </p>
      </div>

      {/* Pantalla de planes / upsell (solo en Free) */}
      {!isPro && <UpsellPanel />}

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Stat icon={Eye} label="Vistas" value={stats.views} />
        <Stat icon={BarChart3} label="Clics totales" value={Object.values(stats.clicks).reduce((s, n) => s + (n || 0), 0)} />
        <Stat icon={Link2} label="Bloques activos" value={cfg.bloques.filter(b => b.activo !== false).length} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Columna editor ── */}
        <div className="space-y-4">
          {/* Perfil */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Encabezado</p>
            <div>
              <label className={lbl}>Título</label>
              <input className={field} value={cfg.perfil.titulo || ''} placeholder="Nombre del local (vacío = usa el del local)"
                onChange={e => update({ perfil: { ...cfg.perfil, titulo: e.target.value } })} />
            </div>
            <div>
              <label className={lbl}>Subtítulo</label>
              <input className={field} value={cfg.perfil.subtitulo || ''} placeholder="Tu slogan"
                onChange={e => update({ perfil: { ...cfg.perfil, subtitulo: e.target.value } })} />
            </div>
          </div>

          {/* Bloques */}
          <div className="space-y-2.5">
            {cfg.bloques.map((b, i) => (
              <BlockCard
                key={b.id} blk={b} index={i} total={cfg.bloques.length} isPro={isPro}
                clicks={stats.clicks[b.id] || 0}
                onChange={patch => setBlock(i, patch)}
                onMove={dir => move(i, dir)}
                onRemove={() => remove(i)}
              />
            ))}
          </div>

          {/* Agregar */}
          {addOpen ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ORDEN_MENU.map(tipo => {
                  const T = TIPOS[tipo]; const Icon = T.icon;
                  const planLocked = TIER_RANK[T.tier] > TIER_RANK[plan];
                  const locked = planLocked || limiteAlcanzado;
                  return (
                    <button key={tipo} disabled={locked} onClick={() => add(tipo)}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-all text-left
                        ${locked ? 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
                                 : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-500/50 hover:bg-slate-750'}`}>
                      <Icon size={15} className={locked ? 'text-slate-600' : (T.tier === 'studio' ? 'text-amber-400' : 'text-emerald-400')} />
                      <span className="flex-1 truncate">{T.nombre}</span>
                      {planLocked && (
                        <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-black uppercase text-amber-500/80">
                          <Lock size={10} />{T.tier === 'studio' ? 'Studio' : 'Pro'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {limiteAlcanzado && (
                <p className="mt-2 text-[11px] text-amber-400 flex items-center gap-1"><Lock size={11} /> Plan free: máximo 6 bloques. Mejora tu plan para bloques ilimitados.</p>
              )}
              <button onClick={() => setAddOpen(false)} className="mt-2 text-xs text-slate-500 hover:text-white">Cerrar</button>
            </div>
          ) : (
            <button onClick={() => setAddOpen(true)} disabled={limiteAlcanzado}
              className="w-full px-3 py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400 text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              <Plus size={16} /> {limiteAlcanzado ? 'Límite de 6 bloques (plan free)' : 'Agregar bloque'}
            </button>
          )}
        </div>

        {/* ── Preview en vivo ── */}
        <div className="lg:sticky lg:top-4">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">Vista previa</p>
          <Preview perfil={cfg.perfil} bloques={cfg.bloques} />
        </div>
      </div>

      {/* Barra guardar */}
      <div className="fixed bottom-0 inset-x-0 lg:left-64 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-4 py-3 flex items-center justify-between gap-3 z-20">
        <span className="text-xs text-slate-500">{dirty ? 'Cambios sin guardar' : 'Todo guardado'}</span>
        <button onClick={save} disabled={saving || !dirty}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2">
          {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Guardar cambios
        </button>
      </div>

      {showHelp && (
        <HelpModal title="Link in Bio" onClose={() => setShowHelp(false)}>
          <p>Arma una mini-página con todos tus enlaces (reservar, WhatsApp, Instagram, reseñas…) para poner en tu bio de Instagram. Tu link es <strong className="text-white">{bioUrl}</strong>.</p>
          <p>Activa/desactiva y reordena los botones. Cada clic se cuenta para que veas qué usan más tus clientes.</p>
        </HelpModal>
      )}
    </div>
  );
}

/* ── Pantalla de planes / upsell (modo Free) ── */
const PLANES = [
  {
    id: 'free', nombre: 'Free', precio: '$0', destacado: false, actual: true,
    beneficios: ['Hasta 6 botones', 'Tema de tu local', 'Vistas + clics totales'],
  },
  {
    id: 'pro', nombre: 'Pro', precio: '$4.990', periodo: '/mes', destacado: true,
    beneficios: ['Bloques ilimitados', 'Links, video, redes y texto', 'Sin marca bioo', 'Analytics por botón + QR', 'Colores propios'],
  },
  {
    id: 'studio', nombre: 'Studio', precio: '$9.990', periodo: '/mes', destacado: false,
    beneficios: ['Todo lo de Pro', 'Reserva con tu barbero', 'Captura de leads (correo/WhatsApp)', 'Carrusel de reseñas Google', 'Multi-sede', 'QR pro con tu logo'],
  },
];

function UpsellPanel() {
  const waMsg = encodeURIComponent('Hola SynapTech! Quiero pasar mi Link in Bio a Pro 🚀');
  return (
    <div className="mb-6 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Estás en Plan Free</p>
          <h3 className="text-lg font-black text-white">Desbloquea todo tu Link in Bio</h3>
        </div>
        <span className="text-[10px] text-slate-500">Lo activa SynapTech</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {PLANES.map(p => (
          <div key={p.id}
            className={`relative rounded-xl border p-4 flex flex-col ${p.destacado ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-800 bg-slate-900/60'}`}>
            {p.destacado && <span className="absolute -top-2 left-4 text-[9px] font-black uppercase tracking-wide bg-amber-500 text-amber-950 px-2 py-0.5 rounded-full">Recomendado</span>}
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-bold text-white">{p.nombre}</p>
              {p.actual && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Actual</span>}
            </div>
            <p className="mt-1 mb-3"><span className="text-2xl font-black text-white">{p.precio}</span><span className="text-xs text-slate-500">{p.periodo || ''}</span></p>
            <ul className="space-y-1.5 flex-1">
              {p.beneficios.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                  <Check size={12} className={`mt-0.5 shrink-0 ${p.destacado ? 'text-amber-400' : 'text-emerald-400'}`} /> {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <a href={`https://wa.me/?text=${waMsg}`} target="_blank" rel="noopener"
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-bold rounded-lg transition-all">
        Quiero pasar a Pro <ChevronRight size={16} />
      </a>
      <p className="mt-2 text-[10px] text-center text-slate-500">El plan lo activa SynapTech para tu local. Escríbenos y lo dejamos andando.</p>
    </div>
  );
}

/* ── Tarjeta de estadística ── */
function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
      <Icon size={18} className="text-emerald-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-lg font-black text-white leading-none">{Number(value).toLocaleString('es-CL')}</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

/* ── Tarjeta de bloque ── */
function BlockCard({ blk, index, total, isPro, clicks, onChange, onMove, onRemove }) {
  const T = TIPOS[blk.tipo] || TIPOS.link;
  const Icon = T.icon;
  const off = blk.activo === false;
  return (
    <div className={`bg-slate-900 border rounded-xl p-3 transition-all ${off ? 'border-slate-850 opacity-60' : 'border-slate-800'}`}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="text-slate-600 hover:text-white disabled:opacity-30 p-0.5"><ArrowUp size={14} /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="text-slate-600 hover:text-white disabled:opacity-30 p-0.5"><ArrowDown size={14} /></button>
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{blk.label || blk.texto || T.nombre}</p>
          <p className="text-[10px] text-slate-500">{T.nombre} · {clicks} clic{clicks !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => onChange({ activo: !off ? false : true })} title={off ? 'Activar' : 'Desactivar'}
          className={`p-1.5 rounded-lg transition-colors ${off ? 'text-slate-500 hover:text-white' : 'text-emerald-400 hover:bg-slate-800'}`}>
          {off ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button onClick={onRemove} className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-slate-800 transition-colors"><Trash2 size={15} /></button>
      </div>

      {/* Campos editables */}
      <div className="mt-3 space-y-2 pl-10">
        {T.fields.includes('label') && (
          <input className={field} value={blk.label || ''} placeholder="Texto del botón"
            onChange={e => onChange({ label: e.target.value })} />
        )}
        {T.fields.includes('texto') && (
          <input className={field} value={blk.texto || ''} placeholder={blk.tipo === 'heading' ? 'Título de sección' : 'Texto'}
            onChange={e => onChange({ texto: e.target.value })} />
        )}
        {T.fields.includes('url') && (
          <input className={field} value={blk.url || ''} placeholder={blk.tipo === 'video' ? 'URL de YouTube' : 'https://...'}
            onChange={e => onChange({ url: e.target.value })} />
        )}
        {T.fields.includes('mensaje') && (
          <input className={field} value={blk.mensaje || ''} placeholder="Mensaje prellenado de WhatsApp (opcional)"
            onChange={e => onChange({ mensaje: e.target.value })} />
        )}
        {T.fields.includes('gridPro') && isPro && (
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={!!blk.grid} onChange={e => onChange({ grid: e.target.checked })}
              className="w-4 h-4 accent-emerald-500" />
            Mostrar grilla con últimas fotos de Instagram
          </label>
        )}
        {T.fields.includes('cta') && (
          <input className={field} value={blk.cta || ''} placeholder="Texto del botón (ej: Quiero enterarme)"
            onChange={e => onChange({ cta: e.target.value })} />
        )}
        {T.fields.includes('redes') && (
          <SocialsEditor redes={blk.redes || []} onChange={redes => onChange({ redes })} />
        )}
        {blk.tipo === 'reviewsCarousel' && (
          <p className="text-[11px] text-slate-500">Usa automáticamente las reseñas y el rating de Google del local.</p>
        )}
        {blk.tipo === 'sedes' && (
          <p className="text-[11px] text-slate-500">Lista automáticamente las sucursales configuradas del local.</p>
        )}
        {blk.tipo === 'barberos' && (
          <p className="text-[11px] text-slate-500">Muestra a tu equipo; cada uno lleva a su página propia para reservar.</p>
        )}
        {!['heading', 'paragraph', 'socials', 'barberos', 'reviewsCarousel', 'leads', 'sedes'].includes(blk.tipo) && (
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input type="checkbox" checked={!!blk.featured} onChange={e => onChange({ featured: e.target.checked })}
              className="w-4 h-4 accent-emerald-500" />
            Destacar (botón con color de marca)
          </label>
        )}
      </div>
    </div>
  );
}

function SocialsEditor({ redes, onChange }) {
  const setRow = (i, patch) => onChange(redes.map((r, j) => j === i ? { ...r, ...patch } : r));
  return (
    <div className="space-y-1.5">
      {redes.map((r, i) => (
        <div key={i} className="flex gap-1.5">
          <select className={field + ' w-32'} value={r.red} onChange={e => setRow(i, { red: e.target.value })}>
            {REDES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <input className={field + ' flex-1'} value={r.url || ''} placeholder="URL" onChange={e => setRow(i, { url: e.target.value })} />
          <button onClick={() => onChange(redes.filter((_, j) => j !== i))} className="px-2 text-rose-400/70 hover:text-rose-400"><Trash2 size={14} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...redes, { red: 'instagram', url: '' }])} className="text-xs text-emerald-400 hover:underline flex items-center gap-1"><Plus size={12} /> Agregar red</button>
    </div>
  );
}

/* ── Preview en vivo (mockup de teléfono) ── */
function Preview({ perfil, bloques }) {
  const ICON = { reserva: Calendar, whatsapp: MessageCircle, instagram: Instagram, reviews: Star, maps: MapPin, link: Link2, video: Youtube, barberos: Users, reviewsCarousel: Star, leads: Mail, sedes: Building2 };
  const visibles = bloques.filter(b => b.activo !== false);
  return (
    <div className="mx-auto w-[260px] rounded-[2rem] border-[6px] border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
      <div className="h-[480px] overflow-y-auto no-scrollbar px-4 py-6 flex flex-col items-center"
        style={{ background: 'radial-gradient(ellipse 80% 35% at 50% 0%, rgba(16,185,129,0.12), transparent 70%), #0a0a0d' }}>
        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400/60 text-xs">logo</div>
        <p className="mt-2 text-white font-black text-center text-sm leading-tight">{perfil.titulo || 'Tu local'}</p>
        {perfil.subtitulo && <p className="text-[10px] text-slate-400 text-center mt-0.5">{perfil.subtitulo}</p>}
        <div className="w-full mt-4 space-y-2">
          {visibles.length === 0 && <p className="text-center text-[11px] text-slate-600 mt-6">Sin bloques activos</p>}
          {visibles.map(b => {
            if (b.tipo === 'heading') return <p key={b.id} className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center pt-1">{b.texto}</p>;
            if (b.tipo === 'paragraph') return <p key={b.id} className="text-[10px] text-slate-400 text-center">{b.texto}</p>;
            if (b.tipo === 'socials') return (
              <div key={b.id} className="flex justify-center gap-1.5 py-1">
                {(b.redes || []).map((r, i) => <div key={i} className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center"><Share2 size={12} className="text-slate-400" /></div>)}
              </div>
            );
            const Icon = ICON[b.tipo] || Link2;
            return (
              <div key={b.id} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-semibold border
                ${b.featured ? 'bg-emerald-500 text-emerald-950 border-emerald-500' : 'bg-white/5 text-white border-white/10'}`}>
                <span className={`w-6 h-6 rounded-md flex items-center justify-center ${b.featured ? 'bg-black/15' : 'bg-emerald-500/15'}`}><Icon size={12} className={b.featured ? '' : 'text-emerald-400'} /></span>
                <span className="flex-1 truncate">{b.label || TIPOS[b.tipo]?.nombre}</span>
                <ChevronRight size={12} className="opacity-50" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
