// ReviewModal.jsx — Se muestra cuando el barbero finaliza una cita.
// Lógica:
//   1. Cliente califica de 1 a 5 estrellas
//   2. Guarda rating en el doc de la cita + colección reseñas
//   3. Si 5 estrellas → botón "Publicar en Google Maps y ganar +1 sello"
//   4. Al hacer clic: abre Maps, espera 3 s (verificación simulada) → +1 sello

import { useState } from 'react';
import { Star, MapPin, Award, X, CheckCircle } from 'lucide-react';
import { updateDoc, addDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { tenantCol, tenantDoc } from '../lib/tenantUtils';

// URL de Google Maps — configura con el enlace real de la barbería
const GOOGLE_MAPS_URLS = {
  elegance: 'https://maps.google.com/?cid=TU_CID_ELEGANCE',
  ferraza:  'https://maps.google.com/?cid=TU_CID_FERRAZA',
  gitana:   'https://maps.google.com/?cid=TU_CID_GITANA',
};

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

export default function ReviewModal({ cita, tenantId, onClose }) {
  const [rating,    setRating]    = useState(0);
  const [hover,     setHover]     = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sellosOk,  setSellosOk]  = useState(false);
  const [mapsLoading, setMapsLoading] = useState(false);

  const clienteNombre = cita.clienteNombre || cita.nombre || 'el cliente';
  const phone         = normalizePhone(cita.clienteTelefono);

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

  async function handleGoogleMaps() {
    if (mapsLoading || sellosOk) return;
    const url = GOOGLE_MAPS_URLS[tenantId] || GOOGLE_MAPS_URLS.elegance;
    window.open(url, '_blank', 'noopener');

    setMapsLoading(true);

    // Verificación simulada: 3 segundos tras abrir Maps
    await new Promise(r => setTimeout(r, 3000));

    try {
      if (phone) {
        const clienteRef = tenantDoc('clientes', phone);
        await updateDoc(clienteRef, {
          sellosDisponibles: increment(1),
          sellosHistoricos:  increment(1),
        });
      }
      setSellosOk(true);
    } finally {
      setMapsLoading(false);
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

              {/* CTA Google Maps — solo si 5 estrellas */}
              {rating === 5 && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Award size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-300 font-semibold text-sm leading-tight">
                        ¡Oferta exclusiva para {clienteNombre}!
                      </p>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                        Publica una reseña en Google Maps y gana{' '}
                        <span className="text-amber-400 font-bold">+1 sello</span> extra en tu tarjeta de fidelidad.
                      </p>
                    </div>
                  </div>

                  {sellosOk ? (
                    <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-3 py-2">
                      <CheckCircle size={16} className="text-amber-400" />
                      <span className="text-amber-300 text-sm font-semibold">
                        ¡+1 sello añadido! 🎉
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleMaps}
                      disabled={mapsLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                        bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm
                        transition-all active:scale-[0.98]
                        disabled:opacity-60 disabled:cursor-wait"
                    >
                      {mapsLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                          Verificando…
                        </>
                      ) : (
                        <>
                          <MapPin size={16} />
                          Publicar en Google Maps y ganar +1 sello
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

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
