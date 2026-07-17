import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import {
  Receipt, Store, UserSquare2, Percent, KeyRound, CheckCircle2, AlertCircle,
  Loader2, FlaskConical, Save, ShieldCheck, FileText, Info,
  Clock, MessageCircle, Sparkles,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

/* ── Facturación · Arriendo de sillón (Fase 1+2) ──────────────────
   Configura la emisión automática de boletas al completar una cita.
   FASE 2 activa: emite la BOLETA AFECTA del local (arriendo + productos)
   vía OpenFactura. La BHE del barbero (SimpleAPI) llega en Fase 3.

   Config no sensible → configuracion/facturacion (write: if esAdmin).
   API Key OpenFactura → facturacion_secrets/{tid} vía callable (cerrado).

   GATING: el módulo todavía no está listo para los locales, así que la
   llave vive en _system/{tid}.facturacion y SOLO la enciende SynapTech
   (reglas: _system write = esBootstrap). Sin ella, el local ve la pantalla
   "Próximamente" con el CTA a WhatsApp — no la configuración.

   Se gatea la VISTA, no el item del sidebar: esconder el item deja la ruta
   accesible escribiendo la URL (es lo que pasa hoy con Integraciones).
   ────────────────────────────────────────────────────────────────── */

const WA_SYNAPTECH = '56983568212';

const EMISOR_VACIO = { rut: '', razonSocial: '', giro: 'Servicios de peluquería y barbería', direccion: '', comuna: '', cdgSiiSucur: '' };

function fmtDate(ts) {
  if (!ts) return '';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtCLP(n) { return `$${Math.round(Number(n) || 0).toLocaleString('es-CL')}`; }

export default function Facturacion() {
  const { id: tenantId, name: tenantName } = useTenant();
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'jefe';

  const [sys, setSys]         = useState(null);   // _system/{tid} → llave del módulo (null = cargando)
  const [cfg, setCfg]         = useState(null);   // doc configuracion/facturacion
  const [form, setForm]       = useState(null);   // copia editable
  const [dirty, setDirty]     = useState(false);
  const [apiKey, setApiKey]   = useState('');     // input write-only
  const [log, setLog]         = useState([]);
  const [busy, setBusy]       = useState('');     // 'save'|'key'|'test'
  const [msg, setMsg]         = useState(null);   // { ok, text }

  const fns = () => getFunctions(getApp(), 'us-central1');

  // ── Llave del módulo ─────────────────────────────────────────────
  // _system/{tid} es lectura pública / escritura solo bootstrap, así que el
  // local puede leer si lo tiene habilitado pero no puede encendérselo.
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, '_system', tenantId),
      snap => setSys(snap.exists() ? snap.data() : {}),
      () => setSys({}),   // sin permiso o sin red → tratar como no habilitado
    );
    return () => unsub();
  }, [tenantId]);

  const habilitado = sys?.facturacion === true;

  // ── Cargar config ────────────────────────────────────────────────
  // Siempre reflejamos el doc en `cfg` (para el flag openfacturaConfigurada
  // que actualiza un callable), pero el `form` editable se inicializa UNA
  // sola vez para no pisar lo que el admin esté escribiendo.
  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      tenantDoc('configuracion', 'facturacion'),
      snap => {
        const d = snap.exists() ? snap.data() : {};
        setCfg(d);
        setForm(prev => prev ? prev : {
          habilitado:          d.habilitado === true,
          modo:                d.modo || 'arriendo_sillon',
          arriendoPct:         d.arriendoPct != null ? d.arriendoPct : 30,
          openfacturaAmbiente: d.openfacturaAmbiente || 'sandbox',
          emisorLocal:         { ...EMISOR_VACIO, ...(d.emisorLocal || {}) },
        });
      },
      err => console.warn('[facturacion] cfg:', err.message),
    );
    return unsub;
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cargar audit log ─────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;
    const q = query(tenantCol('facturacion_log'), orderBy('createdAt', 'desc'), limit(200));
    const unsub = onSnapshot(
      q,
      snap => setLog(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => { if (err.code !== 'permission-denied' && err.code !== 'not-found') console.warn('[facturacion] log:', err.message); },
    );
    return unsub;
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set    = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const setEm  = (k, v) => { setForm(f => ({ ...f, emisorLocal: { ...f.emisorLocal, [k]: v } })); setDirty(true); };

  const configurada = cfg?.openfacturaConfigurada === true;

  const stats = useMemo(() => {
    // Excluir Notas de Crédito (tipo:'nc') del facturado y del conteo de emitidas
    // — son anulaciones, no boletas. Antes sumaban al total y contaban como
    // emisión (sobre-reporte). El límite del query subió a 200 para que el total
    // no quede topado (para volumen mayor haría falta una suma agregada server-side).
    const boletas  = log.filter(l => l.tipo !== 'nc');
    const emitidas = boletas.filter(l => l.ok).length;
    const errores  = log.filter(l => !l.ok).length;
    const total    = boletas.reduce((s, l) => s + (Number(l.documento?.total) || 0), 0);
    return { emitidas, errores, total };
  }, [log]);

  async function guardarConfig() {
    if (!form) return;
    setBusy('save'); setMsg(null);
    try {
      await setDoc(tenantDoc('configuracion', 'facturacion'), {
        habilitado:          form.habilitado,
        modo:                form.modo,
        arriendoPct:         Number(form.arriendoPct) || 0,
        openfacturaAmbiente: form.openfacturaAmbiente,
        emisorLocal:         form.emisorLocal,
        proveedorAfecta:     'openfactura',
        updatedAt:           serverTimestamp(),
      }, { merge: true });
      setDirty(false);
      setMsg({ ok: true, text: 'Configuración guardada.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'No se pudo guardar.' });
    } finally { setBusy(''); }
  }

  async function guardarApiKey() {
    setBusy('key'); setMsg(null);
    try {
      const fn = httpsCallable(fns(), 'facturacionGuardarApiKey');
      const res = await fn({ tenantId, apiKey: apiKey.trim() });
      setApiKey('');
      setMsg({ ok: true, text: res.data?.configurada ? 'API Key guardada de forma segura.' : 'API Key eliminada.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'No se pudo guardar la API Key.' });
    } finally { setBusy(''); }
  }

  async function probarConexion() {
    setBusy('test'); setMsg(null);
    try {
      const fn = httpsCallable(fns(), 'facturacionTestAfecta');
      const res = await fn({ tenantId });
      const folio = res.data?.folio;
      const amb = res.data?.ambiente === 'produccion' ? 'PRODUCCIÓN' : 'prueba (sandbox)';
      setMsg({ ok: true, text: `✓ Conexión OK. Se emitió una boleta de prueba en ${amb} (folio ${folio}).` });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'La prueba falló.' });
    } finally { setBusy(''); }
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-400">
        <ShieldCheck size={32} className="mx-auto mb-3 text-slate-600" />
        Solo el administrador puede configurar la facturación.
      </div>
    );
  }
  // Esperamos la llave antes de decidir: sin esto, el local vería parpadear
  // la pantalla de "Próximamente" cada vez que entra, aunque la tenga activa.
  if (sys === null) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin mr-2" /> Cargando…
      </div>
    );
  }
  if (!habilitado) return <FacturacionProximamente tenantName={tenantName} />;

  if (!form) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin mr-2" /> Cargando…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 pb-16">
      {/* Header */}
      <header className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
          <Receipt size={22} className="text-indigo-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-primary">Facturación automática</h1>
          <p className="text-sm text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            Emite boletas al completar cada cita. En modo <b>arriendo de sillón</b>, el local
            emite su boleta afecta por el arriendo y los productos; el barbero emitirá su boleta
            de honorarios (próxima fase).
          </p>
        </div>
      </header>

      {/* Aviso de fase */}
      <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3.5 text-xs text-amber-200/90 leading-relaxed">
        <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <span>
          <b>Fase actual:</b> emisión automática de la <b>boleta afecta del local</b> vía OpenFactura.
          La boleta de honorarios del barbero (con su propio RUT) se activará cuando conectemos el
          emisor de honorarios. Puedes dejar todo configurado desde ya.
        </span>
      </div>

      {mensajeBanner(msg)}

      {/* ── Interruptor maestro ─────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-primary">Emisión automática</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Al activar, cada cita <b>Completada</b> genera su boleta automáticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => set('habilitado', !form.habilitado)}
            className={`relative inline-flex w-11 h-6 rounded-full transition-colors shrink-0 ${form.habilitado ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <span className={`inline-block w-5 h-5 mt-0.5 bg-white rounded-full shadow transform transition-transform ${form.habilitado ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </section>

      {/* ── Modo de facturación ─────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
        <h2 className="text-sm font-bold text-primary flex items-center gap-2"><UserSquare2 size={15} className="text-indigo-400" /> Modelo de facturación</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModoCard
            active={form.modo === 'arriendo_sillon'}
            onClick={() => set('modo', 'arriendo_sillon')}
            title="Arriendo de sillón"
            desc="El barbero es independiente. El local cobra un % de arriendo (boleta afecta) y el barbero emite su honorario por el resto."
          />
          <ModoCard
            active={form.modo === 'empleados'}
            onClick={() => set('modo', 'empleados')}
            title="Empleados"
            desc="Modelo tradicional. El local emite UNA boleta afecta por el ticket completo (servicio + productos)."
          />
        </div>

        {form.modo === 'arriendo_sillon' && (
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Percent size={12} /> % de arriendo que cobra el local por servicio
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number" min="0" max="100" inputMode="numeric"
                value={form.arriendoPct}
                onChange={e => set('arriendoPct', e.target.value)}
                className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-xs text-slate-500">
                Del precio del servicio, el <b className="text-slate-300">{Number(form.arriendoPct) || 0}%</b> va a la boleta afecta del local;
                el resto será honorario del barbero.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── Datos del emisor (local) ────────────────────────────── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
        <h2 className="text-sm font-bold text-primary flex items-center gap-2"><Store size={15} className="text-indigo-400" /> Datos del local (emisor de la boleta afecta)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="RUT del local" placeholder="76.123.456-7" value={form.emisorLocal.rut} onChange={v => setEm('rut', v)} />
          <Field label="Razón social" placeholder="Barbería XYZ SpA" value={form.emisorLocal.razonSocial} onChange={v => setEm('razonSocial', v)} />
          <Field label="Giro" placeholder="Servicios de peluquería" value={form.emisorLocal.giro} onChange={v => setEm('giro', v)} />
          <Field label="Código sucursal SII (opcional)" placeholder="81303347" value={form.emisorLocal.cdgSiiSucur} onChange={v => setEm('cdgSiiSucur', v)} />
          <Field label="Dirección" placeholder="Av. Siempre Viva 742" value={form.emisorLocal.direccion} onChange={v => setEm('direccion', v)} />
          <Field label="Comuna" placeholder="Providencia" value={form.emisorLocal.comuna} onChange={v => setEm('comuna', v)} />
        </div>
      </section>

      {/* ── OpenFactura (API) ───────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-primary flex items-center gap-2"><KeyRound size={15} className="text-indigo-400" /> Conexión con OpenFactura</h2>
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${configurada
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            : 'bg-slate-700/40 border-slate-600/40 text-slate-400'}`}>
            {configurada ? '● API Key configurada' : '○ Sin API Key'}
          </span>
        </div>

        {/* Ambiente */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ambiente</label>
          <div className="flex gap-2">
            {['sandbox', 'produccion'].map(a => (
              <button key={a} type="button" onClick={() => set('openfacturaAmbiente', a)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.openfacturaAmbiente === a
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                {a === 'sandbox' ? 'Pruebas (sandbox)' : 'Producción'}
              </button>
            ))}
          </div>
          {form.openfacturaAmbiente === 'sandbox' && (
            <p className="text-[11px] text-slate-500 mt-1.5">En sandbox las boletas usan un timbre simulado — no válidas ante el SII. Úsalo para probar.</p>
          )}
        </div>

        {/* API Key (write-only) */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">API Key de OpenFactura</label>
          <div className="flex gap-2">
            <input
              type="password" autoComplete="off"
              placeholder={configurada ? '•••••••••••• (guardada)' : 'Pega tu API Key'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none font-mono"
            />
            <button
              type="button" onClick={guardarApiKey} disabled={busy === 'key' || !apiKey.trim()}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
            >
              {busy === 'key' ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Guardar
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">Se guarda cifrada en el servidor. Nunca se muestra de vuelta.</p>
        </div>

        {/* Probar */}
        <button
          type="button" onClick={probarConexion} disabled={busy === 'test' || !configurada}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy === 'test' ? <Loader2 size={13} className="animate-spin" /> : <FlaskConical size={13} />}
          Probar conexión (emite boleta de $1)
        </button>
      </section>

      {/* ── Guardar ─────────────────────────────────────────────── */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          type="button" onClick={guardarConfig} disabled={busy === 'save' || !dirty}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-500 text-primary hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 transition-colors"
        >
          {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {dirty ? 'Guardar cambios' : 'Guardado'}
        </button>
      </div>

      {/* ── Historial de emisiones ──────────────────────────────── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <header className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-primary flex items-center gap-2"><FileText size={14} className="text-indigo-400" /> Últimas emisiones</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.emitidas} emitidas · {stats.errores} con error · {fmtCLP(stats.total)} facturado (afecta)
            </p>
          </div>
        </header>
        {log.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Aún no se ha emitido ninguna boleta automática.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {log.slice(0, 40).map(l => (
              <li key={l.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`p-1.5 rounded-md border mt-0.5 ${l.ok
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/20'}`}>
                  {l.ok ? <CheckCircle2 size={13} className="text-emerald-400" /> : <AlertCircle size={13} className="text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-primary truncate">
                    {l.ok ? `Folio ${l.documento?.folio}` : 'Error de emisión'}
                    {l.clienteNombre ? <span className="text-slate-500"> · {l.clienteNombre}</span> : null}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {l.barberoNombre ? `${l.barberoNombre} · ` : ''}{fmtDate(l.createdAt)}
                    {!l.ok && l.documento?.error ? ` · ${l.documento.error}` : ''}
                  </div>
                </div>
                {l.ok && (
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-emerald-400">{fmtCLP(l.documento?.total)}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">afecta</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ── Subcomponentes ────────────────────────────────────────────── */

// Lo que ve el local mientras el módulo no está habilitado (_system/{tid}.facturacion).
// Tono "todavía no", no venta: el módulo no está listo, no es que cueste extra.
// Sin variantes [html.light_&]: — los tokens (text-primary, bg-slate-900,
// text-indigo-400) ya voltean solos con el tema.
function FacturacionProximamente({ tenantName }) {
  const waMsg = encodeURIComponent(
    `Hola SynapTech, quiero saber sobre la Facturación automática (boletas al completar cada cita) para mi local ${tenantName || ''}.`.trim(),
  );
  const waUrl = `https://wa.me/${WA_SYNAPTECH}?text=${waMsg}`;

  const LISTO = [
    { Icon: Receipt,     t: 'Boleta al cerrar la cita',  d: 'Completas la atención y el documento se emite solo. Sin planillas ni subir nada a mano.' },
    { Icon: Store,       t: 'Arriendo de sillón',        d: 'El local emite su boleta afecta por el arriendo y los productos; el barbero, su honorario.' },
    { Icon: FileText,    t: 'Todo queda registrado',     d: 'Cada documento emitido con su folio y monto, listo para tu contador.' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-16">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-7 sm:p-10">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-indigo-400 ring-1 ring-indigo-500/25">
            <Clock size={12} /> Próximamente
          </span>

          <div className="mx-auto my-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
            <Receipt size={30} className="text-indigo-400" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
            Facturación automática
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Estamos terminando la integración para emitir tus boletas solas, cada vez
            que completas una cita. La activamos local por local para dejarla andando
            bien desde el primer día.
          </p>
        </div>

        <ul className="my-8 space-y-3">
          {LISTO.map(({ Icon, t, d }) => (
            <li key={t} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-3.5">
              <div className="mt-0.5 shrink-0 rounded-lg bg-indigo-500/10 p-1.5">
                <Icon size={15} className="text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-primary">{t}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{d}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="text-center">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-7 py-3.5 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(99,102,241,0.6)] transition-transform hover:bg-indigo-400 active:scale-95"
          >
            <MessageCircle size={17} /> Consultar activación
          </a>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Sparkles size={11} /> Te contamos cómo queda para tu local y cuándo lo encendemos.
          </p>
        </div>
      </div>
    </div>
  );
}

function mensajeBanner(msg) {
  if (!msg) return null;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl p-3.5 text-xs leading-relaxed border ${msg.ok
      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200/90'
      : 'bg-rose-500/5 border-rose-500/20 text-rose-200/90'}`}>
      {msg.ok ? <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" /> : <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />}
      <span>{msg.text}</span>
    </div>
  );
}

function ModoCard({ active, onClick, title, desc }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`text-left rounded-xl border p-4 transition-colors ${active
        ? 'bg-indigo-500/10 border-indigo-500/40'
        : 'bg-slate-950/40 border-slate-700 hover:border-slate-600'}`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${active ? 'border-indigo-400 bg-indigo-400' : 'border-slate-600'}`} />
        <span className="text-sm font-bold text-primary">{title}</span>
      </div>
      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{desc}</p>
    </button>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      <input
        type="text" autoComplete="off" placeholder={placeholder}
        value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-primary focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}
