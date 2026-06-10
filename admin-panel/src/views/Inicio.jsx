import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocs, query, where } from 'firebase/firestore';
import {
  Users, TrendingDown, DollarSign, BarChart3, RefreshCcw,
  CalendarCheck, UserPlus, ClipboardList, Cake, MessageCircle,
  ArrowUpRight, ArrowDownRight, Sparkles, Clock, ExternalLink,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { tenantCol } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

/* ── Helpers de fecha ─────────────────────────────────────────────── */
function dateToStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const localDateStr = () => dateToStr(new Date());

function monthBounds(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const last  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { first, last: dateToStr(last), key: first.slice(0, 7) };
}

const fmtCLP = v => `$${Math.round(v || 0).toLocaleString('es-CL')}`;

function parseDateStr(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  if (val.toDate)              { try { return val.toDate().toISOString().slice(0, 10); } catch { return ''; } }
  if (val instanceof Date)     return val.toISOString().slice(0, 10);
  return '';
}

const VENTA_OK = ['confirmed', 'completed', 'paid', 'delivered'];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

/* ── Badge de variación ──────────────────────────────────────────── */
function Delta({ value, invert = false }) {
  if (value === null || value === undefined || !isFinite(value)) return null;
  const flat = Math.abs(value) < 0.5;
  const up   = value > 0;
  const good = flat ? null : invert ? !up : up;
  const cls  = flat
    ? 'bg-slate-800 text-slate-400 border-slate-700'
    : good
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/15';
  const Arrow = flat ? null : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>
      {Arrow && <Arrow size={10} />}
      {flat ? '0%' : `${Math.abs(value).toFixed(1)}%`}
    </span>
  );
}

