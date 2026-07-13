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
  'studiodieciseis.synaptechspa.cl':   'sionbarberia',
  'sionbarberia.synaptechspa.cl':      'sionbarberia',
  'barberiasion.synaptechspa.cl':      'sionbarberia',
  'memphissalon.synaptechspa.cl':      'memphis',
  'alfamen.synaptechspa.cl':           'alfamen',
  'yugenstudio.synaptechspa.cl':       'yugen',
  'yugen.synaptechspa.cl':             'yugen',
  'yugenstudio.cl':                    'yugen',
  'www.yugenstudio.cl':                'yugen',
  // Kronnos — los subdominios de sede siguen apuntando a los tenants legacy hasta
  // el cutover D3/D4 (cuando el cliente lea sedeId y filtre). Ver KRONNOS_SUBDOMAIN_SEDE.
  'kronnospenablanca.synaptechspa.cl': 'kronnos_penablanca',
  'kronnoslimache.synaptechspa.cl':    'kronnos_limache',
  'kronnoswoman.synaptechspa.cl':      'kronnos_woman',
  'barbersclub.synaptechspa.cl':       'barbersclub',
  'elbarberomoderno.synaptechspa.cl':  'elbarberomoderno',
  'estudioluxury.synaptechspa.cl':     'estudioluxury',
};

// ── Kronnos multi-sede (Camino 1, D2) ─────────────────────────────
// Espejo del mapa en middleware.js. Fuente de verdad para SedeContext.
// D3/D4: cuando cutover DOMAIN_MAP a 'kronnos', esta tabla resuelve la sede.
export const KRONNOS_SUBDOMAIN_SEDE = {
  'kronnospenablanca.synaptechspa.cl': 'penablanca',
  'kronnoslimache.synaptechspa.cl':    'limache',
  'kronnoswoman.synaptechspa.cl':      'woman',
};

// Tenants legacy Kronnos → sedeId equivalente. Se usan hasta el cutover.
// Después del cutover, quedan solo como redirección hacia { tenantId:'kronnos', sedeId:X }.
export const LEGACY_KRONNOS_TO_SEDE = {
  kronnos_penablanca: 'penablanca',
  kronnos_limache:    'limache',
  kronnos_woman:      'woman',
};

export const KRONNOS_SEDES = ['penablanca', 'limache', 'woman'];

// Un tenant es "multi-sede" si tiene sedes[] internas gestionadas por SedeContext.
export function isMultiSedeTenant(tid) {
  return tid === 'kronnos' || tid in LEGACY_KRONNOS_TO_SEDE;
}

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

// ── Resolución de sede para tenants multi-sede (Kronnos) ─────────
// Prioridad: ?sede= (URL) > subdomain > tenant legacy translation > sessionStorage.
// Devuelve null si el tenant actual no es multi-sede.
export function resolveSedeId() {
  const tid = resolveTenantId();
  if (!isMultiSedeTenant(tid)) return null;

  // 1) ?sede= override (útil desde el lobby admin: /gestion-interna/?local=kronnos&sede=penablanca)
  try {
    const sedeParam = new URL(window.location.href).searchParams.get('sede');
    if (sedeParam && KRONNOS_SEDES.includes(sedeParam)) {
      sessionStorage.setItem('saas_current_sede', sedeParam);
      return sedeParam;
    }
  } catch (_) {}

  // 2) Subdomain (kronnospenablanca.synaptechspa.cl → penablanca)
  const fromSubdomain = KRONNOS_SUBDOMAIN_SEDE[window.location.hostname.toLowerCase()];
  if (fromSubdomain) return fromSubdomain;

  // 3) Legacy tenant translation (kronnos_penablanca → penablanca) — puente durante migración
  if (LEGACY_KRONNOS_TO_SEDE[tid]) return LEGACY_KRONNOS_TO_SEDE[tid];

  // 4) Persistido de nav previa
  try {
    const persisted = sessionStorage.getItem('saas_current_sede');
    if (persisted && KRONNOS_SEDES.includes(persisted)) return persisted;
  } catch (_) {}

  return null;
}

// Resolver combinado: para el marca-tenant 'kronnos' o legacy alias, devuelve
// { tenantId: 'kronnos', sedeId: X }. Para el resto, { tenantId, sedeId: null }.
// Útil para consumidores que quieren pensar directamente en el modelo unificado.
export function resolveTenantAndSede() {
  const tid = resolveTenantId();
  const sedeId = resolveSedeId();
  // Durante la migración, mantenemos los legacy visibles como tenant propio.
  // Solo tras el cutover (D4-D5) las 51 vistas migrarán a leer del tenant 'kronnos'.
  return { tenantId: tid, sedeId };
}

// ── Camino 1.5 (D3-D4): pool marca Kronnos ──────────────────────
// Colecciones marca-level (users/sellos/premios/rangos/canjes) para tenants
// Kronnos legacy se redirigen a tenants/kronnos/*. Operacionales (servicios,
// barberos, citas, settings) siguen per-sede. Espejo del redirect en
// firebaseUtils.js — las 51 vistas del admin heredan automáticamente sin migrar.
export const KRONNOS_MARCA_COLLECTIONS = new Set([
  'users',
  'sellos',
  'premios',
  'rangos',
  'canjes',
  // clientes es lookup por teléfono cross-sede: el import Weibook (2944 docs)
  // cargó a tenants/kronnos/clientes/. Sin este redirect, lookups per-sede
  // devolvían vacío. Espejo del set en functions/lib/kronnos-marca.js.
  'clientes',
  // anuncios_optout: opt-out aplica a las 3 sedes Kronnos (pool marca).
  'anuncios_optout',
  // packConsumos: auditoría del motor de packs. El saldo vive en users
  // (marca), así que el log también — permite consultar historial cross-sede
  // ("¿en qué sede Kronnos descontó esta sesión?").
  'packConsumos',
]);

function _marcaAwareTenant(tid, colName) {
  if (LEGACY_KRONNOS_TO_SEDE[tid] && KRONNOS_MARCA_COLLECTIONS.has(colName)) {
    return 'kronnos';
  }
  return tid;
}

export function tenantCol(name) {
  const rawTid = resolveTenantId();
  const tid    = _marcaAwareTenant(rawTid, name);
  return tid === 'elegance'
    ? collection(db, name)
    : collection(db, `tenants/${tid}/${name}`);
}

export function tenantDoc(colName, docId) {
  return doc(tenantCol(colName), docId);
}
