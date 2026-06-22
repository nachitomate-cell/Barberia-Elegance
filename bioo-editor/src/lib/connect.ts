import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { onAuthStateChanged } from 'firebase/auth';
import { app, auth, db } from './firebase';

const functions = getFunctions(app, 'us-central1');

const _onboard = httpsCallable<{ origin: string }, { url: string; accountId: string }>(functions, 'onboardStripeUser');

/** Inicia (o reanuda) el onboarding de Stripe Connect y devuelve la URL a la que redirigir. */
export async function onboardStripe(): Promise<string> {
  const res = await _onboard({ origin: `${window.location.origin}/editor` });
  return res.data.url;
}

export interface StripeState {
  accountId: string | null;
  loading: boolean;
}

/** Observa en vivo si el usuario tiene cuenta de Stripe Connect (bio_users/{uid}.stripeAccountId). */
export function useStripeAccount(): StripeState {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: () => void = () => {};
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      unsubDoc();
      if (!u) { setAccountId(null); setLoading(false); return; }
      setLoading(true);
      unsubDoc = onSnapshot(
        doc(db, 'bio_users', u.uid),
        (snap) => {
          const d = snap.data() as Record<string, unknown> | undefined;
          setAccountId(d && typeof d.stripeAccountId === 'string' ? d.stripeAccountId : null);
          setLoading(false);
        },
        () => setLoading(false),
      );
    });
    return () => { unsubAuth(); unsubDoc(); };
  }, []);

  return { accountId, loading };
}
