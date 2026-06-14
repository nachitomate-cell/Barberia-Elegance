import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

const DOMAIN_MAP = {
  'barberiaelegance.synaptechspa.cl':  'elegance',
  'barberiaferraza.synaptechspa.cl':   'ferraza',
  'gitananails.synaptechspa.cl':       'gitana',
  'mapubarbershop.synaptechspa.cl':    'mapubarbershop',
  'chameleonbarber.synaptechspa.cl':   'chameleon',
  'deluxeperfumes.synaptechspa.cl':    'deluxeperfumes',
  'barberiadjones.synaptechspa.cl':    'lumen',
  'djonesbarberia.synaptechspa.cl':    'lumen',
  'delnerobarber.synaptechspa.cl':     'delnero',
  'marcelohairdressing.synaptechspa.cl': 'marcelo_hairdressing',
  'marcelo-hairdressing.synaptechspa.cl': 'marcelo_hairdressing',
  'marcelopalma.synaptechspa.cl':       'marcelo_hairdressing',
  'aurasalon.synaptechspa.cl':         'aura',
  'aurasalonmalegrooming.synaptechspa.cl':'aura',
  'latincaribe.synaptechspa.cl':       'latincaribe',
  'thelatincaribe.synaptechspa.cl':    'latincaribe',
  'machos.synaptechspa.cl':            'machos',
  'infinity.synaptechspa.cl':          'infinity',
  'sionbarberia.synaptechspa.cl':      'sionbarberia',
  'barberiasion.synaptechspa.cl':      'sionbarberia',
  'memphissalon.synaptechspa.cl':      'memphis',
  'alfamen.synaptechspa.cl':           'alfamen',
  'yugenstudio.synaptechspa.cl':       'yugen',
  'yugen.synaptechspa.cl':             'yugen',
  // Kronnos — cada sede en su propio subdominio sirve también su gestión interna
  'kronnospenablanca.synaptechspa.cl': 'kronnos_penablanca',
  'kronnoslimache.synaptechspa.cl':    'kronnos_limache',
  'kronnoswoman.synaptechspa.cl':      'kronnos_woman',
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
