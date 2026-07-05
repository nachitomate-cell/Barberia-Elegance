import { useState, useMemo, useEffect } from 'react';
import { Plus, Trophy, ChevronUp, ChevronDown, Sparkles, Brain, Cpu, RefreshCw, Check, Lightbulb, Zap, HelpCircle, Package, Scissors, Tag } from 'lucide-react';
import { addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { confirmDialog } from '../lib/confirmDialog';
import { useCollection } from '../hooks/useCollection';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

const ICONOS = [
  'ph-scissors','ph-gift','ph-star','ph-crown',
  'ph-trophy','ph-fire','ph-drop','ph-lightning',
  'ph-tag','ph-diamond','ph-sparkle','ph-confetti',
];

/* ── Sistema de categorías polimórficas ────────────────────────────────
   Todos los premios llevan `categoria` + `configuracion` específica.
   Premios legacy sin categoría se leen como SERVICIO por defecto.
   ─────────────────────────────────────────────────────────────────── */
const CATEGORIAS = {
  PRODUCTO:  { label: 'Producto',      icon: Package,  emoji: '📦', color: 'sky',     hint: 'El cliente retira un ítem del inventario.' },
  SERVICIO:  { label: 'Servicio',      icon: Scissors, emoji: '✂️', color: 'emerald', hint: 'El cliente reserva o recibe un servicio gratis.' },
  DESCUENTO: { label: 'Descuento',     icon: Tag,      emoji: '🏷️', color: 'amber',   hint: 'Se aplica un descuento en caja al próximo pago.' },
};

const EMPTY_CONFIG = {
  PRODUCTO:  { skuProducto: '',  descuentaStock: true },
  SERVICIO:  { servicioId: '',   requiereTurno: true },
  DESCUENTO: { tipoDescuento: 'PORCENTAJE', valorDescuento: 20 },
};

const EMPTY = {
  nombre: '',
  descripcion: '',
  costoSellos: '',
  icono: 'ph-scissors',
  categoria: 'SERVICIO',
  configuracion: { ...EMPTY_CONFIG.SERVICIO },
};

/* Lee la categoría real de un premio (fallback SERVICIO para legacy). */
function readCategoria(p) {
  const cat = p?.categoria;
  return CATEGORIAS[cat] ? cat : 'SERVICIO';
}

/* Icon picker — scroll horizontal en móvil (deslizar con el dedo). */
function IconPicker({ value, onChange }) {
  return (
    <div className="flex overflow-x-auto gap-3 py-2 -mx-1 px-1 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
      {ICONOS.map(ic => {
        const active = value === ic;
        return (
          <button key={ic} type="button" title={ic.replace('ph-', '')}
            onClick={() => onChange(ic)}
            className={`shrink-0 snap-start w-11 h-11 flex items-center justify-center rounded-full border transition-all ${
              active
                ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] shadow-[0_0_0_1px_#D4AF37]'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
            }`}>
            <i className={`ph ${ic} text-lg`} />
          </button>
        );
      })}
    </div>
  );
}

/* iOS-style toggle — mucho más táctil que un checkbox. */
function IosToggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 w-full py-2.5 text-left group">
      <span className="text-sm text-slate-200 flex-1">{label}</span>
      <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-[#D4AF37]' : 'bg-slate-700 group-hover:bg-slate-600'
      }`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`} />
      </span>
    </button>
  );
}

