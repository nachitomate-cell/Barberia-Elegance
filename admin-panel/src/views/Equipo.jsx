import { useState } from 'react';
import { Calendar, Edit2, Clock, Trash2, PowerOff, User, ShieldCheck, MessageCircle } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useTenant } from '../contexts/TenantContext';
import Badge        from '../components/ui/Badge';
import DropdownMenu from '../components/ui/DropdownMenu';
import SlideOver    from '../components/ui/SlideOver';

const SUPPORT_EMAIL = 'ignaciiio.mate@gmail.com';

function buildWaUrl(tenantName) {
  const msg = `Hola, te escribo desde la agenda (${tenantName}), necesito ayuda con la agenda/panel administrativo`;
  return `https://wa.me/56983568212?text=${encodeURIComponent(msg)}`;
}

function BarberCard({ barber, onEdit, waUrl }) {
  const isActive       = barber.disponible !== false;
  const isStrictAdmin  = barber.rol === 'admin';
  const isAdmin        = barber.rol === 'admin' || barber.rol === 'jefe';
  const isSupportAdmin = (barber.email || '').toLowerCase().trim() === SUPPORT_EMAIL;
  const colPath        = tenantCol('barberos').path;

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

      {/* Dropdown — oculto solo para admin (rol estricto) */}
      {!isStrictAdmin && (
        <div className="absolute top-3 right-3">
          <DropdownMenu items={menuItems} />
        </div>
      )}

      {/* Escudo de admin */}
      {isAdmin && (
        <div className="absolute top-3 right-3 text-emerald-500/60" title="Administrador">
          {isStrictAdmin && <ShieldCheck size={16} />}
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
          href={waUrl}
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

const DIAS_SEMANA = [
  { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mié' },
  { v: 4, l: 'Jue' }, { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }, { v: 0, l: 'Dom' },
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
  ['00', '30'].map(m => `${String(h).padStart(2,'0')}:${m}`)
).flat();

const BARBER_EMPTY = { nombre: '', especialidad: '', servicios: [], horarioInicio: '09:00', horarioFin: '20:00', diasLaborales: [1,2,3,4,5,6] };

export default function Equipo() {
  const tenant = useTenant();
  const waUrl  = buildWaUrl(tenant.name);

  const { data: rawBarberos, loading } = useCollection('barberos');
  const { data: servicios }            = useCollection('servicios');

  // Filtrar docs de enlace UID (_mainDocId) para evitar duplicados
  const barberos = rawBarberos.filter(b => !b._mainDocId);

  const [slide,   setSlide]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(BARBER_EMPTY);

  const openEdit = b => {
    setEditing(b);
    setForm({
      nombre:        b.nombre,
      especialidad:  b.especialidad  || '',
      servicios:     b.servicios     || [],
      horarioInicio: b.horarioInicio || '09:00',
      horarioFin:    b.horarioFin    || '20:00',
      diasLaborales: b.diasLaborales || [1,2,3,4,5,6],
    });
    setSlide(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    const colPath = tenantCol('barberos').path;
    await updateDoc(doc(db, `${colPath}/${editing.id}`), form);
    setSlide(false);
  };

  const toggleServicio = (id) =>
    setForm(f => ({
      ...f,
      servicios: f.servicios.includes(id)
        ? f.servicios.filter(s => s !== id)
        : [...f.servicios, id],
    }));

  const field = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors';
  const label = 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Equipo</h1>
        <p className="text-sm text-slate-500 mt-0.5">{barberos.length} miembros</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {barberos.map(b => <BarberCard key={b.id} barber={b} onEdit={openEdit} waUrl={waUrl} />)}
        </div>
      )}

      <SlideOver
        isOpen={slide}
        onClose={() => setSlide(false)}
        title="Editar barbero"
        footer={
          <div className="flex gap-3 justify-end">
            <button onClick={() => setSlide(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all">Cancelar</button>
            <button onClick={handleSave} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all">
              Guardar
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

          {/* Horario */}
          <div>
            <label className={label}>Horario de trabajo</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Inicio</p>
                <select className={field} value={form.horarioInicio} onChange={e => setForm(f => ({ ...f, horarioInicio: e.target.value }))}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Fin</p>
                <select className={field} value={form.horarioFin} onChange={e => setForm(f => ({ ...f, horarioFin: e.target.value }))}>
                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Días laborales */}
          <div>
            <label className={label}>Días de trabajo</label>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA.map(({ v, l }) => {
                const on = form.diasLaborales.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      diasLaborales: on
                        ? f.diasLaborales.filter(d => d !== v)
                        : [...f.diasLaborales, v],
                    }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      on ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={label}>Servicios que realiza</label>
            <p className="text-[10px] text-slate-500 mb-2">Si no seleccionas ninguno, aparecerá para todos los servicios.</p>
            {servicios.length === 0 ? (
              <p className="text-xs text-slate-600 italic">Sin servicios configurados</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {servicios.map(s => {
                  const checked = form.servicios.includes(s.id);
                  return (
                    <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleServicio(s.id)}
                        className="w-4 h-4 accent-emerald-500 shrink-0"
                      />
                      <span className="text-sm text-white">{s.nombre}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
