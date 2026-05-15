import { useState, useEffect } from 'react';
import {
  Scissors, User, Calendar, DollarSign, Image, FileText,
  Plus, Search, ChevronRight, Clock, Phone,
} from 'lucide-react';
import {
  collection, addDoc, getDocs, query, orderBy, limit,
  serverTimestamp, where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { useTenant } from '../contexts/TenantContext';
import { useAuth }   from '../contexts/AuthContext';
import SlideOver from '../components/ui/SlideOver';

/* ── Utilidades ── */
function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtPrice(n) {
  if (!n) return null;
  return '$' + Number(n).toLocaleString('es-CL');
}
function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0, 2).join('') || '?';
}
function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

/* ── Form de nueva visita ── */
function NuevaVisitaForm({ servicios, barberos, onSave, onClose }) {
  const { id: tenantId } = useTenant();
  const { user } = useAuth();

  const [form, setForm] = useState({
    clienteNombre:    '',
    clienteTelefono:  '',
    servicio:         '',
    barberoId:        '',
    barberoNombre:    '',
    fecha:            new Date().toISOString().slice(0, 16),
    precio:           '',
    foto:             '',
    notas:            '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function onBarberoChange(id) {
    const b = barberos.find(b => b.id === id);
    set('barberoId',    id);
    set('barberoNombre', b?.nombre || b?.name || '');
  }

  async function handleSave() {
    if (!form.clienteNombre.trim()) { setError('Ingresa el nombre del cliente.'); return; }
    if (!form.servicio.trim())       { setError('Selecciona o escribe el servicio.'); return; }
    setError('');
    setSaving(true);
    try {
      const col = tenantId === 'elegance'
        ? collection(db, 'historial')
        : collection(db, 'tenants', tenantId, 'historial');

      await addDoc(col, {
        clienteNombre:   form.clienteNombre.trim(),
        clienteTelefono: normalizePhone(form.clienteTelefono),
        servicio:        form.servicio,
        barberoId:       form.barberoId || null,
        barberoNombre:   form.barberoNombre || null,
        fecha:           new Date(form.fecha),
        precio:          form.precio ? Number(form.precio) : null,
        foto:            form.foto.trim() || null,
        notas:           form.notas.trim() || null,
        tenantId,
        registradoPor:   user?.uid || null,
        creadoEn:        serverTimestamp(),
      });
      onSave();
    } catch(e) {
      setError('Error al guardar. Intenta nuevamente.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Cliente */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Cliente</p>
        <div className="space-y-3">
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              placeholder="Nombre del cliente *"
              value={form.clienteNombre}
              onChange={e => set('clienteNombre', e.target.value)}
            />
          </div>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              placeholder="Teléfono (para que el cliente vea en historial)"
              type="tel"
              value={form.clienteTelefono}
              onChange={e => set('clienteTelefono', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Servicio */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Servicio</p>
        <div className="relative">
          <Scissors size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          {servicios.length > 0 ? (
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 appearance-none"
              value={form.servicio}
              onChange={e => set('servicio', e.target.value)}
            >
              <option value="">Seleccionar servicio *</option>
              {servicios.map(s => (
                <option key={s.id} value={s.nombre}>{s.nombre}</option>
              ))}
            </select>
          ) : (
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              placeholder="Nombre del servicio *"
              value={form.servicio}
              onChange={e => set('servicio', e.target.value)}
            />
          )}
        </div>
      </div>

      {/* Barbero */}
      {barberos.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Barbero</p>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 appearance-none"
              value={form.barberoId}
              onChange={e => onBarberoChange(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {barberos.map(b => (
                <option key={b.id} value={b.id}>{b.nombre || b.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Fecha y Precio */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Fecha</p>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="datetime-local"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-2 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              value={form.fecha}
              onChange={e => set('fecha', e.target.value)}
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Precio</p>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
              placeholder="$ opcional"
              value={form.precio}
              onChange={e => set('precio', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Foto */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Foto del resultado</p>
        <div className="relative">
          <Image size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
            placeholder="URL de la foto (opcional)"
            value={form.foto}
            onChange={e => set('foto', e.target.value)}
          />
        </div>
        {form.foto && (
          <img
            src={form.foto}
            alt="Preview"
            className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-700"
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
      </div>

      {/* Notas */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Notas</p>
        <div className="relative">
          <FileText size={14} className="absolute left-3 top-3.5 text-slate-500" />
          <textarea
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 resize-none"
            placeholder="Estilo, preferencias del cliente, referencias… (opcional)"
            rows={3}
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-xl px-3 py-2">{error}</p>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando…</>
            : <><Scissors size={15} /> Registrar visita</>}
        </button>
      </div>
    </div>
  );
}

/* ── Tarjeta de visita ── */
function VisitCard({ v }) {
  return (
    <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl border border-slate-700/50 p-3 hover:border-slate-600 transition-colors">
      {v.foto ? (
        <img
          src={v.foto}
          alt="Corte"
          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-700"
          onError={e => { e.target.outerHTML = `<div class="w-14 h-14 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0"><svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' fill='none' viewBox='0 0 256 256'><path d='M...' /></svg></div>`; }}
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-slate-700/50 border border-slate-700 flex items-center justify-center flex-shrink-0">
          <Scissors size={20} className="text-slate-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-white truncate">{v.clienteNombre || '—'}</p>
          {v.clienteTelefono && (
            <span className="text-[10px] text-slate-500 font-medium shrink-0">
              +{v.clienteTelefono}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          {v.servicio || '—'}{v.barberoNombre ? ` · ${v.barberoNombre}` : ''}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <Clock size={10} />{fmtDate(v.fecha)}
          </span>
          {v.precio && (
            <span className="text-[10px] font-bold text-emerald-400">{fmtPrice(v.precio)}</span>
          )}
        </div>
        {v.notas && (
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{v.notas}</p>
        )}
      </div>
    </div>
  );
}

/* ── Vista principal ── */
export default function HistorialCortes() {
  const { id: tenantId } = useTenant();
  const [open,  setOpen]  = useState(false);
  const [q,     setQ]     = useState('');
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const servicios = useCollection(tenantCol('servicios'));
  const barberos  = useCollection(tenantCol('barberos'));

  useEffect(() => {
    setLoading(true);
    const col = tenantId === 'elegance'
      ? collection(db, 'historial')
      : collection(db, 'tenants', tenantId, 'historial');

    getDocs(query(col, orderBy('fecha', 'desc'), limit(200)))
      .then(snap => {
        setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantId, refreshKey]);

  const filtered = q
    ? visits.filter(v => {
        const hay = [v.clienteNombre, v.clienteTelefono, v.servicio, v.barberoNombre, v.notas]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q.toLowerCase());
      })
    : visits;

  function onSave() {
    setOpen(false);
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Historial de cortes</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {visits.length} visita{visits.length !== 1 ? 's' : ''} registrada{visits.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors shrink-0"
        >
          <Plus size={16} /> Registrar visita
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          placeholder="Buscar por nombre, teléfono o servicio…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3 bg-slate-800/60 rounded-xl border border-slate-700/50 p-3 animate-pulse">
              <div className="w-14 h-14 rounded-xl bg-slate-700 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-slate-700 rounded w-1/2" />
                <div className="h-2.5 bg-slate-700 rounded w-1/3" />
                <div className="h-2 bg-slate-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3">
            <Scissors size={24} className="text-slate-600" />
          </div>
          <p className="font-semibold text-slate-300 mb-1">
            {q ? 'Sin resultados' : 'Sin visitas registradas'}
          </p>
          <p className="text-sm text-slate-500 max-w-xs">
            {q ? `No encontramos visitas que coincidan con "${q}".` : 'Registra la primera visita de hoy con el botón de arriba.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(v => <VisitCard key={v.id} v={v} />)}
        </div>
      )}

      {/* SlideOver: nueva visita */}
      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar visita"
      >
        <NuevaVisitaForm
          servicios={servicios}
          barberos={barberos}
          onSave={onSave}
          onClose={() => setOpen(false)}
        />
      </SlideOver>
    </div>
  );
}