/* Badge de categoría (chip) — usa colores Tailwind seguros por categoría. */
function CategoriaBadge({ categoria, size = 'sm' }) {
  const cat  = CATEGORIAS[categoria] || CATEGORIAS.SERVICIO;
  const Icon = cat.icon;
  const colorMap = {
    sky:     'bg-sky-500/10     text-sky-300     border-sky-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    amber:   'bg-amber-500/10   text-amber-300   border-amber-500/25',
  };
  const sizeCls = size === 'xs'
    ? 'text-[9px] px-1.5 py-0.5 gap-1'
    : 'text-[10px] px-2 py-0.5 gap-1';
  return (
    <span className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wide ${colorMap[cat.color]} ${sizeCls}`}>
      <Icon size={size === 'xs' ? 9 : 10} />
      {cat.label}
    </span>
  );
}

/* Selector de categoría — pills compactas en una sola fila (mobile-first). */
function CategoriaPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(CATEGORIAS).map(([key, meta]) => {
        const active = value === key;
        return (
          <button key={key} type="button"
            onClick={() => onChange(key)}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
              active
                ? 'bg-[#D4AF37] text-black shadow-[0_2px_10px_rgba(212,175,55,0.35)]'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}>
            <span className="text-base leading-none">{meta.emoji}</span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* Inputs polimórficos ultra simples — sin recuadros anidados. */
function ConfigFields({ categoria, config, onChange, servicios, productos, fieldCls, lblCls }) {
  const set = (patch) => onChange({ ...config, ...patch });

  if (categoria === 'PRODUCTO') {
    return (
      <div className="space-y-2">
        <label className={lblCls}>Producto del inventario</label>
        <select
          className={fieldCls}
          value={config.skuProducto || ''}
          onChange={e => set({ skuProducto: e.target.value })}
        >
          <option value="">— Selecciona un producto —</option>
          {productos.map(p => (
            <option key={p.id} value={p.sku || p.id}>
              {p.nombre} {p.sku ? `· SKU ${p.sku}` : `· ${p.id.slice(0, 6)}`}
            </option>
          ))}
        </select>
        <IosToggle
          checked={!!config.descuentaStock}
          onChange={v => set({ descuentaStock: v })}
          label="Descontar del stock al aprobar"
        />
      </div>
    );
  }

  if (categoria === 'SERVICIO') {
    return (
      <div className="space-y-2">
        <label className={lblCls}>Servicio de regalo</label>
        <select
          className={fieldCls}
          value={config.servicioId || ''}
          onChange={e => set({ servicioId: e.target.value })}
        >
          <option value="">— Selecciona el servicio —</option>
          {servicios.map(s => (
            <option key={s.id} value={s.id}>
              {s.nombre}{s.categoria ? ` · ${s.categoria}` : ''}
            </option>
          ))}
        </select>
        <IosToggle
          checked={!!config.requiereTurno}
          onChange={v => set({ requiereTurno: v })}
          label="Requiere agendar turno"
        />
      </div>
    );
  }

  if (categoria === 'DESCUENTO') {
    const esPct = (config.tipoDescuento || 'PORCENTAJE') === 'PORCENTAJE';
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {['PORCENTAJE', 'MONTO_FIJO'].map(t => (
            <button key={t} type="button"
              onClick={() => set({ tipoDescuento: t })}
              className={`px-3 py-2.5 rounded-full text-xs font-bold transition-colors ${
                config.tipoDescuento === t
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}>
              {t === 'PORCENTAJE' ? '%  Porcentaje' : '$  Monto fijo'}
            </button>
          ))}
        </div>
        <div>
          <label className={lblCls}>
            {esPct ? 'Porcentaje (1-100)' : 'Monto en pesos ($)'}
          </label>
          <input
            className={fieldCls}
            type="number"
            inputMode="numeric"
            min="1"
            max={esPct ? '100' : undefined}
            value={config.valorDescuento ?? ''}
            onChange={e => set({ valorDescuento: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
            placeholder={esPct ? '20' : '5000'}
          />
        </div>
      </div>
    );
  }

  return null;
}

