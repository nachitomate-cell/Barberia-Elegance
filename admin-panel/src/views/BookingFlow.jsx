import { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import BookingServicios from './BookingServicios';
import BookingBarbero   from './BookingBarbero';
import BookingFecha     from './BookingFecha';
import BookingConfirmar from './BookingConfirmar';

export default function BookingFlow() {
  const { id } = useTenant();
  const skipBarbero = id === 'delnero';
  const total = skipBarbero ? 3 : 4;

  const steps = skipBarbero
    ? ['servicios', 'fecha', 'confirmar']
    : ['servicios', 'barbero', 'fecha', 'confirmar'];

  const [stepIdx,   setStepIdx]   = useState(0);
  const [servicio,  setServicio]  = useState(null);
  const [barbero,   setBarbero]   = useState(null);
  const [fechaHora, setFechaHora] = useState(null);

  const goNext = () => setStepIdx(i => i + 1);
  const goBack = () => setStepIdx(i => Math.max(0, i - 1));

  const currentStep = steps[stepIdx];

  if (currentStep === 'servicios') {
    return (
      <BookingServicios
        paso={1}
        total={total}
        onContinuar={s => { setServicio(s); goNext(); }}
      />
    );
  }

  if (currentStep === 'barbero') {
    return (
      <BookingBarbero
        paso={2}
        total={total}
        servicioNombre={servicio?.nombre}
        onContinuar={b => { setBarbero(b.barbero); goNext(); }}
        onVolver={goBack}
      />
    );
  }

  const pasoFecha = skipBarbero ? 2 : 3;
  if (currentStep === 'fecha') {
    return (
      <BookingFecha
        paso={pasoFecha}
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

  const pasoConfirmar = skipBarbero ? 3 : 4;
  if (currentStep === 'confirmar') {
    return (
      <BookingConfirmar
        paso={pasoConfirmar}
        total={total}
        servicioNombre={servicio?.nombre}
        precio={servicio?.precio}
        barberoNombre={barbero?.nombre ?? 'Asignado automáticamente'}
        fecha={fechaHora?.fecha ?? new Date()}
        hora={fechaHora?.hora ?? '00:00'}
        duracion={servicio?.duracion}
        showBarbero={!skipBarbero}
        onConfirmar={d => alert(`Reserva confirmada para ${d.nombre}`)}
        onVolver={goBack}
      />
    );
  }

  return null;
}
