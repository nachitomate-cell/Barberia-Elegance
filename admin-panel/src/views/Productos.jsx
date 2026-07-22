import { useState, useRef, useEffect } from 'react';
import { Plus, ShoppingBag, Edit2, Trash2, Upload, ImageOff, Power, AlertTriangle, CheckCircle2, XCircle, Clock, Eye, EyeOff, Tag, Package, Download, Share2, X, History, TrendingUp, User, CreditCard, ChevronDown } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, onSnapshot, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, db } from '../lib/firebase';
import { tenantCol, tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
import { useTenant } from '../contexts/TenantContext';
import { useSucursal } from '../contexts/SucursalContext';
import { useCollection } from '../hooks/useCollection';
import SlideOver from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import { STORY_FONT, STORY_BG_PRESETS, lum, loadImg, drawCover, ellipsize } from '../lib/storyCanvas';

const EMPTY = { nombre: '', descripcion: '', precio: '', precioOriginal: '', marca: '', categoria: '', stock: '', imagen: '', imagenPath: '', activo: true, precioCosto: '', stockMinimo: '' };

function playProductChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    
    const playNote = (delay, freq, duration) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    };

    // A nice double-tone chime ("ding-ling")
    playNote(0, 987.77, 0.18); // B5
    playNote(0.08, 1318.51, 0.38); // E6
  } catch (_) {}
}

const CATEGORIAS_DELUXE = ['Perfumes', 'Sets', 'Miniaturas', 'Accesorios', 'Aromatizadores', 'Otro'];

