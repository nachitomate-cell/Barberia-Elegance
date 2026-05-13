import { useState, useRef, useEffect } from 'react';
import { Plus, ShoppingBag, Edit2, Trash2, Upload, ImageOff, Power, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, onSnapshot, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, db } from '../lib/firebase';
import { tenantCol, tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import SlideOver from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

const EMPTY = { nombre: '', descripcion: '', precio: '', stock: '', imagen: '', imagenPath: '' };

function ProductCard({ producto, onEdit, onDelete }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group">
      {/* Imagen */}
      <div className="h-40 bg-slate-800 flex items-center justify-center overflow-hidden">
        {producto.imagen
          ? <img src={producto.imagen} alt={producto.nombre} className="w-full h-full object-cover" />
          : <ImageOff size={28} className="text-slate-600" />}
      </div>
      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-sm">{producto.nombre}</h3>
        {producto.descripcion && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{producto.descripcion}</p>}
        <div className="flex items-center justify-between mt-3">
          {producto.precio ? (
            <span className="text-emerald-400 font-bold text-sm">${Number(producto.precio).toLocaleString('es-CL')}</span>
          ) : (
            <span className="text-slate-500 text-xs italic">Consultar en el local</span>
          )}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
            (producto.stock || 0) > 0 ? 'text-slate-400 border-slate-700' : 'text-red-400 border-red-500/30 bg-red-500/5'
          }`}>
            Stock: {producto.stock ?? '—'}
          </span>
        </div>
        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(producto)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-semibold transition-colors">
            <Edit2 size={12} /> Editar
          </button>
          <button onClick={() => onDelete(producto.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-colors">
            <Trash2 size={12} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Productos() {
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

  /* Reservas pendientes en tiempo real */
  useEffect(() => {
    const q = query(tenantCol('product_reservations'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReservas(docs);
      setReservasLoading(false);
    }, () => setReservasLoading(false));
    return unsub;
  }, []);

  const marcarEntregado = async id => {
    const reserva = reservas.find(r => r.id === id);
    const batch = writeBatch(db);
    batch.update(doc(tenantCol('product_reservations'), id), { status: 'delivered', updatedAt: serverTimestamp() });
    if (reserva?.productId) {
      const prod = productos.find(p => p.id === reserva.productId);
      if (prod && prod.stock != null && Number(prod.stock) > 0) {
        batch.update(doc(tenantCol('productos'), reserva.productId), { stock: Number(prod.stock) - 1 });
      }
    }
    await batch.commit();
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

  const MAX_PRODUCTOS = 10;

  const openNew  = () => {
    if (productos.length >= MAX_PRODUCTOS) return;
    setEditing(null); setForm(EMPTY); setPreview(''); setSlide(true);
  };
  const openEdit = p => {
    setEditing(p.id);
    setForm({ nombre: p.nombre || '', descripcion: p.descripcion || '', precio: p.precio || '', stock: p.stock ?? '', imagen: p.imagen || '', imagenPath: p.imagenPath || '' });
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
        nombre:      form.nombre,
        descripcion: form.descripcion,
        precio:      Number(form.precio) || 0,
        stock:       form.stock !== '' ? Number(form.stock) : null,
        imagen:      form.imagen,
        imagenPath:  form.imagenPath || '',
        updatedAt:   serverTimestamp(),
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productos.map(p => <ProductCard key={p.id} producto={p} onEdit={openEdit} onDelete={handleDelete} />)}
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
            <label className={lbl}>Nombre</label>
            <input className={field} placeholder="Pomada para el cabello" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          {/* Descripción */}
          <div>
            <label className={lbl}>Descripción</label>
            <textarea className={`${field} resize-none`} rows={2} placeholder="Descripción breve del producto..." value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
          </div>
          {/* Precio + Stock */}
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
