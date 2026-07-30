import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TENANT_META } from '../contexts/TenantContext';
import { resolveTenantId } from '../lib/tenantUtils';
import Spinner from './ui/Spinner';

// ════════════════════════════════════════════════════════════════
//  HubTenantGate — selector de tenant por CUENTA (hub SynapTech Studio)
//
//  Solo actúa en app.synaptechspa.cl (el hub del TWA/app iOS que abre en
//  `sandbox` por DOMAIN_MAP). Tras el login, resuelve a QUÉ local pertenece
//  el usuario (CF resolverMisTenants) y lo fija en sessionStorage —
//  resolveTenantId() lee esa llave ANTES que DOMAIN_MAP, así que un reload
//  ya lo respeta sin tocar nada más.
//
//    · 1 local  → auto-entra (reload)
//    · N locales→ modal (solo los SUYOS; nunca los de otros)
//    · 0 locales→ pantalla "sin local asignado"
//    · superadmin / CF caída → pass-through (queda el default sandbox)
//
//  Fuera del hub (subdominios de tenant) es pass-through puro: no toca nada.
// ════════════════════════════════════════════════════════════════

const HUB_HOST       = 'app.synaptechspa.cl';
const PIN_TENANT_KEY = 'saas_current_tenant';   // la MISMA que lee resolveTenantId()
const PIN_UID_KEY    = '_hub_pinned_uid';

function isHubHost() {
  return typeof window !== 'undefined' && window.location.hostname === HUB_HOST;
}

// ¿Hay que resolver el local de este usuario? Solo en el hub, sin ?local=
// explícito y sin un pin previo para ESTE uid.
function needsResolution(uid) {
  if (!isHubHost() || !uid) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('local')) return false;                 // elección explícita
  try {
    if (sessionStorage.getItem(PIN_UID_KEY) === uid &&
        sessionStorage.getItem(PIN_TENANT_KEY)) return false;   // ya resuelto
  } catch { /* ignore */ }
  return true;
}

function pin(tenantId, uid) {
  try {
    sessionStorage.setItem(PIN_TENANT_KEY, tenantId);
    sessionStorage.setItem(PIN_UID_KEY, uid);
  } catch { /* ignore */ }
}

// Fija el tenant. Solo recarga si es DISTINTO al que ya está resuelto — así el
// caso "ya estoy en mi local" (p.ej. el revisor en sandbox por DOMAIN_MAP) no
// parpadea con un reload inútil.
function pinTenant(tenantId, uid, { onSame } = {}) {
  const alreadyHere = tenantId === resolveTenantId();
  pin(tenantId, uid);
  if (alreadyHere) onSame?.();
  else window.location.reload();
}

function displayName(tenantId) {
  return TENANT_META[tenantId]?.name
    || tenantId.charAt(0).toUpperCase() + tenantId.slice(1).replace(/_/g, ' ');
}

export default function HubTenantGate({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [phase, setPhase]     = useState(() => (needsResolution(uid) ? 'resolving' : 'ready'));
  const [options, setOptions] = useState([]);

  // Si entraron con ?local= explícito, lo fijamos para este user → un reload
  // sin ?local respeta la elección y no re-resuelve.
  useEffect(() => {
    if (!isHubHost() || !uid) return;
    const local = new URLSearchParams(window.location.search).get('local');
    if (local) {
      try {
        sessionStorage.setItem(PIN_TENANT_KEY, local);
        sessionStorage.setItem(PIN_UID_KEY, uid);
      } catch { /* ignore */ }
    }
  }, [uid]);

  useEffect(() => {
    if (phase !== 'resolving' || !uid) return;
    let cancelled = false;
    (async () => {
      try {
        const fn  = httpsCallable(getFunctions(undefined, 'us-central1'), 'resolverMisTenants');
        const res = await fn();
        if (cancelled) return;
        const data    = res.data || {};
        const tenants = Array.isArray(data.tenants) ? data.tenants : [];
        if (data.superadmin) { setPhase('ready'); return; }   // sandbox por defecto
        if (tenants.length === 1)      pinTenant(tenants[0].tenantId, uid, { onSame: () => setPhase('ready') });
        else if (tenants.length > 1) { setOptions(tenants); setPhase('choose'); }
        else                           setPhase('empty');
      } catch {
        if (!cancelled) setPhase('ready');   // falla-seguro: no bloquear (queda sandbox)
      }
    })();
    return () => { cancelled = true; };
  }, [phase, uid]);

  if (phase === 'resolving') return <Splash label="Entrando a tu local…" />;
  if (phase === 'choose')    return <TenantPicker options={options} onPick={(t) => pinTenant(t, uid, { onSame: () => setPhase('ready') })} />;
  if (phase === 'empty')     return <NoTenant />;
  return children;
}

function Splash({ label }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <Spinner size={32} className="text-slate-500" />
      {label && <p className="text-slate-400 text-sm">{label}</p>}
    </div>
  );
}

function TenantPicker({ options, onPick }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/60 border border-white/10 rounded-2xl p-6 shadow-xl">
        <h1 className="text-white text-lg font-semibold mb-1">Elige tu local</h1>
        <p className="text-slate-400 text-sm mb-5">
          Tu cuenta administra más de un local. ¿Con cuál quieres entrar?
        </p>
        <div className="space-y-2">
          {options.map(({ tenantId }) => {
            const meta = TENANT_META[tenantId];
            return (
              <button
                key={tenantId}
                onClick={() => onPick(tenantId)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-700/40 hover:bg-slate-700 border border-white/5 hover:border-emerald-500/40 transition text-left"
              >
                {meta?.logo
                  ? <img src={meta.logo} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  : <span className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center text-lg flex-shrink-0">{meta?.emoji || '✂️'}</span>}
                <span className="text-white font-medium flex-1">{displayName(tenantId)}</span>
                <svg className="w-5 h-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.29 14.71a1 1 0 010-1.42L10.59 10 7.29 6.71a1 1 0 011.42-1.42l4 4a1 1 0 010 1.42l-4 4a1 1 0 01-1.42 0z" clipRule="evenodd" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NoTenant() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
      <div className="max-w-sm">
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-white text-lg font-semibold mb-2">Tu cuenta no tiene un local asignado</h1>
        <p className="text-slate-400 text-sm mb-5">
          Si eres dueño de un negocio y crees que es un error, escríbenos por WhatsApp a SynapTech.
        </p>
        <button
          onClick={() => signOut(auth)}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