export default function Premios() {
  const { data: premios, loading } = useCollection('premios');
  const { data: servicios }        = useCollection('servicios');
  const { data: productos }        = useCollection('productos');

  const sorted = useMemo(() => {
    const arr = [...premios];
    arr.sort((a, b) => {
      const ao = a.orden ?? Infinity;
      const bo = b.orden ?? Infinity;
      if (ao !== bo) return ao - bo;
      return (a.costoSellos ?? 0) - (b.costoSellos ?? 0);
    });
    return arr;
  }, [premios]);

  const [form,     setForm]     = useState(EMPTY);
  const [showHelp, setShowHelp] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [moving,   setMoving]   = useState(false);
  const [error,    setError]    = useState('');
  // Bottom-sheet mobile: solo mostrar el formulario cuando el usuario lo abre
  const [formOpen, setFormOpen] = useState(false);
  // AI Advisor colapsable en móvil (siempre expandido en desktop)
  const [aiOpen,   setAiOpen]   = useState(false);

  /* ── Synaptech IA™ Advisor States ────────────────────────── */
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep]       = useState(0);

  const stepsAI = [
    'Conectando con base de datos del local...',
    'Analizando distribución de sellos y premios...',
    'Calculando índice de retención de clientes...',
    'Cruzando métricas con modelos predictivos SaaS...',
  ];

  const triggerAiScan = () => {
    setAiLoading(true);
    setAiStep(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current < stepsAI.length) {
        setAiStep(current);
      } else {
        clearInterval(interval);
        setAiLoading(false);
      }
    }, 550);
  };

  // Escaneo inicial al cargar la vista
  useEffect(() => {
    triggerAiScan();
  }, []);

  /* ── Calculations for AI Panel ──────────────────────────── */
  const aiAnalysis = useMemo(() => {
    const totalCount = sorted.length;
    const costs = sorted.map(p => p.costoSellos ?? 0);

    const hasQuickWin = sorted.some(p => p.costoSellos >= 3 && p.costoSellos <= 6);
    const hasMediumWin = sorted.some(p => p.costoSellos >= 7 && p.costoSellos <= 10);
    const hasVipWin = sorted.some(p => p.costoSellos > 10);

    // Dynamic Retention Index calculation
    let score = 10; // base score if 0
    if (totalCount === 1) score = 42;
    if (totalCount === 2) score = 65;
    if (totalCount >= 3) score = 82;

    if (hasQuickWin) score += 10;
    if (hasMediumWin) score += 4;
    if (hasVipWin) score += 8;

    const finalScore = Math.min(99, score);

    // Generate alerts and highlights
    const alerts = [];
    if (totalCount === 0) {
      alerts.push({
        type: 'danger',
        title: 'Club Inactivo',
        text: 'No tienes premios configurados. Los clientes no se registrarán ni acumularán sellos en su app.',
      });
    } else {
      if (!hasQuickWin) {
        alerts.push({
          type: 'warning',
          title: 'Falta premio de enganche rápido',
          text: 'No tienes premios de bajo costo (3-6 sellos). Recomendamos agregar un premio menor para incentivar la segunda y tercera visita antes de que el cliente pierda motivación.',
        });
      }
      if (!hasMediumWin) {
        alerts.push({
          type: 'info',
          title: 'Falta premio de fidelización estándar',
          text: 'Recomendamos un beneficio intermedio de 8-10 sellos (ej. un corte de cabello tradicional) que constituye la meta clásica del cliente frecuente.',
        });
      }
      if (!hasVipWin) {
        alerts.push({
          type: 'purple',
          title: 'Falta recompensa VIP / Alta Gama',
          text: 'Tus clientes más recurrentes y leales no tienen un objetivo de alto valor (>10 sellos) por el cual competir. Añade un combo de lujo.',
        });
      }
      if (hasQuickWin && hasMediumWin && hasVipWin) {
        alerts.push({
          type: 'success',
          title: 'Distribución balanceada óptima',
          text: '¡Estructura excelente! Cubres el enganche de clientes nuevos, la retención clásica y la motivación VIP aspiracional.',
        });
      }
    }

    // Dynamic suggested items
    const suggestions = [];
    if (totalCount === 0 || !hasQuickWin) {
      suggestions.push({
        nombre: 'Perfilado de Cejas Express',
        descripcion: '¡Tu primera recompensa! Un servicio rápido para mantener un perfil impecable.',
        costoSellos: 5,
        icono: 'ph-sparkle',
        label: 'Enganche Rápido (5 sellos)',
      });
    }
    if (!hasMediumWin) {
      suggestions.push({
        nombre: 'Corte de Cabello Tradicional',
        descripcion: 'Canjea 10 sellos por tu corte de cabello favorito de regalo.',
        costoSellos: 10,
        icono: 'ph-scissors',
        label: 'Meta Clásica (10 sellos)',
      });
    }
    if (!hasVipWin) {
      suggestions.push({
        nombre: 'Combo Elegance Imperial',
        descripcion: 'Servicio premium de Corte, Ritual de Barba y Lavado capilar de lujo.',
        costoSellos: 12,
        icono: 'ph-crown',
        label: 'Aspiracional VIP (12 sellos)',
      });
    }
    // Fallback or generic suggestion if catalog is well-stocked
    if (suggestions.length === 0) {
      suggestions.push({
        nombre: 'Aceite de Cuidado de Barba',
        descripcion: 'Llévate a casa un óleo o bálsamo modelador premium para barba.',
        costoSellos: 8,
        icono: 'ph-gift',
        label: 'Fidelización Producto (8 sellos)',
      });
    }

    return {
      finalScore,
      alerts,
      suggestions,
      totalCount,
    };
  }, [sorted]);

  const openEdit = p => {
    setEditing(p.id);
    setError('');
    const cat = readCategoria(p);
    setForm({
      nombre:        p.nombre,
      descripcion:   p.descripcion || '',
      costoSellos:   p.costoSellos,
      icono:         p.icono || 'ph-scissors',
      categoria:     cat,
      configuracion: { ...EMPTY_CONFIG[cat], ...(p.configuracion || {}) },
    });
    setFormOpen(true);
    // En móvil, bloquear scroll del body mientras el bottom-sheet esté abierto
    try { document.body.style.overflow = 'hidden'; } catch (_) {}
  };
  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setFormOpen(true);
    try { document.body.style.overflow = 'hidden'; } catch (_) {}
  };
  const cancelEdit = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setFormOpen(false);
    try { document.body.style.overflow = ''; } catch (_) {}
  };

  /* Cuando el usuario cambia la categoría, resetear configuracion a los defaults
     de esa categoría — evita mezclar campos incompatibles al guardar. */
  const setCategoria = (cat) => {
    setForm(f => ({ ...f, categoria: cat, configuracion: { ...EMPTY_CONFIG[cat] } }));
    setError('');
  };
  const setConfig = (nuevoConfig) => {
    setForm(f => ({ ...f, configuracion: nuevoConfig }));
  };

  /* Valida la configuración según la categoría. Devuelve mensaje de error o null. */
  const validarConfig = (categoria, config) => {
    if (categoria === 'PRODUCTO') {
      if (!config.skuProducto) return 'Elige el producto que se entrega en el canje.';
    }
    if (categoria === 'SERVICIO') {
      if (!config.servicioId) return 'Elige el servicio que se regala.';
    }
    if (categoria === 'DESCUENTO') {
      const v = Number(config.valorDescuento);
      if (!v || v < 1) return 'Ingresa el valor del descuento.';
      if (config.tipoDescuento === 'PORCENTAJE' && v > 100) return 'El porcentaje no puede superar 100.';
    }
    return null;
  };

  const handleSave = async () => {
    const nombre = form.nombre.trim();
    const sellos = parseInt(form.costoSellos);
    if (!nombre || !sellos || sellos < 1) return;

    const configError = validarConfig(form.categoria, form.configuracion);
    if (configError) { setError(configError); return; }

    setError('');
    setSaving(true);
    try {
      const payload = {
        nombre,
        descripcion:   form.descripcion.trim(),
        costoSellos:   sellos,
        icono:         form.icono,
        categoria:     form.categoria,
        configuracion: form.configuracion,
        updatedAt:     serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(tenantCol('premios'), editing), payload);
      } else {
        await addDoc(tenantCol('premios'), { ...payload, activo: true, creadoEn: serverTimestamp() });
      }
      cancelEdit();
      // Re-trigger scanning when a reward is added or updated to simulate AI recalculation
      triggerAiScan();
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!(await confirmDialog('¿Eliminar este premio?'))) return;
    await deleteDoc(doc(tenantCol('premios'), id));
    triggerAiScan();
  };

  const move = async (idx, dir) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length || moving) return;
    setMoving(true);
    const a = sorted[idx];
    const b = sorted[targetIdx];
    const ordenA = a.orden ?? idx;
    const ordenB = b.orden ?? targetIdx;
    try {
      await Promise.all([
        updateDoc(doc(tenantCol('premios'), a.id), { orden: ordenB }),
        updateDoc(doc(tenantCol('premios'), b.id), { orden: ordenA }),
      ]);
    } finally { setMoving(false); }
  };

  const applySuggestion = (sug) => {
    const cat = sug.categoria || 'SERVICIO';
    setForm({
      nombre:        sug.nombre,
      descripcion:   sug.descripcion,
      costoSellos:   sug.costoSellos.toString(),
      icono:         sug.icono,
      categoria:     cat,
      configuracion: { ...EMPTY_CONFIG[cat] },
    });
    setError('');
    setEditing(null);
    setFormOpen(true);
    try { document.body.style.overflow = 'hidden'; } catch (_) {}
  };

  const field = 'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Keyframes locales para bottom-sheet (solo se aplican en móvil) */}
      <style>{`
        @keyframes premiosSheetIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes premiosBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        .premios-sheet { animation: premiosSheetIn 0.28s cubic-bezier(0.16,1,0.3,1); }
        @media (min-width: 768px) { .premios-sheet { animation: none; } }
      `}</style>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">Premios del Club</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Define los premios que obtienen los clientes por acumular sellos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (Listado y Formulario) - Toma 2 de 3 partes en escritorio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lista */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catálogo Activo</span>
              <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono font-semibold">
                {premios.length} premio{premios.length !== 1 ? 's' : ''}
              </span>
            </div>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : premios.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-slate-600">
                <Trophy size={32} className="mb-3 text-slate-700" />
                <p className="text-sm">Sin premios configurados.</p>
                <p className="text-xs mt-0.5 text-slate-700">Crea el primero con el formulario de abajo o usa la IA.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {sorted.map((p, idx) => {
                  const cat  = readCategoria(p);
                  const meta = CATEGORIAS[cat];
                  const circleColor = {
                    sky:     'bg-sky-500/12 text-sky-300 border-sky-500/30',
                    emerald: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30',
                    amber:   'bg-amber-500/12 text-amber-300 border-amber-500/30',
                  }[meta.color];
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-3 min-h-[64px] hover:bg-slate-800/20 transition-colors">
                      {/* Círculo de ícono coloreado por categoría */}
                      <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center border ${circleColor}`}>
                        <i className={`ph ${p.icono || 'ph-scissors'} text-lg`} />
                      </div>
                      {/* Nombre + "Categoría · N sellos" (descripción oculta en lista) */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                        <p className="text-xs text-neutral-400 truncate">
                          {meta.label} · {p.costoSellos} sello{p.costoSellos !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {/* Acciones táctiles */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(p)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#D4AF37] hover:bg-slate-800/60 transition-colors" title="Editar">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <div className="flex flex-col">
                          <button
                            onClick={() => move(idx, -1)}
                            disabled={idx === 0 || moving}
                            className="w-7 h-4 flex items-center justify-center rounded text-slate-500 hover:text-slate-200 disabled:opacity-25 disabled:cursor-default"
                            title="Subir">
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => move(idx, 1)}
                            disabled={idx === sorted.length - 1 || moving}
                            className="w-7 h-4 flex items-center justify-center rounded text-slate-500 hover:text-slate-200 disabled:opacity-25 disabled:cursor-default"
                            title="Bajar">
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <button onClick={() => handleDelete(p.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800/60 transition-colors" title="Eliminar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* CTA principal — abre el bottom-sheet en móvil o el form inline en desktop */}
          <button
            onClick={openNew}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#D4AF37] hover:bg-yellow-500 text-black font-bold text-sm transition-colors shadow-[0_4px_18px_rgba(212,175,55,0.28)]"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo Premio
          </button>

          {/* Formulario add/edit — Bottom-sheet en móvil, inline en desktop */}
          {formOpen && (
            <>
              {/* Backdrop (solo móvil) */}
              <div
                onClick={cancelEdit}
                className="fixed inset-0 z-40 bg-black/60 md:hidden animate-[premiosBackdropIn_0.25s_ease-out]"
              />
              <div
                id="formulario-premio"
                className="premios-sheet fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto bg-slate-900 border-t border-slate-700 rounded-t-3xl shadow-2xl md:static md:z-auto md:max-h-none md:overflow-visible md:rounded-xl md:border md:border-slate-800 md:shadow-md"
              >
                {/* Grip handle (solo móvil) */}
                <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mt-3 md:hidden" />

                <div className="p-5 pb-8 md:pb-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                      {editing ? 'Editar premio' : 'Nuevo premio'}
                    </h2>
                    <button onClick={cancelEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  {/* Paso 1: Categoría (pills grandes de una fila) */}
                  <div>
                    <label className={lbl}>Categoría</label>
                    <CategoriaPicker value={form.categoria} onChange={setCategoria} />
                  </div>

                  {/* Paso 2: Inputs dinámicos — sin recuadros anidados */}
                  <div>
                    <ConfigFields
                      categoria={form.categoria}
                      config={form.configuracion}
                      onChange={setConfig}
                      servicios={servicios}
                      productos={productos}
                      fieldCls={field}
                      lblCls={lbl}
                    />
                  </div>

                  {/* Paso 3: Ícono (scroll horizontal, no consume alto) */}
                  <div>
                    <label className={lbl}>Ícono de canje</label>
                    <IconPicker value={form.icono} onChange={ic => setForm(f => ({ ...f, icono: ic }))} />
                  </div>

                  {/* Paso 4: Nombre (70%) + Sellos (30%) en la misma fila */}
                  <div className="flex gap-2">
                    <div className="flex-[7] min-w-0">
                      <label className={lbl}>Nombre</label>
                      <input className={field} placeholder="Ej. Corte gratis"
                        value={form.nombre}
                        onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSave()} />
                    </div>
                    <div className="flex-[3] min-w-0">
                      <label className={lbl}>Sellos</label>
                      <input className={field} type="number" inputMode="numeric" min="1" placeholder="10"
                        value={form.costoSellos}
                        onChange={e => setForm(f => ({ ...f, costoSellos: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSave()} />
                    </div>
                  </div>

                  <div>
                    <label className={lbl}>Descripción <span className="normal-case font-normal text-slate-600">(opcional)</span></label>
                    <input className={field} placeholder="Ej. Canjea 10 sellos por un corte de cabello de regalo"
                      value={form.descripcion}
                      onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleSave()} />
                  </div>

                  {error && (
                    <p className="text-xs text-red-400 font-semibold">{error}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={cancelEdit} className="flex-1 py-3 text-sm text-slate-300 hover:text-white rounded-xl border border-slate-700 hover:bg-slate-800 transition-all">
                      Cancelar
                    </button>
                    <button onClick={handleSave}
                      disabled={saving || !form.nombre || !form.costoSellos}
                      className="flex-[2] flex items-center justify-center gap-2 py-3 bg-[#D4AF37] hover:bg-yellow-500 disabled:opacity-40 text-black text-sm font-bold rounded-xl transition-colors">
                      {saving && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                      {editing ? 'Guardar cambios' : 'Agregar premio'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Columna Derecha (Synaptech IA™ Advisor) — colapsable en móvil */}
        <div className="lg:col-span-1">
          {/* Toggle compacto solo en móvil */}
          <button
            onClick={() => setAiOpen(v => !v)}
            className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl mb-3 text-left"
          >
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={13} className="text-[#D4AF37]" /> Ver diagnóstico IA
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`${aiOpen ? '' : 'hidden lg:block'} bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg lg:sticky lg:top-6`}>
            
            {/* Header del Asistente */}
            <div className="p-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                  <img src="/logo1.png" alt="SynapTech" className="w-4 h-4 object-contain" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide">SYNAPTECH IA™</h3>
                  <p className="text-[9px] text-[#D4AF37] font-bold font-mono tracking-wider">PREDICTIVE ADVISOR v1.4</p>
                </div>
              </div>
              
              <button 
                onClick={triggerAiScan} 
                disabled={aiLoading}
                className="p-1.5 rounded-lg text-slate-500 hover:text-[#D4AF37] hover:bg-slate-800/50 transition-colors disabled:opacity-30"
                title="Recalcular análisis">
                <RefreshCw size={12} className={aiLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Cuerpo del Asistente */}
            <div className="p-5 space-y-4">
              {aiLoading ? (
                /* Pantalla de Escaneo (Cargando) */
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/10 animate-ping" />
                    <div className="absolute inset-2 rounded-full border border-[#D4AF37]/20 animate-pulse" />
                    <Cpu size={24} className="text-[#D4AF37] animate-bounce" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-white tracking-wide">Escaneando parámetros...</p>
                    <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed animate-pulse">
                      {stepsAI[aiStep]}
                    </p>
                  </div>
                </div>
              ) : (
                /* Resultados del Análisis */
                <>
                  {/* Score de Retención */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Retención Proyectada</span>
                      <span className="text-2xl font-black text-white tracking-tight">{aiAnalysis.finalScore}%</span>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        aiAnalysis.finalScore >= 80 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : aiAnalysis.finalScore >= 50 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {aiAnalysis.finalScore >= 80 ? 'Excelente' : aiAnalysis.finalScore >= 50 ? 'Mejorable' : 'Peligro'}
                      </span>
                      <p className="text-[9px] text-slate-500 mt-1">SaaS Benchmark</p>
                    </div>
                  </div>

                  {/* Estado Diagnóstico */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Brain size={12} className="text-[#D4AF37]" />
                      Diagnóstico del Negocio
                    </h4>

                    <div className="space-y-2">
                      {aiAnalysis.alerts.map((alert, idx) => {
                        const styleMap = {
                          danger:  'bg-red-500/5 border-red-500/20 text-red-300 icon-red',
                          warning: 'bg-amber-500/5 border-amber-500/20 text-amber-300 icon-amber',
                          info:    'bg-blue-500/5 border-blue-500/20 text-blue-300 icon-blue',
                          purple:  'bg-purple-500/5 border-purple-500/20 text-purple-300 icon-purple',
                          success: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 icon-emerald',
                        };
                        const styling = styleMap[alert.type] || styleMap.info;
                        return (
                          <div key={idx} className={`p-3 border rounded-xl text-xs space-y-1 ${styling}`}>
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-xs">
                                {alert.type === 'danger' && '⚠️'}
                                {alert.type === 'warning' && '⚡'}
                                {alert.type === 'info' && '💡'}
                                {alert.type === 'purple' && '👑'}
                                {alert.type === 'success' && '✓'}
                              </span>
                              {alert.title}
                            </div>
                            <p className="text-[10px] opacity-70 leading-relaxed">{alert.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sugerencias de Premios */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb size={12} className="text-yellow-400" />
                        Acción Recomendada
                      </h4>
                      <span className="text-[9px] text-[#D4AF37] font-semibold animate-pulse">Auto-Completa</span>
                    </div>

                    <div className="space-y-2">
                      {aiAnalysis.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => applySuggestion(sug)}
                          className="w-full text-left bg-slate-900/55 hover:bg-slate-800/40 border border-slate-800/80 hover:border-[#D4AF37]/40 rounded-xl p-3 flex items-start gap-2.5 transition-all group relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-[#D4AF37]/5 to-transparent rounded-bl-2xl group-hover:from-[#D4AF37]/15 transition-all" />
                          <i className={`ph ${sug.icono} text-sm shrink-0 text-[#D4AF37] bg-[#D4AF37]/5 w-8 h-8 flex items-center justify-center rounded-lg border border-[#D4AF37]/10 group-hover:border-[#D4AF37]/30 transition-all`} />
                          <div className="flex-1 min-w-0 pr-2">
                            <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-wide block mb-0.5">{sug.label}</span>
                            <h5 className="text-xs font-semibold text-white truncate group-hover:text-[#D4AF37] transition-colors">{sug.nombre}</h5>
                            <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 mt-0.5">{sug.descripcion}</p>
                          </div>
                          <div className="shrink-0 flex items-center self-center p-1 rounded-full bg-slate-800 border border-slate-700/60 group-hover:bg-[#D4AF37] group-hover:border-[#D4AF37] transition-all">
                            <Plus size={10} className="text-slate-400 group-hover:text-black transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer de IA */}
            <div className="p-3 bg-slate-950/70 border-t border-slate-800/60 flex items-center gap-1.5 text-[9px] text-slate-500 justify-center">
              <span>🛡️</span>
              <span>Análisis predictivo de retención de clientes local e industrial.</span>
            </div>

          </div>
        </div>
      </div>

      {showHelp && (
        <HelpModal title="Ayuda — Premios del Club" onClose={() => setShowHelp(false)}>
          <p><strong className="text-white">Premios</strong> define las recompensas del programa de fidelización.</p>
          <ul className="space-y-1.5 list-disc list-inside text-slate-400">
            <li>Crea premios con nombre, descripción, ícono y el <span className="text-white">costo en sellos</span> para canjearlos.</li>
            <li>Los clientes ven los premios disponibles y cuántos sellos les faltan en su app.</li>
            <li>Al alcanzar el umbral, el sistema notifica al cliente que tiene un premio disponible.</li>
            <li>Edita o elimina premios existentes según las promociones del local.</li>
            <li><span className="text-white">Synaptech IA™ Advisor</span> analiza tu catálogo en tiempo real para recomendarte la mejor estructura de incentivos basándose en la fidelización de enganche rápido, intermedia y VIP.</li>
          </ul>
        </HelpModal>
      )}
    </div>
  );
}

