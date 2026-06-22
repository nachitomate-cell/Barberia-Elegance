import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface Sale {
  id: string;
  blockId: string;
  amountTotal: number | null; // en la unidad menor (centavos), salvo monedas sin decimales
  currency: string;
  buyerEmail: string;
  ts: number | null;
}

const ZERO_DECIMAL = new Set(['clp', 'jpy', 'krw', 'vnd', 'pyg', 'isk']);

/** Convierte el monto menor de Stripe a unidades de la moneda. */
export function toMajor(amountMinor: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? amountMinor : amountMinor / 100;
}

/** Formatea un monto (en unidad menor) como string con símbolo. */
export function formatMoney(amountMinor: number, currency: string): string {
  const c = currency.toLowerCase();
  const zero = ZERO_DECIMAL.has(c);
  const sym = c === 'eur' ? '€' : c === 'gbp' ? '£' : c === 'brl' ? 'R$' : '$';
  const v = toMajor(amountMinor, currency);
  return sym + v.toLocaleString('es-CL', {
    minimumFractionDigits: zero ? 0 : 2,
    maximumFractionDigits: zero ? 0 : 2,
  }) + ' ' + c.toUpperCase();
}

/** Lee el historial de ventas (solo el dueño tiene permiso de lectura por reglas). */
export async function loadSales(username: string): Promise<Sale[]> {
  const q = query(collection(db, 'bios', username, 'purchases'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    const created = x.createdAt instanceof Timestamp ? x.createdAt.toMillis() : null;
    const delivered = x.deliveredAt instanceof Timestamp ? x.deliveredAt.toMillis() : null;
    return {
      id: d.id,
      blockId: typeof x.blockId === 'string' ? x.blockId : '',
      amountTotal: typeof x.amountTotal === 'number' ? x.amountTotal : null,
      currency: typeof x.currency === 'string' ? x.currency : 'usd',
      buyerEmail: typeof x.buyerEmail === 'string' ? x.buyerEmail : '',
      ts: created ?? delivered,
    };
  });
}