function ProductCard({ producto, onEdit, onDelete, isDeluxe }) {
  const off = producto.precioOriginal && producto.precio && producto.precioOriginal > producto.precio
    ? Math.round((1 - producto.precio / producto.precioOriginal) * 100) : 0;

  const isCriticalStock = producto.stock !== undefined && producto.stock !== null && producto.stock !== '' && 
                          producto.stockMinimo !== undefined && producto.stockMinimo !== null && producto.stockMinimo !== '' && 
                          Number(producto.stock) <= Number(producto.stockMinimo);

  if (isDeluxe) {
    return (
      <div className={`group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-black/40 backdrop-blur-sm
        hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(217,160,80,0.15)] hover:-translate-y-0.5
        transition-all duration-300 ${producto.activo === false ? 'opacity-60' : ''}`}>

        {/* Badges Flotantes */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
          {producto.activo === false && (
            <div className="flex items-center gap-1 bg-black/80 border border-amber-500/20 rounded-full px-2 py-0.5 w-max">
              <EyeOff size={10} className="text-amber-600/70" />
              <span className="text-[10px] text-amber-600/60 font-medium tracking-wide">Oculto</span>
            </div>
          )}
          {isCriticalStock && (
            <div className="flex items-center gap-1 bg-amber-500 border border-amber-400/30 rounded-full px-2 py-0.5 w-max animate-pulse shadow-lg">
              <AlertTriangle size={10} className="text-black" />
              <span className="text-[9px] text-black font-extrabold tracking-wide">STOCK CRÍTICO ({producto.stock})</span>
            </div>
          )}
        </div>

        {/* Botón editar flotante (esquina superior derecha) */}
        <button
          onClick={() => onEdit(producto)}
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center
            bg-black/60 border border-amber-500/30 rounded-full
            text-amber-500/50 hover:text-amber-400 hover:border-amber-400/60 hover:bg-amber-500/10
            opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <Edit2 size={12} />
        </button>

        {/* Imagen con iluminación dramática */}
        <div className="aspect-[4/5] overflow-hidden relative">
          {producto.imagen ? (
            <img
              src={producto.imagen}
              alt={producto.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-[radial-gradient(ellipse_at_50%_55%,rgba(180,120,40,0.18)_0%,rgba(10,5,0,0.9)_55%,#000_100%)]
              flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/5 border border-amber-500/10 flex items-center justify-center">
                <ImageOff size={20} className="text-amber-500/20" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Info */}
        <div className="p-4">
          {producto.marca && (
            <p className="text-[10px] font-medium text-amber-600/70 uppercase tracking-[0.15em] mb-1">{producto.marca}</p>
          )}
          <h3 className="text-sm font-light text-gray-100 leading-snug line-clamp-2 tracking-wide">{producto.nombre}</h3>
          {producto.categoria && (
            <span className="inline-block text-[9px] font-medium uppercase tracking-widest bg-amber-500/5 border border-amber-500/15 text-amber-600/60 rounded-full px-2 py-0.5 mt-1.5">
              {producto.categoria}
            </span>
          )}
          <div className="flex items-baseline gap-2 mt-3">
            {producto.precio ? (
              <span className="text-amber-500 font-semibold text-sm">${Number(producto.precio).toLocaleString('es-CL')}</span>
            ) : (
              <span className="text-amber-600/40 text-xs italic">Consultar</span>
            )}
            {off > 0 && (
              <span className="text-[10px] text-gray-600 line-through">${Number(producto.precioOriginal).toLocaleString('es-CL')}</span>
            )}
            {off > 0 && (
              <span className="text-[10px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-full px-1.5 py-0.5">-{off}%</span>
            )}
          </div>
          {producto.stock !== undefined && producto.stock !== null && producto.stock !== '' && (
            <div className="mt-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border inline-block ${
                isCriticalStock
                  ? 'text-amber-400 border-amber-500/40 bg-amber-500/5'
                  : Number(producto.stock) > 0
                    ? 'text-amber-600/60 border-amber-500/15 bg-amber-500/5'
                    : 'text-red-400 border-red-500/30 bg-red-500/5'
              }`}>Stock: {producto.stock} {isCriticalStock && `(Min: ${producto.stockMinimo})`}</span>
            </div>
          )}
          <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => onDelete(producto.id)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-transparent
                border border-red-500/20 text-red-400/60 hover:border-red-500/40 hover:text-red-400
                hover:bg-red-500/5 rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 size={10} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-transform hover:-translate-y-1 group relative ${producto.activo === false ? 'opacity-60' : ''}`}>
      {/* Badges flotantes */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1.5">
        {producto.activo === false && (
          <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-full px-2 py-0.5 w-max">
            <EyeOff size={10} className="text-slate-400" />
            <span className="text-[10px] text-slate-400 font-semibold">Oculto</span>
          </div>
        )}
        {isCriticalStock && (
          <div className="flex items-center gap-1 bg-amber-500 border border-amber-400/30 rounded-full px-2 py-0.5 w-max animate-pulse shadow-lg text-black">
            <AlertTriangle size={10} className="text-ink-950" />
            <span className="text-[9px] font-extrabold tracking-wide text-ink-950">STOCK CRÍTICO ({producto.stock})</span>
          </div>
        )}
      </div>

      {/* Escaparate: fondo claro para que la imagen se integre bien */}
      <div className="bg-white/95 aspect-square p-4 flex items-center justify-center relative">
        {producto.imagen
          ? <img src={producto.imagen} alt={producto.nombre} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" />
          : <ImageOff size={28} className="text-slate-400" />}
      </div>

      {/* Info */}
      <div className="p-4 bg-slate-900">
        <h3 className="font-semibold text-primary text-sm leading-tight line-clamp-2 min-h-[2.5rem]">{producto.nombre}</h3>
        <div className="flex items-baseline gap-2 mt-2">
          {producto.precio ? (
            <span className="text-lg font-bold text-emerald-400">${Number(producto.precio).toLocaleString('es-CL')}</span>
          ) : (
            <span className="text-slate-500 text-xs italic">Consultar</span>
          )}
          {off > 0 && (
            <span className="text-[10px] font-bold text-slate-500 line-through">${Number(producto.precioOriginal).toLocaleString('es-CL')}</span>
          )}
          {off > 0 && (
            <span className="text-[10px] font-bold bg-red-500/15 border border-red-500/30 text-red-400 rounded-full px-1.5 py-0.5">-{off}%</span>
          )}
        </div>
        {(producto.stock !== undefined && producto.stock !== null && producto.stock !== '') && (
          <span className={`mt-2 inline-block bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md border border-slate-700 ${
            isCriticalStock ? 'text-amber-400 border-amber-500/50' : Number(producto.stock) === 0 ? 'text-red-400 border-red-500/40' : ''
          }`}>
            Stock: {producto.stock}{isCriticalStock && ` · min ${producto.stockMinimo}`}
          </span>
        )}
        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(producto)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-semibold transition-colors">
            <Edit2 size={11} /> Editar
          </button>
          <button onClick={() => onDelete(producto.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-colors">
            <Trash2 size={11} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Generador de imagen para Historia de Instagram ─────────────── */
function drawStory(canvas, { productos, showPrice, showStock, showPhotos, bgColor, shopName, imgs = {}, logoImg = null }) {
  const W = 1080, H = 1920;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const dark   = lum(bgColor) > 0.6;            // fondo claro → texto oscuro
  const fg     = dark ? '#111827' : '#FFFFFF';
  const muted  = dark ? 'rgba(17,24,39,0.55)' : 'rgba(255,255,255,0.62)';
  const line   = dark ? 'rgba(17,24,39,0.12)' : 'rgba(255,255,255,0.14)';
  const ph     = dark ? 'rgba(17,24,39,0.08)' : 'rgba(255,255,255,0.10)';
  const okClr  = dark ? '#047857' : '#34D399';
  const offClr = dark ? '#B91C1C' : '#FB7185';
  const PAD = 90;

  // Fondo
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  // Cabecera (con logo si está disponible)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let tx = PAD;
  if (logoImg) {
    const LS = 120;
    drawCover(ctx, logoImg, PAD, 92, LS, LS, LS / 2);
    tx = PAD + LS + 30;
  }
  ctx.fillStyle = muted;
  ctx.font = `700 30px ${STORY_FONT}`;
  ctx.fillText('CATÁLOGO', tx, 142);

  ctx.fillStyle = fg;
  ctx.font = `800 60px ${STORY_FONT}`;
  ctx.fillText(ellipsize(ctx, shopName || '', W - tx - PAD), tx, 208);

  ctx.fillStyle = muted;
  ctx.font = `400 32px ${STORY_FONT}`;
  ctx.fillText('Productos disponibles', tx, 256);

  ctx.strokeStyle = line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, 320); ctx.lineTo(W - PAD, 320); ctx.stroke();

  // Filas de productos
  const top = 380, bottom = H - 210;
  const n = Math.max(productos.length, 1);
  const rowH = Math.min(160, (bottom - top) / n);
  const fs   = Math.min(46, Math.max(26, rowH * 0.30));
  const thumb = showPhotos ? Math.min(rowH * 0.74, 118) : 0;

  productos.forEach((p, i) => {
    const rowTop = top + i * rowH;
    const y = rowTop + rowH / 2;
    ctx.textBaseline = 'middle';

    // Miniatura (izquierda)
    let nameX = PAD;
    if (showPhotos) {
      const ty = y - thumb / 2;
      const im = imgs[p.imagen];
      if (im) {
        drawCover(ctx, im, PAD, ty, thumb, thumb, 22);
      } else {
        // Placeholder con la inicial del producto
        ctx.fillStyle = ph;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(PAD, ty, thumb, thumb, 22); else ctx.rect(PAD, ty, thumb, thumb);
        ctx.fill();
        ctx.fillStyle = muted;
        ctx.font = `800 ${Math.round(thumb * 0.42)}px ${STORY_FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText((p.nombre || '?').charAt(0).toUpperCase(), PAD + thumb / 2, y);
        ctx.textAlign = 'left';
      }
      nameX = PAD + thumb + 30;
    }

    // Lado derecho: precio / stock (primero, para conocer el ancho ocupado)
    let rightX = W - PAD;
    if (showStock) {
      const s = Number(p.stock) || 0;
      ctx.textAlign = 'right';
      ctx.fillStyle = s > 0 ? okClr : offClr;
      ctx.font = `700 ${Math.round(fs * 0.78)}px ${STORY_FONT}`;
      const stxt = s > 0 ? `Stock ${s}` : 'Agotado';
      ctx.fillText(stxt, rightX, y);
      rightX -= ctx.measureText(stxt).width + 32;
    }
    if (showPrice) {
      ctx.textAlign = 'right';
      ctx.fillStyle = fg;
      ctx.font = `800 ${Math.round(fs)}px ${STORY_FONT}`;
      const ptxt = '$' + Number(p.precio || 0).toLocaleString('es-CL');
      ctx.fillText(ptxt, rightX, y);
      rightX -= ctx.measureText(ptxt).width + 40;
    }

    // Nombre (recortado para no chocar con el precio)
    ctx.textAlign = 'left';
    ctx.fillStyle = fg;
    ctx.font = `700 ${Math.round(fs)}px ${STORY_FONT}`;
    const nameMaxW = Math.max(120, rightX - nameX - 24);
    ctx.fillText(ellipsize(ctx, p.nombre || 'Producto', nameMaxW), nameX, y);

    // Separador de fila
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, rowTop + rowH); ctx.lineTo(W - PAD, rowTop + rowH); ctx.stroke();
  });

  // Pie: marca abajo a la derecha
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = muted;
  ctx.font = `700 30px ${STORY_FONT}`;
  ctx.fillText('SynapTech Spa', W - PAD, H - 90);
  ctx.textAlign = 'left';
}

function StoryGenerator({ productos, shopName, logoUrl, onClose }) {
  const canvasRef = useRef(null);
  const [showPrice,  setShowPrice]  = useState(true);
  const [showStock,  setShowStock]  = useState(false);
  const [showPhotos, setShowPhotos] = useState(true);
  const [bgColor,    setBgColor]    = useState('#0F172A');
  const [imgs,       setImgs]       = useState({});      // url → HTMLImageElement
  const [logoImg,    setLogoImg]    = useState(null);
  const [loadingImgs, setLoadingImgs] = useState(true);

  const disponibles = productos.filter(p => p.activo !== false);

  // Precarga de imágenes (fotos de productos + logo) con CORS anónimo
  useEffect(() => {
    let alive = true;
    setLoadingImgs(true);
    (async () => {
      const urls = [...new Set(disponibles.map(p => p.imagen).filter(Boolean))];
      const pairs = await Promise.all(urls.map(async u => [u, await loadImg(u)]));
      const lg = await loadImg(logoUrl);
      if (!alive) return;
      const map = {};
      pairs.forEach(([u, im]) => { if (im) map[u] = im; });
      setImgs(map);
      setLogoImg(lg);
      setLoadingImgs(false);
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, logoUrl]);

  // Redibujar al cambiar opciones o cuando terminan de cargar las imágenes
  useEffect(() => {
    if (canvasRef.current) {
      drawStory(canvasRef.current, { productos: disponibles, showPrice, showStock, showPhotos, bgColor, shopName, imgs, logoImg });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPrice, showStock, showPhotos, bgColor, productos, imgs, logoImg]);

  const descargar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let url;
    try {
      url = canvas.toDataURL('image/png');
    } catch {
      // Canvas contaminado (sin CORS) → reintentar sin fotos/logo
      drawStory(canvas, { productos: disponibles, showPrice, showStock, showPhotos: false, bgColor, shopName, imgs: {}, logoImg: null });
      try { url = canvas.toDataURL('image/png'); }
      catch { alert('No se pudo exportar la imagen. Revisa la configuración de CORS del Storage.'); return; }
    }
    const link = document.createElement('a');
    link.download = `historia-productos-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto no-scrollbar rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary bg-slate-800 border border-slate-700 rounded-lg transition-colors">
          <X size={16} />
        </button>

        <div className="p-5 border-b border-slate-800">
          <h3 className="text-lg font-bold text-primary flex items-center gap-2"><Share2 size={18} className="text-emerald-400" /> Imagen para Historia</h3>
          <p className="text-xs text-slate-500 mt-0.5">Genera una imagen 9:16 con tus productos disponibles para subir a Instagram.</p>
        </div>

        <div className="p-5 grid md:grid-cols-2 gap-6">
          {/* Vista previa */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              className="rounded-xl border border-slate-800 shadow-lg"
              style={{ width: 260, height: 'auto' }}
            />
          </div>

          {/* Controles */}
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Mostrar</p>
              <div className="space-y-2">
                <label className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                  <span className="text-sm text-primary flex items-center gap-2"><Tag size={14} className="text-emerald-400" /> Precio</span>
                  <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                </label>
                <label className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                  <span className="text-sm text-primary flex items-center gap-2"><Package size={14} className="text-emerald-400" /> Stock</span>
                  <input type="checkbox" checked={showStock} onChange={e => setShowStock(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                </label>
                <label className="flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                  <span className="text-sm text-primary flex items-center gap-2"><ImageOff size={14} className="text-emerald-400" /> Fotos de productos</span>
                  <input type="checkbox" checked={showPhotos} onChange={e => setShowPhotos(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
                </label>
              </div>
              {showPhotos && loadingImgs && (
                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin" /> Cargando imágenes…
                </p>
              )}
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Color de fondo</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {STORY_BG_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setBgColor(c)}
                    title={c}
                    className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${bgColor.toLowerCase() === c.toLowerCase() ? 'border-emerald-400' : 'border-slate-700'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <label className="flex items-center gap-3 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 bg-transparent border-0 cursor-pointer" />
                <span className="text-sm text-slate-300">Color personalizado</span>
                <span className="ml-auto text-xs font-mono text-slate-500">{bgColor.toUpperCase()}</span>
              </label>
            </div>

            {disponibles.length === 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5"><AlertTriangle size={13} /> No hay productos disponibles para mostrar.</p>
            )}

            <button
              onClick={descargar}
              disabled={disponibles.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-primary text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              <Download size={16} /> Descargar imagen (PNG)
            </button>
            <p className="text-[11px] text-slate-600 text-center">{disponibles.length} producto{disponibles.length !== 1 ? 's' : ''} · formato 1080×1920</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Productos() {
  const tenant = useTenant();
  const { activeSucursal, sucursales: _sucList } = useSucursal();  // sede de la venta
  const isDeluxe = tenant.id === 'deluxeperfumes';

  const { data: productos, loading } = useCollection('productos', [orderBy('createdAt', 'asc')]);

  const [slide,      setSlide]      = useState(false);
  const [showHelp,   setShowHelp]   = useState(false);
  const [storyOpen,  setStoryOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [preview,    setPreview]    = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [activo,     setActivo]     = useState(false);
  const [activoLoad, setActivoLoad] = useState(true);
  const [confirmOn,  setConfirmOn]  = useState(false);
  const [reservas,        setReservas]        = useState([]);
  const [reservasLoading, setReservasLoading] = useState(true);
  const fileRef = useRef(null);
  const initialized = useRef(false);

  const [barberos, setBarberos] = useState([]);
  const [ventaRapidaOpen, setVentaRapidaOpen] = useState(false);
  const [vrForm, setVrForm] = useState({ productId: '', cantidad: 1, descuento: 0, barberoId: '', metodoPago: 'Efectivo' });
  const [vrSaving, setVrSaving] = useState(false);

  // Historial de ventas
  const [ventas,        setVentas]        = useState([]);
  const [ventasLoading, setVentasLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');  // hoy | semana | mes | todo
  const [filtroBarberoH, setFiltroBarberoH] = useState('');

  // Delivery modal state
  const [entregaModal, setEntregaModal] = useState(null); // reserva object or null
  const [entregaForm, setEntregaForm] = useState({ metodoPago: 'Efectivo', barberoId: '' });
  const [entregaSaving, setEntregaSaving] = useState(false);

  // Load barbers for commissions
  useEffect(() => {
    const q = query(tenantCol('barberos'), where('activo', '==', true));
    const unsub = onSnapshot(q, snap => {
      setBarberos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  const criticalProductsCount = productos ? productos.filter(p => {
    return p.stock !== undefined && p.stock !== null && p.stock !== '' && 
           p.stockMinimo !== undefined && p.stockMinimo !== null && p.stockMinimo !== '' && 
           Number(p.stock) <= Number(p.stockMinimo);
  }).length : 0;

  const openVentaRapida = () => {
    setVrForm({ productId: '', cantidad: 1, descuento: 0, barberoId: '', metodoPago: 'Efectivo' });
    setVentaRapidaOpen(true);
  };

  const handleVentaRapidaSave = async () => {
    if (!vrForm.productId || !vrForm.barberoId || !vrForm.metodoPago || vrForm.cantidad <= 0) {
      alert('Por favor, completa todos los campos.');
      return;
    }
    const prod = productos.find(p => p.id === vrForm.productId);
    const barb = barberos.find(b => b.id === vrForm.barberoId);
    if (!prod || !barb) return;

    setVrSaving(true);
    try {
      const batch = writeBatch(db);
      const descuento = Math.min(100, Math.max(0, Number(vrForm.descuento) || 0));
      const subtotalVenta = Number(prod.precio || 0) * Number(vrForm.cantidad);
      const totalVenta = Math.round(subtotalVenta * (1 - descuento / 100));
      // Fecha local "YYYY-MM-DD" (componentes locales, NO toISOString/UTC → evita
      // el salto de día nocturno en Chile). Métricas e Inicio filtran
      // product_reservations por `fecha`; sin este campo la venta rápida quedaba
      // invisible en ingresos y P&L (el ticket de agenda.html ya lo escribe).
      const _now = new Date();
      const fechaHoy = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

      // Create delivered reservation representing direct sale
      const reservationRef = doc(tenantCol('product_reservations'));
      batch.set(reservationRef, {
        productId: prod.id,
        productName: prod.nombre,
        precio: totalVenta,
        subtotal: subtotalVenta,
        descuento,
        cantidad: Number(vrForm.cantidad),
        fecha: fechaHoy,
        status: 'delivered',
        userName: 'Venta Directa Local',
        userEmail: 'admin@barberia.cl',
        metodoPago: vrForm.metodoPago,
        barberoId: barb.id,
        barberoNombre: barb.nombre,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Sede de la venta: la del barbero (o la sede activa) → aísla la venta
        // por sucursal en Caja/Métricas/Inventario.
        ...(() => {
          const sid = barb.sucursalId || activeSucursal?.id || null;
          if (!sid) return {};
          const nom = (_sucList || []).find(s => s.id === sid)?.nombre || activeSucursal?.nombre || '';
          return { sucursalId: sid, sucursalNombre: nom };
        })(),
      });

      // Deduct stock
      if (prod.stock !== undefined && prod.stock !== null && prod.stock !== '') {
        const newStock = Math.max(0, Number(prod.stock) - Number(vrForm.cantidad));
        batch.update(doc(tenantCol('productos'), prod.id), { stock: newStock });
      }

      await batch.commit();
      setVentaRapidaOpen(false);
      playProductChime();
    } catch (err) {
      console.error('Error en venta rápida:', err);
      alert('Error al registrar la venta: ' + err.message);
    } finally {
      setVrSaving(false);
    }
  };

  /* Reservas pendientes en tiempo real */
  useEffect(() => {
    const q = query(tenantCol('product_reservations'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      if (initialized.current) {
        const hasAdditions = snap.docChanges().some(change => change.type === 'added');
        if (hasAdditions) {
          playProductChime();
        }
      } else {
        initialized.current = true;
      }

      setReservas(docs);
      setReservasLoading(false);
    }, () => setReservasLoading(false));
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(tenantCol('product_reservations'), where('status', '==', 'delivered'), orderBy('createdAt', 'desc')),
      snap => {
        setVentas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setVentasLoading(false);
      },
      () => setVentasLoading(false),
    );
    return unsub;
  }, []);

  const openEntregaModal = (reserva) => {
    setEntregaForm({ metodoPago: 'Efectivo', barberoId: barberos[0]?.id || '' });
    setEntregaModal(reserva);
  };

  const handleEntregaConfirm = async () => {
    if (!entregaModal) return;
    if (!entregaForm.barberoId) { alert('Selecciona un barbero vendedor.'); return; }
    setEntregaSaving(true);
    try {
      const reserva = entregaModal;
      const barb = barberos.find(b => b.id === entregaForm.barberoId);
      const batch = writeBatch(db);
      batch.update(doc(tenantCol('product_reservations'), reserva.id), {
        status: 'delivered',
        metodoPago: entregaForm.metodoPago,
        barberoId: entregaForm.barberoId,
        barberoNombre: barb?.nombre || '',
        updatedAt: serverTimestamp(),
      });
      if (reserva.productId) {
        const prod = productos.find(p => p.id === reserva.productId);
        if (prod && prod.stock !== undefined && prod.stock !== null && prod.stock !== '') {
          const currentStock = Number(prod.stock);
          if (currentStock > 0) {
            batch.update(doc(tenantCol('productos'), reserva.productId), { stock: currentStock - 1 });
          }
        }
      }
      await batch.commit();
      setEntregaModal(null);
    } catch (err) {
      console.error('Error al entregar reserva:', err);
      alert('Hubo un error al marcar la entrega: ' + err.message);
    } finally {
      setEntregaSaving(false);
    }
  };

  const cancelarReserva = id =>
    updateDoc(doc(tenantCol('product_reservations'), id), { status: 'cancelled', updatedAt: serverTimestamp() });

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /* Load activation state */
  useEffect(() => {
    withTimeout(getDoc(tenantDoc('config', 'ui')), 10000, 'productos/cfg-ui')
      .then(snap => { if (snap.exists()) setActivo(!!snap.data().productosActivos); })
      .catch(() => {})
      .finally(() => setActivoLoad(false));
  }, []);

  const toggleActivo = async (newVal) => {
    // La bandera vive en dos documentos: config/ui (lo lee el perfil del club)
    // y configuracion/main (lo lee el sitio público de reserva). Hay que
    // escribir en ambos para que productos se vean en las dos vistas.
    await Promise.all([
      setDoc(tenantDoc('config', 'ui'),          { productosActivos: newVal }, { merge: true }),
      setDoc(tenantDoc('configuracion', 'main'), { productosActivos: newVal }, { merge: true }),
    ]);
    setActivo(newVal);
    setConfirmOn(false);
  };

  const openNew  = () => {
    setEditing(null); setForm(EMPTY); setPreview(''); setSlide(true);
  };
  const openEdit = p => {
    setEditing(p.id);
    setForm({
      nombre:        p.nombre        || '',
      descripcion:   p.descripcion   || '',
      precio:        p.precio        ?? '',
      precioOriginal:p.precioOriginal ?? '',
      marca:         p.marca         || '',
      categoria:     p.categoria     || '',
      stock:         p.stock         ?? '',
      imagen:        p.imagen        || '',
      imagenPath:    p.imagenPath    || '',
      activo:        p.activo !== false,
      precioCosto:   p.precioCosto   ?? '',
      stockMinimo:   p.stockMinimo   ?? '',
    });
    setPreview(p.imagen || '');
    setSlide(true);
  };

  const [uploadError, setUploadError] = useState('');

  // Comprime/redimensiona imágenes grandes antes de subir. Las fotos de celular
  // suelen pesar >5MB y el límite de Storage es 5MB → sin esto la subida daba
  // 'storage/unauthorized'. Devuelve un File JPEG liviano; si falla, el original.
  const comprimirImagen = async (file, maxDim = 1400, quality = 0.82) => {
    if (!file.type?.startsWith('image/')) return file;
    try {
      const dataUrl = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
      });
      let { width, height } = img;
      if (Math.max(width, height) > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
      if (!blob || blob.size >= file.size) return file; // ya era chico/mejor el original
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
      return file;
    }
  };

  const handleFileChange = async e => {
    const original = e.target.files?.[0];
    if (!original) return;
    setUploadError('');
    setPreview(URL.createObjectURL(original));
    setUploading(true);
    try {
      const file     = await comprimirImagen(original);
      const tid      = resolveTenantId();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const prefix   = tid === 'elegance' ? '' : `tenants/${tid}/`;
      const path     = `${prefix}productos/${Date.now()}_${safeName}`;
      const snap     = await uploadBytes(
        storageRef(storage, path),
        file,
        {
          contentType: file.type || 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable', // path con timestamp único → cache agresivo seguro
        },
      );
      const url = await getDownloadURL(snap.ref);
      setForm(f => ({ ...f, imagen: url, imagenPath: path }));
      setPreview(url);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.code === 'storage/unauthorized'
        ? 'Sin permiso para subir. Verificá que tu sesión esté activa.'
        : `Error al subir: ${err.message}`);
      setPreview(form.imagen);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.nombre) return;
    setSaving(true);
    try {
      const payload = {
        nombre:         form.nombre,
        descripcion:    form.descripcion,
        precio:         form.precio !== '' ? Math.round(Number(form.precio)) : null,
        precioOriginal: form.precioOriginal !== '' ? Math.round(Number(form.precioOriginal)) : null,
        marca:          form.marca   || null,
        categoria:      form.categoria || null,
        stock:          form.stock !== '' ? Number(form.stock) : null,
        imagen:         form.imagen,
        imagenPath:     form.imagenPath || '',
        activo:         form.activo !== false,
        precioCosto:    form.precioCosto !== '' ? Math.round(Number(form.precioCosto)) : null,
        stockMinimo:    form.stockMinimo !== '' ? Number(form.stockMinimo) : null,
        updatedAt:      serverTimestamp(),
      };
      if (editing) {
        const oldProduct = productos.find(p => p.id === editing);
        await updateDoc(doc(tenantCol('productos'), editing), payload);
        if (oldProduct?.imagenPath && oldProduct.imagenPath !== form.imagenPath) {
          try { await deleteObject(storageRef(storage, oldProduct.imagenPath)); } catch (_) {}
        }
      } else {
        await addDoc(tenantCol('productos'), { ...payload, createdAt: serverTimestamp() });
      }
      setSlide(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!(await confirmDialog('¿Eliminar este producto?'))) return;
    const prod = productos.find(p => p.id === id);
    await deleteDoc(doc(tenantCol('productos'), id));
    if (prod?.imagenPath) {
      try { await deleteObject(storageRef(storage, prod.imagenPath)); } catch (_) {}
    }
  };

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">Productos</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          {!loading && productos.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {productos.length} {productos.length === 1 ? 'producto' : 'productos'} en catálogo
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
          <button
            onClick={() => setStoryOpen(true)}
            disabled={loading}
            title="Generar imagen para historia de Instagram"
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-primary text-sm font-semibold px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
          >
            <Share2 size={16} className="text-emerald-400" /> Imagen historia
          </button>
          <button
            onClick={openVentaRapida}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-primary text-sm font-semibold px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
          >
            <ShoppingBag size={16} className="text-emerald-400" /> Venta Rápida
          </button>
          <button
            onClick={openNew}
            disabled={loading}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-primary text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Agregar producto
          </button>
        </div>
      </div>

      {/* Global Critical Stock Alert Banner */}
      {criticalProductsCount > 0 && (
        <div className="mb-6 flex items-start gap-4 px-5 py-4 rounded-xl border border-amber-500/30 bg-amber-500/5 animate-pulse shadow-md">
          <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">
              Alerta de Inventario: <span className="text-amber-400">{criticalProductsCount} {criticalProductsCount === 1 ? 'producto requiere' : 'productos requieren'} reposición urgente.</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Hay artículos cuyo stock actual está en o por debajo del stock mínimo configurado. Por favor, revisa las tarjetas marcadas con la alerta de Stock Crítico.
            </p>
          </div>
        </div>
      )}

      {/* Activation banner */}
      {!activoLoad && (
        <div className={`mb-6 flex items-start gap-4 px-5 py-4 rounded-xl border transition-all ${
          activo ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-900'
        }`}>
          <Power size={20} className={`shrink-0 mt-0.5 ${activo ? 'text-emerald-400' : 'text-slate-500'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">
              Sección de productos: <span className={activo ? 'text-emerald-400' : 'text-slate-500'}>{activo ? 'Activa' : 'Inactiva'}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {activo
                ? 'Los clientes pueden ver los productos publicados en su perfil del club (pestaña "Productos").'
                : 'Al activar, los clientes verán una pestaña "Productos" en su perfil del club.'}
            </p>
          </div>
          <button
            onClick={() => activo ? toggleActivo(false) : setConfirmOn(true)}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
              activo
                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
            }`}
          >
            {activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )}

      {/* Confirm activation modal */}
      {confirmOn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-amber-400 shrink-0" />
              <h3 className="font-semibold text-primary">Activar sección Productos</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Los clientes verán directamente los productos publicados en su perfil del club.<br /><br />
              <strong className="text-amber-400">Revisa los precios y el stock antes de activar.</strong> Esta sección es pública para todos los clientes registrados.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmOn(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
              <button onClick={() => toggleActivo(true)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-primary text-sm font-semibold rounded-lg transition-all">
                Entendido, activar
              </button>
            </div>
          </div>
        </div>
      )}


      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-slate-600">
          <ShoppingBag size={40} className="mb-3" />
          <p className="text-sm font-medium">Sin productos aún</p>
          <p className="text-xs mt-0.5">Agrega el primero con el botón de arriba.</p>
        </div>
      ) : isDeluxe ? (
        <div className="rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(120,80,20,0.07)_0%,transparent_70%)] p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productos.map(p => <ProductCard key={p.id} producto={p} onEdit={openEdit} onDelete={handleDelete} isDeluxe={isDeluxe} />)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productos.map(p => <ProductCard key={p.id} producto={p} onEdit={openEdit} onDelete={handleDelete} isDeluxe={isDeluxe} />)}
        </div>
      )}

      {/* ── Reservas Pendientes ─────────────────────────────────── */}
      <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 mt-8">
        <h2 className="text-sm font-bold text-slate-400 tracking-widest uppercase mb-6 flex items-center gap-2">
          <Clock size={14} className="text-amber-400" />
          Reservas Pendientes
          {reservas.length > 0 && (
            <span className="ml-1 bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30 normal-case tracking-normal">
              {reservas.length}
            </span>
          )}
        </h2>

        {reservasLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reservas.length === 0 ? (
          <div className="flex items-center gap-3 px-5 py-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-sm">
            <CheckCircle2 size={16} className="text-slate-600 shrink-0" />
            Sin reservas pendientes por el momento.
          </div>
        ) : (
          <div className="space-y-3">
            {reservas.map(r => (
              <div
                key={r.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{r.userName || '—'}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{r.productName}</p>
                  <p className="text-xs text-slate-600 mt-0.5 whitespace-nowrap">{fmtDate(r.createdAt)}</p>
                </div>
                {/* Precio */}
                {r.precio ? (
                  <span className="text-sm font-bold text-emerald-400 shrink-0 whitespace-nowrap">
                    ${Number(r.precio).toLocaleString('es-CL')}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 italic shrink-0 whitespace-nowrap">Consultar en el local</span>
                )}
                {/* Acciones */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEntregaModal(r)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <CheckCircle2 size={12} /> Entregado
                  </button>
                  <button
                    onClick={() => cancelarReserva(r.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <XCircle size={12} /> Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Historial de Ventas ─────────────────────────────────── */}
      {(() => {
        const now   = new Date();
        const hoy   = now.toISOString().slice(0, 10);
        const lunes = new Date(now); lunes.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); const lunesStr = lunes.toISOString().slice(0, 10);
        const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

        function fechaStr(v) {
          if (!v) return '';
          if (typeof v === 'string') return v.slice(0, 10);
          if (v?.toDate) return v.toDate().toISOString().slice(0, 10);
          return '';
        }

        const ventasFiltradas = ventas.filter(v => {
          const f = v.fecha || fechaStr(v.createdAt);
          if (filtroPeriodo === 'hoy'    && f !== hoy)      return false;
          if (filtroPeriodo === 'semana' && f < lunesStr)   return false;
          if (filtroPeriodo === 'mes'    && f < primerDiaMes) return false;
          if (filtroBarberoH && v.barberoId !== filtroBarberoH) return false;
          return true;
        });

        const totalMonto   = ventasFiltradas.reduce((s, v) => s + (Number(v.precio) || 0), 0);
        const totalUnidades = ventasFiltradas.reduce((s, v) => s + (Number(v.cantidad) || 1), 0);

        // Producto más vendido
        const prodCount = {};
        ventasFiltradas.forEach(v => { const n = v.productName || '—'; prodCount[n] = (prodCount[n] || 0) + (Number(v.cantidad) || 1); });
        const topProd = Object.entries(prodCount).sort((a, b) => b[1] - a[1])[0];

        const PERIODO_LABELS = { hoy: 'Hoy', semana: 'Esta semana', mes: 'Este mes', todo: 'Todo' };

        return (
          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-6 mt-8">
            {/* Cabecera */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-sm font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                <History size={14} className="text-emerald-400" />
                Historial de Ventas
                {!ventasLoading && (
                  <span className="ml-1 bg-slate-800 text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-700 normal-case tracking-normal">
                    {ventasFiltradas.length}
                  </span>
                )}
              </h2>

              {/* Filtros */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Período */}
                <div className="relative">
                  <select
                    value={filtroPeriodo}
                    onChange={e => setFiltroPeriodo(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {Object.entries(PERIODO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>

                {/* Barbero */}
                {barberos.length > 0 && (
                  <div className="relative">
                    <select
                      value={filtroBarberoH}
                      onChange={e => setFiltroBarberoH(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">Todos los barberos</option>
                      {barberos.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>

            {/* KPIs */}
            {!ventasLoading && ventasFiltradas.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total vendido</p>
                  <p className="text-3xl font-black text-emerald-400 mt-1 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] tracking-tight">
                    ${totalMonto.toLocaleString('es-CL')}
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Unidades</p>
                  <p className="text-3xl font-black text-primary mt-1 tracking-tight">{totalUnidades}</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 min-w-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Más vendido</p>
                  <p className="text-3xl font-black text-primary mt-1 tracking-tight break-words">
                    {topProd ? topProd[0] : '—'}
                  </p>
                  {topProd && <p className="text-xs text-slate-500 mt-1">×{topProd[1]} unidades</p>}
                </div>
              </div>
            )}

            {/* Lista */}
            {ventasLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ventasFiltradas.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 text-sm">
                <TrendingUp size={16} className="text-slate-600 shrink-0" />
                Sin ventas en {PERIODO_LABELS[filtroPeriodo].toLowerCase()}{filtroBarberoH ? ` para ${barberos.find(b => b.id === filtroBarberoH)?.nombre || 'este barbero'}` : ''}.
              </div>
            ) : (
              <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-4 border-b border-slate-800 whitespace-nowrap">Fecha</th>
                      <th className="text-left px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-4 border-b border-slate-800 whitespace-nowrap">Producto</th>
                      <th className="text-left px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-4 border-b border-slate-800 whitespace-nowrap">Cliente</th>
                      <th className="text-left px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-4 border-b border-slate-800 whitespace-nowrap">Barbero</th>
                      <th className="text-left px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-4 border-b border-slate-800 whitespace-nowrap">Pago</th>
                      <th className="text-right px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider pb-4 border-b border-slate-800 whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasFiltradas.map(v => {
                      const prod = productos?.find(p => p.id === v.productId);
                      const fecha = v.fecha || fechaStr(v.createdAt);
                      const qty   = Number(v.cantidad) || 1;
                      const isDirecta = v.userEmail === 'admin@barberia.cl';
                      return (
                        <tr key={v.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fecha}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {prod?.imagen
                                ? <img src={prod.imagen} alt="" className="w-7 h-7 rounded-md object-cover shrink-0 border border-slate-700" />
                                : <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0"><Package size={12} className="text-slate-600" /></div>
                              }
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-primary truncate">{v.productName || '—'}</p>
                                {qty > 1 && <p className="text-[10px] text-slate-500">×{qty} unidades</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <User size={11} className="text-slate-600 shrink-0" />
                              <span className="text-xs text-slate-400 truncate max-w-[140px]">
                                {isDirecta ? 'Venta directa' : (v.userName || '—')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs text-slate-400">{v.barberoNombre || '—'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {v.metodoPago ? (
                              <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-md px-2 py-1 text-xs">
                                <CreditCard size={9} />{v.metodoPago}
                              </span>
                            ) : <span className="text-xs text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="font-medium text-emerald-400">
                              ${(Number(v.precio) || 0).toLocaleString('es-CL')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {ventasFiltradas.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-slate-700">
                        <td colSpan={5} className="px-4 pt-4 text-xs font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">Total</td>
                        <td className="px-4 pt-4 text-right font-medium text-emerald-400 whitespace-nowrap">${totalMonto.toLocaleString('es-CL')}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* SlideOver */}
      <SlideOver isOpen={slide} onClose={() => setSlide(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setSlide(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre || uploading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-primary text-sm font-semibold rounded-lg transition-all flex items-center gap-2">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {editing ? 'Guardar' : 'Crear producto'}
            </button>
          </div>
        }>
        <div className="space-y-4">
          {/* Imagen */}
          <div>
            <label className={lbl}>Imagen</label>
            <div className="flex gap-3 items-start">
              <div className="w-20 h-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {preview
                  ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
                  : <ImageOff size={20} className="text-slate-600" />}
              </div>
              <div className="flex-1 space-y-2">
                <input className={field} placeholder="https://... o sube una imagen" value={form.imagen}
                  onChange={e => { setForm(f => ({ ...f, imagen: e.target.value })); setPreview(e.target.value); }} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                  {uploading ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Upload size={12} />}
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                </button>
                {uploadError && (
                  <p className="text-xs text-red-400 leading-snug">{uploadError}</p>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>
          </div>
          {/* Nombre */}
          <div>
            <label className={lbl}>Nombre *</label>
            <input className={field} placeholder={isDeluxe ? 'Chanel N°5 EDP 100ml' : 'Pomada para el cabello'} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          {/* Deluxe: Marca + Categoría */}
          {isDeluxe && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Marca</label>
                <input className={field} placeholder="Chanel, Dior, YSL..." value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Categoría</label>
                <select className={field} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  <option value="">Sin categoría</option>
                  {CATEGORIAS_DELUXE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
          {/* Descripción */}
          <div>
            <label className={lbl}>Descripción</label>
            <textarea className={`${field} resize-none`} rows={2} placeholder="Descripción breve del producto..." value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>
          {/* Precio */}
          {isDeluxe ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Precio de venta (CLP)</label>
                <input className={field} type="number" min="0" step="1" inputMode="numeric" placeholder="45000" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value.replace(/[^\d]/g, '') }))} />
              </div>
              <div>
                <label className={lbl}>Precio original (CLP) <span className="text-slate-600 normal-case tracking-normal font-normal">opcional</span></label>
                <input className={field} type="number" min="0" step="1" inputMode="numeric" placeholder="55000" value={form.precioOriginal} onChange={e => setForm(f => ({ ...f, precioOriginal: e.target.value.replace(/[^\d]/g, '') }))} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Precio (CLP)</label>
                <input className={field} type="number" min="0" step="1" inputMode="numeric" placeholder="9900" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value.replace(/[^\d]/g, '') }))} />
              </div>
              <div>
                <label className={lbl}>Stock</label>
                <input className={field} type="number" placeholder="0" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              </div>
            </div>
          )}
          {/* Deluxe: Visible en catálogo */}
          {/* Inventario y Costos */}
          <div className="bg-slate-900/60 p-4 border border-slate-850 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
              <Package size={12} className="text-emerald-400" /> Costos e Inventario
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Precio de Costo (CLP)</label>
                <input className={field} type="number" min="0" step="1" inputMode="numeric" placeholder="5000" value={form.precioCosto} onChange={e => setForm(f => ({ ...f, precioCosto: e.target.value.replace(/[^\d]/g, '') }))} />
              </div>
              <div>
                <label className={lbl}>Stock Mínimo (Alerta)</label>
                <input className={field} type="number" placeholder="2" min="0" value={form.stockMinimo} onChange={e => setForm(f => ({ ...f, stockMinimo: e.target.value }))} />
              </div>
            </div>
            {isDeluxe && (
              <div>
                <label className={lbl}>Stock Disponible</label>
                <input className={field} type="number" placeholder="0" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              </div>
            )}
            {form.precio && form.precioCosto && Number(form.precio) > 0 && (
              <div className="p-2.5 bg-slate-800/80 border border-slate-700/50 rounded-lg flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400 uppercase tracking-wide">Margen de Ganancia Neto</span>
                <span className={`font-bold ${
                  ((Number(form.precio) - Number(form.precioCosto)) / Number(form.precio)) * 100 >= 30 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {(((Number(form.precio) - Number(form.precioCosto)) / Number(form.precio)) * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Deluxe: Visible en catálogo */}
          {isDeluxe && (
            <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-primary">Visible en catálogo</p>
                <p className="text-xs text-slate-500 mt-0.5">Los clientes pueden ver este producto</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  form.activo
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800 border-slate-600 text-slate-400'
                }`}
              >
                {form.activo ? <Eye size={12} /> : <EyeOff size={12} />}
                {form.activo ? 'Visible' : 'Oculto'}
              </button>
            </div>
          )}
        </div>
      </SlideOver>
      {showHelp && (
        <HelpModal title="Ayuda — Productos" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-primary">Productos</strong> gestionas los artículos disponibles para reserva o venta en el local.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Agrega productos con nombre, descripción, precio, stock e imagen.</li>
            <li>Activa o desactiva la tienda con el interruptor — cuando está desactivada los clientes no ven los productos.</li>
            <li>Revisa las <span className="text-primary">reservas pendientes</span> al final de la página y aprueba o rechaza cada solicitud.</li>
            <li>El stock se reduce automáticamente al aprobar una reserva.</li>
          </ul>
        </HelpModal>
      )}

      {storyOpen && (
        <StoryGenerator
          productos={productos}
          shopName={tenant.name || 'Productos'}
          logoUrl={tenant.logo || ''}
          onClose={() => setStoryOpen(false)}
        />
      )}

      {/* Venta Rápida Modal */}
      {ventaRapidaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 shadow-2xl" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-emerald-400 animate-bounce" />
                <h3 className="font-bold text-primary text-base">Venta Rápida de Producto</h3>
              </div>
              <button onClick={() => setVentaRapidaOpen(false)} className="text-slate-400 hover:text-primary transition-colors">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Seleccionar Producto */}
              <div>
                <label className={lbl}>Seleccionar Producto *</label>
                <select 
                  className={field} 
                  value={vrForm.productId} 
                  onChange={e => {
                    setVrForm(f => ({ ...f, productId: e.target.value, cantidad: 1 }));
                  }}
                >
                  <option value="">-- Elige un producto --</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.precio ? `($${Number(p.precio).toLocaleString('es-CL')})` : ''} - Stock: {p.stock ?? '—'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cantidad */}
              {vrForm.productId && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={lbl.replace('mb-1.5', '')}>Cantidad *</label>
                    {(() => {
                      const prod = productos.find(p => p.id === vrForm.productId);
                      if (prod && prod.stock !== undefined && prod.stock !== null && prod.stock !== '') {
                        return <span className={`text-[10px] font-bold ${Number(prod.stock) < vrForm.cantidad ? 'text-red-400' : 'text-slate-500'}`}>Máx en stock: {prod.stock}</span>;
                      }
                      return null;
                    })()}
                  </div>
                  <input 
                    className={field} 
                    type="number" 
                    min="1" 
                    value={vrForm.cantidad} 
                    onChange={e => setVrForm(f => ({ ...f, cantidad: Math.max(1, Number(e.target.value)) }))} 
                  />
                  {(() => {
                    const prod = productos.find(p => p.id === vrForm.productId);
                    if (prod && prod.stock !== undefined && prod.stock !== null && prod.stock !== '' && Number(prod.stock) < vrForm.cantidad) {
                      return (
                        <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> Registrarás más unidades de las disponibles en stock físico.
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Descuento (%) */}
              {vrForm.productId && (
                <div>
                  <label className={lbl}>Descuento (%)</label>
                  <input
                    className={field}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={vrForm.descuento}
                    onChange={e => setVrForm(f => ({ ...f, descuento: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                    placeholder="0"
                  />
                </div>
              )}

              {/* Seleccionar Barbero */}
              <div>
                <label className={lbl}>Barbero Vendedor *</label>
                <select 
                  className={field} 
                  value={vrForm.barberoId} 
                  onChange={e => setVrForm(f => ({ ...f, barberoId: e.target.value }))}
                >
                  <option value="">-- Asignar barbero --</option>
                  {barberos.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Método de Pago */}
              <div>
                <label className={lbl}>Método de Pago *</label>
                <select
                  className={field}
                  value={vrForm.metodoPago}
                  onChange={e => setVrForm(f => ({ ...f, metodoPago: e.target.value }))}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                  <option value="Transferencia">Transferencia</option>
                  {vrForm.metodoPago === 'Tarjeta' && (
                    <option value="Tarjeta">Tarjeta (legacy)</option>
                  )}
                </select>
              </div>

              {/* Resumen e Margen */}
              {(() => {
                const prod = productos.find(p => p.id === vrForm.productId);
                if (!prod) return null;
                const descuento = Math.min(100, Math.max(0, Number(vrForm.descuento) || 0));
                const subtotal = Number(prod.precio || 0) * Number(vrForm.cantidad);
                const total = Math.round(subtotal * (1 - descuento / 100));
                const costoTotal = prod.precioCosto ? Number(prod.precioCosto) * Number(vrForm.cantidad) : 0;
                const margen = total - costoTotal;

                return (
                  <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Precio Unitario:</span>
                      <span className="font-semibold text-primary">${Number(prod.precio || 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Cantidad:</span>
                      <span className="font-semibold text-primary">{vrForm.cantidad}</span>
                    </div>
                    {descuento > 0 && (
                      <>
                        <div className="flex justify-between items-center text-slate-400">
                          <span>Subtotal:</span>
                          <span className="font-semibold text-primary">${subtotal.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-400">
                          <span>Descuento ({descuento}%):</span>
                          <span className="font-semibold">−${(subtotal - total).toLocaleString('es-CL')}</span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-bold text-primary">
                      <span>Total Venta:</span>
                      <span className="text-emerald-400">${total.toLocaleString('es-CL')}</span>
                    </div>
                    {prod.precioCosto && (
                      <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                        <span>Margen Neto Estimado:</span>
                        <span className="text-emerald-500/80">+${margen.toLocaleString('es-CL')} ({(((total - costoTotal) / total) * 100).toFixed(0)}%)</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex gap-3 justify-end">
              <button 
                onClick={() => setVentaRapidaOpen(false)} 
                className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleVentaRapidaSave} 
                disabled={vrSaving || !vrForm.productId || !vrForm.barberoId}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-primary text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
              >
                {vrSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Registrar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Entrega con Método de Pago ────────────────── */}
      {entregaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEntregaModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Confirmar Entrega</h3>
              <button onClick={() => setEntregaModal(null)} className="text-slate-500 hover:text-primary transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
              <p className="text-sm text-primary font-semibold">{entregaModal.productName || 'Producto'}</p>
              <p className="text-xs text-slate-400 mt-0.5">Cliente: {entregaModal.userName || '—'}</p>
              {entregaModal.precio && (
                <p className="text-sm font-bold text-emerald-400 mt-1">${Number(entregaModal.precio).toLocaleString('es-CL')}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Método de Pago *</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-emerald-500 transition-colors"
                value={entregaForm.metodoPago}
                onChange={e => setEntregaForm(f => ({ ...f, metodoPago: e.target.value }))}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Débito">Débito</option>
                <option value="Crédito">Crédito</option>
                <option value="Transferencia">Transferencia</option>
                {entregaForm.metodoPago === 'Tarjeta' && (
                  <option value="Tarjeta">Tarjeta (legacy)</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Barbero Vendedor *</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary focus:outline-none focus:border-emerald-500 transition-colors"
                value={entregaForm.barberoId}
                onChange={e => setEntregaForm(f => ({ ...f, barberoId: e.target.value }))}
              >
                <option value="">— Seleccionar —</option>
                {barberos.map(b => (
                  <option key={b.id} value={b.id}>{b.nombre}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEntregaModal(null)}
                className="flex-1 px-4 py-2.5 text-sm text-slate-400 hover:text-primary rounded-xl hover:bg-slate-800 border border-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleEntregaConfirm}
                disabled={entregaSaving || !entregaForm.barberoId}
                className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#C4A030] disabled:opacity-40 text-black text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {entregaSaving && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                <CheckCircle2 size={14} /> Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
