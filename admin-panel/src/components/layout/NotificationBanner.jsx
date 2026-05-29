import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { activarNotificaciones } from '../../hooks/useFCMToken';
import { useAuth }               from '../../contexts/AuthContext';
import { resolveTenantId }       from '../../lib/tenantUtils';

const DISMISSED_KEY = 'notif-banner-dismissed';

export default function NotificationBanner() {
  const { user } = useAuth();
  const [show,   setShow]   = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | error

  useEffect(() => {
    if (!('Notification' in window) || !user) return;

    if (Notification.permission === 'granted') {
      // Permiso ya concedido: refrescar token silenciosamente en cada carga
      activarNotificaciones({ uid: user.uid, tenantId: resolveTenantId() }).catch(() => {});
      return;
    }

    if (!localStorage.getItem(DISMISSED_KEY)) {
      setShow(true);
    }
  }, [user]);

  if (!show) return null;

  const handleActivar = async () => {
    setStatus('loading');
    const result = await activarNotificaciones({
      uid:      user?.uid,
      tenantId: resolveTenantId(),
    });
    if (result === 'granted') {
      setShow(false);
    } else if (result === 'denied') {
      dismiss();
    } else {
      setStatus('error');
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  return (
    <div className="shrink-0 mx-4 mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">

        <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Bell size={17} className="text-amber-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            Notificaciones de citas
          </p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Recibe alertas cuando llega una nueva reserva, incluso con el panel cerrado.
          </p>
          {status === 'error' && (
            <p className="text-xs text-red-400 mt-1">
              No se pudo activar. Verifica los permisos del navegador.
            </p>
          )}
          <button
            onClick={handleActivar}
            disabled={status === 'loading'}
            className="flex items-center gap-1.5 mt-2.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-all"
          >
            {status === 'loading' ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Bell size={12} />
            )}
            {status === 'loading' ? 'Activando…' : 'Activar notificaciones'}
          </button>
        </div>

        <button
          onClick={dismiss}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-all shrink-0"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
