import { useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import {
  Plus, Trash2, Star, GripVertical, X,
  Link2, MessageCircle, Instagram, Music2, Facebook, Youtube, Mail, Phone,
  Type, Minus, Image as ImageIcon, PlaySquare, Share2, MailPlus, Coffee, Lock,
  RectangleHorizontal, Square, Maximize2, Sparkles, type LucideIcon,
} from 'lucide-react';
import { useEditor, newBlock } from '../store';
import { fileToDataUrl } from '../lib/image';
import { SOCIAL_NETS, embedSrc } from '../lib/blocks';
import ImagePicker from '../components/ImagePicker';
import TemplatePicker from '../components/TemplatePicker';
import type { Block, BlockType, Social, SocialNet, LayoutSize } from '../types';

const TIPOS: { id: BlockType; label: string }[] = [
  { id: 'enlace', label: 'Enlace / Web' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'email', label: 'Correo' },
  { id: 'telefono', label: 'Teléfono' },
  { id: 'texto', label: 'Texto' },
  { id: 'separador', label: 'Separador' },
  { id: 'imagen', label: 'Imagen / Banner' },
  { id: 'embed', label: 'Multimedia (Video/Audio)' },
  { id: 'social', label: 'Fila social' },
  { id: 'newsletter', label: 'Suscripción' },
  { id: 'tip', label: 'Recibir Propinas' },
  { id: 'paywall', label: 'Vender Producto/Enlace' },
];

const TYPE_ICON: Record<BlockType, LucideIcon> = {
  enlace: Link2, whatsapp: MessageCircle, instagram: Instagram, tiktok: Music2,
  facebook: Facebook, youtube: Youtube, email: Mail, telefono: Phone,
  texto: Type, separador: Minus, imagen: ImageIcon, embed: PlaySquare, social: Share2,
  newsletter: MailPlus, tip: Coffee, paywall: Lock,
};

const SPECIAL: BlockType[] = ['texto', 'separador', 'imagen', 'embed', 'social', 'newsletter', 'tip', 'paywall'];
const isLinkType = (t: BlockType): boolean => !SPECIAL.includes(t);

export default function Links(): JSX.Element {
  const { state, dispatch } = useEditor();
  const [picker, setPicker] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* ── Onboarding mágico: plantillas ── */}
      <button
        type="button"
        onClick={() => setTplOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#92c83a] to-[#72a129] py-3 text-sm font-bold text-[#15240b] shadow-sm transition-transform active:scale-95"
      >
        <Sparkles size={16} /> Empezar con una plantilla
      </button>
      <TemplatePicker open={tplOpen} onClose={() => setTplOpen(false)} />

      {/* ── Agregar enlace (arriba de la lista) ── */}
      {picker ? (
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.05]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TIPOS.map((t) => {
              const Icon = TYPE_ICON[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { dispatch({ type: 'addBlock', block: newBlock(t.id) }); setPicker(false); }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-[#92c83a]/5 hover:ring-[#92c83a]"
                >
                  <Icon size={15} className="text-[#72a129]" /> {t.label}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setPicker(false)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-4 text-sm font-bold text-[#72a129] transition-colors hover:border-[#92c83a] hover:bg-[#92c83a]/5"
          >
            <Plus size={18} strokeWidth={2.5} /> Enlace
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'addBlock', block: newBlock('newsletter') })}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#92c83a]/40 bg-[#92c83a]/10 py-4 text-sm font-bold text-[#72a129] transition-colors hover:border-[#92c83a] hover:bg-[#92c83a]/15"
          >
            <MailPlus size={18} strokeWidth={2.3} /> Suscripción
          </button>
        </div>
      )}

      {/* ── Lista reordenable (Framer Motion) ── */}
      <Reorder.Group axis="y" values={state.blocks} onReorder={(blocks) => dispatch({ type: 'setBlocks', blocks })} className="space-y-3">
        {state.blocks.map((b) => (
          <Reorder.Item
            key={b.id}
            value={b}
            className="group rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/[0.05] transition-shadow hover:shadow-md"
          >
            <LinkCard block={b} />
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {state.blocks.length === 0 && (
        <p className="px-1 pt-1 text-center text-xs text-gray-400">Aún no tienes enlaces. Agrega el primero arriba ☝️</p>
      )}
    </div>
  );
}

/* ─────────────── Tarjeta de enlace ─────────────── */

const titleInput =
  'w-full rounded-lg bg-transparent px-2 py-1 text-base font-semibold text-gray-900 placeholder-gray-400 transition-colors focus:bg-gray-50 focus:outline-none';
const subInput =
  'w-full rounded-lg bg-transparent px-2 py-1 text-sm text-gray-500 placeholder-gray-400 transition-colors focus:bg-gray-50 focus:outline-none';

function LinkCard({ block }: { block: Block }): JSX.Element {
  const { dispatch } = useEditor();
  const patch = (p: Partial<Block>): void => dispatch({ type: 'patchBlock', id: block.id, patch: p });
  const remove = (): void => dispatch({ type: 'removeBlock', id: block.id });
  const link = isLinkType(block.tipo);

  return (
    <div>
      <div className="flex items-start gap-2.5">
        {/* Drag handle (6 puntos) */}
        <button
          type="button"
          aria-label="Arrastrar para reordenar"
          className="mt-1.5 cursor-grab text-gray-400 opacity-40 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </button>

        {/* Contenido */}
        <div className="min-w-0 flex-1">
          <TypeChip block={block} patch={patch} />
          {link ? (
            <>
              <input className={titleInput} placeholder="Título del enlace" value={block.label} onChange={(e) => patch({ label: e.target.value })} />
              <div className="mt-0.5 flex items-center gap-2">
                <ThumbBox block={block} patch={patch} />
                <div className="min-w-0 flex-1">
                  <SecondLine block={block} patch={patch} />
                </div>
              </div>
            </>
          ) : (
            <SpecialBody block={block} patch={patch} />
          )}
        </div>

        {/* Toggle iOS (esquina superior derecha) */}
        <Toggle on={block.activo} onChange={(v) => patch({ activo: v })} />
      </div>

      {/* Barra de herramientas */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        {block.tipo !== 'newsletter' && block.tipo !== 'separador' && block.tipo !== 'embed' && block.tipo !== 'tip' && block.tipo !== 'paywall'
          ? <SizePicker value={block.layoutSize ?? 'full'} onChange={(v) => patch({ layoutSize: v })} />
          : <span />}
        <div className="flex items-center gap-0.5">
          {link && (
            <button
              type="button"
              onClick={() => patch({ featured: !block.featured })}
              title="Destacar"
              className={`rounded-lg p-1.5 transition-colors ${block.featured ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}`}
            >
              <Star size={16} fill={block.featured ? 'currentColor' : 'none'} />
            </button>
          )}
          <button type="button" onClick={remove} title="Eliminar enlace" className="rounded-lg p-1.5 text-gray-300 transition-colors hover:text-red-500">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

const SIZES: [LayoutSize, string, LucideIcon][] = [
  ['full', 'Ancho completo', RectangleHorizontal],
  ['half', 'Mitad (cuadrado)', Square],
  ['large', 'Destacado', Maximize2],
];

/** Selector de tamaño Bento (3 iconitos). */
function SizePicker({ value, onChange }: { value: LayoutSize; onChange: (v: LayoutSize) => void }): JSX.Element {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-50 p-0.5">
      {SIZES.map(([v, title, Icon]) => (
        <button
          key={v}
          type="button"
          title={title}
          onClick={() => onChange(v)}
          className={`grid h-6 w-7 place-items-center rounded-md transition-colors ${
            value === v ? 'bg-white text-[#72a129] shadow-sm' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${on ? 'bg-[#92c83a]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

/** Placeholder cuadrado dashed para la miniatura — sube una imagen al tocar. */
function ThumbBox({ block, patch }: { block: Block; patch: (p: Partial<Block>) => void }): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title="Miniatura"
        className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-[#92c83a] hover:text-[#72a129]"
      >
        {block.thumb ? <img src={block.thumb} alt="" className="h-full w-full rounded-md object-cover" /> : <ImageIcon size={16} />}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) { try { patch({ thumb: await fileToDataUrl(f, { square: true, maxW: 160 }) }); } catch { /* noop */ } }
          e.target.value = '';
        }}
      />
    </>
  );
}

function TypeChip({ block, patch }: { block: Block; patch: (p: Partial<Block>) => void }): JSX.Element {
  return (
    <div className="relative -ml-1 mb-0.5 inline-flex">
      <select
        value={block.tipo}
        onChange={(e) => patch({ tipo: e.target.value as BlockType })}
        className="cursor-pointer appearance-none rounded-md bg-transparent px-1 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#72a129] hover:bg-[#92c83a]/5 focus:outline-none"
      >
        {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
    </div>
  );
}

function SecondLine({ block, patch }: { block: Block; patch: (p: Partial<Block>) => void }): JSX.Element {
  switch (block.tipo) {
    case 'whatsapp':
    case 'telefono':
      return (
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-400">+</span>
          <input className={`${subInput} w-12`} placeholder="56" value={block.prefijo ?? ''} onChange={(e) => patch({ prefijo: e.target.value })} />
          <input className={subInput} placeholder="9 1234 5678" value={block.telefono ?? ''} onChange={(e) => patch({ telefono: e.target.value })} />
        </div>
      );
    case 'instagram':
    case 'tiktok':
    case 'facebook':
      return <input className={subInput} placeholder="@tuusuario" value={block.usuario ?? ''} onChange={(e) => patch({ usuario: e.target.value })} />;
    case 'email':
      return <input className={subInput} type="email" placeholder="tu@correo.com" value={block.email ?? ''} onChange={(e) => patch({ email: e.target.value })} />;
    default:
      return <input className={subInput} placeholder="https://tusitio.cl" value={block.url} onChange={(e) => patch({ url: e.target.value })} />;
  }
}

function SpecialBody({ block, patch }: { block: Block; patch: (p: Partial<Block>) => void }): JSX.Element {
  switch (block.tipo) {
    case 'separador':
      return <p className="py-1 text-sm text-gray-400">Línea divisoria — separa secciones de tu página.</p>;
    case 'texto':
      return <textarea className={`${titleInput} resize-none`} rows={2} placeholder="Escribe un título o texto" value={block.texto ?? ''} onChange={(e) => patch({ texto: e.target.value })} />;
    case 'imagen':
      return (
        <div className="space-y-2 pt-1">
          <ImagePicker value={block.img ?? ''} onChange={(img) => patch({ img })} maxW={1080} label="Subir imagen" />
          <input className={subInput} placeholder="Link al tocar (opcional) https://…" value={block.url} onChange={(e) => patch({ url: e.target.value })} />
        </div>
      );
    case 'embed':
      return (
        <input
          className={subInput}
          placeholder="Pega el link de YouTube o Spotify"
          value={block.url}
          onChange={(e) => {
            const info = embedSrc(e.target.value);
            // Auto-tamaño: YouTube → large (video 16:9); Spotify → full.
            const layoutSize: LayoutSize = info?.kind === 'youtube' ? 'large' : info?.kind === 'spotify' ? 'full' : (block.layoutSize ?? 'full');
            patch({ url: e.target.value, layoutSize });
          }}
        />
      );
    case 'social':
      return <SocialEditor block={block} patch={patch} />;
    case 'newsletter':
      return (
        <div className="space-y-0.5 pt-0.5">
          <input className={titleInput} placeholder="Únete a mi Newsletter" value={block.label} onChange={(e) => patch({ label: e.target.value })} />
          <input className={subInput} placeholder="Recibe mis mejores tips cada semana" value={block.subtitulo ?? ''} onChange={(e) => patch({ subtitulo: e.target.value })} />
          <div className="flex items-center gap-2 pt-1">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">Botón</span>
            <input className={subInput} placeholder="Suscribirme" value={block.btnText ?? ''} onChange={(e) => patch({ btnText: e.target.value })} />
          </div>
        </div>
      );
    case 'tip': {
      const amounts = block.amounts ?? [3, 5, 10];
      const setAmt = (i: number, v: string): void => {
        const n = Math.max(0, Math.round(Number(v) || 0));
        patch({ amounts: amounts.map((a, j) => (j === i ? n : a)) });
      };
      return (
        <div className="space-y-1 pt-0.5">
          <input className={titleInput} placeholder="Invítame un café ☕" value={block.label} onChange={(e) => patch({ label: e.target.value })} />
          <input className={subInput} placeholder="Tu apoyo me ayuda a crear más contenido" value={block.subtitulo ?? ''} onChange={(e) => patch({ subtitulo: e.target.value })} />
          <div className="flex items-center gap-2 pt-1.5">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">Montos</span>
            {amounts.slice(0, 3).map((a, i) => (
              <input
                key={i}
                type="number"
                min={0}
                inputMode="numeric"
                value={a}
                onChange={(e) => setAmt(i, e.target.value)}
                className="w-14 rounded-lg bg-gray-50 px-2 py-1.5 text-center text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#92c83a]"
              />
            ))}
            <input
              value={block.currency ?? 'USD'}
              onChange={(e) => patch({ currency: e.target.value.toUpperCase().slice(0, 4) })}
              placeholder="USD"
              className="w-14 rounded-lg bg-gray-50 px-2 py-1.5 text-center text-xs font-bold uppercase text-gray-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      );
    }
    case 'paywall':
      return (
        <div className="space-y-1 pt-0.5">
          <input className={titleInput} placeholder="Guía Definitiva de Fitness" value={block.label} onChange={(e) => patch({ label: e.target.value })} />
          <input className={subInput} placeholder="Descripción corta de lo que recibe el comprador" value={block.subtitulo ?? ''} onChange={(e) => patch({ subtitulo: e.target.value })} />
          <div className="flex items-center gap-2 pt-1.5">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">Precio</span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={block.price ?? 0}
              onChange={(e) => patch({ price: Math.max(0, Number(e.target.value) || 0) })}
              className="w-20 rounded-lg bg-gray-50 px-2 py-1.5 text-center text-sm font-semibold text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#92c83a]"
            />
            <input
              value={block.currency ?? 'USD'}
              onChange={(e) => patch({ currency: e.target.value.toUpperCase().slice(0, 4) })}
              placeholder="USD"
              className="w-14 rounded-lg bg-gray-50 px-2 py-1.5 text-center text-xs font-bold uppercase text-gray-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="pt-1.5">
            <input
              value={block.hiddenUrl ?? ''}
              onChange={(e) => patch({ hiddenUrl: e.target.value })}
              placeholder="https://drive.google.com/… (URL secreta)"
              className="w-full rounded-xl border border-dashed border-[#92c83a]/50 bg-[#92c83a]/5 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-[#92c83a] focus:outline-none"
            />
            <p className="mt-1 flex items-center gap-1 px-1 text-[11px] text-gray-400"><Lock size={11} /> El comprador será redirigido aquí tras el pago.</p>
          </div>
        </div>
      );
    default:
      return <></>;
  }
}

function SocialEditor({ block, patch }: { block: Block; patch: (p: Partial<Block>) => void }): JSX.Element {
  const socials: Social[] = block.socials ?? [];
  const update = (next: Social[]): void => patch({ socials: next });
  return (
    <div className="space-y-2 pt-1">
      {socials.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            className="w-24 shrink-0 rounded-lg bg-gray-50 px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
            value={s.red}
            onChange={(e) => update(socials.map((x, j) => (j === i ? { ...x, red: e.target.value as SocialNet } : x)))}
          >
            {SOCIAL_NETS.map((n) => <option key={n.red} value={n.red}>{n.label}</option>)}
          </select>
          <input className={subInput} placeholder="@usuario o link" value={s.valor} onChange={(e) => update(socials.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} />
          <button type="button" onClick={() => update(socials.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><X size={15} /></button>
        </div>
      ))}
      <button type="button" onClick={() => update([...socials, { red: 'instagram', valor: '' }])} className="text-xs font-semibold text-[#72a129] hover:underline">+ Agregar red</button>
    </div>
  );
}
