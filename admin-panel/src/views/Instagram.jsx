import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import {
  RefreshCw, Link2Off, CheckCircle2, AlertCircle, Camera,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth }   from '../contexts/AuthContext';
import HelpModal, { HelpButton } from '../components/ui/HelpModal';

const CALLBACK_URL = 'https://us-central1-barberia-elegance.cloudfunctions.net/instagramOAuthCallback';

function IgIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <circle cx="12" cy="12" r="4"/>
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

export default function InstagramPage() {
  const { id: tenantId } = useTenant();
  const { role }         = useAuth();
  const isAdmin          = role === 'admin' || role === 'jefe';
  const [showHelp, setShowHelp] = useState(false);

  const [igConfig, setIgConfig] = useState(null);
  const [appId,    setAppId]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [syncing,  setSyncing]  = useState(false);
  const [msg,      setMsg]      = useState(null);

  useEffect(() => {
    const unsubCfg = onSnapshot(
      doc(db, '_system', `instagram_${tenantId}`),
      snap => { setIgConfig(snap.exists() ? snap.data() : null); setLoading(false); },
      ()   => setLoading(false),
    );
    const unsubApp = onSnapshot(
      doc(db, '_system', 'instagram_app'),
      snap => { if (snap.exists()) setAppId(snap.data().appId || null); },
      ()   => {},
    );
    return () => { unsubCfg(); unsubApp(); };
  }, [tenantId]);

  function buildOAuthUrl() {
    if (!appId) return null;
    const p = new URLSearchParams({
      client_id:     appId,
      redirect_uri:  CALLBACK_URL,
      response_type: 'code',
      scope:         'instagram_business_basic',
      state:         tenantId,
    });
    return `https://www.instagram.com/oauth/authorize?${p}`;
  }

  async function handleSync() {
    setSyncing(true);
    setMsg(null);
    try {
      const fn  = httpsCallable(getFunctions(getApp()), 'instagramSyncManual');
      const res = await fn({ tenantId });
      const added = res.data?.added ?? 0;
      setMsg({ ok: true, text: added > 0 ? `+${added} foto${added !== 1 ? 's' : ''} importada${added !== 1 ? 's' : ''}` : 'Todo al día, sin fotos nuevas.' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('¿Desconectar Instagram?\nLos posts ya importados permanecen en el Lookbook.')) return;
    await updateDoc(doc(db, '_system', `instagram_${tenantId}`), { enabled: false });
    setMsg({ ok: true, text: 'Instagram desconectado.' });
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-400 text-sm">
        Solo administradores pueden gestionar la integración de Instagram.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const connected = !!(igConfig?.enabled && igConfig?.accessToken);
  const oauthUrl  = buildOAuthUrl();

  const expiresDate  = igConfig?.tokenExpiresAt?.toDate?.();
  const expiringSoon = expiresDate && expiresDate < new Date(Date.now() + 7 * 86400000);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Título */}
      <div>
        <h1 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
          <IgIcon size={22} className="text-pink-400" />
          Instagram
          <HelpButton onClick={() => setShowHelp(true)} />
        </h1>
        <p className="text-sm text-slate-400">
          Conecta tu cuenta de Instagram para importar tus posts automáticamente al Lookbook.
        </p>
      </div>

      {/* Estado */}
      <div className="bg-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${connected ? 'bg-pink-500/20' : 'bg-slate-700'}`}>
            <IgIcon size={20} className={connected ? 'text-pink-400' : 'text-slate-500'} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {connected ? `@${igConfig.instagramUsername || 'Instagram conectado'}` : 'No conectado'}
            </p>
            <p className="text-xs text-slate-400">
              {connected ? 'Cuenta vinculada correctamente' : 'Vincula tu cuenta para activar la sincronización'}
            </p>
          </div>
          <div className="shrink-0">
            {connected
              ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-400"><CheckCircle2 size={13} /> Activo</span>
              : <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><AlertCircle  size={13} /> Inactivo</span>
            }
          </div>
        </div>

        {connected && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700">
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Última sincronización</p>
              <p className="text-sm font-medium text-white">
                {igConfig.lastSync
                  ? new Date(igConfig.lastSync.toDate()).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
                  : 'Nunca'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 mb-0.5">Fotos importadas</p>
              <p className="text-sm font-medium text-white">{igConfig.postCount ?? 0}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] text-slate-500 mb-0.5">Token expira</p>
              <p className={`text-sm font-medium ${expiringSoon ? 'text-amber-400' : 'text-white'}`}>
                {expiresDate
                  ? expiresDate.toLocaleDateString('es-CL')
                  : '—'}
                {expiringSoon && <span className="ml-2 text-xs">(se renovará automáticamente)</span>}
              </p>
            </div>
          </div>
        )}

        {igConfig?.errorMsg && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-800/30 rounded-xl">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300">{igConfig.errorMsg}</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3">
        {!connected && oauthUrl && (
          <a
            href={oauthUrl}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}
          >
            <IgIcon size={16} />
            Conectar Instagram
          </a>
        )}

        {!appId && !connected && (
          <div className="flex items-start gap-2 p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl w-full">
            <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              Falta configurar el App ID en Firestore (<code className="font-mono">_system/instagram_app</code>).
              Contacta a SynapTech para completar la configuración.
            </p>
          </div>
        )}

        {connected && (
          <>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 active:scale-95 rounded-xl text-sm font-bold text-white transition-all"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 rounded-xl text-sm font-medium text-slate-300 transition-all"
            >
              <Link2Off size={15} />
              Desconectar
            </button>
          </>
        )}
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
          msg.ok
            ? 'bg-emerald-950/30 border border-emerald-800/30 text-emerald-300'
            : 'bg-red-950/30 border border-red-800/30 text-red-300'
        }`}>
          {msg.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      {/* Cómo funciona */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-3">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">¿Cómo funciona?</p>
        <ul className="space-y-2.5 text-sm text-slate-400">
          {[
            'Conecta tu cuenta de Instagram Business o Creator con un clic.',
            'Los posts se sincronizan automáticamente cada 6 horas.',
            'Solo se importan fotos e imágenes (reels y videos quedan excluidos).',
            'Las categorías se detectan automáticamente desde los hashtags (#fade, #barba, #clasico…).',
            'El token se renueva solo antes de expirar — no necesitas reconectar cada mes.',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-emerald-500 shrink-0 font-bold">{i + 1}.</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {showHelp && (
        <HelpModal title="Cómo usar la integración con Instagram" onClose={() => setShowHelp(false)}>
          <p>Conectá tu cuenta de Instagram para que el Lookbook de la barbería se llene automáticamente con tus posts. Tus clientes ven los cortes recientes sin que tengas que subir cada foto a mano.</p>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">1. Conectar cuenta</p>
            <p>Tocá <em>"Conectar Instagram"</em> y autoriza el acceso. Solo lectura de tus posts públicos — no podemos publicar ni borrar nada.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">2. Sincronización automática</p>
            <p>Cada 6 horas un cron baja tus últimos 25 posts. También podés tocar <em>"Sincronizar ahora"</em> para forzar la importación inmediata.</p>
          </div>

          <div>
            <p className="font-semibold text-emerald-400 mb-1">3. Aparecen en el Lookbook</p>
            <p>Los posts se ven automáticamente en <em>/lookbook</em> y en la app pública. Podés desactivar posts individuales si no querés que aparezcan.</p>
          </div>

          <p className="text-xs text-amber-400 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">💡 Solo admins/jefes pueden conectar y desconectar. La token expira a los 60 días — se renueva sola si seguís activo. Si caduca, vas a tener que reconectar.</p>
        </HelpModal>
      )}
    </div>
  );
}
