import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTenant } from '../contexts/TenantContext';
import { Lock, ChevronRight } from 'lucide-react';

// Días de atraso a partir de los cuales se restringen las secciones premium.
export const DIAS_RESTRINGIDO = 8;

// La exención de corte vive en _billing/{tid}.sinCorte, NO hardcodeada acá.
// Antes era un Set en el bundle: cambiarla exigía rebuild + deploy, y el
// backend no se enteraba, así que la Cloud Function seguía mandando avisos
// diciendo "secciones bloqueadas" a locales que en realidad nunca se
// bloqueaban. Con el flag en Firestore ambos lados leen lo mismo.
//
// sinCorte = true → se le siguen enviando los avisos de atraso, pero NUNCA
// se le restringe el panel (arreglos especiales, pilotos, afiliados).

function parseFecha(f) {
  if (!f) return null;
  try {
    const d = f.toDate ? f.toDate() : new Date(`${f}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

// Hook compartido: días de atraso del tenant y si está en modo restringido.
export function useBillingRestriction() {
  const { id } = useTenant();
  const [dias, setDias] = useState(0);
  const [sinCorte, setSinCorte] = useState(false);

  useEffect(() => {
    const ref = doc(db, '_billing', id);
    const unsub = onSnapshot(
      ref,
      s => {
        if (!s.exists()) { setDias(0); setSinCorte(false); return; }
        const d = s.data();
        const due = parseFecha(d.fechaProximoPago);
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        setDias(due ? Math.round((hoy.getTime() - due.getTime()) / 86400000) : 0);
        setSinCorte(d.sinCorte === true);
      },
      () => { setDias(0); setSinCorte(false); },
    );
    return unsub;
  }, [id]);

  return { diasAtraso: dias, restringido: !sinCorte && dias >= DIAS_RESTRINGIDO };
}

// Envuelve una vista premium: si el pago está muy atrasado, la bloquea.
export default function BillingGate({ children }) {
  const { restringido, diasAtraso } = useBillingRestriction();
  const navigate = useNavigate();

  if (!restringido) return children;

  return (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-5">
        <Lock size={28} className="text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-primary mb-2">Sección bloqueada</h2>
      <p className="text-sm text-slate-400 leading-relaxed mb-6">
        Tu cuenta tiene un pago atrasado hace <span className="font-bold text-red-400">{diasAtraso} días</span>.
        Regulariza tu mensualidad para reactivar esta sección.
        <br /><span className="text-slate-500">Tu agenda y tu día a día siguen funcionando con normalidad.</span>
      </p>
      <button
        onClick={() => navigate('/mensualidad')}
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-red-300 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 transition-all active:scale-95"
      >
        Regularizar mi pago <ChevronRight size={15} />
      </button>
    </div>
  );
}
