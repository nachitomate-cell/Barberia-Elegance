import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Tag, Sparkles, Package } from 'lucide-react';
import {
  addDoc, updateDoc, deleteDoc, deleteField, doc, writeBatch,
  serverTimestamp, orderBy, getDocs, query, limit,
} from 'firebase/firestore';
import {
  ref as storageRef, uploadBytesResumable, getDownloadURL,
} from 'firebase/storage';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db, storage } from '../lib/firebase';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import { confirmDialog } from '../lib/confirmDialog';
import { useCollection } from '../hooks/useCollection';
import { useConfig }     from '../hooks/useConfig';
import { useSucursal }   from '../contexts/SucursalContext';
import SlideOver from '../components/ui/SlideOver';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import AIWatermark from '../components/ui/AIWatermark';

const ICONS = [
  'ph-scissors','ph-user-focus','ph-mask-happy','ph-magic-wand',
  'ph-sparkle','ph-star','ph-crown','ph-fire',
  'ph-drop','ph-wave','ph-lightning','ph-paint-brush',
  'ph-gift','ph-eye','ph-smiley','ph-flower',
  'ph-leaf','ph-diamond','ph-trophy','ph-confetti',
  'ph-clock','ph-sun','ph-moon','ph-wind',
];

const DIAS = [
  { key: 1, label: 'Lun' }, { key: 2, label: 'Mar' }, { key: 3, label: 'Mié' },
  { key: 4, label: 'Jue' }, { key: 5, label: 'Vie' }, { key: 6, label: 'Sáb' },
  { key: 0, label: 'Dom' },
];
const EMPTY_PPD = Object.fromEntries(DIAS.map(d => [d.key, '']));
const EMPTY = {
  nombre: '', categoria: 'Otro', precio: '', duracion: '',
  icono: 'ph-scissors', descripcion: '', varPrecios: false,
  ppd: { ...EMPTY_PPD }, imagen: null,
  // Precios por sucursal (multi-sede): { <sucursalId>: <precio> }.
  // Vacío por sede = usa el precio base. Solo se muestra si multiSucursal.
  varPreciosSede: false,
  pps: {},
  recargoSobrecupoDefault: '',
  // Servicio interno: solo el staff puede agendarlo desde el panel.
  // La reserva online pública (index.html) lo oculta. Útil para walk-ins,
  // cortesías, retoques o bloqueos con nombre que no queremos que el cliente
  // reserve por su cuenta.
  soloStaff: false,
  // Motor de cuponeras/packs de sesiones.
  //   isPack:              true si el servicio agrupa N visitas prepagas
  //   sesionesTotales:     cantidad total de visitas del pack (ej. 4)
  //   diasValidez:         días desde la activación hasta que el pack expira (ej. 30)
  //   serviciosIncluidos:  IDs de los servicios que cubre este pack. Cuando el
  //                        cliente reserva uno de esos servicios y tiene pack
  //                        activo, la reserva pública auto-marca el consumo y
  //                        cobra $0. Sin esto, el cliente tendría que elegir
  //                        manualmente el pack cada vez.
  isPack: false,
  sesionesTotales: '',
  diasValidez: '',
  serviciosIncluidos: [],
  // Cantidad por servicio dentro del pack: { servicioId: n }. Con este mapa
  // se pueden armar packs "2 cortes + 2 barbas al mes" en vez de "4 usos de
  // cualquiera". sesionesTotales se auto-calcula como la suma. Backward-compat:
  // si el doc trae serviciosIncluidos sin serviciosCantidades (packs viejos),
  // el UI arranca con cantidad 0 en cada uno y el usuario define la nueva
  // distribución al editar. La CF pack-automatico.js sigue leyendo
  // serviciosIncluidos como fuente de verdad de "qué cubre el pack".
  serviciosCantidades: {},
  // Recomendaciones al reservar: IDs de servicios que la web pública ofrece
  // como complemento cuando el cliente elige este servicio (ej: corte →
  // perfilado de cejas). Solo aplican si el módulo global está encendido
  // (configuracion/main.recomendacionesActivas, switch en el panel lateral).
  recomendar: false,
  recomendados: [],
};

// ── Helpers ───────────────────────────────────────────────────────────

async function compressImage(file, maxPx = 800, quality = 0.82) {
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
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => resolve(blob ?? file), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file); };
    img.src = blobUrl;
  });
}

