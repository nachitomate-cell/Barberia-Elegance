import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface Lead {
  id: string;
  email: string;
  blockId: string;
  ts: number | null; // epoch ms (null si el serverTimestamp aún no resolvió)
}

/** Lee los leads del perfil (solo el dueño tiene permiso de lectura por reglas). */
export async function loadLeads(username: string): Promise<Lead[]> {
  const q = query(collection(db, 'bios', username, 'leads'), orderBy('ts', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      email: typeof data.email === 'string' ? data.email : '',
      blockId: typeof data.blockId === 'string' ? data.blockId : '',
      ts: data.ts instanceof Timestamp ? data.ts.toMillis() : null,
    };
  });
}
