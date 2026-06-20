import { useState } from 'react';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { useEditor } from '../store';

export default function Share(): JSX.Element {
  const { state } = useEditor();
  const url = `https://bioo.cl/${state.username}`;
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard no disponible */ }
  };

  const share = async (): Promise<void> => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Mi bioo', url }); } catch { /* cancelado */ }
    } else {
      void copy();
    }
  };

  const enc = encodeURIComponent(url);
  const msg = encodeURIComponent('Mira mi bioo 👇 ' + url);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${enc}`;

  const nets: { label: string; href?: string; onClick?: () => void; cls: string }[] = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${msg}`, cls: 'bg-[#25D366]' },
    { label: 'Telegram', href: `https://t.me/share/url?url=${enc}`, cls: 'bg-[#229ED9]' },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${msg}`, cls: 'bg-black' },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, cls: 'bg-[#1877F2]' },
    { label: 'Instagram', onClick: copy, cls: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]' },
    { label: 'Copiar', onClick: copy, cls: 'bg-bioo-dark' },
  ];

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={share}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-bioo-dark py-4 text-sm font-bold text-white shadow-md transition-transform active:scale-[0.99]"
      >
        <Share2 size={18} /> Compartir mi bioo
      </button>

      <div className="grid grid-cols-3 gap-2.5">
        {nets.map((n) =>
          n.href ? (
            <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" className={`rounded-xl py-3 text-center text-xs font-bold text-white ${n.cls}`}>
              {n.label}
            </a>
          ) : (
            <button key={n.label} type="button" onClick={n.onClick} className={`rounded-xl py-3 text-center text-xs font-bold text-white ${n.cls}`}>
              {n.label}
            </button>
          ),
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
        <span className="flex-1 truncate text-sm font-bold text-bioo-dark">bioo.cl/{state.username}</span>
        <button type="button" onClick={copy} className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:border-bioo">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado' : 'Copiar'}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:border-bioo">
          <ExternalLink size={13} /> Ver
        </a>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">Código QR</h3>
        <img src={qr} alt="QR de tu página" className="mx-auto h-44 w-44 rounded-xl border border-neutral-200" />
      </div>
    </div>
  );
}
