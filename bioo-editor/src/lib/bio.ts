import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_BG } from './theme';
import type { BioState, Theme } from '../types';

function normalizeTheme(raw: unknown): Theme {
  const t = (raw && typeof raw === 'object') ? (raw as Partial<Theme>) : {};
  return {
    preset: t.preset ?? 'lime',
    shape: t.shape ?? 'rounded',
    fill: t.fill ?? 'solid',
    font: t.font ?? 'system',
    bg: { ...DEFAULT_BG, ...(t.bg ?? {}) },
    avatarShape: t.avatarShape === 'rounded' ? 'rounded' : 'circle',
    avatarRing: t.avatarRing ?? '',
  };
}

/** Lectura pública de una bio (reglas: bios tiene lectura libre). */
export async function loadBio(username: string): Promise<BioState | null> {
  const snap = await getDoc(doc(db, 'bios', username));
  if (!snap.exists()) return null;
  const d = snap.data() as Record<string, any>;
  return {
    username,
    profile: {
      titulo: d.perfil?.titulo ?? '',
      subtitulo: d.perfil?.subtitulo ?? '',
      avatar: d.perfil?.avatar ?? '',
      cover: d.perfil?.cover ?? '',
      verified: !!d.perfil?.verified,
    },
    blocks: Array.isArray(d.bloques) ? d.bloques : [],
    theme: normalizeTheme(d.theme),
  };
}

/** Guarda la bio del usuario autenticado. Lanza 'not-authenticated' si no hay sesión. */
export async function saveBio(state: BioState): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('not-authenticated');
  await setDoc(
    doc(db, 'bios', state.username),
    {
      uid: user.uid,
      username: state.username,
      perfil: state.profile,
      bloques: state.blocks,
      theme: state.theme,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
