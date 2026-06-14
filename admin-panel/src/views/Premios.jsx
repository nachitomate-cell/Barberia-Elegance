import { useState, useMemo, useEffect } from 'react';
import { Plus, Trophy, ChevronUp, ChevronDown, Sparkles, Brain, Cpu, RefreshCw, Check, Lightbulb, Zap, HelpCircle } from 'lucide-react';
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

const EMPTY = { nombre: '', descripcion: '', costoSellos: '', icono: 'ph-scissors' };

function IconPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ICONOS.map(ic => {
        const active = value === ic;
        return (
          <button key={ic} type="button" title={ic.replace('ph-', '')}
            onClick={() => onChange(ic)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
              active
                ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}>
            <i className={`ph ${ic} text-base`} />
          </button>
        );
      })}
    </div>
  );
}

export default function Premios() {
  const { data: premios, loading } = useCollection('premios');

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
    setForm({
      nombre:      p.nombre,
      descripcion: p.descripcion || '',
      costoSellos: p.costoSellos,
      icono:       p.icono || 'ph-scissors',
    });
  };
  const cancelEdit = () => { setEditing(null); setForm(EMPTY); setError(''); };

  const handleSave = async () => {
    const nombre = form.nombre.trim();
    const sellos = parseInt(form.costoSellos);
    if (!nombre || !sellos || sellos < 1) return;

    setError('');

    setSaving(true);
    try {
      const payload = {
        nombre,
        descripcion: form.descripcion.trim(),
        costoSellos: sellos,
        icono:       form.icono,
        updatedAt:   serverTimestamp(),
      };
      if (editing) {
        await updateDoc(doc(tenantCol('premios'), editing), payload);
        cancelEdit();
      } else {
        await addDoc(tenantCol('premios'), { ...payload, activo: true, creadoEn: serverTimestamp() });
        setForm(EMPTY);
      }
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
    setForm({
      nombre: sug.nombre,
      descripcion: sug.descripcion,
      costoSellos: sug.costoSellos.toString(),
      icono: sug.icono,
    });
    setError('');
  };

  const field = 'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="max-w-5xl mx-auto">
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
              <div className="divide-y divide-slate-800/60">
                {sorted.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-800/20 transition-colors">
                    {/* Orden buttons */}
                    <div className="flex flex-col shrink-0">
                      <button
                        onClick={() => move(idx, -1)}
                        disabled={idx === 0 || moving}
                        className="p-0.5 rounded text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default transition-colors"
                        title="Subir">
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        disabled={idx === sorted.length - 1 || moving}
                        className="p-0.5 rounded text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-default transition-colors"
                        title="Bajar">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <i className={`ph ${p.icono || 'ph-scissors'} text-lg shrink-0 text-[#D4AF37] bg-[#D4AF37]/5 w-9 h-9 flex items-center justify-center rounded-lg border border-[#D4AF37]/20`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.nombre}</p>
                      {p.descripcion && (
                        <p className="text-xs text-slate-500 truncate">{p.descripcion}</p>
                      )}
                      <p className="text-[11px] text-[#D4AF37] font-semibold mt-0.5 flex items-center gap-1">
                        <span>🏆</span> {p.costoSellos} sello{p.costoSellos !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(p)}
                        className="p-2 rounded-lg text-slate-400 hover:text-[#D4AF37] hover:bg-slate-800/40 transition-colors" title="Editar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-800/40 transition-colors" title="Eliminar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulario add/edit */}
          <div id="formulario-premio" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                {editing ? 'Editar premio' : 'Nuevo premio'}
              </h2>
              {editing && (
                <button onClick={cancelEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>

            {/* Icono picker */}
            <div className="mb-4">
              <label className={lbl}>Ícono de Canje</label>
              <IconPicker value={form.icono} onChange={ic => setForm(f => ({ ...f, icono: ic }))} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lbl}>Nombre de Premio</label>
                <input className={field} placeholder="Ej. Corte gratis"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSave()} />
              </div>
              <div>
                <label className={lbl}>Sellos requeridos</label>
                <input className={field} type="number" min="1" placeholder="10"
                  value={form.costoSellos}
                  onChange={e => setForm(f => ({ ...f, costoSellos: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleSave()} />
              </div>
            </div>

            <div className="mb-4">
              <label className={lbl}>Descripción <span className="normal-case font-normal text-slate-600">(opcional)</span></label>
              <input className={field} placeholder="Ej. Canjea 10 sellos por un corte de cabello de regalo"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-semibold mb-3">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              {editing && (
                <button onClick={cancelEdit} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">
                  Cancelar
                </button>
              )}
              <button onClick={handleSave}
                disabled={saving || !form.nombre || !form.costoSellos}
                className="flex items-center gap-2 px-5 py-2 bg-[#D4AF37] hover:bg-yellow-500 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors">
                {saving && <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />}
                {editing ? 'Guardar Cambios' : <><Plus size={15} /> Agregar Premio</>}
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha (Synaptech IA™ Advisor) - Toma 1 parte en escritorio */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg sticky top-6">
            
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

