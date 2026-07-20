import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
 * SheetModal — diálogo estándar del panel, tratamiento estilo iOS.
 *
 * Nació en la Agenda y se extrajo acá para que TODOS los modales del
 * panel compartan el mismo lenguaje. Antes cada vista copiaba su propio
 * shell (`fixed inset-0 bg-black/70 ... rounded-xl`), así que había ~40
 * diálogos parecidos pero nunca iguales, y mejorar uno no mejoraba nada
 * más.
 *
 * Criterios detrás del diseño:
 *   · Scrim claro pero MUY difuminado. Tapar con negro duro es lo que
 *     hace ver barato un modal: el fondo debe adivinarse.
 *   · Radio grande (28px) y sombra difusa en capas, no un box-shadow duro.
 *   · Aire generoso. Lo apretado abarata una interfaz más que el color.
 *   · Entrada con spring corto, no un fade plano.
 *
 * PARA QUÉ SIRVE: diálogos de confirmación y acciones acotadas (título +
 * contexto + 2-3 botones). NO es para formularios largos ni paneles de
 * detalle — para eso están Modal/SlideOver, que manejan scroll propio.
 *
 * Uso:
 *   <SheetModal icon={Trash2} tone="danger" titulo="Eliminar servicio"
 *               sub="Corte + Barba" onClose={cerrar}
 *               footer={<>
 *                 <button className={`${sheetBtn.base} ${sheetBtn.ghost}`}>Cancelar</button>
 *                 <button className={`${sheetBtn.base} ${sheetBtn.danger}`}>Eliminar</button>
 *               </>}>
 *     …contenido…
 *   </SheetModal>
 * ═══════════════════════════════════════════════════════════════ */

const TONOS = {
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber:   'bg-amber-500/15 text-amber-400',
  danger:  'bg-red-500/15 text-red-400',
  info:    'bg-blue-500/15 text-blue-400',
  violet:  'bg-violet-500/15 text-violet-400',
};

export function SheetModal({
  icon: Icon,
  tone = 'emerald',
  titulo,
  sub,
  children,
  footer,
  onClose,
  maxW = 'max-w-[380px]',
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className={`sheet-modal-card w-full ${maxW} rounded-[28px] border border-slate-800 bg-slate-900 p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]`}
        onClick={e => e.stopPropagation()}
      >
        {(Icon || titulo) && (
          <div className="flex items-center gap-3.5">
            {Icon && (
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${TONOS[tone] || TONOS.emerald}`}>
                <Icon size={21} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-primary">{titulo}</p>
              {sub && <p className="mt-0.5 truncate text-[13px] text-slate-500">{sub}</p>}
            </div>
          </div>
        )}

        {children && <div className="mt-5 space-y-4">{children}</div>}

        {footer && <div className="mt-6 flex gap-2.5">{footer}</div>}
      </motion.div>
    </motion.div>
  );
}

/* Botones del SheetModal — altos, radio grande y respuesta al tacto.
   Se combinan: `${sheetBtn.base} ${sheetBtn.primary}` */
export const sheetBtn = {
  base:    'flex-1 rounded-2xl py-3 text-[15px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40',
  ghost:   'bg-slate-800 text-slate-300 hover:bg-slate-700',
  primary: 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)]',
  warn:    'bg-amber-500 text-amber-950 hover:bg-amber-400 shadow-[0_4px_14px_-4px_rgba(245,158,11,0.5)]',
  danger:  'bg-red-500 text-white hover:bg-red-400 shadow-[0_4px_14px_-4px_rgba(239,68,68,0.5)]',
};

/* Campos del SheetModal. Se exportan para que cada vista migrada no
   invente su propio input: sin esto, los modales comparten el marco pero
   por dentro siguen viéndose de diez maneras distintas. */
export const sheetInput =
  'w-full rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3 text-[15px] text-primary ' +
  'placeholder-slate-500 transition-colors focus:border-emerald-500/60 focus:outline-none';

export const sheetLabel =
  'mb-2 block px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500';

/* Bloque de dato destacado: lo que el usuario viene a confirmar (una
   fecha nueva, un monto, una hora) va acá, no como fila de tabla. */
export const sheetHighlight = 'rounded-2xl bg-slate-800/50 px-4 py-3.5';

export default SheetModal;
