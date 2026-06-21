import {
  createContext, useContext, useReducer, useEffect,
  type ReactNode, type Dispatch,
} from 'react';
import type { BioState, Block, BlockType, Theme, Profile, BgConfig, TextStyle } from './types';
import { computeUrl, DEFAULT_BG, DEFAULT_TEXT } from './lib/theme';

const DRAFT_KEY = 'bioo_editor_draft_v1';

const DEFAULT_STATE: BioState = {
  username: 'tunombre',
  profile: { titulo: '', subtitulo: '', avatar: '', cover: '', verified: false },
  blocks: [],
  theme: {
    preset: 'lime', shape: 'rounded', fill: 'solid', font: 'system',
    bg: DEFAULT_BG, avatarShape: 'circle', avatarRing: '', btnAnim: 'none', text: DEFAULT_TEXT,
  },
};

export type Action =
  | { type: 'load'; state: BioState }
  | { type: 'setUsername'; value: string }
  | { type: 'patchProfile'; patch: Partial<Profile> }
  | { type: 'patchTheme'; patch: Partial<Theme> }
  | { type: 'patchBg'; patch: Partial<BgConfig> }
  | { type: 'patchText'; patch: Partial<TextStyle> }
  | { type: 'addBlock'; block: Block }
  | { type: 'patchBlock'; id: string; patch: Partial<Block> }
  | { type: 'removeBlock'; id: string }
  | { type: 'setBlocks'; blocks: Block[] };

const recompute = (b: Block): Block => ({ ...b, url: computeUrl(b) });

function reducer(state: BioState, action: Action): BioState {
  switch (action.type) {
    case 'load': return action.state;
    case 'setUsername': return { ...state, username: action.value };
    case 'patchProfile': return { ...state, profile: { ...state.profile, ...action.patch } };
    case 'patchTheme': return { ...state, theme: { ...state.theme, ...action.patch } };
    case 'patchBg': return { ...state, theme: { ...state.theme, bg: { ...state.theme.bg, ...action.patch } } };
    case 'patchText': return { ...state, theme: { ...state.theme, text: { ...state.theme.text, ...action.patch } } };
    case 'addBlock': return { ...state, blocks: [...state.blocks, action.block] };
    case 'patchBlock':
      return { ...state, blocks: state.blocks.map((b) => (b.id === action.id ? recompute({ ...b, ...action.patch }) : b)) };
    case 'removeBlock': return { ...state, blocks: state.blocks.filter((b) => b.id !== action.id) };
    case 'setBlocks': return { ...state, blocks: action.blocks };
    default: return state;
  }
}

interface EditorCtx { state: BioState; dispatch: Dispatch<Action>; }
const EditorContext = createContext<EditorCtx | null>(null);

/** Rellena con defaults los campos que falten (borradores de versiones previas). */
function migrate(d: Partial<BioState>): BioState {
  const t = (d.theme ?? {}) as Partial<BioState['theme']>;
  return {
    username: d.username ?? DEFAULT_STATE.username,
    profile: { ...DEFAULT_STATE.profile, ...(d.profile ?? {}) },
    blocks: Array.isArray(d.blocks) ? d.blocks : [],
    theme: {
      ...DEFAULT_STATE.theme,
      ...t,
      bg: { ...DEFAULT_STATE.theme.bg, ...(t.bg ?? {}) },
      text: { ...DEFAULT_STATE.theme.text, ...(t.text ?? {}) },
    },
  };
}

function readDraft(): BioState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as Partial<BioState>);
  } catch {
    return null;
  }
}

export function EditorProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, undefined, () => readDraft() ?? DEFAULT_STATE);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch { /* almacenamiento lleno/no disponible */ }
  }, [state]);
  return <EditorContext.Provider value={{ state, dispatch }}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorCtx {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor debe usarse dentro de <EditorProvider>');
  return ctx;
}

export function newBlock(tipo: BlockType): Block {
  const needsPhone = tipo === 'whatsapp' || tipo === 'telefono';
  return recompute({
    id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    tipo,
    label: '',
    url: '',
    activo: true,
    prefijo: needsPhone ? '56' : undefined,
  });
}
