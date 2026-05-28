import { X, Scissors, ShieldCheck, Award, GraduationCap } from 'lucide-react';

const ORO = '#D4AF37';

function SeccionCard({ icon: Icon, titulo, descripcion }) {
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${ORO}15`, border: `1px solid ${ORO}30` }}
      >
        <Icon size={18} style={{ color: ORO }} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-sm font-bold text-white mb-1">{titulo}</p>
        <p className="text-sm text-slate-400 leading-relaxed">{descripcion}</p>
      </div>
    </div>
  );
}

export default function AcademiaModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div
          className="relative px-6 pt-6 pb-5 rounded-t-2xl overflow-hidden"
          style={{ background: `linear-gradient(135deg, #0f172a 60%, ${ORO}18)` }}
        >
          {/* Glow decorativo */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: ORO }}
          />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${ORO}20`, border: `1px solid ${ORO}50` }}
            >
              <GraduationCap size={22} style={{ color: ORO }} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ORO }}>
                Formación de Excelencia
              </p>
              <h2 className="text-lg font-bold text-white leading-tight">
                Academia Pichara
              </h2>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed border-l-2 pl-3" style={{ borderColor: ORO }}>
            El Motor de Nuestra Elegancia
          </p>
        </div>

        {/* ── Cuerpo ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Intro */}
          <p className="text-sm text-slate-300 leading-relaxed">
            Todo nuestro equipo en Viña del Mar está respaldado por el programa intensivo de{' '}
            <span className="font-bold text-white">240 horas de Barbería Profesional</span>,
            asegurando que cada servicio cumpla con la promesa:
          </p>
          <p
            className="text-center text-sm font-bold italic px-4 py-2.5 rounded-xl"
            style={{ color: ORO, background: `${ORO}10`, border: `1px solid ${ORO}25` }}
          >
            "No es solo un corte. Es elegancia."
          </p>

          {/* Secciones */}
          <div className="space-y-3 pt-1">
            <SeccionCard
              icon={Scissors}
              titulo="Maestría Técnica"
              descripcion="Capacitación experta detrás de nuestros servicios más solicitados: desde el Corte Tradicional hasta nuestro popular Corte Degradé y Corte con Textura."
            />
            <SeccionCard
              icon={ShieldCheck}
              titulo="Protocolos Premium"
              descripcion="Diagnóstico profesional del cabello y rostro, junto con estrictos estándares de higiene que garantizan una experiencia segura y de primer nivel."
            />
            <SeccionCard
              icon={Award}
              titulo="Sinergia con tu Membresía"
              descripcion="La precisión en los tiempos de ejecución de nuestros barberos es lo que permite que el Club Elegance GOLD funcione a la perfección, garantizando tus recompensas siempre a tiempo."
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: `${ORO}15`,
              color: ORO,
              border: `1px solid ${ORO}40`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${ORO}25`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${ORO}15`; }}
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
