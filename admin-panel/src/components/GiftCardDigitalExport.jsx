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
 */

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
  { monto, codigo, urlQR, nombreTenant, logoTenant, nombreDestinatario },
  ref,
) {
  return (
    <div
      ref={ref}
      className="w-[400px] h-[250px] rounded-2xl border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0b1220 0%, #1e293b 55%, #0b1220 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#fff',
      }}
    >
      {/* Glow esquina sup-der — refuerza el verde de la marca */}
      <div
        className="absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', filter: 'blur(40px)' }}
      />
      {/* Glow esquina inf-izq — profundidad */}
      <div
        className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

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
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Gift Card</p>
            <p
              className="text-base font-bold text-white truncate leading-tight"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              {nombreTenant}
            </p>
          </div>
        </div>

        <div className="bg-white p-1.5 rounded-lg shrink-0">
          <QRCodeSVG value={urlQR} size={56} level="M" includeMargin={false} />
        </div>
      </div>

      {/* Cuerpo — monto + destinatario + código */}
      <div className="relative">
        <p className="text-[32px] font-black text-white tracking-tight leading-none">
          {formatCLP(monto)}
        </p>
        {nombreDestinatario && (
          <p className="text-xs text-slate-400 mt-1.5">Para {nombreDestinatario}</p>
        )}
        <p className="font-mono text-[15px] font-bold text-emerald-400 tracking-[0.15em] mt-2">
          {codigo}
        </p>
      </div>

      {/* Footer — branding sutil */}
      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 relative">
        <span>Powered by</span>
        <span className="font-bold text-slate-300 tracking-wide">SynapTech</span>
      </div>
    </div>
  );
});

export default GiftCardDigitalExport;
