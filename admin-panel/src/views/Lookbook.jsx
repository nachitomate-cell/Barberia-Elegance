import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Images, Trash2, Plus, GripVertical, AlertTriangle,
  Crosshair, Heart, Sparkles, ImagePlus, Loader2, Check, X,
  Instagram, Infinity as InfinityIcon, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import { Section, SettingsGroup, SettingRow, IosToggle } from '../components/ui/SettingsPrimitives';
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
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
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
    setTempFocal({ x: foto.focalX ?? 50, y: foto.focalY ?? 50 });
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
        focalY: tempFocal.y,
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
    withTimeout(getDoc(tenantDoc('config', 'ui')), 10000, 'lookbook/cfg-ui')
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

    const snap       = await withTimeout(getDocs(tenantCol('lookbook')), 15000, 'lookbook/list');
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
    if (!(await confirmDialog('¿Eliminar esta foto del lookbook?'))) return;
    try {
      await deleteDoc(doc(tenantCol('lookbook'), foto.id));
      if (foto.filename) {
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

    const reordered = [...fotos];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(dropIdx, 0, moved);

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

  /* ── Stats ─────────────────────────────────────────────────────── */
  const totalLikes = useMemo(() => fotos.reduce((s, f) => s + (f.likes || 0), 0), [fotos]);
  const conFoco    = useMemo(() => fotos.filter(f => f.focalX !== undefined).length, [fotos]);
  const slotsLibres = MAX_PHOTOS - fotos.length;

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div data-view="lookbook" className="mx-auto max-w-4xl pb-12 space-y-8">

      {/* ─── Header sticky ─── */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 -mb-2 bg-slate-950/85 backdrop-blur-md border-b border-white/[0.06] sm:border-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 shadow-[0_6px_18px_-8px_rgba(16,185,129,0.5)]">
              <Images size={20} className="text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-semibold text-primary tracking-tight leading-tight">Lookbook</h1>
                <HelpButton onClick={() => setShowHelp(true)} />
              </div>
              <p className="text-[13px] text-slate-500 mt-0.5 leading-snug">
                La galería que ven tus clientes en la app pública — hasta {MAX_PHOTOS} fotos de cortes reales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || fotos.length >= MAX_PHOTOS}
            className="shrink-0 hidden sm:inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold px-4 py-2 transition-all active:scale-[0.98] shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)]"
          >
            {uploading
              ? <><Loader2 size={14} className="animate-spin" /> Subiendo…</>
              : <><Plus size={14} /> Subir fotos</>}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {/* ─── Section: Estado + Stats ─── */}
      <Section
        Icon={Sparkles}
        title="Vista general"
        description="Estado de la sección y resumen de fotos publicadas."
      >
        {!activoLoad && (
          <ActivationRow
            activo={activo}
            onTurnOff={() => toggleActivo(false)}
            onTurnOnAsk={() => setConfirmOn(true)}
          />
        )}

        <StatsGroup totalFotos={fotos.length} totalLikes={totalLikes} conFoco={conFoco} max={MAX_PHOTOS} />

        <InstagramConnectRow />
      </Section>

      {/* ─── Progreso de subida ─── */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] backdrop-blur-sm px-4 sm:px-5 py-3.5"
          >
            <div className="flex items-center justify-between text-[12.5px] font-semibold text-emerald-200/90">
              <span className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-emerald-300" />
                {progressLabel || 'Procesando…'}
              </span>
              <span className="tabular-nums font-bold text-primary">{progress}%</span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/15">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Section: Galería ─── */}
      <Section
        Icon={Images}
        title={<span className="flex items-center gap-2">Galería {fotos.length > 0 && <span className="text-[12px] font-normal text-slate-500 tabular-nums">· {fotos.length}/{MAX_PHOTOS}</span>}</span>}
        description={fotos.length > 1 ? 'Arrastra las fotos para reordenarlas. El primer lugar es el que más se ve.' : 'Estas son las fotos que aparecen en la sección Lookbook del cliente.'}
      >
        {loading ? (
          <GridSkeleton />
        ) : fotos.length === 0 ? (
          <EmptyState onClick={() => fileRef.current?.click()} />
        ) : (
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">
            {fotos.map((foto, idx) => (
              <PhotoCard
                key={foto.id}
                foto={foto}
                idx={idx}
                isDraggingOver={dragOver === idx}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onFocal={handleOpenFocalModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {!loading && fotos.length > 0 && slotsLibres > 0 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-5 text-[13px] font-medium text-slate-500 backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] hover:text-emerald-300"
          >
            <ImagePlus size={15} className="transition-transform group-hover:scale-110" />
            Subir más fotos
            <span className="rounded-full bg-white/[0.05] border border-white/10 px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-slate-400 group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 group-hover:text-emerald-300">
              {slotsLibres} {slotsLibres === 1 ? 'libre' : 'libres'}
            </span>
          </button>
        )}
      </Section>

      {/* ─── Modales ─── */}
      <AnimatePresence>
        {confirmOn && (
          <ConfirmActivationModal
            onCancel={() => setConfirmOn(false)}
            onConfirm={() => toggleActivo(true)}
          />
        )}
        {focalTarget && (
          <FocalModal
            target={focalTarget}
            tempFocal={tempFocal}
            saving={savingFocal}
            onCancel={() => setFocalTarget(null)}
            onSave={handleSaveFocal}
            onImageClick={handleImageClick}
          />
        )}
      </AnimatePresence>

      {showHelp && (
        <HelpModal title="Ayuda — Lookbook" onClose={() => setShowHelp(false)}>
          <p>El <strong className="text-primary">Lookbook</strong> es la galería de fotos que ven los clientes en la app pública.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Sube fotos de cortes reales (máx. {MAX_PHOTOS}).</li>
            <li>Puedes subir múltiples imágenes a la vez.</li>
            <li>Arrastra para reordenar.</li>
            <li>El "Foco" define qué parte de la foto se ve siempre.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ActivationRow — SettingRow + IosToggle. Al encender pide confirmar.
   ════════════════════════════════════════════════════════════════ */
function ActivationRow({ activo, onTurnOff, onTurnOnAsk }) {
  return (
    <SettingsGroup
      label="Publicación"
      footer={activo
        ? 'Los clientes ya pueden ver tu galería en la app.'
        : 'Al activar, los clientes verán la pestaña Lookbook con las fotos publicadas.'
      }
    >
      <SettingRow
        Icon={Sparkles}
        title="Sección Lookbook"
        description={activo
          ? 'En vivo — visible para tus clientes en el cliente público.'
          : 'Pausada — no aparece en el cliente público hasta activarla.'
        }
      >
        <IosToggle
          checked={activo}
          onChange={(v) => v ? onTurnOnAsk() : onTurnOff()}
        />
      </SettingRow>
    </SettingsGroup>
  );
}

/* ════════════════════════════════════════════════════════════════
   StatsGroup — 3 stats compactos alineados, dentro de un grupo iOS
   ════════════════════════════════════════════════════════════════ */
function StatsGroup({ totalFotos, totalLikes, conFoco, max }) {
  return (
    <SettingsGroup label="Resumen">
      <div className="grid grid-cols-3 divide-x divide-white/[0.05]">
        <StatCell Icon={Images}     label="Fotos"     value={`${totalFotos}/${max}`} color="text-emerald-300" />
        <StatCell Icon={Heart}      label="Likes"     value={totalLikes}             color="text-rose-300" />
        <StatCell Icon={Crosshair}  label="Con foco"  value={conFoco}                color="text-amber-300" />
      </div>
    </SettingsGroup>
  );
}

function StatCell({ Icon, label, value, color }) {
  return (
    <div className="px-4 py-4 flex flex-col items-start gap-1">
      <div className={`flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] ${color}`}>
        <Icon size={11} /> <span>{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-semibold tabular-nums text-primary tracking-tight">{value}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   InstagramConnectRow — SettingRow con acento IG (gradient icon).
   Preserva la lógica original (stub — abre alert por ahora).
   ════════════════════════════════════════════════════════════════ */
function InstagramConnectRow() {
  return (
    <SettingsGroup
      label="Fuentes extra"
      footer="Se sincroniza cada vez que publiques en tu IG — sin tocar tus 8 fotos manuales."
    >
      <div className="flex items-center gap-3 px-4 sm:px-5 py-4">
        {/* Icono IG con gradient brand */}
        <div className="relative shrink-0">
          <div
            className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)',
              boxShadow: '0 6px 18px -8px rgba(214, 41, 118, 0.5)',
            }}
          >
            <Instagram size={20} strokeWidth={2.2} />
          </div>
          <span
            className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-lime-400 text-emerald-950 ring-2 ring-slate-950"
            aria-hidden
          >
            <InfinityIcon size={9} strokeWidth={3} />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-medium text-primary leading-snug">Conectar Instagram</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-lime-400/10 border border-lime-400/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-lime-300">
              <Sparkles size={9} /> Ilimitado
            </span>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">
            Sincroniza posts y reels — sin el tope de 8 fotos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Próximamente — conexión OAuth con Instagram.')}
          className="group shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #d62976 0%, #962fbf 100%)',
            boxShadow: '0 4px 14px -6px rgba(214, 41, 118, 0.5)',
          }}
        >
          Conectar
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </SettingsGroup>
  );
}

/* ════════════════════════════════════════════════════════════════
   ConfirmActivationModal — mismo espíritu que el resto de modales
   (paleta translúcida). Preserva flujo cancel/confirm.
   ════════════════════════════════════════════════════════════════ */
function ConfirmActivationModal({ onCancel, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
      >
        <div className="p-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 mb-4">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-[17px] font-semibold text-primary tracking-tight">Activar el Lookbook</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
            Tus clientes verán la pestaña <b className="text-slate-200">Lookbook</b> con las fotos publicadas.
            <span className="text-amber-300"> Revisa que estén listas antes de activar.</span>
          </p>
        </div>
        <div className="flex gap-2 border-t border-white/[0.06] p-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-white/10 px-4 py-2.5 text-[13px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.03]"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-[13px] font-semibold text-white transition-all active:scale-[0.98] shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)]"
          >
            <Check size={14} /> Activar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PhotoCard — tarjeta del grid masonry con drag-drop y overlays.
   Se preserva la lógica de drag (dragFrom/dragOver + isDraggingOver).
   ════════════════════════════════════════════════════════════════ */
function PhotoCard({
  foto, idx, isDraggingOver,
  onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  onFocal, onDelete,
}) {
  return (
    <div
      data-foto
      draggable
      onDragStart={e => onDragStart(e, idx)}
      onDragOver={e  => onDragOver(e, idx)}
      onDragLeave={onDragLeave}
      onDrop={e      => onDrop(e, idx)}
      onDragEnd={onDragEnd}
      className={`group relative mb-3 break-inside-avoid cursor-grab overflow-hidden rounded-2xl border border-white/[0.06] transition-all active:cursor-grabbing ${
        isDraggingOver ? 'ring-2 ring-emerald-400 scale-[1.02]' : ''
      }`}
    >
      <img
        src={foto.url}
        alt=""
        loading="lazy"
        className="w-full rounded-2xl object-cover aspect-[3/4] transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ objectPosition: `${foto.focalX ?? 50}% ${foto.focalY ?? 50}%` }}
      />

      {/* Gradient bottom para legibilidad de controles */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-2xl bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      {/* Badge de índice (siempre visible) */}
      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/55 backdrop-blur-sm px-2 py-1 text-[10.5px] font-semibold text-white">
        <GripVertical size={10} className="text-white/60" /> {idx + 1}
      </span>

      {/* Likes contador */}
      {(foto.likes || 0) > 0 && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/55 backdrop-blur-sm px-2 py-1 text-[10.5px] font-semibold text-white">
          <Heart size={10} className="text-rose-400 fill-rose-400" /> {foto.likes}
        </span>
      )}

      {/* Punto focal indicador (siempre discreto) */}
      {foto.focalX !== undefined && (
        <div
          className="pointer-events-none absolute h-2 w-2 -ml-1 -mt-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] transition-transform duration-300 group-hover:scale-150"
          style={{ left: `${foto.focalX}%`, top: `${foto.focalY}%` }}
        />
      )}

      {/* Controles overlay (bottom) */}
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={e => onFocal(e, foto)}
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2.5 py-1.5 text-[10.5px] font-semibold text-amber-950 backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
          title="Ajustar enfoque"
        >
          <Crosshair size={11} /> Foco
        </button>
        <button
          onClick={() => onDelete(foto)}
          className="inline-flex items-center gap-1 rounded-full bg-red-500/95 px-2.5 py-1.5 text-[10.5px] font-semibold text-white backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
          title="Eliminar"
        >
          <Trash2 size={11} /> Borrar
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EmptyState — cuando no hay fotos aún.
   ════════════════════════════════════════════════════════════════ */
function EmptyState({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:bg-emerald-500/[0.03]"
    >
      <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/[0.03] border border-white/10 transition-all group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30">
        <ImagePlus size={30} className="text-slate-500 transition-colors group-hover:text-emerald-300" />
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white shadow-md transition-transform group-hover:scale-110 group-hover:rotate-90"
        >
          <Plus size={12} strokeWidth={3} />
        </span>
      </div>
      <div className="relative max-w-xs">
        <p className="text-[15px] font-semibold text-primary tracking-tight">Sube tu primera foto</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
          Las fotos de cortes reales <span className="text-slate-300">generan reservas</span> — los clientes deciden por lo que ven, no por lo que leen.
        </p>
        <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
          <Sparkles size={11} /> Toca aquí para empezar
        </p>
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   Skeleton de carga
   ════════════════════════════════════════════════════════════════ */
function GridSkeleton() {
  return (
    <div className="columns-2 sm:columns-3 gap-3 space-y-3">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div
          key={i}
          className="mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-white/[0.04]"
          style={{ aspectRatio: i % 2 === 0 ? '3/4' : '4/5' }}
        >
          <div className="h-full w-full animate-pulse bg-gradient-to-br from-white/[0.03] to-white/[0.01]" />
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FocalModal — picker de punto focal. Preserva onImageClick + save.
   ════════════════════════════════════════════════════════════════ */
function FocalModal({ target, tempFocal, saving, onCancel, onSave, onImageClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/[0.05] text-slate-400 border border-white/10 transition-colors hover:bg-white/[0.08] hover:text-primary"
        >
          <X size={14} />
        </button>

        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
              <Crosshair size={18} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-primary tracking-tight leading-tight">Ajustar punto focal</h3>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Define qué parte de la foto queda siempre visible en el cliente.
              </p>
            </div>
          </div>

          <div className="relative flex select-none items-center justify-center overflow-hidden rounded-2xl bg-black border border-white/[0.06]" style={{ maxHeight: '380px' }}>
            <img
              src={target.url}
              alt="Ajustar enfoque"
              className="max-h-[380px] max-w-full cursor-crosshair object-contain"
              onClick={onImageClick}
            />
            <div
              className="pointer-events-none absolute -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-400/15 shadow-[0_0_20px_rgba(251,191,36,0.7)] transition-all duration-150"
              style={{ left: `${tempFocal.x}%`, top: `${tempFocal.y}%` }}
            >
              <div className="absolute h-10 w-10 animate-ping rounded-full border border-amber-400/50" />
              <div className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,1)]" />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded-full bg-white/[0.04] border border-white/10 px-2.5 py-1 font-mono text-amber-200">X {tempFocal.x}%</span>
              <span className="rounded-full bg-white/[0.04] border border-white/10 px-2.5 py-1 font-mono text-amber-200">Y {tempFocal.y}%</span>
            </div>
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-slate-500">
              Click en la imagen
            </span>
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/[0.06] p-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-full border border-white/10 px-4 py-2.5 text-[13px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.03] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex flex-[1.5] items-center justify-center gap-1.5 rounded-full bg-amber-400 hover:bg-amber-300 px-4 py-2.5 text-[13px] font-semibold text-amber-950 shadow-[0_4px_14px_-4px_rgba(251,191,36,0.5)] transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
              : <><Check size={14} /> Guardar enfoque</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
