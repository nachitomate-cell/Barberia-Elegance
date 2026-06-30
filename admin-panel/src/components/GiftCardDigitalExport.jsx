import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * @typedef {Object} GiftCardDigitalExportProps
 * @property {number} monto                    Valor en CLP.
 * @property {string} codigo                   Código alfanumérico de la GC.
 * @property {string} urlQR                    URL pública de consulta de saldo (target del QR).
 * @property {string} nombreTenant             Nombre del local (header de la tarjeta).
 * @property {string} [logoTenant]             URL del logo del local. Si falta, se usa solo el nombre.
 * @property {string} [nombreDestinatario]     Texto opcional "Para {nombre}".
 * @property {string} [templateImageUrl]       Imagen personalizada como fondo de la tarjeta (full-bleed,
 *                                             reemplaza el gradiente default). Subida desde el panel.
 * @property {keyof typeof BG_PRESETS} [bgPreset]   Gradiente base cuando no hay imagen.
 * @property {string} [accentColor]            Color de acento (código + glow primario). Default esmeralda.
 * @property {keyof typeof TITLE_FONTS} [titleFont] Tipografía del nombre del local.
 * @property {string} [customMessage]          Texto opcional de tagline (sobre el monto).
 * @property {number} [overlayIntensity]       0..1 — sólo aplica cuando hay imagen. 1 = oscurecido completo.
 */

/** Presets de fondo cuando no hay imagen personalizada. */
export const BG_PRESETS = {
  default: { gradient: 'linear-gradient(135deg, #0b1220 0%, #1e293b 55%, #0b1220 100%)', glow2: '#6366f1' },
  royal:   { gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #1e1b4b 100%)', glow2: '#3b82f6' },
  sunset:  { gradient: 'linear-gradient(135deg, #2d1410 0%, #7c2d12 55%, #2d1410 100%)', glow2: '#f59e0b' },
  mono:    { gradient: 'linear-gradient(135deg, #0a0a0a 0%, #262626 55%, #0a0a0a 100%)', glow2: '#525252' },
  forest:  { gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 55%, #052e16 100%)', glow2: '#0ea5e9' },
};

/** Tipografías disponibles para el nombre del local. */
export const TITLE_FONTS = {
  playfair:  '"Playfair Display", Georgia, serif',
  inter:     'Inter, system-ui, sans-serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  bebas:     '"Bebas Neue", Impact, sans-serif',
};

function formatCLP(n) { return `$${Math.round(n).toLocaleString('es-CL')}`; }

/**
 * Tarjeta digital de Gift Card — lista para exportar como PNG.
 * Proporciones de tarjeta de crédito (400×250). Estética Premium Dark
 * con glassmorphism sutil. La instancia *real* (la que captura
 * html-to-image) debe renderizarse en su tamaño nominal; la
 * previsualización del modal usa transform: scale() sobre una COPIA.
 * @param {GiftCardDigitalExportProps} props
 */
const GiftCardDigitalExport = forwardRef(function GiftCardDigitalExport(
  {
    monto, codigo, urlQR, nombreTenant, logoTenant, nombreDestinatario,
    templateImageUrl,
    bgPreset = 'default',
    accentColor = '#10b981',
    textColor = '#ffffff',
    titleFont = 'playfair',
    customMessage = '',
    overlayIntensity = 1,
  },
  ref,
) {
  const hasTemplate = !!templateImageUrl;
  const preset = BG_PRESETS[bgPreset] || BG_PRESETS.default;
  const fontStack = TITLE_FONTS[titleFont] || TITLE_FONTS.playfair;
  const o = Math.max(0, Math.min(1, Number(overlayIntensity) || 0));
  // Versión atenuada del color para etiquetas y texto secundario.
  const mutedTextColor = `${textColor}b3`; // ~70% opacidad en hex

  return (
    <div
      ref={ref}
      className="w-[400px] h-[250px] rounded-2xl border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden"
      style={{
        background: preset.gradient,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: textColor,
      }}
    >
      {hasTemplate ? (
        <>
          {/* Imagen personalizada full-bleed. crossOrigin para que html-to-image
              pueda capturarla sin tainted canvas. */}
          <img
            src={templateImageUrl}
            crossOrigin="anonymous"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          {/* Overlay degradado para legibilidad — intensidad ajustable. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, rgba(0,0,0,${0.18 * o}) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,${0.6 * o}) 75%, rgba(0,0,0,${0.85 * o}) 100%)`,
            }}
          />
        </>
      ) : (
        <>
          {/* Glow primario — usa el color de acento elegido por el admin. */}
          <div
            className="absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-30 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`, filter: 'blur(40px)' }}
          />
          {/* Glow secundario — fijo del preset, da profundidad. */}
          <div
            className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full opacity-20 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${preset.glow2} 0%, transparent 70%)`, filter: 'blur(40px)' }}
          />
        </>
      )}

      {/* Header — logo / nombre del local + QR */}
      <div className="flex items-start justify-between relative gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {logoTenant && (
            <img
              src={logoTenant}
              alt=""
              crossOrigin="anonymous"
              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10"
            />
          )}
          <div className="min-w-0">
            <p
              className="text-[10px] uppercase tracking-[0.18em]"
              style={{ color: mutedTextColor }}
            >
              Gift Card
            </p>
            <p
              className="text-base font-bold truncate leading-tight"
              style={{ fontFamily: fontStack, color: textColor }}
            >
              {nombreTenant}
            </p>
          </div>
        </div>

        <div className="bg-white p-1.5 rounded-lg shrink-0">
          <QRCodeSVG value={urlQR} size={56} level="M" includeMargin={false} />
        </div>
      </div>

      {/* Cuerpo — mensaje + monto + destinatario + código */}
      <div className="relative">
        {customMessage && (
          <p
            className="text-[11px] italic mb-1 truncate"
            style={{ color: mutedTextColor }}
          >
            {customMessage}
          </p>
        )}
        <p
          className="text-[32px] font-black tracking-tight leading-none"
          style={{ color: textColor }}
        >
          {formatCLP(monto)}
        </p>
        {nombreDestinatario && (
          <p className="text-xs mt-1.5" style={{ color: mutedTextColor }}>
            Para {nombreDestinatario}
          </p>
        )}
        <p
          className="font-mono text-[15px] font-bold tracking-[0.15em] mt-2"
          style={{ color: accentColor }}
        >
          {codigo}
        </p>
      </div>

      {/* Footer — branding sutil */}
      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 relative">
        <span>Powered by</span>
        <span className="font-bold text-slate-200 tracking-wide">SynapTech</span>
      </div>
    </div>
  );
});

export default GiftCardDigitalExport;
