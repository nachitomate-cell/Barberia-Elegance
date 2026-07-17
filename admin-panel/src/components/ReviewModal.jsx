import { Stamp, MessageCircle, X, CheckCircle } from 'lucide-react';

export default function ReviewModal({ cita, onClose }) {
  const clienteNombre = cita.clienteNombre || cita.nombre || 'el cliente';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-y-auto"
        style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-bottom) - 2rem)' }}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-800 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={22} className="text-emerald-400" />
          </div>
          <h3 className="text-primary font-bold text-lg leading-tight">
            ¡Cita finalizada!
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Cita de <span className="text-primary font-semibold">{clienteNombre}</span> completada
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-600 hover:text-primary hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          <p className="text-center text-sm text-slate-300">
            Al presionar <span className="text-primary font-semibold">Completar</span> se le entregó el sello al cliente y se le enviará el mensaje para reseñarnos en Google.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Stamp size={16} className="text-amber-400" />
              </div>
              <div className="text-sm">
                <p className="text-primary font-semibold">Sello entregado</p>
                <p className="text-slate-400 text-xs mt-0.5">Se sumó +1 sello al cliente (o se descontó su uso de membresía).</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800/50 border border-slate-700/60 rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <MessageCircle size={16} className="text-emerald-400" />
              </div>
              <div className="text-sm">
                <p className="text-primary font-semibold">Reseña en Google</p>
                <p className="text-slate-400 text-xs mt-0.5">Se le enviará el mensaje para que nos reseñe en Google.</p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all
              bg-emerald-600 hover:bg-emerald-500 text-primary"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
