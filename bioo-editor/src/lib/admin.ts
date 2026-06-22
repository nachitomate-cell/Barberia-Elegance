import { collection, doc, getDoc, getDocs, limit, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminUser {
  username: string;
  email: string;
  ts: number | null;       // última actividad (updatedAt) — bios no guarda createdAt
  stripeReady: boolean;
}

export interface Kpis {
  totalUsers: number;
  stripeActive: number;
  gmvUsd: number;          // volumen procesado
  revenueUsd: number;      // ingresos bioo (5%)
}

/** ¿El usuario autenticado es admin? Lee bio_users/{uid}.username → bios/{username}.isAdmin. */
export async function fetchIsAdmin(uid: string): Promise<boolean> {
  const us = await getDoc(doc(db, 'bio_users', uid));
  const username = us.exists() ? (us.data() as Record<string, unknown>).username : null;
  if (typeof username !== 'string' || !username) return false;
  const bio = await getDoc(doc(db, 'bios', username));
  return bio.exists() && (bio.data() as Record<string, unknown>).isAdmin === true;
}

/** Últimos 50 usuarios (bios) por actividad reciente. */
export async function loadRecentUsers(): Promise<AdminUser[]> {
  const q = query(collection(db, 'bios'), orderBy('updatedAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const perfil = (x.perfil ?? {}) as Record<string, unknown>;
    return {
      username: d.id,
      email: typeof x.email === 'string' ? x.email
        : (typeof perfil.email === 'string' ? perfil.email : ''),
      ts: x.updatedAt instanceof Timestamp ? x.updatedAt.toMillis() : null,
      stripeReady: x.stripeReady === true,
    };
  });
}

/** KPIs del panel. TODO: reemplazar por una Cloud Function de agregación real
 *  (runAggregationQuery sobre bios / purchases). Por ahora, estructura + mock. */
export async function loadKpis(users: AdminUser[]): Promise<Kpis> {
  return {
    totalUsers: 239,
    stripeActive: users.filter((u) => u.stripeReady).length || 45,
    gmvUsd: 1250,
    revenueUsd: 62.5,
  };
}
