import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { HelpCircle, Plus, Trash2, Save, GripVertical, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';

/**
 * Faqs.jsx — CRUD de preguntas frecuentes.
 *
 * Colección: tenants/{tid}/faqs/{docId} · campos:
 *   { pregunta, respuesta, orden (number), activa (bool), updatedAt }
 *
 * Renderizado en el sitio público: index.html #faqSection lee esta misma
 * colección y arma un acordeón. La sección se OCULTA sola si no hay faqs
 * activas — así se puede vaciar sin dejar la web con un espacio muerto.
 *
 * Visible en el sidebar solo cuando `tenant.tipo === 'clinica'` (aunque la
 * colección es genérica, hoy es la única variante que la necesita).
 */
export default function Faqs() {
  const { id: tenantId, name: shopName, tipo } = useTenant();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [publicUrl, setPublicUrl] = useState('');

  const colRef = useMemo(() => collection(db, `tenants/${tenantId}/faqs`), [tenantId]);

  useEffect(() => {
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setItems(list);
      setLoading(false);
    }, (err) => {
      console.error('[faqs] listener:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [colRef]);

  useEffect(() => {
    // URL pública para que la dueña pueda abrir la agenda y ver cómo queda
    setPublicUrl(`https://${tenantId}.synaptechspa.cl/`);
  }, [tenantId]);

  const addFaq = async () => {
    const nextOrden = items.length ? Math.max(...items.map(f => f.orden || 0)) + 1 : 1;
    const id = `faq-${Date.now()}`;
    setSavingId(id);
    try {
      await setDoc(doc(colRef, id), {
        pregunta: '',
        respuesta: '',
        orden: nextOrden,
        activa: true,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      alert('No se pudo crear: ' + e.message);
    } finally {
      setSavingId(null);
    }
  };

  const save = async (id, patch) => {
    setSavingId(id);
    try {
      await setDoc(doc(colRef, id), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      alert('No se pudo guardar: ' + e.message);
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar esta pregunta? No se puede deshacer.')) return;
    setSavingId(id);
    try {
      await deleteDoc(doc(colRef, id));
    } catch (e) {
      alert('No se pudo eliminar: ' + e.message);
    } finally {
      setSavingId(null);
    }
  };

  const move = async (id, dir) => {
    const idx = items.findIndex(f => f.id === id);
    if (idx === -1) return;
    const other = dir === 'up' ? items[idx - 1] : items[idx + 1];
    if (!other) return;
    const a = items[idx];
    // Swap orden values
    await Promise.all([
      save(a.id, { orden: other.orden || 0 }),
      save(other.id, { orden: a.orden || 0 }),
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-400">
            <HelpCircle size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-primary">Preguntas frecuentes</h1>
            <p className="text-sm text-slate-400">
              Aparecen en tu página de reservas — {shopName}
              {tipo === 'clinica' && ' · Clínica'}
            </p>
          </div>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors"
              title="Ver en el sitio público"
            >
              <ExternalLink size={14} />
              Ver
            </a>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900/60 border border-slate-800 p-4 text-sm text-slate-300">
          <p className="mb-2 font-semibold text-slate-200">Consejos rápidos</p>
          <ul className="space-y-1 text-slate-400 text-[13px]">
            <li>· Responde lo que la gente más pregunta antes de reservar (precios, dolor, resultados, cuidados).</li>
            <li>· Sé clara y breve. 2–3 frases por respuesta funciona mejor que un párrafo largo.</li>
            <li>· Puedes desactivar una pregunta sin borrarla usando el ojo.</li>
            <li>· El orden en el que aparecen acá es el orden en el que se ven en tu web.</li>
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{items.length} pregunta{items.length === 1 ? '' : 's'}</h2>
          <button
            onClick={addFaq}
            disabled={savingId !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            Nueva pregunta
          </button>
        </div>

        {loading ? (
          <div className="mt-6 flex justify-center py-10">
            <Loader2 className="animate-spin text-slate-500" size={24} />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-800 p-10 text-center">
            <HelpCircle size={32} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400">Aún no hay preguntas frecuentes.</p>
            <p className="text-sm text-slate-500 mt-1">Empieza con las 3 dudas que más te repiten tus clientes.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((f, idx) => (
              <FaqCard
                key={f.id}
                faq={f}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
                saving={savingId === f.id}
                onSave={(patch) => save(f.id, patch)}
                onRemove={() => remove(f.id)}
                onMoveUp={() => move(f.id, 'up')}
                onMoveDown={() => move(f.id, 'down')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FaqCard({ faq, isFirst, isLast, saving, onSave, onRemove, onMoveUp, onMoveDown }) {
  const [pregunta, setPregunta] = useState(faq.pregunta || '');
  const [respuesta, setRespuesta] = useState(faq.respuesta || '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setPregunta(faq.pregunta || '');
    setRespuesta(faq.respuesta || '');
    setDirty(false);
  }, [faq.pregunta, faq.respuesta]);

  const handleSave = () => {
    if (!pregunta.trim()) {
      alert('La pregunta no puede estar vacía.');
      return;
    }
    onSave({ pregunta: pregunta.trim(), respuesta: respuesta.trim() });
    setDirty(false);
  };

  const toggleActiva = () => {
    onSave({ activa: !(faq.activa !== false) });
  };

  const active = faq.activa !== false;

  return (
    <div className={`rounded-2xl border p-4 transition-colors ${active ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-900/40 border-slate-800/60 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1 pt-2">
          <button
            onClick={onMoveUp}
            disabled={isFirst || saving}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
            title="Subir"
          >
            <GripVertical size={14} className="rotate-90" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast || saving}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-20"
            title="Bajar"
          >
            <GripVertical size={14} className="-rotate-90" />
          </button>
        </div>

        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={pregunta}
            onChange={(e) => { setPregunta(e.target.value); setDirty(true); }}
            placeholder="Escribe la pregunta"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
          <textarea
            value={respuesta}
            onChange={(e) => { setRespuesta(e.target.value); setDirty(true); }}
            placeholder="Escribe la respuesta (puedes usar Enter para hacer párrafos)"
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-y"
          />
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={toggleActiva}
            disabled={saving}
            className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${active ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'}`}
            title={active ? 'Está visible — click para ocultar' : 'Está oculta — click para mostrar'}
          >
            {active ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            onClick={onRemove}
            disabled={saving}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors disabled:opacity-40"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {dirty && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
