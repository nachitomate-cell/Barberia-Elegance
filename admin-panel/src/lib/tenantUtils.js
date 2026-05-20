import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

const DOMAIN_MAP = {
  'barberiaelegance.synaptechspa.cl':  'elegance',
  'barberiaferraza.synaptechspa.cl':   'ferraza',
  'gitananails.synaptechspa.cl':       'gitana',
  'mapubarbershop.synaptechspa.cl':    'mapubarbershop',
  'chameleonbarber.synaptechspa.cl':   'chameleon',
  'deluxeperfumes.synaptechspa.cl':    'deluxeperfumes',
  'lumenbarbershop.synaptechspa.cl':   'lumen',
  'delnerobarber.synaptechspa.cl':     'delnero',
  'aurasalon.synaptechspa.cl':         'aura',
  'aurasalonmalegrooming.synaptech.cl':'aura',
  'aurasalonmalegrooming.synaptechspa.cl':'aura',
};

export function resolveTenantId() {
  const url    = new URL(window.location.href);
  const local  = url.searchParams.get('local');
  if (local) {
    sessionStorage.setItem('saas_current_tenant', local);
    return local;
  }
  const fromDomain = DOMAIN_MAP[window.location.hostname.toLowerCase()];
  if (fromDomain) return fromDomain;
  return sessionStorage.getItem('saas_current_tenant') || 'elegance';
}

export function tenantCol(name) {
  const tid = resolveTenantId();
  return tid === 'elegance'
    ? collection(db, name)
    : collection(db, `tenants/${tid}/${name}`);
}

export function tenantDoc(colName, docId) {
  return doc(tenantCol(colName), docId);
}
