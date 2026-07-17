import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Camera, Trash2, Upload, Power, AlertTriangle, Search, X, Plus, UserCircle, Crosshair,
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
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
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

  const [focalTarget, setFocalTarget] = useState(null);
  const [tempFocal, setTempFocal] = useState({ x: 50, y: 50 });
  const [savingFocal, setSavingFocal] = useState(false);

  const handleOpenFocalModal = (e, entrada) => {
    e.stopPropagation();
    setFocalTarget(entrada);
    setTempFocal({
      x: entrada.focalX ?? 50,
      y: entrada.focalY ?? 50
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
      await updateDoc(doc(tenantCol('servicioFavorito'), focalTarget.id), {
        focalX: tempFocal.x,
        focalY: tempFocal.y
      });
      setFocalTarget(null);
    } catch (err) {
      console.error('[Save focal SF]', err);
      alert('Error al guardar el punto focal.');
    } finally {
      setSavingFocal(false);
    }
  };

  useEffect(() => {
    withTimeout(getDoc(tenantDoc('config', 'ui')), 10000, 'svcfav/cfg-ui')
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
          {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000, immutable',
          },
        );
        task.on(
          'state_changed',
          s => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref)),
        );
      });

      const existing = await withTimeout(getDocs(query(tenantCol('servicioFavorito'), where('email', '==', email))), 15000, 'svcfav/existing');
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
      setAddErr('Error al subir. Revisa los permisos de Storage.');
    } finally {
      setUploading(false);
      setProgress(0);
      setProgressLabel('');
    }
  };

  const handleDelete = async entrada => {
    if (!(await confirmDialog(`¿Eliminar la foto de ${entrada.email}?`))) return;
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
            <h1 className="text-xl font-bold text-primary">Servicio Favorito</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Foto personalizada por cliente · visible en el dashboard del club
          </p>
        </div>
      </div>

      {/* Feature toggle — tarjeta de estado */}
      {!activoLoad && (
        <div className={`mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
          activo ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/40 border-slate-700/50'
        }`}>
          <div className="flex items-start gap-3 min-w-0">
            <span className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${
              activo ? 'bg-emerald-500/15' : 'bg-slate-800/60'
            }`}>
              <Power size={18} className={activo ? 'text-emerald-400' : 'text-slate-500'} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">
                Sección en dashboard:{' '}
                <span className={activo ? 'text-emerald-400' : 'text-slate-500'}>
                  {activo ? 'Activa' : 'Inactiva'}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {activo
                  ? 'Cada cliente ve su foto personalizada en el panel de fidelización.'
                  : 'Al activar, los clientes con foto asignada la verán en su club.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => activo ? toggleActivo(false) : setConfirmOn(true)}
            className={`w-full md:w-auto text-center px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              activo
                ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20'
                : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20'
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
              <h3 className="font-semibold text-primary">Activar Servicio Favorito</h3>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Los clientes con foto asignada la verán en su panel de fidelización.<br /><br />
              Puedes desactivarlo en cualquier momento sin perder las fotos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmOn(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => toggleActivo(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-primary text-sm font-semibold rounded-lg transition-all"
              >
                Activar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload form — dropzone horizontal + CTA indigo */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 mt-4 mb-6">
        <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <Plus size={15} className="text-indigo-400" />
          Asignar foto a un cliente
        </h2>

        {/* Dropzone: preview inline + label centrado */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-slate-600 hover:border-indigo-500 bg-slate-900/50 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 cursor-pointer w-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addPreview ? (
            <>
              <img src={addPreview} alt="Preview" className="w-24 h-24 rounded-lg object-cover border border-slate-600 mb-3" />
              <span className="text-xs font-semibold text-primary">Foto lista para subir</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Toca para cambiarla</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3">
                <Upload size={20} className="text-slate-500" />
              </div>
              <span className="text-sm font-medium text-slate-300">Elegir o arrastrar foto</span>
              <span className="text-[10px] text-slate-500 mt-1">JPG · PNG · hasta 10 MB</span>
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Correo del cliente */}
        <input
          type="email"
          value={addEmail}
          onChange={e => setAddEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUpload()}
          placeholder="correo@cliente.com"
          className="bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 w-full text-primary placeholder-slate-500 focus:outline-none transition-colors mt-4"
        />
        {addErr && <p className="text-xs text-rose-400 mt-2">{addErr}</p>}

        {/* CTA principal + limpiar */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={handleUpload}
            disabled={uploading || !addEmail.trim() || !addFile}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-primary rounded-xl py-3 font-medium shadow-lg shadow-indigo-500/20 transition-colors"
          >
            {uploading ? `${progressLabel} ${progress}%` : 'Guardar'}
          </button>
          {(addEmail || addFile) && !uploading && (
            <button
              onClick={clearForm}
              className="p-3 rounded-xl text-slate-500 hover:text-primary hover:bg-slate-800 transition-colors shrink-0"
              title="Limpiar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {uploading && (
          <div className="mt-4">
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Search + count — apilados en columna para no aplastar en movil */}
      <div className="flex flex-col gap-2 mt-6 mb-4">
        <span className="text-xs text-slate-400 font-medium px-1">
          {entradas.length} cliente{entradas.length !== 1 ? 's' : ''} con foto asignada
        </span>
        <div className="relative w-full">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por correo…"
            className="w-full pl-9 pr-3 py-3 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm text-primary placeholder-slate-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Lista de fotos */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
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
        <div>
          {filtered.map(entrada => {
            const displayUrl = entrada.adminUrl || entrada.clienteUrl || null;
            return (
              <div
                key={entrada.id}
                className="flex items-center gap-4 bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 hover:bg-slate-800/60 transition-colors mb-3"
              >
                {/* Miniatura destacada */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                  {displayUrl
                    ? <img
                        src={displayUrl}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover"
                        style={{
                          objectPosition: `${entrada.focalX ?? 50}% ${entrada.focalY ?? 50}%`
                        }}
                      />
                    : <UserCircle size={24} className="text-slate-600" />}
                </div>

                {/* Info — flex-1 min-w-0 para truncate robusto */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-primary truncate block">{entrada.email}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {entrada.adminUrl && (
                      <span className="inline-block text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md mt-1">
                        Del local
                      </span>
                    )}
                    {entrada.clienteUrl && (
                      <span className="inline-block text-[10px] uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md mt-1">
                        {entrada.adminUrl ? '+ Propia del cliente' : 'Subida por cliente'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones — discretas con hover activo */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {displayUrl && (
                    <button
                      onClick={e => handleOpenFocalModal(e, entrada)}
                      className="text-slate-500 p-2 rounded-lg hover:bg-slate-700 hover:text-primary transition-colors"
                      title="Ajustar enfoque"
                    >
                      <Crosshair size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(entrada)}
                    className="text-slate-500 p-2 rounded-lg hover:bg-slate-700 hover:text-rose-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showHelp && (
        <HelpModal title="Ayuda — Servicio Favorito" onClose={() => setShowHelp(false)}>
          <p>
            Asignale a cada cliente una <strong className="text-primary">foto personalizada</strong> que
            aparecerá en su panel de fidelización.
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Ingresa el <span className="text-primary">correo del cliente</span> y elige una foto.</li>
            <li>Si ya tiene foto asignada, se <span className="text-primary">reemplaza</span>.</li>
            <li>
              Los clientes también pueden <span className="text-primary">subir su propia foto</span> si
              no tienen ninguna asignada por el local.
            </li>
            <li>Activa la sección para que sea visible en el dashboard de fidelización.</li>
            <li>Desactivarla oculta la sección sin borrar las fotos guardadas.</li>
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
              <h3 className="font-semibold text-primary text-lg">
                Ajustar Punto Focal
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Haz clic o toca en la imagen de estilo favorito del cliente para definir el centro de interés. Este punto se mantendrá visible en el dashboard y las Historias de Instagram.
            </p>

            <div className="relative border border-slate-800 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center select-none" style={{ maxHeight: '350px' }}>
              <img
                src={focalTarget.adminUrl || focalTarget.clienteUrl}
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
                  className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFocal}
                  disabled={savingFocal}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-ink-950 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-40"
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
