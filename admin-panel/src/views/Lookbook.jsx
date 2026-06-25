import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Images, Trash2, Upload, Plus, GripVertical, Power, AlertTriangle,
  Crosshair, Heart, Sparkles, Eye, ImagePlus, Loader2, Check, X,
  Instagram, Infinity as InfinityIcon, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-5">

      {/* ─────── HERO ─────── */}
      <Hero
        onUpload={() => fileRef.current?.click()}
        uploading={uploading}
        disabled={uploading || fotos.length >= MAX_PHOTOS}
        onHelp={() => setShowHelp(true)}
        totalFotos={fotos.length}
        totalLikes={totalLikes}
        conFoco={conFoco}
        max={MAX_PHOTOS}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {/* ─────── BANNER DE ACTIVACIÓN ─────── */}
      {!activoLoad && (
        <ActivationCard
          activo={activo}
          onTurnOff={() => toggleActivo(false)}
          onTurnOnAsk={() => setConfirmOn(true)}
        />
      )}

      {/* ─────── BANNER INSTAGRAM (imágenes ilimitadas) ─────── */}
      <InstagramConnectCard />

      {/* ─────── PROGRESO DE SUBIDA ─────── */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-200/90">
              <span className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-emerald-300" />
                {progressLabel || 'Procesando…'}
              </span>
              <span className="tabular-nums font-bold text-white">{progress}%</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/15">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 shadow-[0_0_12px_rgba(74,222,128,0.6)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────── GRID DE FOTOS ─────── */}
      {loading ? (
        <GridSkeleton />
      ) : fotos.length === 0 ? (
        <EmptyState onClick={() => fileRef.current?.click()} />
      ) : (
        <>
          {fotos.length > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <GripVertical size={12} className="text-slate-600" />
                Arrastra para reordenar
              </span>
              <span className="tabular-nums font-semibold text-slate-400">
                {fotos.length} <span className="text-slate-600">/ {MAX_PHOTOS}</span>
              </span>
            </div>
          )}
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
        </>
      )}

      {/* ─────── ADD MORE DROP ZONE ─────── */}
      {!loading && fotos.length > 0 && slotsLibres > 0 && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 py-5 text-sm font-semibold text-slate-500 backdrop-blur-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-500/[0.04] hover:text-emerald-300"
        >
          <ImagePlus size={16} className="transition-transform group-hover:scale-110" />
          Subir más fotos
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-400 group-hover:bg-emerald-500/15 group-hover:text-emerald-300">
            {slotsLibres} {slotsLibres === 1 ? 'libre' : 'libres'}
          </span>
        </button>
      )}

      {/* ─────── MODALES ─────── */}
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
          <p>El <strong className="text-white">Lookbook</strong> es la galería de fotos que ven los clientes en la app pública.</p>
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
   HERO con stats inline + CTA premium
   ════════════════════════════════════════════════════════════════ */
function Hero({ onUpload, uploading, disabled, onHelp, totalFotos, totalLikes, conFoco, max }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className="hero-card-emerald relative overflow-hidden rounded-3xl border border-emerald-500/15 p-5 sm:p-6"
      style={{
        background:
          'linear-gradient(135deg, rgba(6,78,59,0.6) 0%, rgba(15,23,42,0.95) 60%), ' +
          'radial-gradient(ellipse at top right, rgba(132,204,22,0.22), transparent 60%)',
      }}
    >
      {/* halo decorativo */}
      <motion.div
        aria-hidden
        className="hero-halo pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(132,204,22,0.3), transparent 70%)', filter: 'blur(30px)' }}
        animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.05, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), ' +
            'linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                <Images size={17} className="text-lime-300" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/80">
                  Galería visual
                </p>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-[28px]">Lookbook</h1>
                  <HelpButton onClick={onHelp} />
                </div>
              </div>
            </div>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-emerald-50/75">
              Fotos de cortes reales que tus clientes ven en la pestaña{' '}
              <b className="text-white">Lookbook</b> de su perfil. Hasta {max} imágenes.
            </p>
          </div>

          <button
            type="button"
            onClick={onUpload}
            disabled={disabled}
            className="group inline-flex shrink-0 items-center gap-2 rounded-2xl bg-lime-400 px-5 py-3 text-sm font-extrabold text-emerald-950 shadow-[0_8px_24px_-8px_rgba(132,204,22,0.6)] transition-all hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> Subiendo…</>
            ) : (
              <><Plus size={16} className="transition-transform group-hover:rotate-90" /> Subir fotos</>
            )}
          </button>
        </div>

        {/* Stats inline */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <StatPill label="Fotos" value={`${totalFotos}/${max}`} icon={Images} accent="text-lime-300" />
          <StatPill label="Likes" value={totalLikes} icon={Heart} accent="text-rose-300" />
          <StatPill label="Con foco" value={conFoco} icon={Crosshair} accent="text-amber-300" />
        </div>
      </div>
    </motion.section>
  );
}

