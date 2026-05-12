import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Camera, Trash2, Upload, Power, AlertTriangle, Search, X, Plus, UserCircle,
} from 'lucide-react';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import {
  addDoc, deleteDoc, doc, query, where, getDocs, getDoc, setDoc, updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { tenantCol, tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';

const MAX_SIZE = 10 * 1024 * 1024;

async function compressImage(file, maxPx = 1200, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image();
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

export default function ServicioFavorito() {
  const { data: entradas, loading } = useCollection('servicioFavorito');
  const [activo,        setActivo]        = useState(false);
  const [activoLoad,    setActivoLoad]    = useState(true);
  const [confirmOn,     setConfirmOn]     = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [showHelp,      setShowHelp]      = useState(false);
  const [search,        setSearch]        = useState('');
  const [addEmail,      setAddEmail]      = useState('');
  const [addFile,       setAddFile]       = useState(null);
  const [addPreview,    setAddPreview]    = useState(null);
  const [addErr,        setAddErr]        = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    getDoc(tenantDoc('config', 'ui'))
      .then(snap => { if (snap.exists()) setActivo(!!snap.data().servicioFavoritoActivo); })
      .catch(() => {})
      .finally(() => setActivoLoad(false));
  }, []);

  const toggleActivo = async newVal => {
    await setDoc(tenantDoc('config', 'ui'), { servicioFavoritoActivo: newVal }, { merge: true });
    setActivo(newVal);
    setConfirmOn(false);
  };

  const storagePath = (emailKey, filename) => {
    const tid = resolveTenantId();
    return tid === 'elegance'
      ? `servicioFavorito/${emailKey}/${filename}`
      : `tenants/${tid}/servicioFavorito/${emailKey}/${filename}`;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return entradas;
    const q = search.toLowerCase();
    return entradas.filter(e => (e.email || '').toLowerCase().includes(q));
  }, [entradas, search]);

  const handleFileSelect = e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_SIZE) { setAddErr('La imagen supera 10 MB.'); return; }
    setAddErr('');
    if (addPreview) URL.revokeObjectURL(addPreview);
    setAddFile(file);
    setAddPreview(URL.createObjectURL(file));
  };

  const clearForm = () => {
    setAddEmail('');
    setAddFile(null);
    if (addPreview) { URL.revokeObjectURL(addPreview); setAddPreview(null); }
    setAddErr('');
  };

  const handleUpload = async () => {
    const email = addEmail.trim().toLowerCase();
    if (!email || !addFile) { setAddErr('Completá el correo y seleccioná una foto.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setAddErr('Correo inválido.'); return; }

    setUploading(true);
    setProgress(0);
    setAddErr('');
    try {
      setProgressLabel('Comprimiendo…');
      const compressed = await compressImage(addFile);
      setProgressLabel('Subiendo…');

      const emailKey = email.replace(/[^a-z0-9]/g, '_');
      const filename = `${Date.now()}_${addFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const url = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(
          storageRef(storage, storagePath(emailKey, filename)),
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

      const existing = await getDocs(query(tenantCol('servicioFavorito'), where('email', '==', email)));
      if (!existing.empty) {
        const existDoc = existing.docs[0];
        // Delete old admin storage file if present
        const oldFilename = existDoc.data().adminFilename;
        if (oldFilename) {
          try { await deleteObject(storageRef(storage, storagePath(emailKey, oldFilename))); } catch (_) {}
        }
        await updateDoc(doc(tenantCol('servicioFavorito'), existDoc.id), {
          adminUrl: url,
          adminFilename: filename,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(tenantCol('servicioFavorito'), {
          email,
          adminUrl: url,
          adminFilename: filename,
          updatedAt: serverTimestamp(),
        });
      }

      clearForm();
    } catch (err) {
      console.error('[ServicioFavorito upload]', err);
      setAddErr('Error al subir. Revisá los permisos de Storage.');
    } finally {
      setUploading(false);
      setProgress(0);
      setProgressLabel('');
    }
  };

  const handleDelete = async entrada => {
    if (!confirm(`¿Eliminar la foto de ${entrada.email}?`)) return;
    try {
      const emailKey = entrada.email.replace(/[^a-z0-9]/g, '_');
      await deleteDoc(doc(tenantCol('servicioFavorito'), entrada.id));
      if (entrada.adminFilename) {
        try { await deleteObject(storageRef(storage, storagePath(emailKey, entrada.adminFilename))); } catch (_) {}
      }
      if (entrada.clienteFilename) {
        try { await deleteObject(storageRef(storage, storagePath(emailKey, entrada.clienteFilename))); } catch (_) {}
      }
    } catch (err) {
      console.error('[ServicioFavorito delete]', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Servicio Favorito</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Foto personalizada por cliente · visible en el dashboard del club
          </p>
        </div>
      </div>

      {/* Feature toggle */}
      {!activoLoad && (
        <div className={`mb-6 flex items-start gap-4 px-5 py-4 rounded-xl border transition-all ${
          activo ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-900'
        }`}>
          <Power size={20} className={`shrink-0 mt-0.5 ${activo ? 'text-emerald-400' : 'text-slate-500'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              Sección en dashboard:{' '}
              <span className={activo ? 'text-emerald-400' : 'text-slate-500'}>
                {activo ? 'Activa' : 'Inactiva'}
              </span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {activo
                ? 'Cada cliente ve su foto personalizada en el panel de fidelización.'
                : 'Al activar, los clientes con foto asignada la verán en su club.'}
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

      {/* Confirm activation */}
      {confirmOn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-amber-400 shrink-0" />
              <h3 className="font-semibold text-white">Activar Servicio Favorito</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Los clientes con foto asignada la verán en su panel de fidelización.<br /><br />
              Podés desactivarlo en cualquier momento sin perder las fotos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOn(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => toggleActivo(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload form */}
      <div className="mb-6 bg-slate-900 border border-slate-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Plus size={15} className="text-emerald-400" />
          Asignar foto a un cliente
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Photo preview / picker */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`w-24 h-24 shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${
              addPreview ? 'border-emerald-500/60' : 'border-slate-700 hover:border-slate-500'
            }`}
          >
            {addPreview
              ? <img src={addPreview} alt="Preview" className="w-full h-full object-cover" />
              : <Camera size={24} className="text-slate-600" />}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="flex-1 space-y-3">
            <input
              type="email"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUpload()}
              placeholder="correo@cliente.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {addErr && <p className="text-xs text-red-400">{addErr}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 transition-all disabled:opacity-40"
              >
                <Upload size={13} />
                {addFile ? 'Cambiar' : 'Elegir foto'}
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !addEmail.trim() || !addFile}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {uploading ? `${progressLabel} ${progress}%` : 'Guardar'}
              </button>
              {(addEmail || addFile) && !uploading && (
                <button
                  onClick={clearForm}
                  className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {uploading && (
          <div className="mt-4">
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por correo…"
            className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <span className="text-xs text-slate-500 shrink-0">
          {entradas.length} cliente{entradas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
          <Camera size={36} className="mb-3" />
          <p className="text-sm font-medium">
            {search ? 'Sin resultados' : 'Sin fotos asignadas aún'}
          </p>
          {!search && (
            <p className="text-xs mt-1 text-center max-w-xs">
              Asigná una foto a un cliente ingresando su correo y subiendo la imagen
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(entrada => {
            const displayUrl = entrada.adminUrl || entrada.clienteUrl || null;
            return (
              <div
                key={entrada.id}
                className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-all"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-800 flex items-center justify-center">
                  {displayUrl
                    ? <img src={displayUrl} alt="" className="w-full h-full object-cover" />
                    : <UserCircle size={24} className="text-slate-600" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{entrada.email}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {entrada.adminUrl && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                        del local
                      </span>
                    )}
                    {entrada.clienteUrl && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                        {entrada.adminUrl ? '+ propia del cliente' : 'subida por cliente'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(entrada)}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-all shrink-0"
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showHelp && (
        <HelpModal title="Ayuda — Servicio Favorito" onClose={() => setShowHelp(false)}>
          <p>
            Asignale a cada cliente una <strong className="text-white">foto personalizada</strong> que
            aparecerá en su panel de fidelización.
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Ingresá el <span className="text-white">correo del cliente</span> y elegí una foto.</li>
            <li>Si ya tiene foto asignada, se <span className="text-white">reemplaza</span>.</li>
            <li>
              Los clientes también pueden <span className="text-white">subir su propia foto</span> si
              no tienen ninguna asignada por el local.
            </li>
            <li>Activá la sección para que sea visible en el dashboard de fidelización.</li>
            <li>Desactivarla oculta la sección sin borrar las fotos guardadas.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}
