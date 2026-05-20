import { useState, useRef, useEffect } from 'react';
import { Plus, ShoppingBag, Edit2, Trash2, Upload, ImageOff, Power, AlertTriangle, CheckCircle2, XCircle, Clock, Eye, EyeOff, Tag, Package } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, onSnapshot, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, db } from '../lib/firebase';
import { tenantCol, tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { useCollection } from '../hooks/useCollection';
import SlideOver from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

const EMPTY = { nombre: '', descripcion: '', precio: '', precioOriginal: '', marca: '', categoria: '', stock: '', imagen: '', imagenPath: '', activo: true };

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

  if (isDeluxe) {
    return (
      <div className={`group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-black/40 backdrop-blur-sm
        hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(217,160,80,0.15)] hover:-translate-y-0.5
        transition-all duration-300 ${producto.activo === false ? 'opacity-60' : ''}`}>

        {producto.activo === false && (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/80 border border-amber-500/20 rounded-full px-2 py-0.5">
            <EyeOff size={10} className="text-amber-600/70" />
            <span className="text-[10px] text-amber-600/60 font-medium tracking-wide">Oculto</span>
          </div>
        )}

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
    <div className={`bg-slate-900 border rounded-xl overflow-hidden hover:border-slate-600 transition-all group relative ${producto.activo === false ? 'border-slate-800 opacity-60' : 'border-slate-800'}`}>
      {producto.activo === false && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-full px-2 py-0.5">
          <EyeOff size={10} className="text-slate-400" />
          <span className="text-[10px] text-slate-400 font-semibold">Oculto</span>
        </div>
      )}
      <div className="aspect-[3/4] bg-slate-800 flex items-center justify-center overflow-hidden">
        {producto.imagen
          ? <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <ImageOff size={28} className="text-slate-600" />}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2">{producto.nombre}</h3>
        <div className="flex items-baseline gap-2 mt-2">
          {producto.precio ? (
            <span className="text-emerald-400 font-bold text-sm">${Number(producto.precio).toLocaleString('es-CL')}</span>
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
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mt-1 inline-block ${
          (producto.stock || 0) > 0 ? 'text-slate-500 border-slate-700' : 'text-red-400 border-red-500/30 bg-red-500/5'
        }`}>Stock: {producto.stock ?? '—'}</span>
        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

export default function Productos() {
  const tenant = useTenant();
  const isDeluxe = tenant.id === 'deluxeperfumes';

  const { data: productos, loading } = useCollection('productos', [orderBy('createdAt', 'asc')]);

  const [slide,      setSlide]      = useState(false);
  const [showHelp,   setShowHelp]   = useState(false);
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

  const MAX_PRODUCTOS = isDeluxe ? 200 : 10;

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

  const marcarEntregado = async id => {
    try {
      const reserva = reservas.find(r => r.id === id);
      if (!reserva) {
        alert('Error: No se encontró la reserva seleccionada.');
        return;
      }
      const batch = writeBatch(db);
      batch.update(doc(tenantCol('product_reservations'), id), { status: 'delivered', updatedAt: serverTimestamp() });
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
    } catch (err) {
      console.error('Error al entregar reserva:', err);
      alert('Hubo un error al marcar la entrega: ' + err.message);
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
    getDoc(tenantDoc('config', 'ui'))
      .then(snap => { if (snap.exists()) setActivo(!!snap.data().productosActivos); })
      .catch(() => {})
      .finally(() => setActivoLoad(false));
  }, []);

  const toggleActivo = async (newVal) => {
    await setDoc(tenantDoc('config', 'ui'), { productosActivos: newVal }, { merge: true });
    setActivo(newVal);
    setConfirmOn(false);
  };

  const openNew  = () => {
    if (productos.length >= MAX_PRODUCTOS) return;
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
    });
    setPreview(p.imagen || '');
    setSlide(true);
  };

  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const tid      = resolveTenantId();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const prefix   = tid === 'elegance' ? '' : `tenants/${tid}/`;
      const path     = `${prefix}productos/${Date.now()}_${safeName}`;
      const snap     = await uploadBytes(
        storageRef(storage, path),
        file,
        { contentType: file.type || 'image/jpeg' },
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
        precio:         form.precio !== '' ? Number(form.precio) : null,
        precioOriginal: form.precioOriginal !== '' ? Number(form.precioOriginal) : null,
        marca:          form.marca   || null,
        categoria:      form.categoria || null,
        stock:          form.stock !== '' ? Number(form.stock) : null,
        imagen:         form.imagen,
        imagenPath:     form.imagenPath || '',
        activo:         form.activo !== false,
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
    if (!confirm('¿Eliminar este producto?')) return;
    const prod = productos.find(p => p.id === id);
    await deleteDoc(doc(tenantCol('productos'), id));
    if (prod?.imagenPath) {
      try { await deleteObject(storageRef(storage, prod.imagenPath)); } catch (_) {}
    }
  };

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Productos</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Productos disponibles en el local.
            {!loading && (
              <span className={`ml-2 font-semibold ${productos.length >= MAX_PRODUCTOS ? 'text-amber-400' : 'text-slate-600'}`}>
                {productos.length}/{MAX_PRODUCTOS}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={openNew}
          disabled={loading || productos.length >= MAX_PRODUCTOS}
          title={productos.length >= MAX_PRODUCTOS ? 'Límite de 10 productos alcanzado' : ''}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Agregar producto
        </button>
      </div>

      {/* Activation banner */}
      {!activoLoad && (
        <div className={`mb-6 flex items-start gap-4 px-5 py-4 rounded-xl border transition-all ${
          activo ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-900'
        }`}>
          <Power size={20} className={`shrink-0 mt-0.5 ${activo ? 'text-emerald-400' : 'text-slate-500'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
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
              <h3 className="font-semibold text-white">Activar sección Productos</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Los clientes verán directamente los productos publicados en su perfil del club.<br /><br />
              <strong className="text-amber-400">Revisa los precios y el stock antes de activar.</strong> Esta sección es pública para todos los clientes registrados.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmOn(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
              <button onClick={() => toggleActivo(true)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all">
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
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Reservas Pendientes</h2>
          {reservas.length > 0 && (
            <span className="ml-1 bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
              {reservas.length}
            </span>
          )}
        </div>

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
              <div key={r.id} className="flex items-center gap-4 px-5 py-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{r.userName || '—'}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{r.productName}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{fmtDate(r.createdAt)}</p>
                </div>
                {/* Precio */}
                {r.precio ? (
                  <span className="text-sm font-bold text-emerald-400 shrink-0">
                    ${Number(r.precio).toLocaleString('es-CL')}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 italic shrink-0">Consultar en el local</span>
                )}
                {/* Acciones */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => marcarEntregado(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <CheckCircle2 size={12} /> Entregado
                  </button>
                  <button
                    onClick={() => cancelarReserva(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <XCircle size={12} /> Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SlideOver */}
      <SlideOver isOpen={slide} onClose={() => setSlide(false)}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setSlide(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !form.nombre || uploading}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2">
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
                <label className={lbl}>Precio de venta ($)</label>
                <input className={field} type="number" placeholder="45000" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Precio original ($) <span className="text-slate-600 normal-case tracking-normal font-normal">opcional</span></label>
                <input className={field} type="number" placeholder="55000" value={form.precioOriginal} onChange={e => setForm(f => ({ ...f, precioOriginal: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Precio ($)</label>
                <input className={field} type="number" placeholder="9900" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Stock</label>
                <input className={field} type="number" placeholder="0" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              </div>
            </div>
          )}
          {/* Deluxe: Visible en catálogo */}
          {isDeluxe && (
            <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div>
                <p className="text-sm font-semibold text-white">Visible en catálogo</p>
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
          <p>En <strong className="text-white">Productos</strong> gestionas los artículos disponibles para reserva o venta en el local.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Agrega productos con nombre, descripción, precio, stock e imagen.</li>
            <li>Activa o desactiva la tienda con el interruptor — cuando está desactivada los clientes no ven los productos.</li>
            <li>Revisa las <span className="text-white">reservas pendientes</span> al final de la página y aprueba o rechaza cada solicitud.</li>
            <li>El stock se reduce automáticamente al aprobar una reserva.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
