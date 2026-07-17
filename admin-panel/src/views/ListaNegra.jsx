import { useState, useEffect, useMemo } from 'react';
import { getDocs, query, where, limit } from 'firebase/firestore';
import {
  UserX, Phone, Calendar, MessageCircle, Search, AlertTriangle, History,
} from 'lucide-react';
import { tenantCol } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}
function normName(s) {
  return (s || '').trim().toLowerCase();
}
function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}
function whatsappLink(phone, msg) {
  const p = normalizePhone(phone);
  if (!p) return null;
  const intl = p.startsWith('56') ? p : `56${p}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
}

export default function ListaNegra() {
  const [loading,  setLoading]  = useState(true);
  const [groups,   setGroups]   = useState([]);
  const [term,     setTerm]     = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [history,  setHistory]  = useState({});

  useEffect(() => {
    let alive = true;
    withTimeout(
      getDocs(query(
        tenantCol('citas'),
        where('estado', '==', 'Cancelada'),
        limit(2000),
      )),
      30000,
      'lista-negra',
    ).then(snap => {
      if (!alive) return;
      const map = new Map();
      snap.docs.forEach(d => {
        const c = d.data();
        const nombre = (c.clienteNombre || '').trim();
        if (!nombre) return;
        const key = c.clienteUid || normName(nombre);
        const prev = map.get(key) || {
          key,
          nombre,
          telefono: c.clienteTelefono || '',
          email:    c.clienteEmail    || '',
          uid:      c.clienteUid      || null,
          count:    0,
          last:     null,
          citas:    [],
        };
        prev.count += 1;
        if (!prev.telefono && c.clienteTelefono) prev.telefono = c.clienteTelefono;
        if (!prev.email    && c.clienteEmail)    prev.email    = c.clienteEmail;
        if (!prev.last || (c.fecha || '') > prev.last) prev.last = c.fecha || prev.last;
        prev.citas.push({
          id:       d.id,
          fecha:    c.fecha,
          hora:     c.hora,
          servicio: c.servicioNombre,
          barbero:  c.barbero,
        });
        map.set(key, prev);
      });
      const arr = Array.from(map.values())
        .filter(g => g.count >= 2)
        .map(g => ({ ...g, citas: g.citas.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')) }))
        .sort((a, b) => b.count - a.count || (b.last || '').localeCompare(a.last || ''));
      setGroups(arr);
      setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return groups;
    return groups.filter(g =>
      g.nombre.toLowerCase().includes(t)
      || (g.telefono || '').includes(t)
      || (g.email || '').toLowerCase().includes(t),
    );
  }, [groups, term]);

  async function loadHistory(group) {
    if (history[group.key]) return;
    try {
      const snap = await withTimeout(
        getDocs(query(
          tenantCol('citas'),
          where('clienteNombre', '==', group.nombre),
          limit(200),
        )),
        15000,
        'lista-negra/historial',
      );
      const rows = snap.docs.map(d => d.data());
      const total       = rows.length;
      const completadas = rows.filter(r => r.estado === 'Completada').length;
      setHistory(h => ({ ...h, [group.key]: { total, completadas } }));
    } catch { /* sin total: mostramos solo el conteo de cancelaciones */ }
  }

  function toggle(group) {
    const next = expanded === group.key ? null : group.key;
    setExpanded(next);
    if (next) loadHistory(group);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="w-8 h-8 border-2 border-slate-700 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Analizando historial de citas…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <UserX size={20} className="text-red-400" />
            Lista Negra
          </h1>
          <HelpButton onClick={() => setShowHelp(true)} />
        </div>
        <p className="text-sm text-slate-500">
          Clientes con más cancelaciones — útil para reconfirmar antes de la cita o pedir abono.
        </p>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={term}
          onChange={e => setTerm(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email…"
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
        />
      </div>

      {/* Estado vacío */}
      {filtered.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-6 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <UserX size={22} className="text-emerald-400" />
          </div>
          {term ? (
            <p className="text-sm text-slate-500">Ningún cliente coincide con la búsqueda.</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-primary mb-1">Sin reincidentes por ahora</p>
              <p className="text-xs text-slate-500">Aparecerán aquí los clientes con 2 o más cancelaciones registradas.</p>
            </>
          )}
        </div>
      )}

      {/* Lista */}
      {filtered.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-800/30">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
            </p>
            <p className="text-[10px] text-slate-600">
              Top: {filtered[0]?.count} cancelaciones
            </p>
          </div>

          <ul className="divide-y divide-slate-800/60">
            {filtered.map((g, idx) => {
              const isOpen = expanded === g.key;
              const hist   = history[g.key];
              const rate   = hist && hist.total > 0
                ? Math.round((g.count / hist.total) * 100)
                : null;
              const intensity =
                g.count >= 8 ? 'high'   :
                g.count >= 4 ? 'medium' : 'low';
              const ringClass =
                intensity === 'high'   ? 'border-red-500/40 bg-red-500/5'     :
                intensity === 'medium' ? 'border-amber-500/30 bg-amber-500/5' :
                                         'border-slate-700/40';

              const waLink = whatsappLink(
                g.telefono,
                `Hola ${g.nombre}, te escribimos desde la barbería para reconfirmar tu próxima cita.`,
              );

              return (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => toggle(g)}
                    className="w-full text-left px-5 py-4 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg border flex flex-col items-center justify-center shrink-0 ${ringClass}`}>
                        <p className="text-sm font-black text-primary leading-none">{g.count}</p>
                        <p className="text-[8px] text-slate-500 uppercase tracking-wider leading-none mt-0.5">canc</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary truncate">
                          {idx < 3 && <span className="text-amber-400 mr-1">#{idx + 1}</span>}
                          {g.nombre}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {g.telefono && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Phone size={10} /> {g.telefono}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar size={10} /> última {fmtFecha(g.last)}
                          </span>
                        </div>
                      </div>
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Reconfirmar por WhatsApp"
                          className="w-9 h-9 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 flex items-center justify-center transition-colors shrink-0"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-slate-950/40 px-5 py-4 border-t border-slate-800/60 space-y-3">
                      {rate != null && (
                        <div className="flex items-center justify-between bg-red-950/20 border border-red-500/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={12} className="text-red-400" />
                            <span className="text-[11px] text-slate-300">Tasa de cancelación</span>
                          </div>
                          <span className="text-xs font-bold text-red-400">
                            {rate}% <span className="text-slate-500 font-normal">({g.count}/{hist.total})</span>
                          </span>
                        </div>
                      )}

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                          Citas canceladas ({g.citas.length})
                        </p>
                        <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {g.citas.slice(0, 12).map(c => (
                            <li key={c.id} className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                              <History size={10} className="text-slate-600 shrink-0" />
                              <span className="font-mono text-slate-500">{fmtFecha(c.fecha)} {c.hora ? `· ${c.hora}` : ''}</span>
                              {c.servicio && <><span className="text-slate-600">·</span><span className="truncate">{c.servicio}</span></>}
                              {c.barbero  && <span className="text-slate-600">— {c.barbero}</span>}
                            </li>
                          ))}
                          {g.citas.length > 12 && (
                            <li className="text-[10px] text-slate-600 italic">… y {g.citas.length - 12} más</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showHelp && (
        <HelpModal title="Cómo usar la Lista Negra" onClose={() => setShowHelp(false)}>
          <p>
            Esta vista muestra a los clientes con <strong className="text-primary">2 o más cancelaciones</strong> registradas en tu sistema, ordenados del más reincidente al menos.
          </p>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">Cómo se calcula</p>
            <p>Contamos cualquier cita con estado <strong className="text-primary">Cancelada</strong> agrupada por cliente (uid del club o nombre). Al expandir la fila se calcula también la tasa de cancelación sobre el total de citas del cliente.</p>
          </div>
          <div>
            <p className="font-semibold text-emerald-400 mb-1">Acciones recomendadas</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Usa el botón verde para reconfirmar por WhatsApp antes de la próxima cita.</li>
              <li>Considera pedir abono o seña a clientes con tasa &gt; 25%.</li>
              <li>Si acumula 5+ cancelaciones, evalúa bloquear su acceso al club desde la ficha de Clientes.</li>
            </ul>
          </div>
          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
            💡 El color del badge refleja el nivel de reincidencia: gris (2-3), ámbar (4-7), rojo (8+).
          </p>
        </HelpModal>
      )}
    </div>
  );
}
