/**
 * SettingsPrimitives — primitivos "premium apple" (iOS/macOS Settings 2022+).
 *
 * Extraído de admin-panel/src/views/Configuracion.jsx (rediseño 2026-07) para
 * que otras vistas del panel (WhatsApp, Marketing, etc.) puedan compartir el
 * mismo lenguaje visual sin duplicar código. Ver README interno en cada componente.
 */

/**
 * Section — encabezado de una "página" de configuración.
 * Título grande + subtítulo opcional + ícono en caja translúcida. Los children
 * son los grupos apilados debajo. Se usa como wrapper superior de cada sección.
 */
export function Section({ Icon, title, description, children }) {
  return (
    <section className="space-y-5 sm:space-y-6">
      <header className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 w-9 h-9 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center shrink-0">
            <Icon size={17} className="text-slate-300" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-primary tracking-tight leading-tight">{title}</h2>
          {description && (
            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

/**
 * SettingsGroup — caja rounded translúcida tipo iOS. Con label superior
 * (small-caps gris) y footer opcional debajo del grupo. Los children suelen
 * ser SettingRow o inputs. `divide` agrega hairlines entre filas.
 */
export function SettingsGroup({ label, footer, children, divide = false, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <p className="px-4 sm:px-1 mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
      )}
      <div className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm ${divide ? 'divide-y divide-white/[0.05]' : ''}`}>
        {children}
      </div>
      {footer && (
        <p className="px-4 sm:px-1 mt-2 text-[11.5px] text-slate-500 leading-relaxed">{footer}</p>
      )}
    </div>
  );
}

/**
 * SettingRow — fila "label izquierda, control derecha" tipo iOS. Con `stackedOnMobile`
 * el control cae abajo en pantallas chicas (útil para inputs largos o botones).
 */
export function SettingRow({ Icon, title, description, children, stackedOnMobile = false }) {
  return (
    <div className={`flex ${stackedOnMobile ? 'flex-col sm:flex-row sm:items-center' : 'items-center'} justify-between gap-3 px-4 sm:px-5 py-3.5`}>
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <Icon size={16} className="text-slate-400 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-primary leading-snug">{title}</p>
          {description && (
            <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {children && <div className={`shrink-0 ${stackedOnMobile ? 'w-full sm:w-auto' : ''}`}>{children}</div>}
    </div>
  );
}

/**
 * FormField — campo con label uppercase pequeño arriba, input abajo, hint opcional.
 * A diferencia de SettingRow, es para inputs largos con label descriptivo (nombres,
 * direcciones, etc.). Se usa dentro de un SettingsGroup.
 */
export function FormField({ label, hint, children, className = '' }) {
  return (
    <div className={`px-4 sm:px-5 py-3.5 ${className}`}>
      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.06em] mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-slate-500 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

/**
 * IosToggle — switch táctil estilo iOS. Extraído del inline de Configuracion.jsx
 * (donde ya venía como sub-componente). `sm` = 36×20 · `md` = 44×24.
 */
export function IosToggle({ checked, onChange, size = 'md', disabled = false }) {
  const dim = size === 'sm'
    ? { track: 'w-9 h-5', dot: 'w-4 h-4', on: 'translate-x-4', off: 'translate-x-0.5' }
    : { track: 'w-11 h-6', dot: 'w-5 h-5', on: 'translate-x-[22px]', off: 'translate-x-0.5' };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative shrink-0 rounded-full transition-colors ${dim.track} ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${checked ? 'bg-emerald-500' : 'bg-neutral-700'}`}
    >
      <span className={`absolute top-0.5 ${dim.dot} rounded-full bg-white shadow transition-transform ${
        checked ? dim.on : dim.off
      }`} />
    </button>
  );
}