async function uploadServiceImage(tenantId, serviceId, blob) {
  const path = tenantId === 'elegance'
    ? `servicios/${serviceId}/imagen.jpg`
    : `tenants/${tenantId}/servicios/${serviceId}/imagen.jpg`;
  const sRef = storageRef(storage, path);
  // Cache 1 día: el path es fijo (servicios/{id}/imagen.jpg) — si el user
  // actualiza el servicio el URL puede seguir siendo el mismo, asi que no
  // podemos usar immutable como en barberos/productos.
  const task = uploadBytesResumable(sRef, blob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' });
  return new Promise((resolve, reject) => {
    task.on('state_changed', null, reject, async () => {
      resolve(await getDownloadURL(task.snapshot.ref));
    });
  });
}

// ── Icon Picker ───────────────────────────────────────────────────────

function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 transition-colors">
        <i className={`ph ${value} text-base text-emerald-400`} />
        <span>Elegir ícono</span>
      </button>
      {open && (
        <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl p-3 grid grid-cols-8 gap-1.5">
          {ICONS.map(ic => (
            <button key={ic} type="button" title={ic.replace('ph-', '')}
              onClick={() => { onChange(ic); setOpen(false); }}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                value === ic ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-slate-400'
              }`}>
              <i className={`ph ${ic} text-base ${value === ic ? 'text-emerald-400' : 'text-slate-400'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function Servicios() {
  const { data: servicios, loading } = useCollection('servicios', [orderBy('orden')]);
  const { config, updateConfig }     = useConfig();
  const { multiSucursal, sucursales } = useSucursal();
  const categorias = config.categoriasServicio ?? ['Otro'];
  // Módulo Recomendaciones: flag global en configuracion/main. La reserva
  // pública (index.html) solo muestra el modal de sugerencias si está true.
  const recsOn = !!config.recomendacionesActivas;
  const serviciosConRecs = useMemo(
    () => servicios.filter(s => Array.isArray(s.recomendados) && s.recomendados.length > 0).length,
    [servicios],
  );

  const [citasUsage, setCitasUsage] = useState({});
  useEffect(() => {
    withTimeout(getDocs(query(tenantCol('citas'), orderBy('creadoEn', 'desc'), limit(300))), 20000, 'servicios/citas-usage')
      .then(snap => {
        const cnt = {};
        snap.forEach(d => { const n = d.data().servicioNombre; if (n) cnt[n] = (cnt[n] || 0) + 1; });
        setCitasUsage(cnt);
      })
      .catch(() => {});
  }, []);

  const topServicio = useMemo(() => {
    const sorted = Object.entries(citasUsage).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }, [citasUsage]);

  const [slide,     setSlide]     = useState(false);
  const [showHelp,  setShowHelp]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [newCat,    setNewCat]    = useState('');
  const [activeId,  setActiveId]  = useState(null);

  // Image upload state
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const imgRef  = useRef(null);

  // Sensores dnd-kit — mouse por distancia (8px), touch por long-press (250ms).
  // `delayOnTouchOnly` de SortableJS = TouchSensor con activationConstraint.delay.
  // Sin esto, arrastrar en móvil bloquea el scroll vertical.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const resetImageState = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, categoria: categorias[0] || 'Otro', ppd: { ...EMPTY_PPD } });
    resetImageState();
    setSlide(true);
  };
  // "Nuevo pack" abre el mismo SlideOver pero con isPack:true de arranque.
  // El JSX del form detecta el modo pack (form.isPack) y esconde
  // el toggle redundante + toggles irrelevantes (precios por día/sede,
  // recomendaciones) para que la UX quede enfocada en configurar la cuponera.
  const openNewPack = () => {
    setEditing(null);
    setForm({ ...EMPTY, categoria: categorias[0] || 'Otro', ppd: { ...EMPTY_PPD }, isPack: true });
    resetImageState();
    setSlide(true);
  };

  const openEdit = s => {
    const ppd = { ...EMPTY_PPD };
    if (s.preciosPorDia) {
      Object.entries(s.preciosPorDia).forEach(([k, v]) => { ppd[Number(k)] = v != null ? String(v) : ''; });
    }
    // Precios por sucursal: convertir números a strings para los inputs
    const pps = {};
    if (s.preciosSucursal && typeof s.preciosSucursal === 'object') {
      Object.entries(s.preciosSucursal).forEach(([sid, v]) => { pps[sid] = v != null ? String(v) : ''; });
    }
    setEditing(s.id);
    setForm({
      nombre: s.nombre, categoria: s.categoria || 'Otro',
      precio: s.precio, duracion: s.duracion,
      icono: s.icono || 'ph-scissors', descripcion: s.descripcion || '',
      varPrecios: !!s.preciosPorDia, ppd,
      varPreciosSede: !!(s.preciosSucursal && Object.keys(s.preciosSucursal).length),
      pps,
      imagen: s.imagen || null,
      recargoSobrecupoDefault: s.recargoSobrecupoDefault != null ? String(s.recargoSobrecupoDefault) : '',
      // Pack — se guardan como strings en el form para tratarlo como los otros numéricos.
      isPack:             !!s.isPack,
      sesionesTotales:    s.sesionesTotales != null ? String(s.sesionesTotales) : '',
      diasValidez:        s.diasValidez     != null ? String(s.diasValidez)     : '',
      serviciosIncluidos: Array.isArray(s.serviciosIncluidos) ? [...s.serviciosIncluidos] : [],
      // Cantidades por servicio: convertir números a strings para los inputs.
      // Si el pack viejo no tenía este mapa, arranca vacío y el editor lo pide.
      serviciosCantidades: (s.serviciosCantidades && typeof s.serviciosCantidades === 'object')
        ? Object.fromEntries(Object.entries(s.serviciosCantidades).map(([k, v]) => [k, v != null ? String(v) : '']))
        : {},
      recomendar:         Array.isArray(s.recomendados) && s.recomendados.length > 0,
      recomendados:       Array.isArray(s.recomendados) ? [...s.recomendados] : [],
      soloStaff:          !!s.soloStaff,
    });
    resetImageState();
    setSlide(true);
  };

  const handleImageSelect = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setForm(f => ({ ...f, imagen: null }));
  };

  const handleSave = async () => {
    if (!form.nombre || !form.precio || !form.duracion) return;
    setSaving(true);
    setImgUploading(false);
    try {
      const tid        = resolveTenantId();
      const basePrecio = Math.round(Number(form.precio)) || 0;   // CLP enteros, sin decimales
      const preciosPorDia = {};
      if (form.varPrecios) {
        DIAS.forEach(({ key }) => {
          const v = form.ppd[key];
          if (v !== '' && v != null) preciosPorDia[String(key)] = Math.round(Number(v));
        });
      }
      // Precios por sucursal: solo persistimos las sedes con valor definido
      // (>=0); sedes en blanco usan el precio base. Cuando el toggle se apaga,
      // preciosSucursal se borra con deleteField.
      const preciosSucursal = {};
      if (form.varPreciosSede && form.pps) {
        Object.entries(form.pps).forEach(([sid, v]) => {
          if (sid && v !== '' && v != null) preciosSucursal[sid] = Math.round(Number(v));
        });
      }
      const descripcion = form.descripcion.trim();
      // Recargo por sobrecupo / horario especial: opcional. Se aplica solo si
      // el barbero activa el toggle en la agenda; el default aquí es 0.
      const rawRecargo = String(form.recargoSobrecupoDefault ?? '').trim();
      const recargoSobrecupoDefault = rawRecargo === ''
        ? 0
        : Math.max(0, Math.round(Number(rawRecargo)) || 0);
      // Config del pack (solo si isPack está activo). Validamos enteros ≥ 1
      // para no permitir "0 sesiones" o valores raros que rompen el consumo.
      const isPack = !!form.isPack;
      // Cantidades por servicio: solo enteros > 0. Los servicios con cantidad
      // 0 o vacía se descartan (equivale a "no incluido"). Sirve para packs
      // tipo "2 cortes + 2 barbas al mes" en vez de "4 usos de cualquiera".
      const serviciosCantidades = {};
      if (isPack && form.serviciosCantidades) {
        Object.entries(form.serviciosCantidades).forEach(([sid, v]) => {
          const n = Math.max(0, Math.round(Number(v) || 0));
          if (sid && n > 0) serviciosCantidades[sid] = n;
        });
      }
      const sumaCantidades = Object.values(serviciosCantidades).reduce((a, b) => a + b, 0);
      // Si el usuario definió cantidades, sesionesTotales = suma. Si no
      // (backward-compat), tomamos el valor del input manual.
      const sesionesTotales = isPack
        ? Math.max(1, sumaCantidades || Math.round(Number(form.sesionesTotales) || 0))
        : 0;
      const diasValidez = isPack
        ? Math.max(1, Math.round(Number(form.diasValidez) || 0))
        : 0;
      // Recomendaciones: solo IDs válidos, sin duplicados y sin el propio
      // servicio (un servicio no puede recomendarse a sí mismo).
      const recomendados = form.recomendar
        ? Array.from(new Set(
            (form.recomendados || []).filter(id =>
              typeof id === 'string' && id.length > 0 && id !== editing)
          ))
        : [];

      const base = {
        nombre: form.nombre, categoria: form.categoria,
        precio: basePrecio,
        // Duración: los servicios normales la piden como input. Los packs no
        // (cada sesión hereda la duración del servicio consumido), así que
        // guardamos 30 min como placeholder para que el schema siga siendo
        // uniforme y las vistas legacy que leen `duracion` no fallen.
        duracion: Number(form.duracion) || (isPack ? 30 : 30),
        icono: form.icono || 'ph-scissors', updatedAt: serverTimestamp(),
        recargoSobrecupoDefault,
        // Pack / cuponera. isPack=false explícito para que el filtro
        // "servicios normales" siga funcionando sin tocar los existentes.
        isPack,
        soloStaff: !!form.soloStaff,
      };
      if (isPack) {
        base.sesionesTotales = sesionesTotales;
        base.diasValidez     = diasValidez;
        // Si el usuario definió cantidades por servicio, `serviciosIncluidos`
        // se deriva del mapa. Si no (modo viejo), respetamos lo que ya venía
        // marcado con los checkboxes.
        const idsDeCantidades = Object.keys(serviciosCantidades);
        base.serviciosIncluidos = idsDeCantidades.length
          ? idsDeCantidades
          : Array.from(new Set(
              (form.serviciosIncluidos || []).filter(id => typeof id === 'string' && id.length > 0)
            ));
        // Mapa detallado {servicioId: cantidad}. Vacío si el usuario no lo
        // definió (backward-compat con packs viejos).
        base.serviciosCantidades = serviciosCantidades;
      }

      let imagenUrl = form.imagen ?? null;

      if (editing) {
        // Upload image first if a new one was selected
        if (imageFile) {
          setImgUploading(true);
          const compressed = await compressImage(imageFile);
          imagenUrl = await uploadServiceImage(tid, editing, compressed);
          setImgUploading(false);
        }
        await updateDoc(doc(tenantCol('servicios'), editing), {
          ...base,
          imagen:       imagenUrl !== null ? imagenUrl : deleteField(),
          descripcion:  descripcion || deleteField(),
          preciosPorDia: form.varPrecios ? preciosPorDia : deleteField(),
          preciosSucursal: (form.varPreciosSede && Object.keys(preciosSucursal).length)
            ? preciosSucursal
            : deleteField(),
          // Al desactivar el pack, borramos los campos residuales para que el
          // servicio se comporte como normal en el flujo público y en Agenda.
          sesionesTotales:    isPack ? sesionesTotales    : deleteField(),
          diasValidez:        isPack ? diasValidez        : deleteField(),
          serviciosIncluidos: isPack ? (base.serviciosIncluidos || []) : deleteField(),
          serviciosCantidades: isPack ? (base.serviciosCantidades || {}) : deleteField(),
          recomendados:       recomendados.length ? recomendados : deleteField(),
        });
      } else {
        const nextOrden = servicios.length ? Math.max(...servicios.map(s => s.orden ?? 0)) + 1 : 0;
        const newDoc = { ...base, orden: nextOrden, createdAt: serverTimestamp() };
        if (descripcion) newDoc.descripcion = descripcion;
        if (form.varPrecios) newDoc.preciosPorDia = preciosPorDia;
        if (form.varPreciosSede && Object.keys(preciosSucursal).length) {
          newDoc.preciosSucursal = preciosSucursal;
        }
        if (recomendados.length) newDoc.recomendados = recomendados;
        // Create doc first to get ID, then upload image
        const docRef = await addDoc(tenantCol('servicios'), newDoc);
        if (imageFile) {
          setImgUploading(true);
          const compressed = await compressImage(imageFile);
          imagenUrl = await uploadServiceImage(tid, docRef.id, compressed);
          await updateDoc(docRef, { imagen: imagenUrl });
          setImgUploading(false);
        }
      }

      resetImageState();
      setSlide(false);
    } finally {
      setSaving(false);
      setImgUploading(false);
    }
  };

  const handleDelete = async id => {
    if (!(await confirmDialog('¿Eliminar este servicio?'))) return;
    await deleteDoc(doc(tenantCol('servicios'), id));
  };

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
    // Feedback háptico al levantar la tarjeta (solo dispositivos con soporte).
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = servicios.findIndex(s => s.id === active.id);
    const newIdx = servicios.findIndex(s => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const newOrder = arrayMove(servicios, oldIdx, newIdx);
    const batch = writeBatch(db);
    newOrder.forEach((s, i) => batch.update(doc(tenantCol('servicios'), s.id), { orden: i }));
    await batch.commit();
  };

  const addCategoria = async () => {
    const nombre = newCat.trim(); if (!nombre) return;
    if (categorias.map(c => c.toLowerCase()).includes(nombre.toLowerCase())) return;
    await updateConfig({ categoriasServicio: [...categorias, nombre] });
    setNewCat('');
  };

  const delCategoria = async nombre => {
    if (categorias.length <= 1) return;
    const fallback = categorias.filter(c => c !== nombre)[0] ?? 'Otro';
    const afectados = servicios.filter(s => s.categoria === nombre);
    if (afectados.length > 0) {
      const batch = writeBatch(db);
      afectados.forEach(s => batch.update(doc(tenantCol('servicios'), s.id), { categoria: fallback }));
      await batch.commit();
    }
    await updateConfig({ categoriasServicio: categorias.filter(c => c !== nombre) });
  };

  // Estilos base unificados (SaaS premium dark). Todo el form los reutiliza.
  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors';
  const lbl   = 'block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5';
  const help  = 'text-xs text-slate-500 mt-1';
  const sectionHead = 'text-[11px] font-bold uppercase tracking-widest text-violet-200/80 mb-2';

  const previewSrc = imagePreview || form.imagen;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* ── Lista de servicios ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-primary">Servicios</h1>
              <HelpButton onClick={() => setShowHelp(true)} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Arrastra para reordenar. El orden se guarda en Firestore.</p>
          </div>
          {/* Dos CTAs: pack a la izquierda (violeta, decisión secundaria),
              servicio a la derecha (verde, acción primaria del día). */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={openNewPack} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-primary text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <Package size={16} /> Nuevo pack
            </button>
            <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-primary text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <Plus size={16} /> Nuevo servicio
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : servicios.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-600">
            <Tag size={32} className="mb-3" />
            <p className="text-sm">No hay servicios creados.</p>
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragCancel={() => setActiveId(null)}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={servicios.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {servicios.map(s => (
                    <SortableServicioCard
                      key={s.id}
                      s={s}
                      topServicio={topServicio}
                      openEdit={openEdit}
                      handleDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeId ? (
                  <ServicioOverlayCard
                    s={servicios.find(x => x.id === activeId)}
                    topServicio={topServicio}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
            {topServicio && (
              <div className="flex items-center gap-2 mt-3 px-1">
                <img src="/logo1.png" alt="SynapTech" className="h-3 w-auto opacity-30" />
                <p className="text-[9px] text-slate-700">Motor analítico de SynapTech AI · Conclusiones basadas en los datos cargados</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sidebar: categorías ── */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <Tag size={14} className="text-slate-400" />
            Categorías
          </h2>

          <div className="space-y-1.5 mb-4">
            {categorias.map(c => (
              <div key={c} className="bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 flex justify-between items-center">
                <span className="text-sm text-slate-200">{c}</span>
                <button
                  onClick={() => delCategoria(c)}
                  className="text-slate-500 hover:text-red-400 transition-colors p-0.5 rounded"
                  aria-label={`Eliminar categoría ${c}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm px-3 py-2 text-primary placeholder-slate-500 focus:outline-none transition-colors"
              placeholder="Nueva categoría..." value={newCat} onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategoria()}
            />
            <button
              onClick={addCategoria}
              disabled={!newCat.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-primary rounded-lg w-9 h-9 flex items-center justify-center transition-colors shrink-0"
              aria-label="Añadir categoría"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Módulo: Recomendaciones al reservar ── */}
        <div className={`border rounded-2xl p-5 mt-4 transition-colors ${
          recsOn ? 'bg-sky-500/5 border-sky-500/30' : 'bg-slate-800/30 border-slate-700/50'
        }`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Sparkles size={14} className={recsOn ? 'text-sky-400' : 'text-slate-400'} />
              Recomendaciones
            </h2>
            <button
              type="button"
              role="switch"
              aria-checked={recsOn}
              aria-label="Activar recomendaciones al reservar"
              onClick={() => updateConfig({ recomendacionesActivas: !recsOn })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${recsOn ? 'bg-sky-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${recsOn ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Al reservar online, sugiere servicios complementarios según lo elegido
            (ej: corte → perfilado de cejas). Configura las sugerencias dentro de cada servicio.
          </p>
          {recsOn && (
            <p className="text-[11px] mt-3 font-medium text-sky-400">
              {serviciosConRecs === 0
                ? 'Ningún servicio tiene recomendaciones aún — edita un servicio para agregarlas.'
                : `${serviciosConRecs} servicio${serviciosConRecs === 1 ? '' : 's'} con recomendaciones configuradas.`}
            </p>
          )}
        </div>
      </div>

      {/* FABs móviles apilados — pack arriba (violeta), servicio abajo (verde) */}
      <div className="fixed bottom-6 right-6 md:hidden flex flex-col gap-3 z-50">
        <button
          onClick={openNewPack}
          className="bg-violet-600 hover:bg-violet-500 text-primary rounded-full p-3.5 shadow-lg shadow-violet-900/50 transition-colors"
          aria-label="Nuevo pack"
        >
          <Package size={22} strokeWidth={2.5} />
        </button>
        <button
          onClick={openNew}
          className="bg-emerald-600 hover:bg-emerald-500 text-primary rounded-full p-4 shadow-lg shadow-emerald-900/50 transition-colors"
          aria-label="Nuevo servicio"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── SlideOver creación/edición ──
          `esNuevoPack` es el modo pack sin edición previa (llamado por el
          botón "Nuevo pack"). Cambia título/CTA y esconde toggles que no
          aplican (precios por día/sede, recomendaciones), dejando el flujo
          enfocado en armar la cuponera. Al editar un pack existente, todos
          los campos vuelven a estar visibles para que se pueda ajustar. */}
      {(() => { /* no-op — bloque para documentación */ })()}
      <SlideOver
        isOpen={slide}
        onClose={() => { resetImageState(); setSlide(false); }}
        title={
          form.isPack
            ? (editing ? 'Editar pack' : 'Nuevo pack')
            : (editing ? 'Editar servicio' : 'Nuevo servicio')
        }
        footer={
          // Footer premium: sticky con desenfoque para no perder el CTA al scrollear.
          // (El SlideOver ya lo renderiza fuera del body scrollable, así que la
          // "adherencia" se logra con bg semitransparente + backdrop-blur.)
          <div className="flex gap-3 justify-end -mx-6 -mt-4 px-6 pt-4 pb-1 bg-slate-900/80 backdrop-blur-md">
            <button
              onClick={() => { resetImageState(); setSlide(false); }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-primary rounded-lg hover:bg-slate-800/60 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !form.nombre ||
                !form.precio ||
                // Servicio: requiere duración. Pack: requiere ≥1 servicio con cantidad > 0.
                (form.isPack
                  ? Object.values(form.serviciosCantidades || {}).reduce(
                      (a, v) => a + (Math.max(0, Math.round(Number(v) || 0))), 0,
                    ) === 0
                  : !form.duracion)
              }
              className={`px-6 py-2 disabled:opacity-40 disabled:cursor-not-allowed text-primary text-sm font-medium rounded-lg shadow-lg transition-all flex items-center gap-2 ${
                form.isPack
                  ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
              }`}
            >
              {(saving || imgUploading) && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {imgUploading ? 'Subiendo imagen…' : (editing ? 'Guardar' : (form.isPack ? 'Crear pack' : 'Crear servicio'))}
            </button>
          </div>
        }
      >
        <div className="space-y-5">

          {/* En modo pack, un encabezado hero al inicio para ubicar al
              usuario: qué está haciendo, qué debe entender. */}
          {form.isPack && (
            <div className="rounded-xl p-4 border border-violet-500/40 bg-gradient-to-br from-violet-500/[0.14] to-violet-500/[0.04] flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/25 border border-violet-500/40 flex items-center justify-center shrink-0">
                <Package size={18} className="text-violet-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary">
                  {editing ? 'Editando pack' : 'Nuevo pack'}
                </p>
                <p className="text-[11.5px] text-violet-100/80 mt-0.5 leading-relaxed">
                  El cliente paga <b>una vez</b> y consume <b>N sesiones prepagas</b> dentro
                  de la vigencia. Las citas de consumo se cobran <b>$0</b>.
                </p>
              </div>
            </div>
          )}

          {/* ── Nombre ── */}
          <div>
            <label className={lbl}>{form.isPack ? 'Nombre del pack' : 'Nombre del servicio'}</label>
            <input className={field} placeholder={form.isPack ? 'Ej. Pack Corte + Barba × 4' : 'Corte clásico'} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>

          {/* ── Precio + Duración ──
              En modo pack, la duración por sesión pierde sentido: cada visita
              se agenda con la duración del servicio consumido. Se oculta y se
              usa una duración placeholder (30) al guardar. */}
          <div className={form.isPack ? '' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className={lbl}>{form.isPack ? 'Precio del pack (CLP)' : 'Precio (CLP)'}</label>
              <input className={field} type="number" min="0" step="1" inputMode="numeric" placeholder={form.isPack ? '40000' : '12000'} value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value.replace(/[^\d]/g, '') }))} />
              {form.isPack && <p className={help}>Lo que paga el cliente una sola vez por el pack completo.</p>}
            </div>
            {!form.isPack && (
              <div>
                <label className={lbl}>Duración (min)</label>
                <input className={field} type="number" placeholder="45" value={form.duracion} onChange={e => setForm(f => ({ ...f, duracion: e.target.value }))} />
              </div>
            )}
          </div>

          {/* ── Recargo sobrecupo (NO aplica a packs — el pack ya está pagado) ── */}
          {!form.isPack && (
          <div>
            <label className={lbl}>
              Recargo por Sobrecupo <span className="text-slate-600 normal-case tracking-normal font-normal ml-1">(opcional)</span>
            </label>
            <input
              className={field}
              type="number" min="0" step="1" inputMode="numeric"
              placeholder="5000"
              value={form.recargoSobrecupoDefault}
              onChange={e => setForm(f => ({ ...f, recargoSobrecupoDefault: e.target.value.replace(/[^\d]/g, '') }))}
            />
            <p className={help}>
              Monto adicional cuando la cita es sobrecupo o fuera de turno. El barbero puede ajustarlo por cita.
            </p>
          </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TOGGLE: Servicio interno (solo staff)
              Se oculta en la reserva online del cliente pero sigue
              disponible al agendar desde el panel / agenda del barbero.
              No aplica a packs — se agendan siempre por el cliente.
              ══════════════════════════════════════════════════════════ */}
          {!form.isPack && (
          <div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, soloStaff: !f.soloStaff }))}
              className={`flex items-center justify-between gap-4 w-full p-4 border rounded-xl transition-colors ${
                form.soloStaff
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <span aria-hidden="true">🔒</span> Servicio interno (solo staff)
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Oculto en la reserva online. Solo ustedes pueden agendarlo desde el panel.</p>
              </div>
              <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.soloStaff ? 'bg-amber-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.soloStaff ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
          </div>
          )}

          {/* ── Categoría + Ícono ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Categoría</label>
              <select className={field} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Ícono</label>
              <IconPicker value={form.icono} onChange={ic => setForm(f => ({ ...f, icono: ic }))} />
            </div>
          </div>

          {/* ── Imagen del servicio (dropzone estilo SaaS) ── */}
          <div>
            <label className={lbl}>
              Imagen <span className="text-slate-600 normal-case tracking-normal font-normal">(opcional · portal VIP)</span>
            </label>

            {previewSrc && (
              <div className="relative mb-2 rounded-xl overflow-hidden bg-slate-800 group" style={{ aspectRatio: '16/9' }}>
                <img src={previewSrc} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-red-500 rounded-lg flex items-center justify-center transition-colors ring-1 ring-white/10"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => imgRef.current?.click()}
              className="w-full py-6 border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-primary transition-all group"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mb-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span className="text-sm font-medium">{previewSrc ? 'Cambiar imagen' : 'Arrastra o toca para subir'}</span>
              <span className="text-[11px] text-slate-500 mt-0.5">JPG / PNG · se comprime a 16:9</span>
            </button>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          </div>

          {/* ── Descripción ── */}
          <div>
            <label className={lbl}>
              Descripción <span className="text-slate-600 normal-case tracking-normal font-normal">(opcional)</span>
            </label>
            <textarea
              className={`${field} resize-none`}
              rows={3}
              placeholder="Breve descripción visible para el cliente al elegir servicio…"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            />
            <p className={help}>Máximo 2 líneas se mostrarán en la app de reserva.</p>
          </div>

          {/* ══════════════════════════════════════════════════════════
              TOGGLE: Precios variables por día
              Fila clickeable con switch iOS. El sub-panel condicional se
              "pega" visualmente al toggle (rounded-b-none + -mt-px).
              En modo "Nuevo pack" esta sección se esconde: la cuponera tiene
              un precio único (el prepago) que no varía por día.
              ══════════════════════════════════════════════════════════ */}
          {!form.isPack && (
          <div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, varPrecios: !f.varPrecios }))}
              className={`flex items-center justify-between gap-4 w-full p-4 border transition-colors ${
                form.varPrecios
                  ? 'bg-slate-800/50 border-indigo-500/40 rounded-t-xl border-b-transparent'
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 rounded-xl'
              }`}
            >
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-primary">Precios variables por día</p>
                <p className="text-xs text-slate-500 mt-0.5">Ajusta el precio según el día de la semana.</p>
              </div>
              <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.varPrecios ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.varPrecios ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
            {form.varPrecios && (
              <div className="bg-slate-900/50 border-x border-b border-indigo-500/40 rounded-b-xl p-4">
                <p className="text-xs text-slate-500 mb-3">Deja en blanco para usar el precio base. El precio dependerá del día que elija el cliente.</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {DIAS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${key === 0 || key === 6 ? 'text-amber-400' : 'text-slate-400'}`}>{label}</span>
                      <input
                        type="number"
                        min="0" step="1" inputMode="numeric"
                        placeholder={form.precio || '–'}
                        value={form.ppd[key]}
                        onChange={e => setForm(f => ({ ...f, ppd: { ...f.ppd, [key]: e.target.value.replace(/[^\d]/g, '') } }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-1 py-1.5 text-[11px] text-center text-primary placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TOGGLE: Precios por sucursal (solo tenants multi-sede)
              El valor por sede se guarda en preciosSucursal:{sid:precio};
              lo lee index.html vía _getPrecioEfectivo() al elegir sede.
              Sede vacía = usa el precio base.
              En modo "Nuevo pack" también se esconde: la cuponera tiene un
              precio único en el tenant; para variarlo por sede, se edita
              después de creada.
              ══════════════════════════════════════════════════════════ */}
          {!form.isPack && multiSucursal && sucursales.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, varPreciosSede: !f.varPreciosSede }))}
                className={`flex items-center justify-between gap-4 w-full p-4 border transition-colors ${
                  form.varPreciosSede
                    ? 'bg-slate-800/50 border-orange-500/40 rounded-t-xl border-b-transparent'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 rounded-xl'
                }`}
              >
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <span aria-hidden="true">📍</span> Precios por sucursal
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Define un precio distinto en cada sede.</p>
                </div>
                <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.varPreciosSede ? 'bg-orange-500' : 'bg-slate-600'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.varPreciosSede ? 'left-[22px]' : 'left-0.5'}`} />
                </span>
              </button>
              {form.varPreciosSede && (
                <div className="bg-slate-900/50 border-x border-b border-orange-500/40 rounded-b-xl p-4">
                  <p className="text-xs text-slate-500 mb-3">Deja en blanco para que la sede use el precio base. La reserva pública mostrará el precio de la sede que elija el cliente.</p>
                  <div className="space-y-2">
                    {sucursales.map(sc => (
                      <div key={sc.id} className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            aria-hidden="true"
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: sc.color || '#94a3b8' }}
                          />
                          <span className="text-sm text-primary font-medium truncate">{sc.nombreCorto || sc.nombre}</span>
                        </div>
                        <div className="relative w-32 shrink-0">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                          <input
                            type="number" min="0" step="1" inputMode="numeric"
                            placeholder={form.precio || '–'}
                            value={form.pps[sc.id] || ''}
                            onChange={e => setForm(f => ({ ...f, pps: { ...f.pps, [sc.id]: e.target.value.replace(/[^\d]/g, '') } }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-[13px] text-right text-primary placeholder-slate-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bloque de configuración del pack: se muestra SOLO cuando el
              modal está en modo pack (form.isPack). El toggle "Este servicio
              es un Pack / Combo" del formulario normal se eliminó — ahora los
              packs son una entidad aparte que se crea con el botón "Nuevo pack"
              del header. Editar un pack existente sigue mostrando esta sección
              porque form.isPack viene true del doc. */}
          {form.isPack && (() => {
            // Suma de cantidades por servicio → total de sesiones del pack.
            // Se recalcula en cada render mientras el usuario edita los inputs.
            const cantidades = form.serviciosCantidades || {};
            const totalSesiones = Object.values(cantidades)
              .reduce((a, v) => a + (Math.max(0, Math.round(Number(v) || 0))), 0);
            const setCant = (sid, raw) => {
              const val = String(raw).replace(/[^\d]/g, '').slice(0, 3);
              setForm(f => {
                const next = { ...(f.serviciosCantidades || {}), [sid]: val };
                if (val === '' || Number(val) === 0) delete next[sid];
                // Mantener `serviciosIncluidos` sincronizado con las claves
                // que tienen cantidad > 0 (fuente de verdad de "qué cubre").
                const incluidos = Object.keys(next);
                return { ...f, serviciosCantidades: next, serviciosIncluidos: incluidos };
              });
            };
            const stepCant = (sid, delta) => {
              const actual = Math.max(0, Math.round(Number(cantidades[sid]) || 0));
              const nuevo  = Math.max(0, actual + delta);
              setCant(sid, String(nuevo));
            };
            return (
            <div className="space-y-4">
              {/* Sub-sección: qué servicios y cuántas sesiones de cada uno.
                  Cada fila = un servicio + sus sesiones. Ej: "2 cortes + 2 barbas".
                  El total de sesiones es la suma automática de estas cantidades. */}
              <div>
                <p className={sectionHead}>1. Cuántas sesiones de cada servicio</p>
                <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                  Define exactamente cuántas veces se puede usar cada servicio.
                  Ejemplo: <span className="text-slate-300 font-medium">2 cortes y 2 barbas al mes</span>.
                </p>
                <div className="bg-slate-950/40 border border-slate-700 rounded-lg max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                  {servicios.filter(s => s.id !== editing && !s.isPack).length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center italic px-4">
                      Crea primero los servicios normales que quieres incluir en el pack.
                    </p>
                  ) : (
                    servicios
                      .filter(s => s.id !== editing && !s.isPack)
                      .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
                      .map(s => {
                        const cantRaw = cantidades[s.id];
                        const cant    = Math.max(0, Math.round(Number(cantRaw) || 0));
                        const activo  = cant > 0;
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${
                              activo ? 'bg-violet-500/10' : 'hover:bg-slate-800/50'
                            }`}
                          >
                            <i className={`ph ${s.icono || 'ph-scissors'} text-base ${activo ? 'text-violet-300' : 'text-slate-500'}`} />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm truncate block ${activo ? 'text-primary font-medium' : 'text-slate-300'}`}>
                                {s.nombre}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ${Math.round(Number(s.precio || 0)).toLocaleString('es-CL')} c/u
                              </span>
                            </div>
                            {/* Stepper -/+ con input al medio: touch friendly */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => stepCant(s.id, -1)}
                                disabled={cant === 0}
                                aria-label={`Restar sesión de ${s.nombre}`}
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 text-sm font-bold transition-colors"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0" step="1" inputMode="numeric"
                                placeholder="0"
                                value={cantRaw ?? ''}
                                onChange={e => setCant(s.id, e.target.value)}
                                className={`w-12 text-center rounded-md py-1 text-sm font-bold border transition-colors ${
                                  activo
                                    ? 'bg-violet-500/15 border-violet-500/40 text-violet-200'
                                    : 'bg-slate-900 border-slate-700 text-slate-400'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => stepCant(s.id, 1)}
                                aria-label={`Sumar sesión de ${s.nombre}`}
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
                {/* Total de sesiones (auto-computado). Fila destacada con la
                    suma de cantidades — reemplaza al viejo input manual. */}
                {totalSesiones > 0 && (
                  <div className="mt-2 flex items-center justify-between px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/25">
                    <span className="text-xs font-semibold text-violet-200">Total del pack</span>
                    <span className="text-sm font-black text-violet-100">
                      {totalSesiones} sesion{totalSesiones === 1 ? '' : 'es'}
                    </span>
                  </div>
                )}
              </div>

              {/* Sub-sección: vigencia. Un solo campo (los días desde la
                  primera cita hasta que el pack expira). Sesiones se auto-
                  calcula arriba, ya no lo pedimos por separado. */}
              <div>
                <p className={sectionHead}>2. Por cuánto tiempo se puede usar</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Vigencia (días)</label>
                    <input
                      type="number" min="1" step="1" inputMode="numeric"
                      placeholder="30"
                      value={form.diasValidez}
                      onChange={e => setForm(f => ({ ...f, diasValidez: e.target.value.replace(/[^\d]/g, '') }))}
                      className={field}
                    />
                    <p className={help}>Días desde la primera cita hasta que expira.</p>
                  </div>
                </div>
              </div>

              {/* Preview del pack — resume lo elegido en una tarjeta simple
                  que refleja cómo lo va a ver el cliente. Se actualiza en vivo.
                  Desglose por servicio "2 Corte · 2 Barba" abajo del monto. */}
              <div className="rounded-xl p-4 border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.08] to-violet-500/[0.02]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300/70 mb-2">Vista previa</p>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Package size={18} className="text-violet-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary truncate">
                      {form.nombre || 'Nombre del pack'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      <span className="text-violet-300 font-bold">
                        ${form.precio ? Number(form.precio).toLocaleString('es-CL') : '?'}
                      </span>
                      {' · '}
                      <span>{totalSesiones || '?'} sesion{totalSesiones === 1 ? '' : 'es'}</span>
                      {' · '}
                      <span>{form.diasValidez || '?'} días</span>
                    </p>
                    {totalSesiones > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {servicios
                          .filter(s => Number(cantidades[s.id]) > 0)
                          .map(s => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-violet-500/15 border border-violet-500/30 text-violet-200 rounded-full px-2 py-0.5"
                            >
                              <b>{Math.round(Number(cantidades[s.id]) || 0)}</b> {s.nombre}
                            </span>
                          ))}
                      </div>
                    )}
                    {form.precio && totalSesiones > 0 && (
                      <p className="text-[10px] text-emerald-400/80 font-semibold mt-2">
                        ${Math.round(Number(form.precio) / totalSesiones).toLocaleString('es-CL')} por sesión
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ══════════════════════════════════════════════════════════
              TOGGLE: Recomendaciones al reservar
              Mismo patrón que precios variables / pack. Al elegir este
              servicio en la reserva online, se ofrecen los marcados aquí.
              Requiere el módulo global encendido (switch del panel lateral).
              En modo "Nuevo pack" no aplica: el pack ES la venta, no tiene
              sentido recomendar OTRAS cosas encima.
              ══════════════════════════════════════════════════════════ */}
          {!form.isPack && (
          <div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, recomendar: !f.recomendar }))}
              className={`flex items-center justify-between gap-4 w-full p-4 border transition-colors ${
                form.recomendar
                  ? 'bg-slate-800/50 border-sky-500/40 rounded-t-xl border-b-transparent'
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 rounded-xl'
              }`}
            >
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                  <span aria-hidden="true">✨</span> Recomendar servicios al reservar
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Sugiere complementos cuando el cliente elige este servicio.</p>
              </div>
              <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.recomendar ? 'bg-sky-500' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.recomendar ? 'left-[22px]' : 'left-0.5'}`} />
              </span>
            </button>
            {form.recomendar && (
              <div className="bg-slate-900/50 border-x border-b border-sky-500/40 rounded-b-xl p-4 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Al elegir <span className="text-primary font-semibold">{form.nombre || 'este servicio'}</span> en la reserva online, se le ofrecerán estos complementos (ej: corte → perfilado de cejas). El precio y la duración se suman a la cita.
                </p>

                <div>
                  <label className={lbl}>¿Qué servicios recomendar?</label>
                  <div className="mt-1 bg-slate-950/40 border border-slate-700 rounded-lg max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                    {servicios.filter(s => s.id !== editing && !s.isPack).length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center italic px-4">
                        Crea primero otros servicios para poder recomendarlos.
                      </p>
                    ) : (
                      servicios
                        .filter(s => s.id !== editing && !s.isPack)
                        .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
                        .map(s => {
                          const checked = (form.recomendados || []).includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                                checked ? 'bg-sky-500/10' : 'hover:bg-slate-800/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={e => {
                                  const next = new Set(form.recomendados || []);
                                  if (e.target.checked) next.add(s.id);
                                  else next.delete(s.id);
                                  setForm(f => ({ ...f, recomendados: [...next] }));
                                }}
                                className="w-4 h-4 bg-slate-900 border-slate-600 rounded accent-sky-500 cursor-pointer shrink-0"
                              />
                              <i className={`ph ${s.icono || 'ph-scissors'} text-base ${checked ? 'text-sky-300' : 'text-slate-500'}`} />
                              <span className={`text-sm truncate flex-1 ${checked ? 'text-primary font-medium' : 'text-slate-300'}`}>
                                {s.nombre}
                              </span>
                              <span className="text-[10px] text-slate-500 shrink-0">
                                ${Math.round(Number(s.precio || 0)).toLocaleString('es-CL')}
                              </span>
                            </label>
                          );
                        })
                    )}
                  </div>
                  <p className={help}>
                    Las sugerencias solo aparecen si el módulo <span className="text-sky-400">Recomendaciones</span> está encendido (panel derecho). Asegúrate de que todo tu equipo pueda realizar los servicios recomendados.
                  </p>
                </div>
              </div>
            )}
          </div>
          )}

        </div>
      </SlideOver>

      {showHelp && (
        <HelpModal title="Ayuda — Servicios" onClose={() => setShowHelp(false)}>
          <p>En <strong className="text-primary">Servicios</strong> defines los cortes y tratamientos que ofrece el local.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Crea servicios con nombre, categoría, <span className="text-primary">precio</span> y <span className="text-primary">duración</span> en minutos.</li>
            <li><span className="text-primary">Mantén presionado el ícono de puntos</span> y arrastra para reordenar (en móvil requiere long-press de ~¼ seg).</li>
            <li>Agrega <span className="text-primary">categorías personalizadas</span> para agrupar los servicios (ej: Barba, Color, Premium).</li>
            <li>Sube una <span className="text-primary">imagen</span> a cada servicio para que aparezca en el portal VIP del cliente.</li>
            <li>Con el módulo <span className="text-primary">Recomendaciones</span> encendido (panel derecho), puedes marcar en cada servicio qué complementos sugerir al cliente cuando reserva (ej: corte → perfilado de cejas). El precio y la duración del complemento se suman a la cita.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}

/* ── Drag handle (6 puntos) ─────────────────────────────────────── */
function GripIcon() {
  return (
    <svg viewBox="0 0 12 18" fill="currentColor" className="w-5 h-5">
      <circle cx="3" cy="3" r="1.5"/><circle cx="9" cy="3" r="1.5"/>
      <circle cx="3" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/>
      <circle cx="3" cy="15" r="1.5"/><circle cx="9" cy="15" r="1.5"/>
    </svg>
  );
}

/* ── Contenido común de la card (icono + info + badges) ─────────── */
function ServicioCardBody({ s, topServicio }) {
  return (
    <>
      {s.imagen ? (
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shrink-0 border border-slate-700">
          <img src={s.imagen} alt={s.nombre} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-emerald-400">
          <i className={`ph ${s.icono || 'ph-scissors'} text-lg md:text-xl`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-sm md:text-base font-bold text-primary truncate w-full block">{s.nombre}</span>
        <div className="flex items-center text-xs md:text-sm text-slate-400 mt-0.5">
          <span>${Math.round(Number(s.precio || 0)).toLocaleString('es-CL')}</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span>{s.duracion} min</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className="bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded-full text-[9px] md:text-xs px-2 py-0.5 font-medium">
            {s.categoria || 'Otro'}
          </span>
          {topServicio === s.nombre && (
            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[9px] md:text-xs px-2 py-0.5 font-bold">
              ✦ Más solicitado
            </span>
          )}
          {s.preciosPorDia && Object.keys(s.preciosPorDia).length > 0 && (
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full text-[9px] md:text-xs px-2 py-0.5 font-bold">
              precio variable
            </span>
          )}
          {s.preciosSucursal && Object.keys(s.preciosSucursal).length > 0 && (
            <span className="bg-orange-400/10 text-orange-400 border border-orange-400/20 rounded-full text-[9px] md:text-xs px-2 py-0.5 font-bold">
              📍 precio por sede
            </span>
          )}
          {Array.isArray(s.recomendados) && s.recomendados.length > 0 && (
            <span className="bg-sky-400/10 text-sky-400 border border-sky-400/20 rounded-full text-[9px] md:text-xs px-2 py-0.5 font-bold">
              ✨ recomienda {s.recomendados.length}
            </span>
          )}
          {s.soloStaff && (
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full text-[9px] md:text-xs px-2 py-0.5 font-bold">
              🔒 solo staff
            </span>
          )}
        </div>
        {s.descripcion && (
          <p className="hidden md:block text-slate-500 text-sm mt-1 line-clamp-1">{s.descripcion}</p>
        )}
      </div>
    </>
  );
}

/* ── Card sortable (fila real de la lista) ──────────────────────── */
function SortableServicioCard({ s, topServicio, openEdit, handleDelete }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: s.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => openEdit(s)}
      className={`group flex items-center gap-3 rounded-2xl p-3 md:p-4 select-none cursor-pointer transition-colors ${
        isDragging
          ? 'opacity-40 bg-slate-900 border-2 border-dashed border-slate-700'
          : 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
      }`}
    >
      {/* Drag handle — únicos listeners. touch-none evita que Chrome mobile
          arrastre la página al mismo tiempo (scroll-vs-drag). Padding generoso
          en móvil (p-3) para acertar con el pulgar. */}
      <button
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        aria-label="Reordenar servicio"
        className="p-3 md:p-1 -m-3 md:-m-1 shrink-0 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none transition-colors"
      >
        <GripIcon />
      </button>

      <ServicioCardBody s={s} topServicio={topServicio} />

      {/* Chevron sutil en móvil, ghost buttons en desktop */}
      <svg
        className="md:hidden text-slate-500 w-5 flex-shrink-0"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="9 6 15 12 9 18" />
      </svg>
      <div
        className="hidden md:flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => openEdit(s)}
          className="text-slate-400 hover:bg-slate-700 hover:text-primary p-2 rounded-lg transition-colors"
          title="Editar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
        <button
          onClick={() => handleDelete(s.id)}
          className="text-slate-400 hover:bg-red-500/10 hover:text-red-400 p-2 rounded-lg transition-colors"
          title="Eliminar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Card elevada del DragOverlay (lo que "flota" con el dedo) ── */
function ServicioOverlayCard({ s, topServicio }) {
  if (!s) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl p-3 md:p-4 select-none cursor-grabbing bg-slate-800/95 border border-indigo-500 shadow-2xl shadow-black/60 scale-[1.02] transition-transform duration-200">
      <div className="p-3 md:p-1 -m-3 md:-m-1 shrink-0 text-slate-300"><GripIcon /></div>
      <ServicioCardBody s={s} topServicio={topServicio} />
    </div>
  );
}
