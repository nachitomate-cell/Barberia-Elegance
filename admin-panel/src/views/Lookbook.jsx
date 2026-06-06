import { useState, useRef, useEffect } from 'react';
import { Images, Trash2, Upload, Plus, GripVertical, Power, AlertTriangle, Crosshair, Heart } from 'lucide-react';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import {
  addDoc, deleteDoc, doc, orderBy,
  serverTimestamp, getDocs, writeBatch, getDoc, setDoc, updateDoc,
} from 'firebase/firestore';
import {
  ref as storageRef, uploadBytesResumable,
  getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { tenantCol, tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';

const MAX_PHOTOS = 8;
const MAX_SIZE   = 10 * 1024 * 1024; // 10 MB antes de comprimir

// Redimensiona y convierte a JPEG para ahorrar ancho de banda en el portal
async function compressImage(file, maxPx = 1200, quality = 0.82) {
  return new Promise(resolve => {
    const img    = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
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
      canvas.toBlob(blob => resolve(blob ?? file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });
}

export default function Lookbook() {
  const { data: fotos, loading } = useCollection('lookbook', [orderBy('order', 'asc')]);
  const [uploading,     setUploading]     = useState(false);
  const [showHelp,      setShowHelp]      = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [dragOver,      setDragOver]      = useState(null);
  const [activo,        setActivo]        = useState(false);
  const [activoLoad,    setActivoLoad]    = useState(true);
  const [confirmOn,     setConfirmOn]     = useState(false);
  const fileRef  = useRef(null);
  const dragFrom = useRef(null);

  const [focalTarget, setFocalTarget] = useState(null);
  const [tempFocal, setTempFocal] = useState({ x: 50, y: 50 });
  const [savingFocal, setSavingFocal] = useState(false);

  const handleOpenFocalModal = (e, foto) => {
    e.stopPropagation();
    setFocalTarget(foto);
    setTempFocal({
      x: foto.focalX ?? 50,
      y: foto.focalY ?? 50
    });
  };

  const handleImageClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    setTempFocal({ x, y });
  };

  const handleSaveFocal = async () => {
    if (!focalTarget) return;
    setSavingFocal(true);
    try {
      await updateDoc(doc(tenantCol('lookbook'), focalTarget.id), {
        focalX: tempFocal.x,
        focalY: tempFocal.y
      });
      setFocalTarget(null);
    } catch (err) {
      console.error('[Save focal]', err);
      alert('Error al guardar el punto focal.');
    } finally {
      setSavingFocal(false);
    }
  };

  useEffect(() => {
    getDoc(tenantDoc('config', 'ui'))
      .then(snap => { if (snap.exists()) setActivo(!!snap.data().lookbookActivo); })
      .catch(() => {})
      .finally(() => setActivoLoad(false));
  }, []);

  const toggleActivo = async newVal => {
    await setDoc(tenantDoc('config', 'ui'), { lookbookActivo: newVal }, { merge: true });
    setActivo(newVal);
    setConfirmOn(false);
  };

  // Ruta en Storage según tenant
  const storagePath = filename => {
    const tid = resolveTenantId();
    return tid === 'elegance'
      ? `lookbook/${filename}`
      : `tenants/${tid}/lookbook/${filename}`;
  };

  /* ── Subida con compresión ─────────────────────────────────────── */
  const handleFiles = async e => {
    let files = Array.from(e.target.files || []).filter(f => f.size <= MAX_SIZE);
    e.target.value = '';
    if (!files.length) return;

    // Una sola lectura para contar Y calcular el orden máximo
    const snap       = await getDocs(tenantCol('lookbook'));
    const disponible = MAX_PHOTOS - snap.size;
    if (disponible <= 0) {
      alert('Límite de 8 fotos alcanzado. Elimina una para subir más.');
      return;
    }
    files = files.slice(0, disponible);

    const orders   = snap.docs.map(d => d.data().order ?? 0);
    let nextOrder  = orders.length ? Math.max(...orders) + 1 : 0;

    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        setProgressLabel(`Comprimiendo ${i + 1} / ${files.length}…`);
        const compressed = await compressImage(file);

        setProgressLabel(`Subiendo ${i + 1} / ${files.length}…`);
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const url = await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(
            storageRef(storage, storagePath(filename)),
            compressed,
            { contentType: 'image/jpeg' },
          );
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

  /* ── Eliminar — borra Firestore Y Storage ──────────────────────── */
  const handleDelete = async foto => {
    if (!confirm('¿Eliminar esta foto del lookbook?')) return;
    try {
      await deleteDoc(doc(tenantCol('lookbook'), foto.id));
      if (foto.filename) {
        // Usa la ruta de Storage (filename), no la URL de descarga
        try { await deleteObject(storageRef(storage, storagePath(foto.filename))); }
        catch (_) {}
      }
    } catch (err) {
      console.error('[Lookbook delete]', err);
    }
  };

  /* ── Drag & drop para reordenar ────────────────────────────────── */
  const onDragStart = (e, idx) => {
    dragFrom.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    // Pequeño delay para que el ghost se vea antes del estado de arrastre
    setTimeout(() => e.target.closest('[data-foto]')?.classList.add('opacity-40'), 0);
  };

  const onDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragFrom.current) setDragOver(idx);
  };

  const onDragLeave = () => setDragOver(null);

  const onDrop = async (e, dropIdx) => {
    e.preventDefault();
    setDragOver(null);
    const fromIdx = dragFrom.current;
    dragFrom.current = null;
    if (fromIdx === null || fromIdx === dropIdx) return;

    // Reordenar el array localmente
    const reordered = [...fotos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(dropIdx, 0, moved);

    // Batch update de todos los campos order en Firestore
    const batch = writeBatch(db);
    reordered.forEach((f, i) => {
      batch.update(doc(tenantCol('lookbook'), f.id), { order: i });
    });
    await batch.commit();
  };

  const onDragEnd = e => {
    dragFrom.current = null;
    setDragOver(null);
    e.target.closest('[data-foto]')?.classList.remove('opacity-40');
  };

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Lookbook</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Fotos de cortes reales · se muestran en el portal de clientes · máx. {MAX_PHOTOS} fotos
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

      {/* Activation banner */}
      {!activoLoad && (
        <div className={`mb-6 flex items-start gap-4 px-5 py-4 rounded-xl border transition-all ${
          activo ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-900'
        }`}>
          <Power size={20} className={`shrink-0 mt-0.5 ${activo ? 'text-emerald-400' : 'text-slate-500'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              Sección Lookbook: <span className={activo ? 'text-emerald-400' : 'text-slate-500'}>{activo ? 'Activa' : 'Inactiva'}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {activo
                ? 'Los clientes pueden ver las fotos publicadas en la pestaña "Lookbook" de su perfil.'
                : 'Al activar, los clientes verán la pestaña "Lookbook" con las fotos del local.'}
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
              <h3 className="font-semibold text-white">Activar sección Lookbook</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Los clientes verán las fotos publicadas en la pestaña <strong className="text-white">Lookbook</strong> de su perfil del club.<br /><br />
              <strong className="text-amber-400">Revisa que las fotos estén listas antes de activar.</strong> Esta galería es pública para todos los clientes registrados.
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
          {fotos.length > 1 && (
            <p className="text-xs text-slate-600 mb-3 flex items-center gap-1.5">
              <GripVertical size={12} /> Arrastra las fotos para cambiar el orden
            </p>
          )}
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">
            {fotos.map((foto, idx) => (
              <div
                key={foto.id}
                data-foto
                draggable
                onDragStart={e => onDragStart(e, idx)}
                onDragOver={e  => onDragOver(e, idx)}
                onDragLeave={onDragLeave}
                onDrop={e      => onDrop(e, idx)}
                onDragEnd={onDragEnd}
                className={`break-inside-avoid mb-3 relative group rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                  dragOver === idx ? 'ring-2 ring-emerald-500 scale-[1.02]' : ''
                }`}
              >
                <img
                  src={foto.url}
                  alt=""
                  loading="lazy"
                  className="w-full object-cover rounded-xl aspect-[3/4]"
                  style={{
                    objectPosition: `${foto.focalX ?? 50}% ${foto.focalY ?? 50}%`
                  }}
                />
                {/* Like count badge */}
                {(foto.likes || 0) > 0 && (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-1.5 py-0.5 pointer-events-none">
                    <Heart size={9} className="text-red-400 fill-red-400" />
                    <span className="text-[10px] font-bold text-white">{foto.likes}</span>
                  </div>
                )}
                {/* Punto Focal Indicador en miniatura (sutil) */}
                {foto.focalY !== undefined && (
                  <div
                    className="absolute w-2 h-2 -mt-1 -ml-1 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] pointer-events-none group-hover:scale-150 transition-all duration-300"
                    style={{
                      left: `${foto.focalX}%`,
                      top: `${foto.focalY}%`
                    }}
                  />
                )}
                {/* Overlay con controles */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-black/40 rounded-lg text-white/50 text-xs select-none">
                    <GripVertical size={12} />
                    <span>{idx + 1}</span>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <button
                      onClick={e => handleOpenFocalModal(e, foto)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold rounded-lg transition-colors"
                      title="Ajustar Enfoque"
                    >
                      <Crosshair size={12} /> Foco
                    </button>
                    <button
                      onClick={() => handleDelete(foto)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 text-right mt-3">
            {fotos.length} / {MAX_PHOTOS} fotos
          </p>
        </>
      )}

      {/* Drop zone secundaria */}
      {!loading && fotos.length > 0 && fotos.length < MAX_PHOTOS && (
        <div
          onClick={() => fileRef.current?.click()}
          className="mt-4 flex items-center justify-center gap-2 h-16 border border-dashed border-slate-700 rounded-xl text-slate-600 text-sm cursor-pointer hover:border-emerald-500/40 hover:text-slate-400 transition-all"
        >
          <Upload size={16} />
          Subir más fotos ({MAX_PHOTOS - fotos.length} disponible{MAX_PHOTOS - fotos.length !== 1 ? 's' : ''})
        </div>
      )}
      {showHelp && (
        <HelpModal title="Ayuda — Lookbook" onClose={() => setShowHelp(false)}>
          <p>El <strong className="text-white">Lookbook</strong> es la galería de fotos que ven los clientes en la app pública.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Sube fotos de cortes reales haciendo clic en <span className="text-white">Subir fotos</span> (máx. {MAX_PHOTOS} imágenes).</li>
            <li>Puedes subir <span className="text-white">múltiples imágenes</span> a la vez seleccionándolas desde el explorador de archivos.</li>
            <li><span className="text-white">Arrastra</span> las fotos para reordenarlas.</li>
            <li>El ícono de basura elimina una foto del lookbook y del almacenamiento.</li>
          </ul>
        </HelpModal>
      )}
      {/* Modal de Punto Focal */}
      {focalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Crosshair className="text-amber-400 shrink-0" size={20} />
              <h3 className="font-semibold text-white text-lg">
                Ajustar Punto Focal
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Haz clic o toca en la imagen para definir el centro de interés. Este punto permanecerá siempre visible en cortes cuadrados o verticales.
            </p>

            <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center select-none" style={{ maxHeight: '350px' }}>
              <img
                src={focalTarget.url}
                alt="Ajustar enfoque"
                className="max-w-full max-h-[350px] object-contain cursor-crosshair"
                onClick={handleImageClick}
              />
              {/* Visor de Enfoque */}
              <div
                className="absolute w-8 h-8 -mt-4 -ml-4 rounded-full border-2 border-amber-400 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.6)] pointer-events-none transition-all duration-150 flex items-center justify-center"
                style={{
                  left: `${tempFocal.x}%`,
                  top: `${tempFocal.y}%`
                }}
              >
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </div>
            </div>

            <div className="flex justify-between items-center mt-5">
              <span className="text-xs text-slate-500 font-mono">
                Coordenadas: X: {tempFocal.x}% · Y: {tempFocal.y}%
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFocalTarget(null)}
                  disabled={savingFocal}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFocal}
                  disabled={savingFocal}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {savingFocal ? 'Guardando...' : 'Guardar Enfoque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
