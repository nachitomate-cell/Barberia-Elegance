import { useState } from 'react';
import { ChevronLeft, Trophy, Check, Scissors, User, Calendar, Clock } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmtPrecio = p => `$${p.toLocaleString('es-CL')}`;

/* ── Fila del resumen ────────────────────────────────────────────── */
function SummaryRow({ icon: Icon, label, value, clr, valueAccent }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <Icon size={13} style={{ color: '#555' }} />
      </div>
      <p className="flex-1 text-[13px] text-gray-300 truncate">{label}</p>
      {value && (
        <p
          className="text-[13px] font-semibold shrink-0"
          style={{ color: valueAccent ? clr.A : '#888' }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function BookingConfirmar({
  servicioNombre = 'Corte Tradicional',
  precio         = 10990,
  barberoNombre  = 'Joaquin Amiri',
  fecha          = new Date(),
  hora           = '10:00',
  duracion       = 40,
  showBarbero    = true,
  onConfirmar,
  onVolver,
  paso  = 4,
  total = 4,
}) {
  const { accent, name: tenantName } = useTenant();
  const isLime = accent === 'lime';
  const clr = {
    A:    isLime ? '#39ff14' : '#D4AF37',
    A08:  isLime ? 'rgba(57,255,20,0.08)'  : 'rgba(212,175,55,0.08)',
    A12:  isLime ? 'rgba(57,255,20,0.12)'  : 'rgba(212,175,55,0.12)',
    A25:  isLime ? 'rgba(57,255,20,0.25)'  : 'rgba(212,175,55,0.25)',
    glow: isLime ? '0 0 22px rgba(57,255,20,0.28), 0 4px 12px rgba(0,0,0,0.4)'
                 : '0 0 22px rgba(212,175,55,0.28), 0 4px 12px rgba(0,0,0,0.4)',
  };

  const onFocus = e => {
    e.target.style.borderColor = clr.A;
    e.target.style.boxShadow   = `0 0 0 1px ${clr.A25}`;
  };
  const onBlur = e => {
    e.target.style.borderColor = '#222';
    e.target.style.boxShadow   = 'none';
  };

  const BASE_INPUT = {
    width: '100%',
    backgroundColor: '#111',
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const [nombre,   setNombre]   = useState('');
  const [telefono, setTelefono] = useState('');
  const [email,    setEmail]    = useState('');
  const [joinClub, setJoinClub] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const isValid = nombre.trim().length >= 2 && telefono.trim().length >= 8;

  const handleConfirm = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    try {
      await onConfirmar?.({ nombre, telefono, email, joinClub });
    } finally {
      setLoading(false);
    }
  };

  const fechaLabel = `${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
  const pct = Math.round((paso / total) * 100);

  return (
    <div
      className="max-w-md mx-auto flex flex-col"
      style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100dvh', paddingBottom: '7rem' }}
    >

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-12 pb-5 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          {onVolver && (
            <button
              onClick={onVolver}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#555' }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: clr.A }}>
                Paso {paso} de {total}
              </p>
              <p className="text-[11px] text-gray-600">{pct}%</p>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: clr.A }}
              />
            </div>
          </div>
        </div>

        <h1 className="text-[26px] font-black text-white tracking-tight leading-tight">
          Tus datos
        </h1>
        <p className="text-[13px] mt-1" style={{ color: '#555' }}>
          Confirma tu reserva
        </p>
      </div>

      <div className="flex-1 px-5 space-y-4 overflow-y-auto">

        {/* ── Resumen de la cita ──────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: '#111', border: '1px solid #1e1e1e' }}>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#444' }}>
            Tu reserva
          </p>
          <div className="space-y-2.5">
            <SummaryRow icon={Scissors}  label={servicioNombre} value={fmtPrecio(precio)} clr={clr} valueAccent />
            {showBarbero && <SummaryRow icon={User} label={barberoNombre} clr={clr} />}
            <SummaryRow icon={Calendar}  label={fechaLabel} clr={clr} />
            <SummaryRow icon={Clock}     label={hora} value={`${duracion} min`} clr={clr} />
          </div>
        </div>

        {/* ── Formulario ──────────────────────────────────────── */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Tu nombre completo *"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={BASE_INPUT}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <input
            type="tel"
            placeholder="Teléfono (WhatsApp) *"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            style={BASE_INPUT}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <input
            type="email"
            placeholder="Email (opcional)"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={BASE_INPUT}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        {/* ── Club ────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setJoinClub(v => !v)}
          className="w-full text-left rounded-2xl p-4 transition-all duration-200"
          style={{
            backgroundColor: joinClub ? clr.A08 : '#111',
            border:          joinClub ? `1.5px solid ${clr.A}` : '1px solid #1e1e1e',
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: clr.A12 }}
            >
              <Trophy size={18} style={{ color: clr.A }} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-white leading-tight">
                Unirme al Club de {tenantName.split(' ').slice(0, 2).join(' ')}
              </p>
              <p className="text-[11px] mt-1" style={{ color: '#888' }}>
                Acumula sellos con cada visita y canjea premios exclusivos
              </p>
            </div>

            <div
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-200 mt-0.5"
              style={{
                borderColor:     joinClub ? clr.A : '#333',
                backgroundColor: joinClub ? clr.A : 'transparent',
              }}
            >
              {joinClub && <Check size={12} strokeWidth={3.5} className="text-black" />}
            </div>
          </div>
        </button>
      </div>

      {/* ── Botón flotante ───────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-8 pt-3"
        style={{ background: 'linear-gradient(to top, #0a0a0a 75%, transparent)' }}
      >
        <button
          type="button"
          disabled={!isValid || loading}
          onClick={handleConfirm}
          className="w-full py-4 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          style={
            isValid
              ? {
                  backgroundColor: clr.A,
                  color: '#000',
                  boxShadow: clr.glow,
                }
              : {
                  backgroundColor: '#111',
                  color: '#333',
                  cursor: 'not-allowed',
                }
          }
        >
          {loading && (
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          )}
          {isValid ? 'Confirmar reserva' : 'Completa tus datos'}
        </button>
      </div>
    </div>
  );
}
