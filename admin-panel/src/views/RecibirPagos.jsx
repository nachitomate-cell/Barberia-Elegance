import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import {
  CircleDollarSign, Wallet, CreditCard, Sparkles, CheckCircle2, Link2Off,
  Loader2, AlertCircle, Terminal, ChevronDown, ChevronUp, Eye, EyeOff,
  ExternalLink, Info,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';
import { useSucursal } from '../contexts/SucursalContext';
import { confirmDialog } from '../lib/confirmDialog';

const PASARELAS_DIGITAL = [
  { id: 'flow', nombre: 'Flow', descripcion: 'Procesador chileno. Soporta Webpay, tarjetas y transferencias.', Icon: Wallet, soon: true },
  { id: 'mercadopago', nombre: 'Mercado Pago', descripcion: 'Cobros con QR, tarjetas y cuotas. La plata llega directo a tu cuenta de MP.', Icon: CreditCard, soon: false },
  { id: 'stripe', nombre: 'Stripe', descripcion: 'Cobros internacionales en USD/EUR. Pensado para Gift Cards.', Icon: Sparkles, soon: true },
];

export default function RecibirPagos() {
  const { id: tenantId } = useTenant();
  const { role } = useAuth();
  const { sucursales, multiSucursal } = useSucursal();
  const isAdmin = role === 'admin';

  const [mpConnected, setMpConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState(null);

  // Estado TUU (no sensible) en _system/tuu_{tid}.
  const [tuu, setTuu] = useState(null);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, '_system', `mercadopago_${tenantId}`),
      (snap) => { setMpConnected(snap.exists() && snap.data().connected === true); setLoading(false); },
      () => setLoading(false),
    );
    return () => unsub();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, '_system', `tuu_${tenantId}`),
      (snap) => { setTuu(snap.exists() ? snap.data() : null); },
      () => setTuu(null),
    );
    return () => unsub();
  }, [tenantId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('mp');
    if (p === 'connected') setMsg({ ok: true, text: 'Mercado Pago conectado correctamente.' });
    else if (p === 'error') setMsg({ ok: false, text: 'No se pudo conectar Mercado Pago. Intenta de nuevo.' });
    if (p) { try { window.history.replaceState({}, '', window.location.pathname); } catch { /* noop */ } }
  }, []);

  async function connectMp() {
    setConnecting(true);
    setMsg(null);
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'mpTenantConnect');
      const res = await fn({ tenantId });
      window.location.href = res.data.url;
    } catch (err) {
      setConnecting(false);
      setMsg({ ok: false, text: err.message || 'No se pudo iniciar la conexion.' });
    }
  }

  async function disconnectMp() {
    if (!(await confirmDialog({ title: 'Desconectar Mercado Pago', message: 'Dejaras de recibir cobros en tu cuenta de MP. Puedes reconectar cuando quieras.', confirmText: 'Desconectar' }))) return;
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'mpTenantDisconnect');
      await fn({ tenantId });
      setMsg({ ok: true, text: 'Mercado Pago desconectado.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'No se pudo desconectar.' });
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-yellow-400/15 [html.light_&]:bg-yellow-100 flex items-center justify-center shrink-0">
          <CircleDollarSign size={22} className="text-yellow-400 [html.light_&]:text-yellow-700" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-primary [html.light_&]:text-ink-900">Recibir Pagos</h1>
          <p className="text-sm text-slate-400 [html.light_&]:text-ink-600 mt-1">
            Conecta tus canales de cobro: pagos online (reservas, Gift Cards) y cobros presenciales en el POS.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 flex items-center gap-2 p-3 rounded-xl text-sm ${
          msg.ok ? 'bg-emerald-950/30 border border-emerald-800/30 text-emerald-300'
                 : 'bg-red-950/30 border border-red-800/30 text-red-300'
        }`}>
          {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  SECCIÓN 1 — COBROS DIGITALES (ONLINE)                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title="Cobros digitales (online)"
        subtitle="Para reservas online, Gift Cards y propinas. El cliente paga desde su teléfono."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PASARELAS_DIGITAL.map(({ id, nombre, descripcion, Icon, soon }) => {
          const isMp = id === 'mercadopago';
          const connected = isMp && mpConnected;
          return (
            <div
              key={id}
              className={`rounded-2xl border bg-slate-900/40 [html.light_&]:bg-white p-5 transition-colors duration-200 ${
                connected ? 'border-emerald-500/40' : 'border-slate-800 [html.light_&]:border-ink-200 hover:border-yellow-400/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon size={20} className="text-yellow-400 [html.light_&]:text-yellow-700" />
                <h3 className="font-semibold text-primary [html.light_&]:text-ink-900">{nombre}</h3>
              </div>
              <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 leading-relaxed mb-4">{descripcion}</p>

              <div className="flex items-center justify-between gap-2">
                <span className={`text-[11px] uppercase tracking-wider flex items-center gap-1 ${
                  connected ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {connected ? <><CheckCircle2 size={12} /> Conectado</> : 'No configurado'}
                </span>

                {soon && (
                  <button disabled className="text-xs font-medium px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 [html.light_&]:bg-yellow-100 [html.light_&]:text-yellow-700 opacity-60 cursor-not-allowed">
                    Proximamente
                  </button>
                )}

                {isMp && !loading && (
                  connected ? (
                    isAdmin && (
                      <button
                        onClick={disconnectMp}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                      >
                        <Link2Off size={13} /> Desconectar
                      </button>
                    )
                  ) : (
                    isAdmin ? (
                      <button
                        onClick={connectMp}
                        disabled={connecting}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-primary transition-transform active:scale-95 disabled:opacity-60"
                        style={{ background: '#009ee3' }}
                      >
                        {connecting ? <><Loader2 size={13} className="animate-spin" /> …</> : 'Conectar'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500">Solo admin</span>
                    )
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  SECCIÓN 2 — COBROS PRESENCIALES (POS)                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <SectionHeader
        title="Cobros presenciales (POS)"
        subtitle="Al marcar una cita como Completada, el POS suena solo con el monto exacto. Menos digitacion, cero errores de cobro."
        className="mt-10"
      />

      <TuuCard
        tenantId={tenantId}
        isAdmin={isAdmin}
        tuu={tuu}
        sucursales={sucursales}
        multiSucursal={multiSucursal}
        onMsg={setMsg}
      />

      <p className="text-xs text-slate-500 [html.light_&]:text-ink-500 text-center mt-8">
        Mercado Pago ya disponible. Flow, Stripe y el cobro automatico por POS TUU se activaran proximamente.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

function SectionHeader({ title, subtitle, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 [html.light_&]:text-ink-700">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-slate-500 [html.light_&]:text-ink-500 mt-1 max-w-3xl">{subtitle}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  TUU — card con onboarding expandible.
// ═══════════════════════════════════════════════════════════════════════════
function TuuCard({ tenantId, isAdmin, tuu, sucursales, multiSucursal, onMsg }) {
  const configured = !!(tuu && tuu.configured);
  const enabled    = !!(tuu && tuu.enabled);      // aun no se libera desde el backend
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Si nunca fue configurado y el admin entra, abre el onboarding solo.
    if (!configured && isAdmin && tuu !== null && !open) {
      // no auto-abrir en el primer render para no molestar; el usuario hace click.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, isAdmin]);

  const badgeText = enabled
    ? 'Activo'
    : configured
      ? 'Configurado · pendiente activacion'
      : 'No configurado';

  const badgeColor = enabled
    ? 'text-emerald-400'
    : configured
      ? 'text-amber-400'
      : 'text-slate-500';

  return (
    <div className={`rounded-2xl border bg-slate-900/40 [html.light_&]:bg-white transition-colors duration-200 ${
      configured
        ? (enabled ? 'border-emerald-500/40' : 'border-amber-500/30')
        : 'border-slate-800 [html.light_&]:border-ink-200 hover:border-yellow-400/40'
    }`}>
      {/* Header — clickeable para expandir */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        <div className="w-11 h-11 rounded-xl bg-slate-800/60 [html.light_&]:bg-ink-100 flex items-center justify-center shrink-0">
          <Terminal size={22} className="text-yellow-400 [html.light_&]:text-yellow-700" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-primary [html.light_&]:text-ink-900">TUU (Haulmer)</h3>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 [html.light_&]:bg-ink-100 text-slate-400 [html.light_&]:text-ink-600">
              POS Chile
            </span>
          </div>
          <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 leading-relaxed mt-1">
            Envia el cobro directo al POS con el monto exacto. Compatible con POS Mini, SE, PRO y PRO2. Emite boleta electronica SII automaticamente.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className={`text-[11px] uppercase tracking-wider flex items-center gap-1 ${badgeColor}`}>
              {enabled
                ? <><CheckCircle2 size={12} /> {badgeText}</>
                : configured
                  ? <><AlertCircle size={12} /> {badgeText}</>
                  : badgeText}
            </span>
            {configured && tuu?.deviceSerial && (
              <span className="text-[11px] text-slate-500 [html.light_&]:text-ink-500 font-mono">
                SN: {tuu.deviceSerial}
              </span>
            )}
            {configured && tuu?.serialsPorSucursal && (
              <span className="text-[11px] text-slate-500 [html.light_&]:text-ink-500">
                {Object.keys(tuu.serialsPorSucursal).length} sucursales configuradas
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 self-center text-slate-500">
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Cuerpo — onboarding */}
      {open && (
        <div className="border-t border-slate-800/60 [html.light_&]:border-ink-200 p-5">
          {!isAdmin ? (
            <p className="text-sm text-slate-400 [html.light_&]:text-ink-600">
              Solo el administrador del local puede configurar la integracion con TUU.
            </p>
          ) : (
            <TuuOnboarding
              tenantId={tenantId}
              tuu={tuu}
              sucursales={sucursales}
              multiSucursal={multiSucursal}
              configured={configured}
              onMsg={onMsg}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  ONBOARDING — guia + formulario. Persiste via CF tuuGuardarConfig.
// ═══════════════════════════════════════════════════════════════════════════
function TuuOnboarding({ tenantId, tuu, sucursales, multiSucursal, configured, onMsg }) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [deviceSerial, setDeviceSerial] = useState(tuu?.deviceSerial || '');
  const [serialsPorSucursal, setSerialsPorSucursal] = useState(
    () => tuu?.serialsPorSucursal ? { ...tuu.serialsPorSucursal } : {},
  );
  const [saving, setSaving] = useState(false);
  const [busyDisc, setBusyDisc] = useState(false);
  const [localErr, setLocalErr] = useState(null);

  // Cuando cambian los props (por el listener), re-hidratar el serial pero NUNCA la apiKey.
  useEffect(() => {
    setDeviceSerial(tuu?.deviceSerial || '');
    setSerialsPorSucursal(tuu?.serialsPorSucursal ? { ...tuu.serialsPorSucursal } : {});
  }, [tuu]);

  const sucursalesArr = useMemo(() => Array.isArray(sucursales) ? sucursales : [], [sucursales]);
  const usaMulti = multiSucursal && sucursalesArr.length > 1;

  async function guardar() {
    setLocalErr(null);

    if (!apiKey || apiKey.trim().length < 8) {
      setLocalErr('Ingresa una API key valida (min 8 caracteres).');
      return;
    }

    const payload = { tenantId, apiKey: apiKey.trim() };

    if (usaMulti) {
      const map = {};
      for (const s of sucursalesArr) {
        const raw = serialsPorSucursal[s.id];
        if (raw && String(raw).trim()) map[s.id] = String(raw).trim();
      }
      if (!Object.keys(map).length) {
        setLocalErr('Ingresa al menos el numero de serie de una sucursal.');
        return;
      }
      payload.serialsPorSucursal = map;
    } else {
      if (!deviceSerial || String(deviceSerial).trim().length < 4) {
        setLocalErr('Ingresa el numero de serie del POS.');
        return;
      }
      payload.deviceSerial = String(deviceSerial).trim();
    }

    setSaving(true);
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'tuuGuardarConfig');
      await fn(payload);
      setApiKey('');       // no dejar la key en el DOM
      onMsg({ ok: true, text: 'Configuracion de TUU guardada. La activacion del cobro automatico se libera proximamente.' });
    } catch (err) {
      onMsg({ ok: false, text: err.message || 'No se pudo guardar la configuracion de TUU.' });
    } finally {
      setSaving(false);
    }
  }

  async function desconectar() {
    if (!(await confirmDialog({
      title: 'Desconectar TUU',
      message: 'Se borrara tu API key y la configuracion de POS. Podras reconectar cuando quieras.',
      confirmText: 'Desconectar',
    }))) return;
    setBusyDisc(true);
    try {
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'tuuDesconectar');
      await fn({ tenantId });
      onMsg({ ok: true, text: 'TUU desconectado.' });
    } catch (err) {
      onMsg({ ok: false, text: err.message || 'No se pudo desconectar.' });
    } finally {
      setBusyDisc(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Aviso principal */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-400/10 [html.light_&]:bg-yellow-100 border border-yellow-400/20 [html.light_&]:border-yellow-300 text-yellow-300 [html.light_&]:text-yellow-800">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed">
          Estamos habilitando el cobro automatico por POS TUU. Puedes dejar tu configuracion lista <b>ahora</b> y el dia que lo liberemos se activa solo. No enviamos ningun cobro real todavia.
        </p>
      </div>

      {/* Guia paso a paso */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 [html.light_&]:text-ink-700 mb-3">
          Antes de empezar, necesitas
        </h4>
        <ol className="space-y-3 text-sm text-slate-300 [html.light_&]:text-ink-700">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-slate-800 [html.light_&]:bg-ink-100 flex items-center justify-center text-[11px] font-bold text-yellow-400 [html.light_&]:text-yellow-700 shrink-0">1</span>
            <div className="min-w-0">
              <div className="font-medium">Generar tu API key en TUU</div>
              <div className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5">
                Entra a tu Espacio de Trabajo TUU y ve a <b>Pagos &rarr; Configuracion &rarr; API</b>. Genera una key y copiala aca abajo.
              </div>
              <a
                href="https://developers.tuu.cl/docs/generaci%C3%B3n-de-api-key-en-espacio-de-trabajo"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-yellow-400 [html.light_&]:text-yellow-700 hover:underline mt-1"
              >
                Ver guia oficial <ExternalLink size={11} />
              </a>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-slate-800 [html.light_&]:bg-ink-100 flex items-center justify-center text-[11px] font-bold text-yellow-400 [html.light_&]:text-yellow-700 shrink-0">2</span>
            <div className="min-w-0">
              <div className="font-medium">Anotar el numero de serie de tu POS</div>
              <div className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5">
                Viene impreso atras del aparato o dentro de <b>Configuracion del POS &rarr; Informacion del dispositivo</b>.
                {usaMulti && ' Si tienes mas de una sucursal, necesitas el serial de cada POS por separado.'}
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-slate-800 [html.light_&]:bg-ink-100 flex items-center justify-center text-[11px] font-bold text-yellow-400 [html.light_&]:text-yellow-700 shrink-0">3</span>
            <div className="min-w-0">
              <div className="font-medium">Activar el Modo Integracion en el POS</div>
              <div className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5">
                En cada POS: <b>Configuracion &rarr; Integraciones &rarr; Modo Integracion</b>. Con esto el POS queda esperando cobros enviados desde el sistema.
              </div>
            </div>
          </li>
        </ol>
      </div>

      {/* Formulario */}
      <div className="border-t border-slate-800/60 [html.light_&]:border-ink-200 pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 [html.light_&]:text-ink-700 mb-3">
          Tu configuracion
        </h4>

        <div className="space-y-4">
          {/* API key */}
          <div>
            <label className="block text-xs font-medium text-slate-300 [html.light_&]:text-ink-700 mb-1.5">
              API Key {configured && <span className="text-[10px] text-slate-500 [html.light_&]:text-ink-500 normal-case">(guardada · deja vacio para no cambiarla — proximamente)</span>}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={configured ? 'Reemplazar API key (opcional)' : 'Pega aqui tu API key de TUU'}
                autoComplete="off"
                className="w-full bg-slate-950/60 [html.light_&]:bg-ink-50 border border-slate-800 [html.light_&]:border-ink-200 rounded-lg px-3 py-2 pr-10 text-sm text-primary [html.light_&]:text-ink-900 placeholder-slate-600 [html.light_&]:placeholder-ink-400 focus:outline-none focus:border-yellow-400/50"
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 [html.light_&]:hover:text-ink-700 p-1"
                aria-label={showKey ? 'Ocultar' : 'Mostrar'}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Serial(es) */}
          {usaMulti ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300 [html.light_&]:text-ink-700">
                Numero de serie del POS por sucursal
              </label>
              {sucursalesArr.map(s => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 [html.light_&]:text-ink-600 w-32 shrink-0 truncate">{s.nombre || s.id}</span>
                  <input
                    type="text"
                    value={serialsPorSucursal[s.id] || ''}
                    onChange={e => setSerialsPorSucursal(prev => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="Ej. TP2-CL-000123"
                    autoComplete="off"
                    className="flex-1 bg-slate-950/60 [html.light_&]:bg-ink-50 border border-slate-800 [html.light_&]:border-ink-200 rounded-lg px-3 py-2 text-sm font-mono text-primary [html.light_&]:text-ink-900 placeholder-slate-600 [html.light_&]:placeholder-ink-400 focus:outline-none focus:border-yellow-400/50"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 [html.light_&]:text-ink-700 mb-1.5">
                Numero de serie del POS
              </label>
              <input
                type="text"
                value={deviceSerial}
                onChange={e => setDeviceSerial(e.target.value)}
                placeholder="Ej. TP2-CL-000123"
                autoComplete="off"
                className="w-full bg-slate-950/60 [html.light_&]:bg-ink-50 border border-slate-800 [html.light_&]:border-ink-200 rounded-lg px-3 py-2 text-sm font-mono text-primary [html.light_&]:text-ink-900 placeholder-slate-600 [html.light_&]:placeholder-ink-400 focus:outline-none focus:border-yellow-400/50"
              />
            </div>
          )}

          {localErr && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertCircle size={12} /> {localErr}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            {configured ? (
              <button
                onClick={desconectar}
                disabled={busyDisc || saving}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-60 transition-colors"
              >
                {busyDisc ? <><Loader2 size={13} className="animate-spin" /> …</> : <><Link2Off size={13} /> Desconectar</>}
              </button>
            ) : <span />}

            <button
              onClick={guardar}
              disabled={saving || busyDisc}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-900 disabled:opacity-60 transition-colors active:scale-95"
            >
              {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando…</> : configured ? 'Actualizar configuracion' : 'Guardar configuracion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