function StatPill({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 backdrop-blur">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${accent}`}>
        <Icon size={11} /> <span>{label}</span>
      </div>
      <p className="mt-1 text-xl font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Banner de activación premium
   ════════════════════════════════════════════════════════════════ */
function ActivationCard({ activo, onTurnOff, onTurnOnAsk }) {
  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-colors ${
        activo
          ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
          : 'border-slate-800 bg-slate-900/50'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${
              activo
                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
                : 'bg-slate-800 text-slate-500 ring-slate-700'
            }`}
          >
            <Power size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">Sección Lookbook</p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  activo ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activo && <span className="relative flex h-1.5 w-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300" /></span>}
                {activo ? 'En vivo' : 'Pausada'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {activo
                ? 'Los clientes ya pueden ver tu galería en la app.'
                : 'Al activar, los clientes verán la pestaña Lookbook con las fotos del local.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={activo ? onTurnOff : onTurnOnAsk}
          className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activo
              ? 'border border-red-500/30 text-red-300 hover:bg-red-500/10'
              : 'bg-emerald-500 text-emerald-950 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-95'
          }`}
        >
          {activo ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Conecta tu Instagram — imágenes ilimitadas (banner upgrade)
   ════════════════════════════════════════════════════════════════ */
function InstagramConnectCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="relative overflow-hidden rounded-2xl border p-4 sm:p-5 backdrop-blur-sm"
      style={{
        background:
          'linear-gradient(135deg, rgba(225,48,108,0.10) 0%, rgba(131,58,180,0.08) 50%, rgba(15,23,42,0.6) 100%)',
        borderColor: 'rgba(225,48,108,0.25)',
      }}
    >
      {/* halo IG (gradient pink → purple) */}
      <motion.div
        aria-hidden
        className="hero-halo-soft pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(225,48,108,0.30) 0%, rgba(131,58,180,0.18) 50%, transparent 75%)',
          filter: 'blur(22px)',
        }}
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        {/* Icono IG con gradient brand */}
        <div className="relative shrink-0">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)',
              boxShadow: '0 8px 22px -6px rgba(214, 41, 118, 0.55)',
            }}
          >
            <Instagram size={22} strokeWidth={2.2} />
          </div>
          {/* mini badge infinity */}
          <span
            className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-lime-400 text-emerald-950 ring-2 ring-slate-900 shadow-md"
            aria-hidden
          >
            <InfinityIcon size={11} strokeWidth={3} />
          </span>
        </div>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-white sm:text-base">
              Conecta tu Instagram
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-lime-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-lime-300 ring-1 ring-lime-400/30">
              <Sparkles size={9} /> Imágenes ilimitadas
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-300/85">
            Sincroniza tus últimos posts y reels — sin límite de 8 fotos.
            Tu Lookbook se actualiza solo cada vez que publicas en IG.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={() => alert('Próximamente — conexión OAuth con Instagram.')}
          className="group inline-flex shrink-0 items-center gap-1.5 self-stretch rounded-xl px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition-all hover:scale-[1.02] active:scale-95 sm:self-center"
          style={{
            background: 'linear-gradient(135deg, #d62976 0%, #962fbf 100%)',
            boxShadow: '0 6px 18px -6px rgba(214, 41, 118, 0.55)',
          }}
        >
          Conectar
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Modal: confirmar activación
   ════════════════════════════════════════════════════════════════ */
