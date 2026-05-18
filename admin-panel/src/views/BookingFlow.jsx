import { useState, useMemo, useRef } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useCollection } from '../hooks/useCollection';
import BookingServicios from './BookingServicios';
import BookingBarbero   from './BookingBarbero';
import BookingFecha     from './BookingFecha';
import BookingConfirmar from './BookingConfirmar';

/* ── Loading screen con color de tema ───────────────────────────── */
function LoadingFlow({ accent }) {
  const A = accent === 'lime' ? '#39ff14' : '#D4AF37';
  return (
    <div
      className="max-w-md mx-auto min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{ borderColor: A, borderTopColor: 'transparent' }}
        />
        <p className="text-sm font-medium" style={{ color: A }}>Cargando…</p>
      </div>
    </div>
  );
}

/* ── BookingFlow ─────────────────────────────────────────────────── */
export default function BookingFlow() {
  const { accent } = useTenant();

  /* ── Datos reales de Firestore ── */
  const { data: rawBarberos, loading: loadingBarberos } = useCollection('barberos');
  const { data: rawServicios, loading: loadingServicios } = useCollection('servicios');

  const barberos = useMemo(
    () => (rawBarberos ?? []).filter(
      b => !b._mainDocId && b.disponible !== false && b.rol !== 'admin',
    ),
    [rawBarberos],
  );
  const servicios = useMemo(() => rawServicios ?? [], [rawServicios]);
  const loading = loadingBarberos || loadingServicios;

  /*
   * skipBarbero se decide SINCRÓNICAMENTE en el mismo render en que
   * los datos llegan, usando un ref — sin useEffect, sin setState asíncrono,
   * sin renders intermedios con skipBarbero === null ya resueltos.
   *
   * El ref se escribe una sola vez (cuando loading pasa a false por primera
   * vez) y no vuelve a cambiar, protegiendo el flujo de actualizaciones
   * en tiempo real de Firestore.
   */
  const skipLocked = useRef(false);
  const skipResult = useRef(null); // null = aún no decidido

  if (!loading && !skipLocked.current) {
    skipLocked.current = true;
    const count = barberos?.length ?? 0;
    skipResult.current = count <= 1; // 0 ó 1 barbero → saltar paso
  }

  const skipBarbero = skipResult.current; // null mientras carga

  /* Espera hasta que los datos lleguen Y la decisión esté tomada */
  if (loading || skipBarbero === null) return <LoadingFlow accent={accent} />;

  /*
   * REGLA 3 — total y steps dependen de skipBarbero (ya resuelto
   * sincrónicamente). Todos los hijos reciben paso/total correctos.
   *   skip=true  → 3 pasos: Servicio · Fecha · Confirmar
   *   skip=false → 4 pasos: Servicio · Barbero · Fecha · Confirmar
   */
  const total = skipBarbero ? 3 : 4;
  const steps = skipBarbero
    ? ['servicios', 'fecha', 'confirmar']
    : ['servicios', 'barbero', 'fecha', 'confirmar'];

  /* ── Estado del wizard ── */
  const [stepIdx,   setStepIdx]   = useState(0);
  const [servicio,  setServicio]  = useState(null);
  const [barbero,   setBarbero]   = useState(null);
  const [fechaHora, setFechaHora] = useState(null);

  const goNext = () => setStepIdx(i => i + 1);
  const goBack = () => setStepIdx(i => Math.max(0, i - 1));

  const currentStep = steps[stepIdx];
  const fechaIdx    = steps.indexOf('fecha'); // 1 si skip=true, 2 si skip=false

  /* ── Paso 1: Servicio ── */
  if (currentStep === 'servicios') {
    return (
      <BookingServicios
        servicios={servicios.length > 0 ? servicios : undefined}
        paso={1}
        total={total}
        onContinuar={s => {
          setServicio(s);

          /*
           * REGLA 1 — La decisión de salto ocurre aquí, en el onClick del
           * botón "Continuar" del Paso 1, evaluando barberos.length en este
           * preciso momento (datos de Firestore ya cargados).
           *
           * REGLA 2 — Protección contra null/undefined y fallback:
           *   length === 0 → asignar 'default-barber' y saltar a Fecha.
           *   length === 1 → auto-asignar ese barbero y saltar a Fecha.
           *   length  >  1 → ir al paso de selección de Barbero.
           *
           * setStepIdx(fechaIdx) usa el índice precalculado del array steps,
           * que ya es coherente con skipBarbero (3 ó 4 pasos).
           */
          const count = barberos?.length ?? 0;

          if (count === 0) {
            setBarbero({ id: 'default-barber', nombre: '' });
            setStepIdx(fechaIdx);
          } else if (count === 1) {
            setBarbero(barberos[0]);
            setStepIdx(fechaIdx);
          } else {
            goNext(); // steps[1] === 'barbero'
          }
        }}
      />
    );
  }

  /* ── Paso 2 (flujo completo): Barbero ── */
  if (currentStep === 'barbero') {
    return (
      <BookingBarbero
        paso={2}
        total={total}
        barberos={barberos}
        servicioNombre={servicio?.nombre}
        onContinuar={b => { setBarbero(b.barbero); goNext(); }}
        onVolver={goBack}
      />
    );
  }

  /* ── Paso 2 (skip) / Paso 3 (completo): Fecha y hora ── */
  if (currentStep === 'fecha') {
    return (
      <BookingFecha
        paso={skipBarbero ? 2 : 3}
        total={total}
        servicioNombre={servicio?.nombre}
        barberoNombre={barbero?.nombre}
        duracion={servicio?.duracion}
        showBarbero={!skipBarbero}
        onContinuar={fh => { setFechaHora(fh); goNext(); }}
        onVolver={goBack}
      />
    );
  }

  /* ── Paso 3 (skip) / Paso 4 (completo): Confirmación ── */
  return (
    <BookingConfirmar
      paso={skipBarbero ? 3 : 4}
      total={total}
      servicioNombre={servicio?.nombre}
      precio={servicio?.precio}
      barberoNombre={barbero?.nombre}
      barberoId={barbero?.id}
      fecha={fechaHora?.fecha ?? new Date()}
      hora={fechaHora?.hora ?? '00:00'}
      duracion={servicio?.duracion}
      showBarbero={!skipBarbero}
      onConfirmar={d => alert(`Reserva confirmada para ${d.nombre}`)}
      onVolver={goBack}
    />
  );
}
