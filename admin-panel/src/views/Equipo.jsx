import { useState } from 'react';
import { Plus, Calendar, Edit2, Clock, Trash2, PowerOff, User, ShieldCheck, MessageCircle } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import Badge        from '../components/ui/Badge';
import DropdownMenu from '../components/ui/DropdownMenu';
import SlideOver    from '../components/ui/SlideOver';

const SUPPORT_EMAIL = 'ignaciiio.mate@gmail.com';
const SUPPORT_WA    = 'https://wa.me/56983568212?text=Hola%2C%20te%20escribo%20desde%20la%20agenda%2C%20necesito%20soporte.';

function BarberCard({ barber, onEdit }) {
  const isActive      = barber.disponible !== false;
  const isAdmin       = barber.rol === 'admin' || barber.rol === 'jefe';
  const isSupportAdmin = (barber.email || '').toLowerCase().trim() === SUPPORT_EMAIL;
  const colPath       = tenantCol('barberos').path;

  const toggleStatus = () =>
    updateDoc(doc(db, `${colPath}/${barber.id}`), { disponible: !isActive });

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${barber.nombre}?`)) return;
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, `${colPath}/${barber.id}`));
  };

  const menuItems = [
    { label: 'Editar datos',       Icon: Edit2,    onClick: () => onEdit(barber) },
    { label: 'Configurar horario', Icon: Clock,    onClick: () => {} },
    'separator',
    { label: isActive ? 'Desactivar' : 'Activar', Icon: PowerOff, onClick: toggleStatus },
    { label: 'Eliminar',           Icon: Trash2,   onClick: handleDelete, danger: true },
  ];

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-slate-700 transition-all group">

      {/* Dropdown — oculto para admin/jefe */}
      {!isAdmin && (
        <div className="absolute top-3 right-3">
          <DropdownMenu items={menuItems} />
        </div>
      )}

      {/* Escudo de admin (top-right cuando es admin) */}
      {isAdmin && (
        <div className="absolute top-3 right-3 text-emerald-500/60" title="Administrador">
          <ShieldCheck size={16} />
        </div>
      )}

      {/* Avatar */}
      <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
        {barber.foto
          ? <img src={barber.foto} alt={barber.nombre} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-600">
              <User size={32} />
            </div>
        }
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="font-semibold text-white text-sm">{barber.nombre}</p>
        {isAdmin && (
          <p className="text-xs text-emerald-500/70 font-semibold mt-0.5 uppercase tracking-wide">
            {barber.rol === 'jefe' ? 'Jefe' : 'Admin'}
          </p>
        )}
        {!isAdmin && barber.especialidad && (
          <p className="text-xs text-slate-500 mt-0.5">{barber.especialidad}</p>
        )}
        <div className="mt-2">
          <Badge variant={isActive ? 'active' : 'inactive'}>
            {isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>
      </div>

      {/* CTA */}
      {isSupportAdmin ? (
        <a
          href={SUPPORT_WA}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-400 text-xs font-semibold rounded-lg transition-all border border-green-600/30"
        >
          <MessageCircle size={13} /> Soporte vía WhatsApp
        </a>
      ) : (
        <button className="mt-1 flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all border border-slate-700">
          <Calendar size={13} /> Ver Agenda
        </button>
      )}
    </div>
  );
}

const BARBER_EMPTY = { nombre: '', especialidad: '' };

export default function Equipo() {
  const { data: rawBarberos, loading } = useCollection('barberos');
  // Filtrar docs de enlace UID (_mainDocId) para evitar duplicados
  const barberos = rawBarberos.filter(b => !b._mainDocId);
  const [slide,   setSlide]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(BARBER_EMPTY);

  const openEdit = b => { setEditing(b); setForm({ nombre: b.nombre, especialidad: b.especialidad || '' }); setSlide(true); };
  const openNew  = () => { setEditing(null); setForm(BARBER_EMPTY); setSlide(true); };

  const handleSave = async () => {
    const colPath = tenantCol('barberos').path;
    if (editing) {
      await updateDoc(doc(db, `${colPath}/${editing.id}`), form);
    } else {
      const { addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(tenantCol('barberos'), { ...form, disponible: true, createdAt: serverTimestamp() });
    }
    setSlide(false);
  };

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const label = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Equipo</h1>
          <p className="text-sm text-slate-500 mt-0.5">{barberos.length} miembros</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {barberos.map(b => <BarberCard key={b.id} barber={b} onEdit={openEdit} />)}
        </div>
      )}

      <SlideOver
        isOpen={slide}
        onClose={() => setSlide(false)}
        title={editing ? 'Editar barbero' : 'Nuevo barbero'}
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setSlide(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button onClick={handleSave} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all">
              {editing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={label}>Nombre</label>
            <input className={field} placeholder="Nicolás Fabián" value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </div>
          <div>
            <label className={label}>Especialidad</label>
            <input className={field} placeholder="Cortes y barba clásica" value={form.especialidad}
              onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))} />
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
