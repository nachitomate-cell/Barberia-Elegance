import { useState } from 'react';
import { Reorder } from 'framer-motion';
import { Plus, Trash2, Star, GripVertical } from 'lucide-react';
import { useEditor, newBlock } from '../store';
import { inputCls } from '../ui';
import type { Block, BlockType } from '../types';

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
];

export default function Links(): JSX.Element {
  const { state, dispatch } = useEditor();
  const [picker, setPicker] = useState(false);

  return (
    <div className="space-y-3">
      <Reorder.Group axis="y" values={state.blocks} onReorder={(blocks) => dispatch({ type: 'setBlocks', blocks })} className="space-y-3">
        {state.blocks.map((b) => (
          <Reorder.Item key={b.id} value={b} className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
            <BlockEditor block={b} />
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {picker ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-3">
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { dispatch({ type: 'addBlock', block: newBlock(t.id) }); setPicker(false); }}
                className="rounded-xl border border-neutral-200 px-3 py-2.5 text-left text-xs font-semibold hover:border-bioo"
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPicker(false)} className="mt-2 text-xs text-neutral-400">Cerrar</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 py-4 text-sm font-semibold text-neutral-500 transition-colors hover:border-bioo hover:text-bioo-dark"
        >
          <Plus size={16} /> Agregar enlace
        </button>
      )}
    </div>
  );
}

function BlockEditor({ block }: { block: Block }): JSX.Element {
  const { dispatch } = useEditor();
  const patch = (p: Partial<Block>): void => dispatch({ type: 'patchBlock', id: block.id, patch: p });
  const isLink = block.tipo !== 'texto' && block.tipo !== 'separador';

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <GripVertical size={16} className="cursor-grab text-neutral-300" />
        <span className="flex-1 text-[11px] font-bold uppercase tracking-wide text-bioo-dark">{block.tipo}</span>
        {isLink && (
          <button type="button" onClick={() => patch({ featured: !block.featured })} title="Destacar" className={block.featured ? 'text-amber-500' : 'text-neutral-300'}>
            <Star size={16} fill={block.featured ? 'currentColor' : 'none'} />
          </button>
        )}
        <button type="button" onClick={() => dispatch({ type: 'removeBlock', id: block.id })} className="text-neutral-400 hover:text-red-500">
          <Trash2 size={16} />
        </button>
      </div>

      {block.tipo === 'separador' ? (
        <p className="px-1 text-xs text-neutral-400">Línea divisoria — separa secciones.</p>
      ) : block.tipo === 'texto' ? (
        <textarea className={inputCls} rows={2} placeholder="Escribe un título o texto" value={block.texto ?? ''} onChange={(e) => patch({ texto: e.target.value })} />
      ) : (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Texto del botón" value={block.label} onChange={(e) => patch({ label: e.target.value })} />
          <BlockFields block={block} patch={patch} />
        </div>
      )}
    </div>
  );
}

function BlockFields({ block, patch }: { block: Block; patch: (p: Partial<Block>) => void }): JSX.Element {
  switch (block.tipo) {
    case 'whatsapp':
    case 'telefono':
      return (
        <div className="flex gap-2">
          <input className={`${inputCls} w-16`} placeholder="56" value={block.prefijo ?? ''} onChange={(e) => patch({ prefijo: e.target.value })} />
          <input className={inputCls} placeholder="9 1234 5678" value={block.telefono ?? ''} onChange={(e) => patch({ telefono: e.target.value })} />
        </div>
      );
    case 'instagram':
    case 'tiktok':
    case 'facebook':
      return <input className={inputCls} placeholder="tuusuario" value={block.usuario ?? ''} onChange={(e) => patch({ usuario: e.target.value })} />;
    case 'email':
      return <input className={inputCls} type="email" placeholder="tu@correo.com" value={block.email ?? ''} onChange={(e) => patch({ email: e.target.value })} />;
    default:
      return <input className={inputCls} placeholder="https://…" value={block.url} onChange={(e) => patch({ url: e.target.value })} />;
  }
}
