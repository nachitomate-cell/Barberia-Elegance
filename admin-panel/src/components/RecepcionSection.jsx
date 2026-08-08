import { useState, useMemo } from 'react';
import { doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  UserCog, Plus, KeyRound, Trash2, Loader2, Check, ShieldCheck, Eye, EyeOff,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { tenantCol, resolveTenantId } from '../lib/tenantUtils';
import { useCollection } from '../hooks/useCollection';
import { usePermisosRecepcion } from '../hooks/usePermisosRecepcion';
import { modulosRecepcion } from './layout/Sidebar';
import { confirmDialog } from '../lib/confirmDialog';

/* Configuración → Recepción: el admin crea y administra la cuenta del
   mostrador sin pasar por SynapTech, y decide qué módulos del panel puede
   usar. Los toggles viven en `configuracion/recepcion.permisos` y los
   aplican el Sidebar y el guard de rutas (App.jsx).

   Importante: esto gestiona VISIBILIDAD de módulos operacionales. Los
   números del negocio (métricas, gastos, facturación, comisiones, equipo)
   no son concedibles desde acá — siguen cerrados por firestore.rules. */

const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-primary placeholder-slate-500 focus:border-emerald-500 focus:outline-none';

function CuentaRecepcion({ r, onEliminar }) {
  const [clave, setClave]       = useState('');
  const [verClave, setVerClave] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [msg, setMsg]           = useState('');

  const cambiarClave = async () => {
    if (clave.length < 6) { setMsg('Mínimo 6 caracteres.'); return; }
    setCambiando(true); setMsg('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'cambiarPasswordStaff');
      await fn({ email: r.email, nuevaPassword: clave, tenantId: resolveTenantId() });
      setClave(''); setMsg('✓ Clave actualizada. Comunícasela por WhatsApp o en persona.');
    } catch (e) {
      setMsg(String(e?.message || 'No se pudo cambiar la clave.').replace(/^\[.*?\]\s*/, ''));
    } finally { setCambiando(false); }
  };

  return (
    <div className="border border-slate-700/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-primary truncate">{r.nombre || 'Recepcionista'}</p>
          <p className="text-xs text-slate-400 truncate">{r.email}</p>
        </div>
        <button onClick={onEliminar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all shrink-0">
          <Trash2 size={12} /> Eliminar
        </button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type={verClave ? 'text' : 'password'} value={clave} autoComplete="new-password"
            onChange={e => setClave(e.target.value)} placeholder="Nueva contraseña" className={inp} />
          <button type="button" onClick={() => setVerClave(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {verClave ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <button onClick={cambiarClave} disabled={cambiando || !clave}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-all shrink-0">
          {cambiando ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />} Cambiar clave
        </button>
      </div>
      {msg && <p className={`text-[11px] ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</p>}
    </div>
  );
}

export default function RecepcionSection() {
  const { data: barberos = [] } = useCollection('barberos');
  const permisos = usePermisosRecepcion();
  const modulos  = useMemo(() => modulosRecepcion(), []);

  const recepcionistas = useMemo(
    () => barberos.filter(b => b.rol === 'recepcion' && !b._mainDocId),
    [barberos],
  );

  // ── Crear cuenta ──
  const [form, setForm]       = useState({ nombre: '', email: '', clave: '' });
  const [creando, setCreando] = useState(false);
  const [crearMsg, setCrearMsg] = useState('');

  const crear = async () => {
    const email = form.email.trim().toLowerCase();
    if (!form.nombre.trim()) { setCrearMsg('Ingresa un nombre.'); return; }
    if (!email.includes('@')) { setCrearMsg('Ingresa un email válido — será su usuario de acceso.'); return; }
    if (form.clave.length < 6) { setCrearMsg('La contraseña debe tener al menos 6 caracteres.'); return; }
    setCreando(true); setCrearMsg('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'crearAccesoStaff');
      const res = await fn({
        email, password: form.clave, displayName: form.nombre.trim(),
        tenantId: resolveTenantId(), rol: 'recepcion',
      });
      const uid = res?.data?.uid;
      // Doc principal + doc-espejo por UID (el estándar de roles: el panel
      // resuelve el rol leyendo barberos/{uid}). disponible/esBarbero en
      // false: recepción no aparece como columna reservable en la agenda.
      const mainRef = await addDoc(tenantCol('barberos'), {
        nombre: form.nombre.trim(), email, rol: 'recepcion', activo: true,
        authUid: uid, disponible: false, mostrarEnAgenda: false, esBarbero: false,
        creadoEn: serverTimestamp(),
      });
      if (uid) {
        await setDoc(doc(db, `${tenantCol('barberos').path}/${uid}`), {
          _mainDocId: mainRef.id, uid, email, nombre: form.nombre.trim(),
          rol: 'recepcion', activo: true,
        }, { merge: true });
      }
      setForm({ nombre: '', email: '', clave: '' });
      setCrearMsg('✓ Cuenta creada. Entra en este mismo panel con ese email y contraseña.');
    } catch (e) {
      setCrearMsg(String(e?.message || 'No se pudo crear la cuenta.').replace(/^\[.*?\]\s*/, ''));
    } finally { setCreando(false); }
  };

  const eliminar = async (r) => {
    if (!(await confirmDialog(`¿Eliminar a ${r.nombre || r.email}? Se cierra también su acceso al panel.`))) return;
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'staffEliminarAcceso');
      await fn({ tenantId: resolveTenantId(), docId: r.id });
    } catch (e) {
      window.alert(String(e?.message || 'No se pudo eliminar.').replace(/^\[.*?\]\s*/, ''));
    }
  };

  // ── Permisos ──
  const [guardandoPermiso, setGuardandoPermiso] = useState('');
  const togglePermiso = async (m) => {
    const actual = permisos?.[m.id];
    const efectivo = m.grant ? actual === true : actual !== false;
    setGuardandoPermiso(m.id);
    try {
      await setDoc(doc(db, `${tenantCol('configuracion').path}/recepcion`), {
        permisos: { [m.id]: !efectivo },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } finally { setGuardandoPermiso(''); }
  };

  return (
    <div className="space-y-5">

      {/* Qué es */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 flex items-start gap-3">
        <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[12px] text-slate-300 leading-relaxed">
          La cuenta de <b>recepción</b> opera el mostrador. Por defecto ve lo operacional
          — agenda, clientes, caja, inventario — <b>sin los números del negocio</b>.
          Abajo decides exactamente qué módulos puede usar: los marcados
          «normalmente solo admin» se conceden bajo tu criterio. Configuración
          queda siempre reservada al admin.
        </p>
      </div>

      {/* Cuentas existentes */}
      {recepcionistas.map(r => (
        <CuentaRecepcion key={r.id} r={r} onEliminar={() => eliminar(r)} />
      ))}

      {/* Crear cuenta */}
      <div className="border border-slate-700/50 rounded-lg p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
          <Plus size={12} /> {recepcionistas.length ? 'Agregar otra cuenta' : 'Crear la cuenta de recepción'}
        </p>
        <div className="grid sm:grid-cols-3 gap-2">
          <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Nombre (ej: Recepción)" className={inp} />
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email de acceso" autoComplete="off" className={inp} />
          <input type="password" value={form.clave} onChange={e => setForm(f => ({ ...f, clave: e.target.value }))}
            placeholder="Contraseña (mín. 6)" autoComplete="new-password" className={inp} />
        </div>
        <button onClick={crear} disabled={creando}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 disabled:opacity-50 transition-all">
          {creando ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />}
          Crear cuenta de recepción
        </button>
        {crearMsg && <p className={`text-[11px] ${crearMsg.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>{crearMsg}</p>}
      </div>

      {/* Permisos */}
      <div className="border border-slate-700/50 rounded-lg p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Qué módulos puede usar</p>
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Se aplica al instante a todas las cuentas de recepción. La agenda y el Centro de Ayuda van siempre incluidos.
        </p>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {modulos.map(m => {
            const actual   = permisos?.[m.id];
            const efectivo = m.grant ? actual === true : actual !== false;
            return (
              <button key={m.id} onClick={() => togglePermiso(m)} disabled={guardandoPermiso === m.id}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${
                  efectivo
                    ? 'border-emerald-500/30 bg-emerald-500/[0.07]'
                    : 'border-slate-700/60 bg-slate-800/40 opacity-70'
                }`}>
                <span className="min-w-0">
                  <span className={`block text-[12.5px] font-semibold truncate ${efectivo ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {m.label}
                  </span>
                  <span className="block text-[10px] text-slate-500 truncate">
                    {m.grupo}{m.grant ? ' · normalmente solo admin' : ''}
                  </span>
                </span>
                {guardandoPermiso === m.id
                  ? <Loader2 size={14} className="animate-spin text-slate-500 shrink-0" />
                  : <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${efectivo ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      {efectivo && <Check size={11} className="text-slate-950" strokeWidth={3} />}
                    </span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
