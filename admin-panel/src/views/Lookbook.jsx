import { useState, useRef } from 'react';
import { Images, Trash2, Upload, Plus } from 'lucide-react';
import { addDoc, deleteDoc, doc, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { resolveTenantId } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';

const MAX_PHOTOS = 8;
const MAX_SIZE   = 5 * 1024 * 1024;

export default function Lookbook() {
  const { data: fotos, loading } = useCollection('lookbook', [orderBy('order', 'asc')]);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const fileRef = useRef(null);

  const handleFiles = async e => {
    let files = Array.from(e.target.files || []).filter(f => f.size <= MAX_SIZE);
    e.target.value = '';
    if (!files.length) return;

    const snap = await getDocs(tenantCol('lookbook'));
    const disponible = MAX_PHOTOS - snap.size;

    if (disponible <= 0) {
      alert('Límite de 8 fotos alcanzado. Elimina una para subir más.');
      return;
    }
    files = files.slice(0, disponible);

    const maxOrderSnap = await getDocs(tenantCol('lookbook'));
    const orders = maxOrderSnap.docs.map(d => d.data().order ?? 0);
    let nextOrder = orders.length ? Math.max(...orders) + 1 : 0;

    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgressLabel(`Subiendo ${i + 1} de ${files.length}…`);

        const tid      = resolveTenantId();
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path     = tid === 'elegance'
          ? `lookbook/${filename}`
          : `tenants/${tid}/lookbook/${filename}`;

        const url = await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(storageRef(storage, path), file);
          task.on(
            'state_changed',
            s => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            reject,
            async () => resolve(await getDownloadURL(task.snapshot.ref)),
          );
        });

        await addDoc(tenantCol('lookbook'), {
          url,
          filename,
          order:     nextOrder++,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('[Lookbook upload]', err);
      alert('Error al subir la foto. Revisa los permisos de Storage.');
    } finally {
      setUploading(false);
      setProgress(0);
      setProgressLabel('');
    }
  };

  const handleDelete = async foto => {
    if (!confirm('¿Eliminar esta foto del lookbook?')) return;
    try {
      await deleteDoc(doc(tenantCol('lookbook'), foto.id));
      try { await deleteObject(storageRef(storage, foto.url)); } catch (_) {}
    } catch (err) {
      console.error('[Lookbook delete]', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Lookbook</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Fotos de cortes reales · se muestran en el portal de clientes · máx. {MAX_PHOTOS} fotos.
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || fotos.length >= MAX_PHOTOS}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Subir fotos
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {/* Barra de progreso */}
      {uploading && (
        <div className="mb-5 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>{progressLabel}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Grid de fotos */}
      {loading ? (
        <div className="columns-2 sm:columns-3 gap-3 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="break-inside-avoid rounded-xl aspect-[3/4] bg-slate-800 animate-pulse mb-3" />
          ))}
        </div>
      ) : fotos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center h-60 border-2 border-dashed border-slate-700 rounded-2xl text-slate-600 cursor-pointer hover:border-emerald-500/40 hover:text-slate-500 transition-all"
        >
          <Images size={40} className="mb-3" />
          <p className="text-sm font-medium">Sin fotos aún</p>
          <p className="text-xs mt-1">Toca para subir las primeras</p>
        </div>
      ) : (
        <>
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">
            {fotos.map(foto => (
              <div key={foto.id} className="break-inside-avoid mb-3 relative group rounded-xl overflow-hidden">
                <img
                  src={foto.url}
                  alt=""
                  className="w-full object-cover rounded-xl"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                  <button
                    onClick={() => handleDelete(foto)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 text-right mt-3">{fotos.length} / {MAX_PHOTOS} fotos</p>
        </>
      )}

      {/* Drop zone secundaria cuando ya hay fotos */}
      {!loading && fotos.length > 0 && fotos.length < MAX_PHOTOS && (
        <div
          onClick={() => fileRef.current?.click()}
          className="mt-4 flex items-center justify-center gap-2 h-16 border border-dashed border-slate-700 rounded-xl text-slate-600 text-sm cursor-pointer hover:border-emerald-500/40 hover:text-slate-400 transition-all"
        >
          <Upload size={16} /> Subir más fotos ({MAX_PHOTOS - fotos.length} disponible{MAX_PHOTOS - fotos.length !== 1 ? 's' : ''})
        </div>
      )}
    </div>
  );
}
