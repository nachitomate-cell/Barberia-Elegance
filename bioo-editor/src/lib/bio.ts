import { doc, getDoc, getDocs, setDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEFAULT_BG, DEFAULT_TEXT } from './theme';
import type { BioState, Theme, Block } from '../types';

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
    btnAnim: t.btnAnim ?? 'none',
    text: { ...DEFAULT_TEXT, ...(t.text ?? {}) },
  };
}

/** Resuelve el username del usuario autenticado y carga su bio (si tiene).
 *  Como es el dueño, además re-une los secretos privados (hiddenUrl) en sus
 *  bloques paywall para poder editarlos. */
export async function loadUserBio(uid: string): Promise<BioState | null> {
  const us = await getDoc(doc(db, 'bio_users', uid));
  const username = us.exists() ? (us.data() as Record<string, any>).username : null;
  if (!username || typeof username !== 'string') return null;
  const bio = await loadBio(username);
  if (!bio) return null;

  // Fetch cruzado de /secrets (solo el dueño tiene permiso de lectura).
  try {
    const secrets = await getDocs(collection(db, 'bios', username, 'secrets'));
    const map: Record<string, string> = {};
    secrets.forEach((s) => {
      const data = s.data() as Record<string, any>;
      if (typeof data.hiddenUrl === 'string') map[s.id] = data.hiddenUrl;
    });
    bio.blocks = bio.blocks.map((b) =>
      b.tipo === 'paywall' && map[b.id] !== undefined ? { ...b, hiddenUrl: map[b.id] } : b,
    );
  } catch { /* sin secretos o sin permiso: se edita sin hiddenUrl */ }

  return bio;
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
      // Solo se incluyen si existen en el doc (evita escribir undefined al guardar).
      ...(d.perfil?.partner ? { partner: String(d.perfil.partner) } : {}),
      ...(typeof d.perfil?.showPartnerBadge === 'boolean' ? { showPartnerBadge: d.perfil.showPartnerBadge } : {}),
    },
    blocks: Array.isArray(d.bloques) ? d.bloques : [],
    theme: normalizeTheme(d.theme),
    marketing: {
      ga4: d.marketing?.ga4 ?? '',
      metaPixel: d.marketing?.metaPixel ?? '',
      tiktokPixel: d.marketing?.tiktokPixel ?? '',
    },
    seo: {
      title: d.seo?.title ?? '',
      description: d.seo?.description ?? '',
    },
  };
}

/** Guarda la bio del usuario autenticado. Lanza 'not-authenticated' si no hay sesión.
 *
 *  Separación de datos: la `hiddenUrl` de los bloques 'paywall' NO se guarda en el
 *  array público `bloques` (lectura libre). Se extrae y se escribe en la subcolección
 *  privada `bios/{username}/secrets/{blockId}` (solo lectura/escritura del dueño).
 *  Todo se commitea en un único batch atómico. */
export async function saveBio(state: BioState): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('not-authenticated');
  const username = state.username;

  // 1) Bloques públicos: se le quita hiddenUrl a los paywall.
  const publicBlocks = state.blocks.map((b) => {
    if (b.tipo !== 'paywall') return b;
    const { hiddenUrl: _omit, ...rest } = b;
    return rest as Block;
  });
  // JSON round-trip: elimina `undefined` (Firestore lo rechaza) de forma segura.
  const cleanBlocks = JSON.parse(JSON.stringify(publicBlocks)) as Block[];
  // Round-trip: elimina claves `undefined` del perfil (p.ej. partner ausente),
  // que Firestore rechaza.
  const cleanProfile = JSON.parse(JSON.stringify(state.profile));

  const batch = writeBatch(db);

  // 2) Documento público.
  batch.set(
    doc(db, 'bios', username),
    {
      uid: user.uid,
      username,
      perfil: cleanProfile,
      bloques: cleanBlocks,
      theme: state.theme,
      marketing: state.marketing,
      seo: state.seo,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  // 2b) Mapeo uid → username (privado del dueño). Permite que loadUserBio
  // recupere la página al volver, incluso tras fusionar una cuenta anónima.
  batch.set(
    doc(db, 'bio_users', user.uid),
    { username, email: user.email ?? '', updatedAt: serverTimestamp() },
    { merge: true },
  );

  // 3) Secretos privados (hiddenUrl) por cada paywall.
  const secretsCol = collection(db, 'bios', username, 'secrets');
  const keep = new Set<string>();
  for (const b of state.blocks) {
    if (b.tipo !== 'paywall') continue;
    keep.add(b.id);
    batch.set(doc(secretsCol, b.id), {
      uid: user.uid,
      blockId: b.id,
      hiddenUrl: b.hiddenUrl ?? '',
      updatedAt: serverTimestamp(),
    });
  }

  // 4) Limpieza de secretos huérfanos (paywalls eliminados).
  try {
    const existing = await getDocs(secretsCol);
    existing.forEach((s) => { if (!keep.has(s.id)) batch.delete(s.ref); });
  } catch { /* sin permiso de listar: omitimos limpieza */ }

  await batch.commit();
}
