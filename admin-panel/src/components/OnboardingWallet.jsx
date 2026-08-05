import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  CheckCircle2, Circle, ExternalLink, Loader2, Sparkles, Palette,
  Image as ImgIcon, MapPin, Eye, RefreshCw,
} from 'lucide-react';
import { db } from '../lib/firebase';

// Checklist post-activación del módulo Wallet: aparece dentro de la vista
// /gestion-interna/wallets cuando el add-on está activo (_billing.walletActivo)
// pero la config aún no está pulida (logo custom, color propio, geo del local
// y visibilidad ON). Cada check lee configuracion/wallet en vivo. Al completar
// los 4 → botón "Provisionar" llama walletProvisionarClase para crear/actualizar
// la LoyaltyClass en Google Wallet con la config final.
//
// Se oculta cuando el dueño marca configuracion/wallet.onboardingCompletado=true
// (lo hace solo al provisionar con los 4 checks OK, o manualmente).

const ESTUDIO_URL = 'https://wallets.bioo.cl/estudio';

const cfgPath = (tid) => (tid === 'elegance' ? 'configuracion/wallet' : `tenants/${tid}/configuracion/wallet`);

// Un logoUrl es "custom" si NO es un placeholder autogenerado. Los defaults
// que consideramos placeholder: walletFallbackLogo (generado por nosotros) y
// placehold.co / placehold.jp (usado en el demo). Cualquier otra URL cuenta.
function esLogoCustom(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  if (u.includes('walletfallbacklogo')) return false;
  if (u.includes('placehold.')) return false;
  if (u.includes('via.placeholder')) return false;
  return true;
}

// Color acento "por defecto" = el fallback de wallet-core (#c9a84c). Cualquier
// otro valor cuenta como que el dueño lo eligió (aunque sea igual por casualidad).
function tieneAccentPropio(accent) {
  if (!accent || typeof accent !== 'string') return false;
  const clean = accent.toLowerCase().replace('#', '').trim();
  return clean.length >= 6 && clean !== 'c9a84c';
}

function tieneGeo(cfg) {
  if (Array.isArray(cfg?.locations) && cfg.locations.length) {
    return cfg.locations.some(l => Number.isFinite(Number(l?.lat)) && Number.isFinite(Number(l?.lng)));
  }
  return Number.isFinite(Number(cfg?.location?.lat)) && Number.isFinite(Number(cfg?.location?.lng));
}

