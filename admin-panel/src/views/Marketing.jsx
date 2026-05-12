import { useState, useEffect, useRef } from 'react';
import {
  Megaphone, Image, Type, AlignLeft, Link2,
  ToggleLeft, ToggleRight, Save,
} from 'lucide-react';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';
import { getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { tenantDoc } from '../lib/tenantUtils';

const EMPTY = {
  titulo:      '',
  descripcion: '',
  imagen:      '',
  ctaTexto:    'Reservar mi lugar',
  ctaUrl:      'index.html',
  activo:      false,
};

export default function Marketing() {
  const [form,     setForm]     = useState(EMPTY);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const savedTimer = useRef(null);

  useEffect(() => {
    getDoc(tenantDoc('config', 'anuncio'))
      .then(snap => { if (snap.exists()) setForm({ ...EMPTY, ...snap.data() }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        ...form,
        updatedAt: serverTimestamp(),
      };
      // Solo regenerar versionId cuando el banner se publica activo
      if (form.activo) payload.versionId = Date.now().toString();

      await setDoc(tenantDoc('config', 'anuncio'), payload);

      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  const field = 'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors';
  const lbl   = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone size={20} className="text-[#D4AF37]" />
            Marketing
          </h1>
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestiona el banner publicitario que ven los clientes en su app.
        </p>
      </div>

      {/* Preview card */}
      {form.imagen && (
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ minHeight: 170, backgroundImage: `url('${form.imagen}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.1) 100%)' }} />
          <div className="relative z-10 p-5 flex flex-col justify-end" style={{ minHeight: 170 }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-[#D4AF37]">Vista previa</p>
            <p className="text-base font-black text-white leading-tight mb-1">{form.titulo || 'Título del anuncio'}</p>
            <p className="text-xs text-white/60 leading-snug mb-3">{form.descripcion}</p>
            <span
              className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black"
              style={{ background: '#D4AF37' }}
            >
              {form.ctaTexto || 'Reservar mi lugar'}
            </span>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">

        {/* Toggle activo */}
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-semibold text-white">Publicar anuncio</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {form.activo ? 'Visible para todos los clientes.' : 'Oculto — los clientes no lo ven.'}
            </p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
              form.activo
                ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {form.activo
              ? <><ToggleRight size={18} /> Activo</>
              : <><ToggleLeft  size={18} /> Inactivo</>}
          </button>
        </div>

        <div className="border-t border-slate-800" />

        {/* Título */}
        <div>
          <label className={lbl}>
            <span className="inline-flex items-center gap-1.5"><Type size={11} /> Título</span>
          </label>
          <input
            className={field}
            placeholder="¡VIVE EL MUNDIAL EN ELEGANCE!"
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
          />
        </div>

        {/* Descripción */}
        <div>
          <label className={lbl}>
            <span className="inline-flex items-center gap-1.5"><AlignLeft size={11} /> Descripción</span>
          </label>
          <textarea
            className={`${field} resize-none`}
            rows={2}
            placeholder="Ven a ver los partidos con tu barbero favorito."
            value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          />
        </div>

        {/* Imagen */}
        <div>
          <label className={lbl}>
            <span className="inline-flex items-center gap-1.5"><Image size={11} /> URL de la imagen</span>
          </label>
          <input
            className={field}
            placeholder="https://images.unsplash.com/..."
            value={form.imagen}
            onChange={e => setForm(f => ({ ...f, imagen: e.target.value }))}
          />
          <p className="text-[10px] text-slate-600 mt-1">
            Usa una imagen horizontal (16:9 o 2:1) con sujeto en la parte superior.
          </p>
        </div>

        {/* CTA */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Texto del botón</label>
            <input
              className={field}
              placeholder="Reservar mi lugar"
              value={form.ctaTexto}
              onChange={e => setForm(f => ({ ...f, ctaTexto: e.target.value }))}
            />
          </div>
          <div>
            <label className={lbl}>
              <span className="inline-flex items-center gap-1.5"><Link2 size={11} /> URL del botón</span>
            </label>
            <input
              className={field}
              placeholder="index.html"
              value={form.ctaUrl}
              onChange={e => setForm(f => ({ ...f, ctaUrl: e.target.value }))}
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between pt-1">
          {saved
            ? <p className="text-xs font-semibold text-emerald-400">✓ Guardado — los clientes verán el cambio en su próxima carga.</p>
            : <span />}
          <button
            onClick={handleSave}
            disabled={saving || !form.titulo}
            className="flex items-center gap-2 px-5 py-2 bg-[#D4AF37] hover:bg-yellow-500 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <Save size={15} />}
            {saving ? 'Guardando…' : 'Guardar y publicar'}
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-500 leading-relaxed">
        <Megaphone size={14} className="text-slate-600 shrink-0 mt-0.5" />
        <span>
          Al publicar con el banner <strong className="text-slate-400">activo</strong> se genera un nuevo <strong className="text-slate-400">versionId</strong>.
          Esto activa el punto rojo en el ícono de Fidelización de la app del cliente,
          avisándole que hay un anuncio nuevo sin necesidad de push notifications.
        </span>
      </div>

    {showHelp && (
      <HelpModal title="Ayuda — Marketing" onClose={() => setShowHelp(false)}>
        <p>En <strong className="text-white">Marketing</strong> configuras el banner que aparece en la app de tus clientes.</p>
        <ul className="space-y-1.5 list-disc list-inside text-slate-400">
          <li>Sube una <span className="text-white">imagen</span> de promoción (descuentos, nuevos servicios, eventos).</li>
          <li>Agrega un <span className="text-white">título</span>, descripción y enlace opcional al que llevar al cliente.</li>
          <li>Activa la casilla <span className="text-white">Marcar como nuevo</span> para notificar a los clientes sobre el anuncio.</li>
          <li>Guarda los cambios para que el banner se actualice en tiempo real en la app pública.</li>
        </ul>
      </HelpModal>
    )}
    </div>
  );
}
