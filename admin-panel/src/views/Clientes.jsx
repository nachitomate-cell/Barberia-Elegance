import { useState, useMemo } from 'react';
import { Search, User, Phone, Mail } from 'lucide-react';
import { useCollection } from '../hooks/useCollection';
import { orderBy }       from 'firebase/firestore';
import StampProgressBar  from '../components/ui/StampProgressBar';
import Badge             from '../components/ui/Badge';

function CustomerRow({ customer, maxStamps }) {
  return (
    <tr className="hover:bg-slate-800/40 transition-colors">
      {/* Avatar + nombre */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            {customer.photoURL
              ? <img src={customer.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
              : <User size={14} className="text-slate-400" />
            }
          </div>
          <div>
            <p className="text-sm font-medium text-white">{customer.nombre || 'Sin nombre'}</p>
            <p className="text-xs text-slate-500 mt-0.5 hidden md:block">{customer.email}</p>
          </div>
        </div>
      </td>

      {/* Teléfono */}
      <td className="px-3 py-3.5 hidden sm:table-cell">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <Phone size={11} /> {customer.telefono || '—'}
        </span>
      </td>

      {/* Sellos */}
      <td className="px-3 py-3.5">
        <StampProgressBar stamps={customer.stamps ?? 0} total={maxStamps} size="sm" />
      </td>

      {/* Rol */}
      <td className="px-3 py-3.5 hidden md:table-cell">
        <Badge variant={customer.rol === 'admin' ? 'admin' : 'active'}>
          {customer.rol || 'cliente'}
        </Badge>
      </td>
    </tr>
  );
}

export default function Clientes() {
  const { data: clientes, loading } = useCollection('users', [orderBy('nombre')]);
  const [search, setSearch]         = useState('');

  const filtered = useMemo(() =>
    clientes.filter(c =>
      c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono?.includes(search)
    ),
    [clientes, search]
  );

  const maxStamps = 10;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{clientes.length} registrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          placeholder="Buscar por nombre, correo o teléfono…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sellos</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(c => <CustomerRow key={c.id} customer={c} maxStamps={maxStamps} />)}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600">
            <User size={32} className="mb-3" />
            <p className="text-sm font-medium">Sin clientes</p>
          </div>
        )}
      </div>
    </div>
  );
}
