import { useState } from 'react';
import { Star, X, CheckCircle } from 'lucide-react';
import { updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';

export default function ReviewModal({ cita, onClose }) {
  const [rating,    setRating]    = useState(0);
  const [hover,     setHover]     = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const clienteNombre = cita.clienteNombre || cita.nombre || 'el cliente';

  async function submitRating() {
    if (!rating || saving) return;
    setSaving(true);
    try {
      // 1. Guardar rating en el doc de la cita
      await updateDoc(
        tenantDoc('citas', cita.id),
        { rating, ratingAt: serverTimestamp() },
      );

      // 2. Crear reseña en colección dedicada (útil para analytics)
      await addDoc(tenantCol('resenas'), {
        citaId:         cita.id,
        clienteNombre:  cita.clienteNombre || '',
        clienteTelefono: cita.clienteTelefono || '',
        barberoId:      cita.barberoId     || '',
        barberoNombre:  cita.barbero       || '',
        servicioNombre: cita.servicioNombre || '',
        rating,
        createdAt:      serverTimestamp(),
      });

      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-slate-800 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={22} className="text-emerald-400" />
          </div>
          <h3 className="text-white font-bold text-lg leading-tight">
            ¡Cita finalizada!
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            ¿Cómo quedó <span className="text-white font-semibold">{clienteNombre}</span>?
          </p>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {!submitted ? (
            <>
              {/* Estrellas */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    className="transition-transform active:scale-90"
                  >
                    <Star
                      size={36}
                      className="transition-colors duration-150"
                      fill={(hover || rating) >= n ? '#D4AF37' : 'none'}
                      stroke={(hover || rating) >= n ? '#D4AF37' : '#475569'}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <p className="text-center text-sm text-slate-400">
                  {['', 'Mal servicio', 'Podría mejorar', 'Estuvo bien', 'Muy bueno', '¡Excelente! 🔥'][rating]}
                </p>
              )}

              <button
                onClick={submitRating}
                disabled={!rating || saving}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                  bg-emerald-600 hover:bg-emerald-500 text-white
                  disabled:opacity-40 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {saving && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Enviar calificación
              </button>
            </>
          ) : (
            <>
              {/* Gracias */}
              <div className="text-center space-y-2">
                <div className="flex justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star
                      key={n}
                      size={24}
                      fill={n <= rating ? '#D4AF37' : 'none'}
                      stroke={n <= rating ? '#D4AF37' : '#334155'}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <p className="text-white font-semibold">¡Gracias por calificar!</p>
                <p className="text-slate-400 text-sm">La reseña queda guardada.</p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-medium
                  border border-slate-800 hover:border-slate-600 transition-all"
              >
                Cerrar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