/* ── Tarjeta KPI estilo WeiBook ──────────────────────────────────── */
const KPI_TILES = {
  pink:    'bg-rose-500/15    text-rose-400',
  amber:   'bg-amber-500/15   text-amber-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  blue:    'bg-blue-500/15    text-blue-400',
};
function KpiCard({ Icon, label, value, sub, color, delta, invertDelta }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`p-2 rounded-xl ${KPI_TILES[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <Delta value={delta} invert={invertDelta} />
        {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Panel con título ────────────────────────────────────────────── */
function Panel({ title, action, children, className = '' }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const PIE_COLORS = ['#10b981', '#475569'];

export default function Inicio() {
  const tenant   = useTenant();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isAdmin  = role === 'admin' || role === 'jefe';

  const [citas,     setCitas]     = useState([]);
  const [servicios, setServicios] = useState([]);
  const [clientes,  setClientes]  = useState([]);
  const [gastos,    setGastos]    = useState([]);
  const [ventas,    setVentas]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetching,  setFetching]  = useState(false);

  const mesActual = useMemo(() => monthBounds(0),  []);
  const mesPrev   = useMemo(() => monthBounds(-1), []);

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const [citasSnap, servSnap, cliSnap, gastosSnap, ventasSnap] = await Promise.all([
        getDocs(query(tenantCol('citas'), where('fecha', '>=', mesPrev.first))),
        getDocs(tenantCol('servicios')),
        getDocs(tenantCol('clientes')),
        getDocs(tenantCol('gastos')),
        getDocs(tenantCol('product_reservations')),
      ]);
      setCitas(citasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setServicios(servSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setClientes(cliSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setGastos(gastosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setVentas(ventasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Inicio fetchData:', e);
    } finally {
      setFetching(false);
      setLoading(false);
    }
  }, [mesPrev.first]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const precioMap = useMemo(() => {
    const m = {};
    servicios.forEach(s => {
      if (s.id)     m[s.id]     = Number(s.precio) || 0;
      if (s.nombre) m[s.nombre] = Number(s.precio) || 0;
    });
    return m;
  }, [servicios]);

  const getPrice = useCallback(c =>
    c.cortesia ? 0 : (Number(c.precio) || precioMap[c.servicioId] || precioMap[c.servicioNombre] || 0),
    [precioMap]);

  /* ── Cálculo de un mes (ventas, gastos, ticket, atendidos, reservas) ── */
  const monthStats = useCallback((mb) => {
    const rango       = citas.filter(c => c.fecha >= mb.first && c.fecha <= mb.last);
    const completadas = rango.filter(c => c.estado === 'Completada');
    const ingresosServ = completadas.reduce((s, c) => s + getPrice(c), 0);

    const ventasMes = ventas.filter(v => {
      const d = parseDateStr(v.fecha || v.createdAt || v.creadoEn);
      return d >= mb.first && d <= mb.last && VENTA_OK.includes(v.status);
    });
    const ingresosProd = ventasMes.reduce((s, v) => s + (Number(v.precio) || Number(v.total) || 0), 0);

    const gastosMes = gastos.filter(g => {
      const d = parseDateStr(g.fecha || g.creadoEn);
      return d >= mb.first && d <= mb.last;
    }).reduce((s, g) => s + (Number(g.monto) || 0), 0);

    const atendidos = new Set(completadas.map(c => c.clienteNombre || c.clienteId).filter(Boolean)).size;
    const ventasTot = ingresosServ + ingresosProd;

    return {
      ventas:      ventasTot,
      gastos:      gastosMes,
      reservas:    rango.length,
      completadas: completadas.length,
      ticket:      completadas.length ? ingresosServ / completadas.length : 0,
      atendidos,
    };
  }, [citas, ventas, gastos, getPrice]);

  const cur  = useMemo(() => monthStats(mesActual), [monthStats, mesActual]);
  const prev = useMemo(() => monthStats(mesPrev),   [monthStats, mesPrev]);

  const pctDelta = (a, b) => (!b ? (a > 0 ? 100 : null) : ((a - b) / b) * 100);

  /* ── Nuevos clientes este mes (si hay timestamp de registro) ── */
  const nuevosMes = useMemo(() => {
    return clientes.filter(c => {
      const d = parseDateStr(c.creadoEn || c.createdAt || c.fechaRegistro || c.fechaRegistroOriginal);
      return d >= mesActual.first && d <= mesActual.last;
    }).length;
  }, [clientes, mesActual]);

  /* ── Últimas visitas (completadas más recientes) ── */
  const ultimasVisitas = useMemo(() =>
    citas
      .filter(c => c.estado === 'Completada')
      .sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')))
      .slice(0, 7),
    [citas]);

  /* ── Reservas de hoy ── */
  const reservasHoy = useMemo(() => {
    const hoy = localDateStr();
    return citas
      .filter(c => c.fecha === hoy && c.estado !== 'Cancelada')
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  }, [citas]);

  /* ── Fidelización (reemplaza "Edad de clientes") ── */
  const fidelizacion = useMemo(() => {
    const sellos = c => c.sellosHistoricos ?? c.stamps ?? 0;
    const con = clientes.filter(c => sellos(c) > 0).length;
    const sin = clientes.length - con;
    return {
      data: [{ name: 'Con sellos', value: con }, { name: 'Sin sellos', value: sin }],
      con, sin, total: clientes.length,
      pct: clientes.length ? Math.round((con / clientes.length) * 100) : 0,
    };
  }, [clientes]);

  /* ── Cumpleaños del mes ── */
  const cumpleaneros = useMemo(() => {
    const mm = String(new Date().getMonth() + 1).padStart(2, '0');
    return clientes
      .filter(c => {
        if (c.cumpleDia)       return c.cumpleDia.startsWith(mm + '-');
        if (c.fechaNacimiento) return c.fechaNacimiento.split('-')[1] === mm;
        return false;
      })
      .map(c => {
        const fn = c.fechaNacimiento || '';
        const dia = c.cumpleDia ? c.cumpleDia.split('-')[1] : (fn.split('-')[2] || '');
        return { ...c, _dia: Number(dia) || 99 };
      })
      .sort((a, b) => a._dia - b._dia);
  }, [clientes]);

  const cumpleWaUrl = useCallback((c) => {
    const raw = (c.telefono || '').replace(/\D/g, '');
    if (!raw || raw.length < 8) return null;
    const num = raw.startsWith('56') ? raw : `56${raw}`;
    const msg = `¡Feliz cumpleaños ${c.nombre || ''}! 🎉 De parte de todo el equipo de ${tenant.name} te deseamos un gran día. Te esperamos pronto. 🎁`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }, [tenant.name]);

  const userName = (user?.displayName || user?.email || '').split('@')[0].split(' ')[0];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {tenant.logo && <img src={tenant.logo} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />}
          <div>
            <h1 className="text-xl font-bold text-white">
              {greeting()}{userName ? `, ${userName}` : ''} 👋
            </h1>
            <p className="text-sm text-slate-500">Resumen de {tenant.name}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={fetching}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 disabled:opacity-40 transition-all self-start"
        >
          <RefreshCcw size={12} className={fetching ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          Icon={Users} color="pink" label="Total clientes"
          value={clientes.length.toLocaleString('es-CL')}
          sub={`${nuevosMes} nuevo${nuevosMes !== 1 ? 's' : ''} este mes`}
        />
        {isAdmin ? (
          <KpiCard
            Icon={TrendingDown} color="amber" label="Gastos del mes"
            value={fmtCLP(cur.gastos)}
            delta={pctDelta(cur.gastos, prev.gastos)} invertDelta
            sub="vs. mes anterior"
          />
        ) : (
          <KpiCard
            Icon={CalendarCheck} color="amber" label="Citas completadas"
            value={cur.completadas.toLocaleString('es-CL')}
            delta={pctDelta(cur.completadas, prev.completadas)}
            sub="este mes"
          />
        )}
        <KpiCard
          Icon={DollarSign} color="emerald" label="Ventas del mes"
          value={fmtCLP(cur.ventas)}
          delta={pctDelta(cur.ventas, prev.ventas)}
          sub="vs. mes anterior"
        />
        <KpiCard
          Icon={BarChart3} color="blue" label="Crecimiento"
          value={(() => { const d = pctDelta(cur.ventas, prev.ventas); return d === null ? '—' : `${d > 0 ? '+' : ''}${d.toFixed(0)}%`; })()}
          sub="ventas vs. mes anterior"
        />
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { Icon: DollarSign,   label: 'Saldo promedio de ventas',     value: fmtCLP(cur.ticket),  hint: 'Ticket promedio del mes' },
          { Icon: UserPlus,     label: 'Clientes atendidos',           value: cur.atendidos,       hint: 'Clientes únicos este mes' },
          { Icon: ClipboardList,label: 'Reservas recibidas',           value: cur.reservas,        hint: 'Citas agendadas este mes' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 shrink-0"><s.Icon size={20} /></div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs font-semibold text-slate-400">{s.label}</p>
              <p className="text-[11px] text-slate-600">{s.hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Reservas de hoy + Fidelización */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel
          title="Reservas de hoy"
          className="lg:col-span-2"
          action={
            <button onClick={() => navigate('/agenda')} className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              Ver agenda <ExternalLink size={12} />
            </button>
          }
        >
          {reservasHoy.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8">No hay reservas para hoy.</p>
          ) : (
            <div className="space-y-2">
              {reservasHoy.map((c, i) => (
                <div key={c.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                  <div className="flex flex-col items-center justify-center w-14 shrink-0">
                    <Clock size={13} className="text-emerald-400 mb-0.5" />
                    <span className="text-xs font-bold text-white">{c.hora || '--:--'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{c.clienteNombre || 'Cliente'}</p>
                    <p className="text-xs text-slate-500 truncate">{c.servicioNombre || 'Servicio'}{c.barbero ? ` · ${c.barbero}` : ''}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    c.estado === 'Completada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/15'
                  }`}>{c.estado || 'Pendiente'}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Fidelización del Club">
          {fidelizacion.total === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-8">Aún no hay clientes registrados.</p>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={fidelizacion.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                      {fidelizacion.data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-white">{fidelizacion.pct}%</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">con sellos</span>
                </div>
              </div>
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Con sellos</span>
                  <span className="font-bold text-white">{fidelizacion.con}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-400"><span className="w-2.5 h-2.5 rounded-full bg-slate-600" />Sin sellos</span>
                  <span className="font-bold text-white">{fidelizacion.sin}</span>
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Últimas visitas */}
      <Panel
        title="Últimas visitas"
        action={
          <button onClick={() => navigate('/clientes')} className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            Ver clientes <ExternalLink size={12} />
          </button>
        }
      >
        {ultimasVisitas.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-8">Sin visitas registradas todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] text-slate-500 uppercase tracking-wide border-b border-slate-800">
                  <th className="py-2 font-bold">Nombre</th>
                  <th className="py-2 font-bold hidden sm:table-cell">Servicio</th>
                  <th className="py-2 font-bold">Fecha</th>
                  <th className="py-2 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ultimasVisitas.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-slate-800/20">
                    <td className="py-2.5 font-semibold text-white">{c.clienteNombre || 'Cliente'}</td>
                    <td className="py-2.5 text-slate-400 hidden sm:table-cell">{c.servicioNombre || '—'}</td>
                    <td className="py-2.5 text-slate-400">{c.fecha}{c.hora ? `, ${c.hora}` : ''}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-400">{fmtCLP(getPrice(c))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Cumpleaños del mes */}
      <Panel title={<span className="flex items-center gap-2"><Cake size={16} className="text-pink-400" />Cumpleaños este mes</span>}>
        {cumpleaneros.length === 0 ? (
          <p className="text-sm text-slate-500 italic text-center py-8">No hay cumpleaños registrados este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] text-slate-500 uppercase tracking-wide border-b border-slate-800">
                  <th className="py-2 font-bold">Día</th>
                  <th className="py-2 font-bold">Nombre</th>
                  <th className="py-2 font-bold hidden sm:table-cell">Teléfono</th>
                  <th className="py-2 font-bold text-right">Saludar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cumpleaneros.map((c, i) => {
                  const wa = cumpleWaUrl(c);
                  return (
                    <tr key={c.id || i} className="hover:bg-slate-800/20">
                      <td className="py-2.5 text-slate-400">{c._dia < 99 ? String(c._dia).padStart(2, '0') : '—'}</td>
                      <td className="py-2.5 font-semibold text-white">{c.nombre || 'Cliente'}</td>
                      <td className="py-2.5 text-slate-400 hidden sm:table-cell">{c.telefono || '—'}</td>
                      <td className="py-2.5 text-right">
                        {wa ? (
                          <a href={wa} target="_blank" rel="noopener noreferrer"
                             className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        ) : <span className="text-xs text-slate-600">Sin teléfono</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

    </div>
  );
}
