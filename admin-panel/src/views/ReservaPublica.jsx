import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Link2, Copy, CheckCheck, ExternalLink, Instagram, MapPin, MessageCircle,
  Download, Globe, Share2, Printer, CalendarCheck, AlertCircle, FileCode,
} from 'lucide-react';
import { getDocs, query, where } from 'firebase/firestore';
import { tenantCol } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';
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

// Convierte una URL de imagen (mismo origen) a data URL para que quede
// embebida en el SVG del QR y sobreviva exportación PNG/SVG e impresión
// (about:blank y blob: no pueden resolver rutas relativas).
async function toDataUrl(src) {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function ReservaPublica() {
  const { id: tenantId, name, logo } = useTenant();
  const [copiedKey, setCopiedKey] = useState(null);
  const [copyError, setCopyError] = useState(false);
  const [onlineCount, setOnlineCount] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

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
        const snap = await withTimeout(getDocs(query(
          tenantCol('citas'),
          where('fecha', '>=', ini),
          where('fecha', '<=', fin),
        )), 20000, 'reservapublica/citas-mes');
        const count = snap.docs
          .map(d => d.data())
          .filter(c => c.estado !== 'Cancelada' && !MANUAL_ORIGINS.includes(c.origen))
          .length;
        if (active) setOnlineCount(count);
      } catch (e) {
        console.warn('[ReservaOnline] no se pudo contar reservas:', e.message);
        if (active) setOnlineCount(null);
      }
    })();
    return () => { active = false; };
  }, [tenantId]);

  // Pre-fetch del logo como data URL para incrustar en el centro del QR.
  // Con data URL, la exportación PNG/SVG y la impresión mantienen el logo.
  useEffect(() => {
    let active = true;
    if (!logo) { setLogoDataUrl(null); return; }
    (async () => {
      const url = await toDataUrl(logo);
      if (active) setLogoDataUrl(url);
    })();
    return () => { active = false; };
  }, [logo]);

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
  // exportar/imprimir. El logo va como data URL, así que el SVG queda
  // autocontenido y portable.
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
      key: 'instagram', Icon: Instagram,
      iconBg: 'bg-gradient-to-tr from-fuchsia-500 via-pink-500 to-amber-400 text-white',
      label: 'Instagram', action: 'copy',
      desc: 'Editar perfil → Sitio web → pega el link. También puedes fijarlo en tus historias destacadas.',
    },
    {
      key: 'google', Icon: MapPin,
      iconBg: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/40',
      label: 'Google Business', action: 'copy',
      desc: 'En tu perfil de Google → "Agregar sitio web" o pégalo en la descripción del negocio.',
    },
    {
      key: 'whatsapp', Icon: MessageCircle,
      iconBg: 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/40',
      label: 'WhatsApp Business', action: 'whatsapp',
      desc: 'Agrega el link en tu descripción de WhatsApp Business o compártelo directo a tus clientes.',
    },
  ];

  const ghostBtn = 'flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg text-sm border border-slate-700 transition-colors';
  const primaryBtn = 'flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all';
  const primaryCopied = 'flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all';
  const secondaryBtn = 'flex items-center gap-2 text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors';
  const smallCopyBtn = 'flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors shrink-0';

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

      {/* Stat hero — reservas online del mes */}
      {onlineCount !== null && (
        <div className="bg-slate-800/40 border border-slate-700 border-t-2 border-t-emerald-500 rounded-2xl p-5 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CalendarCheck size={22} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-4xl font-extrabold text-white leading-none tracking-tight">{onlineCount}</p>
              <p className="text-xs text-slate-400 mt-2">
                reserva{onlineCount !== 1 ? 's' : ''} online este mes · cada una cae sola en tu agenda
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Link de reserva */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Link de reserva</p>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-3">
          <Link2 size={14} className="text-slate-500 shrink-0" />
          <span className="flex-1 text-slate-300 truncate font-mono text-sm">{bookingBase}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy('link', bookingBase)}
            className={copiedKey === 'link' ? primaryCopied : primaryBtn}
          >
            {copiedKey === 'link' ? <CheckCheck size={16} /> : <Copy size={16} />}
            {copiedKey === 'link' ? 'Copiado' : 'Copiar link'}
          </button>
          {canShare && (
            <button onClick={shareNative} className={secondaryBtn}>
              <Share2 size={15} />
              Compartir
            </button>
          )}
          <a href={bookingBase} target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
            <ExternalLink size={15} />
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
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mensaje listo para enviar</p>
        <div className="bg-slate-900/80 border-l-4 border-emerald-500 text-slate-300 p-4 rounded-r-xl rounded-bl-xl text-sm leading-relaxed">
          {mensaje}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy('mensaje', mensaje)}
            className={copiedKey === 'mensaje' ? primaryCopied : primaryBtn}
          >
            {copiedKey === 'mensaje' ? <CheckCheck size={16} /> : <Copy size={16} />}
            {copiedKey === 'mensaje' ? 'Copiado' : 'Copiar mensaje'}
          </button>
          <button onClick={shareWhatsApp} className={primaryBtn}>
            <MessageCircle size={16} />
            Enviar por WhatsApp
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-white">Código QR</p>
            <p className="text-xs text-slate-500 mt-0.5">Imprime y pega en tu local o compártelo en redes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadPNG} className={ghostBtn}>
              <Download size={14} /> PNG
            </button>
            <button onClick={downloadSVG} className={ghostBtn}>
              <FileCode size={14} /> SVG
            </button>
            <button onClick={printPoster} className={ghostBtn}>
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] inline-block">
            <QRCodeSVG
              id="reserva-qr-svg"
              value={qrUrl}
              size={200}
              level="H"
              marginSize={2}
              imageSettings={logoDataUrl ? {
                src: logoDataUrl,
                height: 44,
                width: 44,
                excavate: true,
              } : undefined}
            />
          </div>
          <p className="text-xs text-slate-500 text-center">
            Escanea con la cámara del celular para reservar en <span className="text-white font-semibold">{name}</span>
          </p>
        </div>
      </div>

      {/* Dónde compartir */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-4">Dónde compartir</p>
        <div>
          {channels.map(({ Icon, iconBg, label, desc, key, action }) => (
            <div
              key={key}
              className="flex items-start md:items-center justify-between gap-3 bg-slate-900/50 hover:bg-slate-800/80 transition-colors border border-slate-700 rounded-xl p-4 mb-3 last:mb-0"
            >
              <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
              {action === 'copy' ? (
                <button
                  onClick={() => handleCopy(key, urlFor(key))}
                  className={smallCopyBtn}
                >
                  {copiedKey === key ? <CheckCheck size={12} /> : <Copy size={12} />}
                  {copiedKey === key ? 'Copiado' : 'Copiar'}
                </button>
              ) : (
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-md transition-colors shrink-0"
                >
                  <Share2 size={12} /> Enviar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stats hint */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
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