export default function OnboardingWallet({ tenantId }) {
  const [cfg, setCfg]         = useState(null);      // null = cargando
  const [provisionando, setProv] = useState(false);
  const [msg, setMsg]         = useState('');
  const [err, setErr]         = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const unsub = onSnapshot(
      doc(db, cfgPath(tenantId)),
      (snap) => setCfg(snap.exists() ? (snap.data() || {}) : {}),
      () => setCfg({}),
    );
    return () => unsub();
  }, [tenantId]);

  const tareas = useMemo(() => {
    if (!cfg) return [];
    return [
      {
        id: 'logo',
        titulo: 'Sube tu logo (660×660)',
        hint: 'Cuadrado, en PNG. Mientras tanto usamos uno con tus iniciales.',
        done: esLogoCustom(cfg.logoUrl),
        Icon: ImgIcon,
      },
      {
        id: 'color',
        titulo: 'Elige el color de tu marca',
        hint: 'El acento de la tarjeta. Se ve en los sellos y el rango.',
        done: tieneAccentPropio(cfg.accent),
        Icon: Palette,
      },
      {
        id: 'geo',
        titulo: 'Marca tu local en el mapa',
        hint: 'Sin esto no funciona el geo-push (aparecer al pasar cerca).',
        done: tieneGeo(cfg),
        Icon: MapPin,
      },
      {
        id: 'visible',
        titulo: 'Actívala para tus clientes',
        hint: 'Cuando la enciendas, verán el botón "Añadir a Wallet".',
        done: cfg.enabled === true,
        Icon: Eye,
      },
    ];
  }, [cfg]);

  const completas = tareas.filter(t => t.done).length;
  const totales   = tareas.length;
  const listo     = totales > 0 && completas === totales;

  // Si el dueño ya marcó onboarding como completo, no molestamos con el checklist.
  if (!cfg || cfg.onboardingCompletado === true) return null;

  async function provisionarAhora() {
    if (provisionando || !tenantId) return;
    setProv(true); setMsg(''); setErr('');
    try {
      const fn = httpsCallable(getFunctions(undefined, 'us-central1'), 'walletProvisionarClase');
      await fn({ tenantId, config: cfg });
      // Marcamos completo para ocultar el checklist. Se hace desde el cliente
      // (rules permiten al admin del tenant escribir su config).
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, cfgPath(tenantId)), {
        onboardingCompletado: true,
        onboardingCompletadoEn: new Date(),
      });
      setMsg('¡Tarjeta lista! Tus clientes ya pueden agregarla en su celular.');
    } catch (e) {
      setErr(e?.message || 'No pudimos provisionar la tarjeta. Revisa los datos e intenta de nuevo.');
    } finally {
      setProv(false);
    }
  }

  return (
    <div
      className="rounded-2xl bg-white/[0.02] [html.light_&]:bg-white p-5 sm:p-6 mb-4"
      style={{ border: '1px solid rgba(251,191,36,0.20)' }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-400/15 ring-1 ring-inset ring-amber-400/25 [html.light_&]:bg-amber-100 flex items-center justify-center shrink-0">
          <Sparkles size={17} className="text-amber-300 [html.light_&]:text-amber-700" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary [html.light_&]:text-ink-900 tracking-tight">
            Deja lista tu tarjeta — {completas} de {totales}
          </h3>
          <p className="text-xs text-slate-400 [html.light_&]:text-ink-600 mt-0.5 leading-relaxed">
            Personalízala en el estudio y actívala para tus clientes. Toma 3 minutos.
          </p>
          <div className="mt-2 h-1 bg-neutral-800 [html.light_&]:bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
              style={{ width: `${totales ? Math.round((completas / totales) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {tareas.map((t) => {
          const Icon = t.Icon;
          return (
            <li key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              t.done
                ? 'border-emerald-500/25 bg-emerald-500/[0.04] [html.light_&]:bg-emerald-50'
                : 'border-slate-800 [html.light_&]:border-ink-200 bg-slate-900/40 [html.light_&]:bg-white'
            }`}>
              {t.done
                ? <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                : <Circle size={20} className="text-neutral-600 [html.light_&]:text-neutral-400 shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${
                  t.done
                    ? 'text-emerald-200 [html.light_&]:text-emerald-700 line-through decoration-emerald-500/40'
                    : 'text-primary [html.light_&]:text-ink-900'
                }`}>
                  <Icon size={13} className="inline mr-1.5 opacity-70" />{t.titulo}
                </p>
                <p className="text-[11.5px] text-slate-400 [html.light_&]:text-ink-600 mt-0.5 leading-relaxed">{t.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
        <a
          href={`${ESTUDIO_URL}?tid=${encodeURIComponent(tenantId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-white/10 [html.light_&]:bg-ink-100 [html.light_&]:text-ink-900 hover:bg-white/15 transition-all"
        >
          Abrir el estudio <ExternalLink size={13} />
        </a>
        <button
          type="button"
          onClick={provisionarAhora}
          disabled={!listo || provisionando}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
            listo
              ? 'bg-amber-400 hover:bg-amber-300 text-ink-900 shadow-[0_10px_25px_-8px_rgba(251,191,36,0.55)]'
              : 'bg-white/5 [html.light_&]:bg-ink-100 text-slate-500 [html.light_&]:text-ink-500 cursor-not-allowed'
          }`}
        >
          {provisionando
            ? <>Provisionando… <Loader2 size={15} className="animate-spin" /></>
            : listo
              ? <>Activar mi tarjeta <RefreshCw size={14} /></>
              : <>Completa los pasos</>}
        </button>
      </div>

      {msg && (
        <p className="mt-3 text-xs text-emerald-300 [html.light_&]:text-emerald-700">{msg}</p>
      )}
      {err && (
        <p className="mt-3 text-xs text-rose-300 [html.light_&]:text-rose-700">{err}</p>
      )}
    </div>
  );
}
