import { useState, useEffect } from 'react';
import {
  GraduationCap, Users, BookOpen, Plus, Search, Edit2, Trash2, Check,
  AlertCircle, DollarSign, Calendar, Link as LinkIcon
} from 'lucide-react';
import { getDocs, query, orderBy, setDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

/* ── Componentes de UI ───────────────────────────────────────────── */
function Card({ children, className = '' }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

const TABS = [
  { id: 'cursos',   label: 'Cursos',   Icon: GraduationCap },
  { id: 'alumnos',  label: 'Alumnos',  Icon: Users },
  { id: 'material', label: 'Material', Icon: BookOpen },
];

export default function Academia() {
  const [activeTab, setActiveTab] = useState('cursos');
  const [showHelp,  setShowHelp]  = useState(false);

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-theme(spacing.20))]">
      {/* ── Cabecera ── */}
      <div className="shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <GraduationCap className="text-emerald-500" size={28} />
          Academia
          <HelpButton onClick={() => setShowHelp(true)} />
        </h1>
        <p className="text-sm text-slate-400">
          Gestiona tus cursos, alumnos inscritos y material de estudio.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex space-x-1 p-1 bg-slate-900 rounded-lg shrink-0 mb-6 border border-slate-800 self-start">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all
              ${activeTab === id
                ? 'bg-emerald-500/10 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }
            `}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
        {activeTab === 'cursos' && <TabCursos />}
        {activeTab === 'alumnos' && <TabAlumnos />}
        {activeTab === 'material' && <TabMaterial />}
      </div>

      {showHelp && (
        <HelpModal title="Cómo usar la Academia" onClose={() => setShowHelp(false)}>
          <p>Acá organizás los <strong className="text-white">cursos que impartís</strong> en tu barbería: alumnos inscritos, material de estudio y seguimiento de avance.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Pestaña "Cursos"</p>
            <p>Creá cursos con nombre, descripción, fecha de inicio/fin y precio. Cada curso es un programa formativo (ej. "Fade nivel intermedio", "Barba clásica").</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Pestaña "Alumnos"</p>
            <p>Lista de personas inscritas con su email, teléfono y al curso al que pertenecen. Útil para enviarles material o avisos.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">Pestaña "Material"</p>
            <p>Subí PDFs, links a videos o documentos que los alumnos puedan consultar. Cada material se asocia a un curso.</p>
          </div>

          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Esta sección es independiente del flujo de citas/fidelización. Los alumnos no se vuelven automáticamente miembros del Club — son contactos separados.</p>
        </HelpModal>
      )}
    </div>
  );
}

/* ── Tab: Cursos ─────────────────────────────────────────────────── */
function TabCursos() {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null o objeto curso nuevo/existente

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(tenantCol('cursos_academia'), orderBy('createdAt', 'desc')));
      setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (curso) => {
    try {
      const isNew = !curso.id;
      const id = isNew ? Date.now().toString() : curso.id;
      const dataToSave = { ...curso, id };
      if (isNew) dataToSave.createdAt = serverTimestamp();

      await setDoc(doc(tenantCol('cursos_academia'), id), dataToSave, { merge: true });
      setEditing(null);
      fetchData();
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este curso?')) return;
    try {
      await deleteDoc(doc(tenantCol('cursos_academia'), id));
      fetchData();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  if (loading) return <div className="text-slate-500 animate-pulse py-10 text-center">Cargando cursos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing({ title: '', description: '', price: '', dates: '', capacity: '' })}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all"
        >
          <Plus size={16} /> Nuevo Curso
        </button>
      </div>

      {editing && (
        <Card className="p-5 border-emerald-500/30">
          <h3 className="text-white font-bold mb-4">{editing.id ? 'Editar Curso' : 'Nuevo Curso'}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder="Nombre del curso"
              value={editing.title}
              onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
              className="col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <input
              placeholder="Fechas (Ej: 12 al 15 de Octubre)"
              value={editing.dates}
              onChange={e => setEditing(p => ({ ...p, dates: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <input
              placeholder="Precio"
              type="number"
              value={editing.price}
              onChange={e => setEditing(p => ({ ...p, price: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <input
              placeholder="Cupos Máximos"
              type="number"
              value={editing.capacity}
              onChange={e => setEditing(p => ({ ...p, capacity: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <textarea
              placeholder="Descripción"
              value={editing.description}
              onChange={e => setEditing(p => ({ ...p, description: e.target.value }))}
              className="col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none resize-none"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-all">Cancelar</button>
            <button
              onClick={() => handleSave(editing)}
              disabled={!editing.title}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
            >
              Guardar
            </button>
          </div>
        </Card>
      )}

      {cursos.length === 0 && !editing && (
        <div className="text-center py-20 text-slate-500">No hay cursos creados. Crea uno para comenzar.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cursos.map(c => (
          <Card key={c.id} className="p-4 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-white text-lg">{c.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => setEditing(c)} className="text-slate-400 hover:text-emerald-400 transition-colors p-1"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(c.id)} className="text-slate-400 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-1">{c.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5"><Calendar size={13} className="text-emerald-500"/> {c.dates || '-'}</div>
              <div className="flex items-center gap-1.5"><Users size={13} className="text-emerald-500"/> Cupos: {c.capacity || '-'}</div>
              <div className="flex items-center gap-1.5"><DollarSign size={13} className="text-emerald-500"/> ${c.price || '-'}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Tab: Alumnos ────────────────────────────────────────────────── */
function TabAlumnos() {
  const [alumnos, setAlumnos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [snapA, snapC] = await Promise.all([
        getDocs(query(tenantCol('alumnos_academia'), orderBy('createdAt', 'desc'))),
        getDocs(query(tenantCol('cursos_academia')))
      ]);
      setAlumnos(snapA.docs.map(d => ({ id: d.id, ...d.data() })));
      setCursos(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (alumno) => {
    try {
      const isNew = !alumno.id;
      const id = isNew ? Date.now().toString() : alumno.id;
      const dataToSave = { ...alumno, id };
      if (isNew) dataToSave.createdAt = serverTimestamp();

      await setDoc(doc(tenantCol('alumnos_academia'), id), dataToSave, { merge: true });
      setEditing(null);
      fetchData();
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este alumno?')) return;
    try {
      await deleteDoc(doc(tenantCol('alumnos_academia'), id));
      fetchData();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  if (loading) return <div className="text-slate-500 animate-pulse py-10 text-center">Cargando alumnos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing({ name: '', phone: '', courseId: '', status: 'Pendiente' })}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all"
        >
          <Plus size={16} /> Añadir Alumno
        </button>
      </div>

      {editing && (
        <Card className="p-5 border-emerald-500/30">
          <h3 className="text-white font-bold mb-4">{editing.id ? 'Editar Alumno' : 'Añadir Alumno'}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder="Nombre del alumno"
              value={editing.name}
              onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
              className="col-span-2 md:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <input
              placeholder="Teléfono (Ej: +569...)"
              value={editing.phone}
              onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))}
              className="col-span-2 md:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <select
              value={editing.courseId}
              onChange={e => setEditing(p => ({ ...p, courseId: e.target.value }))}
              className="col-span-2 md:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            >
              <option value="">Seleccione un Curso</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select
              value={editing.status}
              onChange={e => setEditing(p => ({ ...p, status: e.target.value }))}
              className="col-span-2 md:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            >
              <option value="Pendiente">Pago Pendiente</option>
              <option value="Abono">Abonado</option>
              <option value="Pagado">Pagado Completo</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-all">Cancelar</button>
            <button
              onClick={() => handleSave(editing)}
              disabled={!editing.name || !editing.courseId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
            >
              Guardar
            </button>
          </div>
        </Card>
      )}

      {alumnos.length === 0 && !editing && (
        <div className="text-center py-20 text-slate-500">No hay alumnos inscritos todavía.</div>
      )}

      {alumnos.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Alumno</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Curso</th>
                  <th className="px-4 py-3">Estado Pago</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {alumnos.map(a => {
                  const cursoObj = cursos.find(c => c.id === a.courseId);
                  const statusColors = {
                    'Pagado': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    'Abono': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    'Pendiente': 'bg-red-500/10 text-red-400 border-red-500/20',
                  };
                  return (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{a.name}</td>
                      <td className="px-4 py-3">
                        <a href={`https://wa.me/${(a.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                          {a.phone || '-'}
                        </a>
                      </td>
                      <td className="px-4 py-3">{cursoObj ? cursoObj.title : <span className="text-slate-500">Curso Eliminado</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${statusColors[a.status] || statusColors['Pendiente']}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setEditing(a)} className="text-slate-400 hover:text-emerald-400 transition-colors p-1 mr-2"><Edit2 size={15} /></button>
                        <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-400 transition-colors p-1"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ── Tab: Material ───────────────────────────────────────────────── */
function TabMaterial() {
  const [material, setMaterial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(tenantCol('material_academia'), orderBy('createdAt', 'desc')));
      setMaterial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (item) => {
    try {
      const isNew = !item.id;
      const id = isNew ? Date.now().toString() : item.id;
      const dataToSave = { ...item, id };
      if (isNew) dataToSave.createdAt = serverTimestamp();

      await setDoc(doc(tenantCol('material_academia'), id), dataToSave, { merge: true });
      setEditing(null);
      fetchData();
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este material?')) return;
    try {
      await deleteDoc(doc(tenantCol('material_academia'), id));
      fetchData();
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  if (loading) return <div className="text-slate-500 animate-pulse py-10 text-center">Cargando material...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setEditing({ title: '', url: '', type: 'Video' })}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all"
        >
          <Plus size={16} /> Añadir Material
        </button>
      </div>

      {editing && (
        <Card className="p-5 border-emerald-500/30">
          <h3 className="text-white font-bold mb-4">{editing.id ? 'Editar Material' : 'Añadir Material'}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              placeholder="Título del recurso (Ej: Clase 1 - Introducción al Fade)"
              value={editing.title}
              onChange={e => setEditing(p => ({ ...p, title: e.target.value }))}
              className="col-span-2 md:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
            <select
              value={editing.type}
              onChange={e => setEditing(p => ({ ...p, type: e.target.value }))}
              className="col-span-2 md:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            >
              <option value="Video">Video (YouTube/Vimeo)</option>
              <option value="Documento">Documento / PDF</option>
              <option value="Enlace">Enlace Web</option>
            </select>
            <input
              placeholder="Enlace URL (https://...)"
              value={editing.url}
              onChange={e => setEditing(p => ({ ...p, url: e.target.value }))}
              className="col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-all">Cancelar</button>
            <button
              onClick={() => handleSave(editing)}
              disabled={!editing.title || !editing.url}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
            >
              Guardar
            </button>
          </div>
        </Card>
      )}

      {material.length === 0 && !editing && (
        <div className="text-center py-20 text-slate-500">No hay material guardado.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {material.map(m => (
          <Card key={m.id} className="p-4 flex flex-col items-start hover:border-slate-600 transition-colors group">
            <div className="w-full flex justify-between items-start mb-3">
              <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-md border border-slate-700">
                {m.type}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditing(m)} className="text-slate-400 hover:text-emerald-400 transition-colors p-1"><Edit2 size={13} /></button>
                <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-red-400 transition-colors p-1"><Trash2 size={13} /></button>
              </div>
            </div>
            <h3 className="font-bold text-white text-sm mb-3 flex-1">{m.title}</h3>
            <a
              href={m.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
            >
              <LinkIcon size={12} /> Abrir Recurso
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
