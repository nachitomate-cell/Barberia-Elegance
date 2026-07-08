import { useState, useEffect, useRef } from 'react';
import { getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Megaphone, Plus, X, Loader2, ImagePlus, Check, ExternalLink, AlertCircle, Power,
} from 'lucide-react';
import { storage } from '../lib/firebase';
import { tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { useTenant } from '../contexts/TenantContext';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

const MAX_BRANDS = 10;
const EMPTY_BRAND = { nombre: '', logoUrl: '', url: '' };

export default function Publicidad() {
  const { id: tenantId } = useTenant();
  const [loading,    setLoading]    = useState(true);
  const [activo,     setActivo]     = useState(false);
  const [marcas,     setMarcas]     = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [uploadIdx,  setUploadIdx]  = useState(null);
  const [uploadErr,  setUploadErr]  = useState('');
  const [showHelp,   setShowHelp]   = useState(false);
  const savedTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    withTimeout(getDoc(tenantDoc('config', 'publicidad')), 10000, 'publicidad/load')
      .then(snap => {
        if (!alive) return;
        if (snap.exists()) {
          const d = snap.data();
          setActivo(!!d.activo);
          setMarcas(Array.isArray(d.marcas) ? d.marcas.slice(0, MAX_BRANDS) : []);
        }
        setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tenantId]);

  async function persist(nextActivo, nextMarcas) {
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(tenantDoc('config', 'publicidad'), {
        activo:    nextActivo,
        marcas:    nextMarcas,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2400);
    } finally {
      setSaving(false);
    }
  }

  function toggleActivo() {
    const next = !activo;
    setActivo(next);
    persist(next, marcas);
  }

  function updateField(idx, field, value) {
    const next = marcas.slice();
    next[idx] = { ...next[idx], [field]: value };
    setMarcas(next);
  }

  function commitTextChange() {
    persist(activo, marcas);
  }

  async function uploadLogo(idx, file) {
    if (!file) return;
    setUploadErr('');
    if (!file.type.startsWith('image/')) { setUploadErr('El archivo debe ser una imagen.'); return; }
    if (file.size > 5 * 1024 * 1024)     { setUploadErr('La imagen supera los 5 MB.');     return; }
    setUploadIdx(idx);
    try {
      const tid      = resolveTenantId();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const prefix   = tid === 'elegance' ? '' : `tenants/${tid}/`;
      const path     = `${prefix}marketing/publicidad-${idx}-${Date.now()}_${safeName}`;
      const snap = await uploadBytes(
        storageRef(storage, path),
        file,
        {
          contentType: file.type || 'image/png',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      );
      const url  = await getDownloadURL(snap.ref);
      const next = marcas.slice();
      next[idx]  = { ...(next[idx] || EMPTY_BRAND), logoUrl: url };
      setMarcas(next);
      await persist(activo, next);
    } catch (err) {
      console.error('[Publicidad] upload error:', err);
      setUploadErr(err.code === 'storage/unauthorized'
        ? 'Sin permiso para subir. Verifica que tu sesión esté activa.'
        : `Error al subir: ${err.message}`);
    } finally {
      setUploadIdx(null);
    }
  }

  function addMarca() {
    if (marcas.length >= MAX_BRANDS) return;
    const next = [...marcas, { ...EMPTY_BRAND }];
    setMarcas(next);
    persist(activo, next);
  }

  function removeMarca(idx) {
    const next = marcas.filter((_, i) => i !== idx);
    setMarcas(next);
    persist(activo, next);
  }

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 size={22} className="text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone size={20} className="text-amber-400" />
            <h1 className="text-xl font-bold text-white">Publicidad</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-400">
            Marcas asociadas que aparecen entre la lista de servicios y el Club en la página pública.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 size={14} className="text-slate-500 animate-spin" />}
          {saved  && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check size={12} /> Guardado</span>}
        </div>
      </div>

      {/* Toggle activo */}
      <div className={`rounded-xl border p-4 flex items-center gap-4 transition-colors ${
        activo
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-slate-900 border-slate-800'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          activo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
        }`}>
          <Power size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            {activo ? 'Módulo activo' : 'Módulo desactivado'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {activo
              ? 'Las marcas se están mostrando en la web pública.'
              : 'Las marcas no aparecen en la web aunque estén configuradas.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleActivo}
          role="switch"
          aria-checked={activo}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            activo ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            activo ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Header de la lista */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Marcas asociadas</p>
          <p className="text-xs text-slate-500 mt-0.5">{marcas.length} de {MAX_BRANDS} configuradas</p>
        </div>
        <button
          type="button"
          onClick={addMarca}
          disabled={marcas.length >= MAX_BRANDS}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> Agregar marca
        </button>
      </div>

      {uploadErr && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle size={12} /> {uploadErr}
        </p>
      )}

      {/* Grid de marcas */}
      {marcas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-900 border border-slate-800 border-dashed rounded-xl">
          <ImagePlus size={28} className="opacity-30 mb-2" />
          <p className="text-sm">Aún no has agregado marcas.</p>
          <button
            type="button"
            onClick={addMarca}
            className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-all"
          >
            <Plus size={14} /> Agregar primera marca
          </button>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {marcas.map((m, idx) => (
            <li key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-3">
              {/* Logo + uploader */}
              <label className={`relative w-20 h-20 rounded-xl border border-dashed flex items-center justify-center cursor-pointer shrink-0 overflow-hidden transition-colors ${
                m.logoUrl
                  ? 'border-slate-700 bg-slate-950'
                  : 'border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5'
              }`}>
                {uploadIdx === idx ? (
                  <Loader2 size={16} className="text-amber-400 animate-spin" />
                ) : m.logoUrl ? (
                  <img src={m.logoUrl} alt="" className="w-full h-full object-contain p-1.5" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-500">
                    <ImagePlus size={16} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Logo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => { uploadLogo(idx, e.target.files?.[0]); if (e.target) e.target.value = ''; }}
                  className="hidden"
                />
              </label>

              {/* Datos */}
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  type="text"
                  value={m.nombre || ''}
                  onChange={e => updateField(idx, 'nombre', e.target.value)}
                  onBlur={commitTextChange}
                  placeholder="Nombre marca (opcional)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                />
                <div className="relative">
                  <ExternalLink size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    value={m.url || ''}
                    onChange={e => updateField(idx, 'url', e.target.value)}
                    onBlur={commitTextChange}
                    placeholder="https://… (opcional)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMarca(idx)}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X size={11} /> Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showHelp && (
        <HelpModal title="Cómo usar Publicidad" onClose={() => setShowHelp(false)}>
          <p>Acá puedes mostrar logos de marcas asociadas (proveedores, sponsors, alianzas) en la página pública de Elegance, justo entre la lista de servicios y el Club Elegance.</p>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">Cómo se ve</p>
            <p>Los logos aparecen centrados, en cuadros del mismo tamaño, en una fila horizontal que se adapta al ancho de la pantalla. Si configuras un enlace, el logo abre esa URL en una pestaña nueva.</p>
          </div>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">Tips de diseño</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Sube logos en <strong className="text-white">PNG con fondo transparente</strong> para que se vean bien sobre el fondo oscuro.</li>
              <li>Tamaño recomendado: cuadrado o casi cuadrado (1:1).</li>
              <li>Máximo <strong className="text-white">10 marcas</strong> y <strong className="text-white">5 MB</strong> por imagen.</li>
              <li>Para esconder todo sin perder la configuración, apaga el toggle de arriba.</li>
            </ul>
          </div>
        </HelpModal>
      )}
    </div>
  );
}
