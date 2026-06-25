import { useRef, useState } from 'react';
import {
  QrCode, Copy, Check, Download, Share2, ExternalLink, Loader2, AlertCircle,
  MessageCircle, Send, Twitter, Facebook, Instagram, type LucideIcon,
} from 'lucide-react';
import { useEditor } from '../store';
import { useInstaShare, type InstaShareStatus } from '../lib/useInstaShare';
import StoryCapture from '../components/StoryCapture';

interface Net {
  label: string;
  Icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  cls: string;
}

export default function Share(): JSX.Element {
  const { state } = useEditor();
  const url = `https://bioo.cl/${state.username}`;
  const [copied, setCopied] = useState(false);

  // Insta-Share: ref al lienzo fuera de pantalla + hook que lo captura.
  // El StoryCapture renderiza el BioPreview real envuelto en una historia
  // 1080×1920; el hook lo convierte a PNG y dispara el share nativo o
  // descarga directa en desktop.
  const storyRef = useRef<HTMLDivElement>(null);
  const insta = useInstaShare(storyRef, {
    title: 'Mi nueva página',
    text: `¡Mira mi nuevo perfil en bioo.cl! ${url}`,
    filename: `bioo-${state.username || 'mi-perfil'}.png`,
    pixelRatio: 2,
  });

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard no disponible */ }
  };

  const share = async (): Promise<void> => {
    if ('share' in navigator) {
      try { await navigator.share({ title: 'Mi bioo', url }); } catch { /* cancelado */ }
    } else {
      void copy();
    }
  };

  const enc = encodeURIComponent(url);
  const msg = encodeURIComponent('Mira mi bioo 👇 ' + url);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=${enc}`;

  const downloadQR = async (): Promise<void> => {
    try {
      const res = await fetch(qr);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `bioo-${state.username || 'codigo'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(qr, '_blank');
    }
  };

  const nets: Net[] = [
    { label: 'WhatsApp', Icon: MessageCircle, href: `https://wa.me/?text=${msg}`, cls: 'bg-[#25D366]' },
    { label: 'Telegram', Icon: Send, href: `https://t.me/share/url?url=${enc}`, cls: 'bg-[#229ED9]' },
    { label: 'X', Icon: Twitter, href: `https://twitter.com/intent/tweet?text=${msg}`, cls: 'bg-black' },
    { label: 'Facebook', Icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, cls: 'bg-[#1877F2]' },
    { label: 'Instagram', Icon: Instagram, onClick: copy, cls: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]' },
  ];

  const canShare = 'share' in navigator;

  return (
    <div className="space-y-4">
      {/* ── Hero ── */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.04]">
        <div className="flex flex-col items-center text-center">
          <span className="rounded-full bg-[#92c83a]/15 p-4 text-[#72a129]">
            <QrCode size={28} />
          </span>
          <p className="mt-4 text-lg font-semibold text-neutral-800">
            bioo.cl/<span className="text-neutral-900">{state.username}</span>
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-neutral-400 transition-colors hover:text-[#72a129]"
          >
            <ExternalLink size={12} /> Ver mi página
          </a>
        </div>

        {/* Acciones principales */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={copy}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#92c83a] py-3.5 text-sm font-bold text-[#15240b] shadow-sm transition-all active:scale-95"
          >
            {copied ? <Check size={16} strokeWidth={2.6} /> : <Copy size={16} />}
            {copied ? '¡Copiado!' : 'Copiar enlace'}
          </button>
          <button
            type="button"
            onClick={downloadQR}
            className="flex items-center justify-center gap-2 rounded-xl bg-neutral-100 py-3.5 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-200 active:scale-95"
          >
            <Download size={16} /> Descargar QR
          </button>
        </div>

        {canShare && (
          <button
            type="button"
            onClick={share}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-neutral-500 transition-all hover:bg-neutral-50 active:scale-95"
          >
            <Share2 size={15} /> Más opciones para compartir
          </button>
        )}
      </section>

      {/* ── Insta-Share (CTA viral) ──
          Botón hero que captura una historia 9:16 con el preview real del
          usuario y la pasa al menú nativo (IG → Stories). En desktop hace
          fallback a descarga. */}
      <InstaShareCard
        status={insta.status}
        error={insta.error}
        canShareFiles={insta.canShareFiles}
        onShare={() => void insta.share()}
      />

      {/* ── QR ── */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.04]">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-neutral-400">Código QR</p>
        <img src={qr} alt="QR de tu página" className="mx-auto h-44 w-44 rounded-2xl" />
      </section>

      {/* ── Redes ── */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-wider text-neutral-400">Compartir en redes</p>
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
          {nets.map((n) => {
            const Icon = n.Icon;
            const inner = (
              <>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm ${n.cls}`}>
                  <Icon size={20} />
                </span>
                <span className="text-[11px] font-semibold text-neutral-500">{n.label}</span>
              </>
            );
            const cls = 'flex shrink-0 flex-col items-center gap-1.5 transition-all active:scale-95';
            return n.href ? (
              <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className={cls}>
                {inner}
              </a>
            ) : (
              <button key={n.label} type="button" onClick={n.onClick} className={cls}>
                {inner}
              </button>
            );
          })}
        </div>
      </section>

      {/* Lienzo OFF-SCREEN que se convierte en la imagen compartida.
          Vive aquí porque depende de `state` (vivo) y del DOM montado. */}
      <StoryCapture ref={storyRef} state={state} />
    </div>
  );
}

/* ────────────────────────────── Insta-Share UI ────────────────────────────── */

function InstaShareCard({
  status, error, canShareFiles, onShare,
}: {
  status: InstaShareStatus;
  error: string | null;
  canShareFiles: boolean;
  onShare: () => void;
}): JSX.Element {
  const busy = status === 'generating' || status === 'sharing';

  let label: string;
  let Icon: LucideIcon;
  if (status === 'generating') { label = 'Generando imagen…'; Icon = Loader2; }
  else if (status === 'sharing') { label = 'Abriendo Instagram…'; Icon = Loader2; }
  else if (status === 'done') { label = canShareFiles ? '¡Compartido!' : '¡Descargado!'; Icon = Check; }
  else if (status === 'error') { label = 'Reintentar'; Icon = AlertCircle; }
  else { label = canShareFiles ? 'Compartir en IG Stories' : 'Descargar para Instagram'; Icon = Instagram; }

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] p-5 text-white shadow-lg">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
          <Instagram size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold leading-tight">Compártelo en tu historia</p>
          <p className="mt-1 text-xs leading-relaxed text-white/85">
            Generamos una imagen 9:16 con tu página y la pasamos al menú nativo
            de tu celular para enviarla directo a Instagram.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onShare}
        disabled={busy}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-extrabold text-[#15240b] shadow-sm transition-all active:scale-95 disabled:opacity-90 ${
          status === 'error' ? 'text-red-600' : ''
        }`}
      >
        <Icon size={18} className={busy ? 'animate-spin' : ''} strokeWidth={status === 'done' ? 2.8 : 2.2} />
        {label}
      </button>

      {!canShareFiles && status === 'idle' && (
        <p className="mt-2 text-center text-[11px] text-white/85">
          Estás en computador — se descargará el PNG y lo subes manualmente.
        </p>
      )}
      {status === 'error' && error && (
        <p className="mt-2 text-center text-[11px] text-white">{error}</p>
      )}
    </section>
  );
}
