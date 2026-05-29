import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link2, Copy, CheckCheck, ExternalLink, Instagram, MapPin, MessageCircle, Download, Globe } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

export default function ReservaPublica() {
  const { id: tenantId, name } = useTenant();
  const [copied, setCopied] = useState(false);

  const bookingUrl = `${window.location.origin}/index.html?local=${tenantId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const downloadQR = () => {
    const svg = document.getElementById('reserva-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-reservas-${tenantId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe size={20} className="text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Reserva Online</h1>
        </div>
        <p className="text-sm text-slate-400">
          Comparte este link para que tus clientes reserven 24/7 sin necesidad de llamar.
        </p>
      </div>

      {/* Link Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Link de reserva</p>
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2.5">
          <Link2 size={13} className="text-slate-500 shrink-0" />
          <span className="flex-1 text-sm text-slate-300 truncate font-mono text-xs">{bookingUrl}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
              copied
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
            }`}
          >
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <ExternalLink size={14} />
            Abrir
          </a>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-bold text-white">Código QR</p>
            <p className="text-xs text-slate-500 mt-0.5">Imprime y pega en tu local o comparte por WhatsApp</p>
          </div>
          <button
            onClick={downloadQR}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <Download size={12} />
            Descargar SVG
          </button>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-xl">
            <QRCodeSVG
              id="reserva-qr-svg"
              value={bookingUrl}
              size={190}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-xs text-slate-500 text-center">
            Escanea con la cámara del celular para reservar en <span className="text-white font-semibold">{name}</span>
          </p>
        </div>
      </div>

      {/* Where to share */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <p className="text-sm font-bold text-white">Dónde compartir</p>
        <div className="space-y-2">
          {[
            {
              Icon: Instagram,
              color: 'text-pink-400',
              bg: 'bg-pink-500/10',
              label: 'Instagram',
              desc: 'Editar perfil → Sitio web → Pega el link. También puedes agregarlo en tus historias fijadas.',
            },
            {
              Icon: MapPin,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              label: 'Google Business',
              desc: 'En tu perfil de Google → "Agregar sitio web" o agrega el link en la descripción del negocio.',
            },
            {
              Icon: MessageCircle,
              color: 'text-green-400',
              bg: 'bg-green-500/10',
              label: 'WhatsApp Business',
              desc: 'Agrega el link en tu descripción de WhatsApp Business. También puedes compartirlo directamente.',
            },
          ].map(({ Icon, color, bg, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats hint */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 animate-pulse" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Cada reserva online queda automáticamente en tu agenda y recibes una notificación en el panel.
          Los clientes reciben confirmación por WhatsApp si tienen número registrado.
        </p>
      </div>

    </div>
  );
}
