// useBlockStats — suscribe a bios/{username}/blockStats (analítica por bloque).
// Devuelve un Record<blockId, { count, lastClickAt? }> que se mantiene vivo
// vía onSnapshot. Si el username está vacío o no autenticado, devuelve {}.
//
// El doc lo escribe el Cloud Function biooTrackClick desde u.html con cada
// click público (incluyendo anónimos). Las reglas permiten lectura solo al
// dueño (uid match contra bios/{u}.uid).

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

export interface BlockStat {
  count: number;
  lastClickAt?: Date | null;
  tipo?: string;
}

export type BlockStats = Record<string, BlockStat>;

export function useBlockStats(username: string | undefined | null): BlockStats {
  const [stats, setStats] = useState<BlockStats>({});
  // Esperamos a tener sesión — sin auth, las reglas niegan la lectura.
  const [authed, setAuthed] = useState<boolean>(!!auth.currentUser);

  useEffect(() => onAuthStateChanged(auth, (u) => setAuthed(!!u)), []);

  useEffect(() => {
    if (!username || username === 'tunombre' || !authed) {
      setStats({});
      return;
    }
    const col = collection(db, 'bios', username, 'blockStats');
    const unsub = onSnapshot(
      col,
      (snap) => {
        const next: BlockStats = {};
        snap.forEach((d) => {
          const data = d.data() as { count?: number; lastClickAt?: { toDate?: () => Date }; tipo?: string };
          next[d.id] = {
            count: Number(data.count || 0),
            lastClickAt: data.lastClickAt?.toDate ? data.lastClickAt.toDate() : null,
            tipo: data.tipo,
          };
        });
        setStats(next);
      },
      (e) => {
        // Sin permisos (todavía sin auth, o no es dueño) — mantenemos {}
        console.warn('[useBlockStats] no se pudo leer:', e.code || e.message);
        setStats({});
      },
    );
    return () => unsub();
  }, [username, authed]);

  return stats;
}
