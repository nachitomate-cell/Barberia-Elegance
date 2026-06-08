import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Link2, Copy, CheckCheck, ExternalLink, Instagram, MapPin, MessageCircle,
  Download, Globe, Share2, Printer, CalendarCheck, AlertCircle, FileCode, Scissors,
} from 'lucide-react';
import { getDocs, query, where } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { useTenant } from '../contexts/TenantContext';

// Solo la agenda del staff ('agenda_manual') es una carga manual/presencial.
// Las reservas online del cliente vienen de /index ('reserva_online') y de la
// página del barbero /barbero ('barbero-page'); ambas pasan por FDB.addCita.
// El resto sin `origen` (citas antiguas) también se asume online.
const MANUAL_ORIGINS = ['agenda_manual'];

// Copia robusta: usa Clipboard API en contexto seguro y cae a execCommand.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* sigue al fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

export default function ReservaPublica() {
  const { id: tenantId, name } = useTenant();
  const [copiedKey, setCopiedKey] = useState(null);
  const [copyError, setCopyError] = useState(false);
  const [stats, setStats] = useState(null);

  // Link base limpio (para mostrar y copiar). Las variantes por canal llevan
  // UTM para medir el origen de las reservas en Vercel Analytics.
  const bookingBase = window.location.origin;
  const urlFor = src => `${bookingBase}/?utm_source=${src}&utm_medium=reserva_online`;
  const qrUrl = urlFor('qr');
  const mensaje = `¡Hola! Reserva tu hora en ${name} cuando quieras, 24/7 y sin llamar 👉 ${urlFor('mensaje')}`;

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // ── Contador de reservas online del mes en curso ──────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const pad = n => String(n).padStart(2, '0');
        const ini = `${y}-${pad(m + 1)}-01`;
        const fin = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
        const snap = await getDocs(query(
          tenantCol('citas'),
          where('fecha', '>=', ini),
          where('fecha', '<=', fin),
        ));
        const acc = { total: 0, pagina: 0, barbero: 0, otros: 0 };
        snap.docs.map(d => d.data()).forEach(c => {
          if (c.estado === 'Cancelada' || MANUAL_ORIGINS.includes(c.origen)) return;
          acc.total++;
          if (c.origen === 'reserva_online') acc.pagina++;
          else if (c.origen === 'barbero-page') acc.barbero++;
          else acc.otros++; // citas anteriores al etiquetado de origen
        });
        if (active) setStats(acc);
      } catch (e) {
        console.warn('[ReservaOnline] no se pudo contar reservas:', e.message);
        if (active) setStats(null);
      }
    })();
    return () => { active = false; };
  }, [tenantId]);

  // ── Acciones ──────────────────────────────────────────────────────
  const handleCopy = async (key, text) => {
    const ok = await copyText(text);
    if (ok) {
      setCopyError(false);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(k => (k === key ? null : k)), 2000);
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 4000);
    }
  };

  const shareNative = async () => {
    try {
      await navigator.share({ title: `Reserva en ${name}`, text: `Reserva tu hora en ${name} 24/7`, url: urlFor('share') });
    } catch { /* cancelado o no soportado */ }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer');
  };

  // Serializa el <svg> del QR como string standalone (con xmlns) para
  // exportar/imprimir.
  const serializeQR = () => {
    const svg = document.getElementById('reserva-qr-svg');
    if (!svg) return null;
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(clone);
  };

  const triggerDownload = (href, filename, revoke) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (revoke) URL.revokeObjectURL(href);
  };

  const downloadSVG = () => {
    const data = serializeQR();
    if (!data) return;
    const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
    triggerDownload(url, `qr-reservas-${tenantId}.svg`, true);
  };

  const downloadPNG = () => {
    const data = serializeQR();
    if (!data) return;
    const svgUrl = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const size = 800;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob(blob => {
        if (!blob) return;
        triggerDownload(URL.createObjectURL(blob), `qr-reservas-${tenantId}.png`, true);
      }, 'image/png');
    };
    img.src = svgUrl;
  };

  const printPoster = () => {
    const data = serializeQR();
    if (!data) return;
    const w = window.open('', '_blank', 'width=800,height=1000');
    if (!w) return;
    const cleanUrl = bookingBase.replace(/^https?:\/\//, '');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reservas ${escapeHtml(name)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
  .poster { text-align:center; padding:48px 40px; }
  h1 { font-size:34px; font-weight:800; letter-spacing:-0.5px; }
  .sub { font-size:20px; color:#444; margin-top:8px; }
  .qr { display:inline-block; margin:36px 0 20px; padding:20px; border:2px solid #111; border-radius:20px; }
  .qr svg { width:340px; height:340px; display:block; }
  .url { font-size:18px; font-weight:700; }
  .foot { font-size:14px; color:#666; margin-top:14px; }
  @media print { @page { margin:0; } body { -webkit-print-color-adjust:exact; } }
</style></head><body>
  <div class="poster">
    <h1>${escapeHtml(name)}</h1>
    <p class="sub">Reserva tu hora aquí</p>
    <div class="qr">${data}</div>
    <p class="url">${escapeHtml(cleanUrl)}</p>
    <p class="foot">Escanea con la cámara de tu celular · Reserva 24/7</p>
  </div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const channels = [
    {
      key: 'instagram', Icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10',
      label: 'Instagram', action: 'copy',
      desc: 'Editar perfil → Sitio web → pega el link. También puedes fijarlo en tus historias destacadas.',
    },
    {
      key: 'google', Icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10',
      label: 'Google Business', action: 'copy',
      desc: 'En tu perfil de Google → "Agregar sitio web" o pégalo en la descripción del negocio.',
    },
    {
      key: 'whatsapp', Icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-500/10',
      label: 'WhatsApp Business', action: 'whatsapp',
      desc: 'Agrega el link en tu descripción de WhatsApp Business o compártelo directo a tus clientes.',
    },
  ];

  const btnBase = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border';
  const btnNeutral = 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700';

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

      {/* Reservas online del mes + desglose por origen */}
      {stats !== null && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CalendarCheck size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{stats.total}</p>
              <p className="text-xs text-slate-400 mt-1">
                reserva{stats.total !== 1 ? 's' : ''} online este mes · cada una cae sola en tu agenda
              </p>
            </div>
          </div>
          {stats.total > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { Icon: Globe,    color: 'text-emerald-400', label: 'Página general', value: stats.pagina },
                { Icon: Scissors, color: 'text-sky-400',     label: 'Link de barbero', value: stats.barbero },
                ...(stats.otros > 0 ? [{ Icon: CalendarCheck, color: 'text-slate-400', label: 'Sin etiquetar', value: stats.otros }] : []),
              ].map(({ Icon, color, label, value }) => (
                <div key={label} className="flex items-center gap-2 bg-slate-800/60 border border-slate-800 rounded-lg px-3 py-1.5">
                  <Icon size={13} className={color} />
                  <span className="text-xs text-slate-400">{label}</span>
                  <span className="text-sm font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Link de reserva</p>
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2.5">
          <Link2 size={13} className="text-slate-500 shrink-0" />
          <span className="flex-1 text-slate-300 truncate font-mono text-xs">{bookingBase}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy('link', bookingBase)}
            className={`${btnBase} ${copiedKey === 'link' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : btnNeutral}`}
          >
            {copiedKey === 'link' ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copiedKey === 'link' ? 'Copiado' : 'Copiar link'}
          </button>
          {canShare && (
            <button onClick={shareNative} className={`${btnBase} ${btnNeutral}`}>
              <Share2 size={14} />
              Compartir
            </button>
          )}
          <a href={bookingBase} target="_blank" rel="noopener noreferrer" className={`${btnBase} ${btnNeutral}`}>
            <ExternalLink size={14} />
            Abrir
          </a>
        </div>
        {copyError && (
          <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} /> No se pudo copiar automáticamente. Mantén presionado el link de arriba para copiarlo.
          </div>
        )}
      </div>

      {/* Mensaje listo para enviar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <p className="text-sm font-bold text-white">Mensaje listo para enviar</p>
        <div className="bg-slate-800/60 rounded-lg px-4 py-3 text-sm text-slate-300 leading-relaxed border border-slate-800">
          {mensaje}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy('mensaje', mensaje)}
            className={`${btnBase} ${copiedKey === 'mensaje' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : btnNeutral}`}
          >
            {copiedKey === 'mensaje' ? <CheckCheck size={14} /> : <Copy size={14} />}
            {copiedKey === 'mensaje' ? 'Copiado' : 'Copiar mensaje'}
          </button>
          <button
            onClick={shareWhatsApp}
            className={`${btnBase} bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20`}
          >
            <MessageCircle size={14} />
            Enviar por WhatsApp
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-white">Código QR</p>
            <p className="text-xs text-slate-500 mt-0.5">Imprime y pega en tu local o compártelo en redes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadPNG} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all">
              <Download size={12} /> PNG
            </button>
            <button onClick={downloadSVG} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all">
              <FileCode size={12} /> SVG
            </button>
            <button onClick={printPoster} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all">
              <Printer size={12} /> Imprimir
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-xl">
            <QRCodeSVG
              id="reserva-qr-svg"
              value={qrUrl}
              size={190}
              level="H"
              marginSize={4}
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
          {channels.map(({ Icon, color, bg, label, desc, key, action }) => (
            <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon size={16} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{desc}</p>
              </div>
              {action === 'copy' ? (
                <button
                  onClick={() => handleCopy(key, urlFor(key))}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all shrink-0"
                >
                  {copiedKey === key ? <CheckCheck size={12} /> : <Copy size={12} />}
                  {copiedKey === key ? 'Copiado' : 'Copiar'}
                </button>
              ) : (
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 transition-all shrink-0"
                >
                  <Share2 size={12} /> Enviar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats hint */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0 animate-pulse" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Cada reserva online queda automáticamente en tu agenda y recibes una notificación en el panel.
          Los clientes reciben confirmación por WhatsApp si tienen número registrado. Los links incluyen
          seguimiento (UTM) para saber desde qué canal llegan tus reservas.
        </p>
      </div>

    </div>
  );
}
