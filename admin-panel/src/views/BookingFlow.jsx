import { useState, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useCollection } from '../hooks/useCollection';
import BookingServicios from './BookingServicios';
import BookingBarbero   from './BookingBarbero';
import BookingFecha     from './BookingFecha';
import BookingConfirmar from './BookingConfirmar';

/* Tenants que tienen un solo barbero — el paso 2 se omite siempre */
const SINGLE_BARBER_TENANTS = ['delnero', 'marcelo_hairdressing'];

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
  const { id, accent } = useTenant();

  /* skipBarbero: verdadero si el tenant está en la lista de barbero único */
  const skipBarbero = SINGLE_BARBER_TENANTS.includes(id);

  /* ── Datos reales de Firestore ── */
  const { data: rawBarberos, loading: loadingBarberos } = useCollection('barberos');
  const { data: rawServicios, loading: loadingServicios } = useCollection('servicios');

  const barberos = useMemo(
    () => (rawBarberos ?? []).filter(
      // Excluimos admins PUROS, pero incluimos al admin-barbero (admin que
      // atiende): esBarbero/mostrarEnAgenda === true, o la convención delnero.
      // Mismo criterio que la agenda (Agenda.jsx) para no dejarlo fuera de la
      // reserva cuando el dueño también corta.
      b => !b._mainDocId && b.disponible !== false &&
        (b.rol !== 'admin' || id === 'delnero' || b.esBarbero === true || b.mostrarEnAgenda === true),
    ),
    [rawBarberos, id],
  );
  // Los servicios soloStaff (marcados como "interno" en /gestion-interna/servicios)
  // no se muestran en la reserva pública — solo el staff los agenda desde el panel.
  const servicios = useMemo(
    () => (rawServicios ?? []).filter(s => !s.soloStaff),
    [rawServicios],
  );
  const loading = loadingBarberos || loadingServicios;

  /* ── Estado del wizard ──
     Va ANTES del early return de `loading`: como loading arranca en true y
     pasa a false dentro del mismo montaje, si estos useState quedaban abajo
     el primer render llamaba 5 hooks y el siguiente 9, y React reventaba con
     "Rendered more hooks than during the previous render". */
  const [stepIdx,   setStepIdx]   = useState(0);
  const [servicio,  setServicio]  = useState(null);
  const [barbero,   setBarbero]   = useState(null);
  const [fechaHora, setFechaHora] = useState(null);

  if (loading) return <LoadingFlow accent={accent} />;

  /* 3 pasos si skip, 4 si no */
  const total = skipBarbero ? 3 : 4;
  const steps = skipBarbero
    ? ['servicios', 'fecha', 'confirmar']
    : ['servicios', 'barbero', 'fecha', 'confirmar'];

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
          if (skipBarbero) {
            // Auto-asignar el primer barbero disponible (o fallback si no hay)
            setBarbero(barberos[0] ?? { id: 'default-barber', nombre: '' });
            setStepIdx(fechaIdx);
          } else {
            goNext(); // → 'barbero'
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