function ConfirmActivationModal({ onCancel, onConfirm }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 4 }}
        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/20 bg-slate-900/95 shadow-2xl backdrop-blur"
      >
        <div className="relative p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.25), transparent 70%)', filter: 'blur(20px)' }}
          />
          <div className="relative">
            <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30">
              <AlertTriangle size={22} />
            </span>
            <h3 className="text-lg font-bold text-white">Activar el Lookbook</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Tus clientes verán la pestaña <b className="text-white">Lookbook</b> de su perfil con
              las fotos publicadas. <span className="text-amber-300">Revisa que estén listas antes
              de activar.</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 border-t border-slate-800/70 bg-slate-950/40 p-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800/60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-emerald-950 transition-transform hover:scale-[1.02] active:scale-95"
          >
            <Check size={14} /> Activar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Tarjeta de foto (con overlay y micro-interacciones)
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
      className={`group relative mb-3 break-inside-avoid cursor-grab overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/[0.04] transition-all active:cursor-grabbing ${
        isDraggingOver ? 'ring-2 ring-emerald-400 scale-[1.02] shadow-emerald-500/20' : ''
      }`}
    >
      <img
        src={foto.url}
        alt=""
        loading="lazy"
        className="w-full rounded-2xl object-cover aspect-[3/4] transition-transform duration-500 group-hover:scale-[1.03]"
        style={{ objectPosition: `${foto.focalX ?? 50}% ${foto.focalY ?? 50}%` }}
      />

      {/* Gradient bottom para legibilidad */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-b-2xl bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      {/* Badge índice (top-left siempre visible) */}
      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
        <GripVertical size={10} className="text-white/60" /> {idx + 1}
      </span>

      {/* Likes */}
      {(foto.likes || 0) > 0 && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          <Heart size={10} className="text-rose-400 fill-rose-400" /> {foto.likes}
        </span>
      )}

      {/* Punto focal indicador */}
      {foto.focalX !== undefined && (
        <div
          className="pointer-events-none absolute h-2 w-2 -ml-1 -mt-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] transition-transform duration-300 group-hover:scale-150"
          style={{ left: `${foto.focalX}%`, top: `${foto.focalY}%` }}
        />
      )}

      {/* Overlay con controles (bottom) */}
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={e => onFocal(e, foto)}
          className="inline-flex items-center gap-1 rounded-lg bg-amber-500/95 px-2.5 py-1.5 text-[11px] font-bold text-amber-950 shadow-md backdrop-blur transition-transform hover:scale-105 active:scale-95"
          title="Ajustar enfoque"
        >
          <Crosshair size={11} /> Foco
        </button>
        <button
          onClick={() => onDelete(foto)}
          className="inline-flex items-center gap-1 rounded-lg bg-red-500/95 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-md backdrop-blur transition-transform hover:scale-105 active:scale-95"
          title="Eliminar"
        >
          <Trash2 size={11} /> Borrar
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Empty state premium
   ════════════════════════════════════════════════════════════════ */
function EmptyState({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center backdrop-blur-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-500/[0.03]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), ' +
            'linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-slate-800/60 ring-1 ring-slate-700 transition-all group-hover:bg-emerald-500/10 group-hover:ring-emerald-400/30">
        <ImagePlus size={36} className="text-slate-500 transition-colors group-hover:text-emerald-300" />
        <span
          aria-hidden
          className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-lime-400 text-emerald-950 shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-90"
        >
          <Plus size={14} strokeWidth={3} />
        </span>
      </div>
      <div className="relative max-w-xs">
        <p className="text-base font-bold text-white">Sube tu primera foto</p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Las fotos de cortes reales <span className="text-slate-200">generan reservas</span> —
          los clientes deciden por lo que ven, no por lo que leen.
        </p>
        <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
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
          className="mb-3 break-inside-avoid overflow-hidden rounded-2xl ring-1 ring-white/[0.03]"
          style={{ aspectRatio: i % 2 === 0 ? '3/4' : '4/5' }}
        >
          <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-800 to-slate-900" />
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Modal: Punto focal — glassmorphism premium
   ════════════════════════════════════════════════════════════════ */
function FocalModal({ target, tempFocal, saving, onCancel, onSave, onImageClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-amber-500/20 bg-slate-900/95 shadow-2xl backdrop-blur"
      >
        {/* halo amber */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 right-0 h-40 w-40"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.25), transparent 70%)', filter: 'blur(30px)' }}
        />
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>

        <div className="relative p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30">
              <Crosshair size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Ajustar punto focal</h3>
              <p className="text-[11px] text-slate-400">
                Define qué parte de la foto permanece siempre visible.
              </p>
            </div>
          </div>

          {/* Lienzo */}
          <div className="relative flex select-none items-center justify-center overflow-hidden rounded-2xl bg-slate-950/70 ring-1 ring-slate-800" style={{ maxHeight: '380px' }}>
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

          {/* Coordenadas */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded-md bg-slate-800/70 px-2 py-1 font-mono text-amber-200 ring-1 ring-slate-700">
                X {tempFocal.x}%
              </span>
              <span className="rounded-md bg-slate-800/70 px-2 py-1 font-mono text-amber-200 ring-1 ring-slate-700">
                Y {tempFocal.y}%
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              Click en la imagen
            </span>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-800/70 bg-slate-950/40 p-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800/60 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex flex-[1.5] items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-amber-950 shadow-[0_4px_14px_-4px_rgba(251,191,36,0.6)] transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
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
