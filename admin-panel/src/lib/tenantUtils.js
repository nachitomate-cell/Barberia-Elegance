import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

const DOMAIN_MAP = {
  // ── SynapTech Studio (TWA de Google Play) ──────────────────────────
  // El hub app.synaptechspa.cl no representa a un local: hasta que exista el
  // selector de tenant post-login, el panel abre en el tenant `sandbox`
  // ("Barbería Demo", datos ficticios aislados en tenants/sandbox/). Así el
  // revisor de Play y los testers internos ven una demo limpia, no un cliente
  // real. Es forward-compatible: ?local= y sessionStorage se resuelven ANTES
  // que DOMAIN_MAP, así que el futuro selector lo pisa sin tocar esta línea.
  'app.synaptechspa.cl':               'sandbox',
  'barberiaelegance.synaptechspa.cl':  'elegance',
  // Va explícito aunque el fallback diera lo mismo: desde que el fallback
  // consulta el claim antes de rendirse, "por casualidad daba bien" dejó de
  // ser cierto — un admin de otro local entrando acá resolvía al suyo.
  'elegance.synaptechspa.cl':          'elegance',
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
  'renacer.synaptechspa.cl':           'renacer',
  'orenbarber.synaptechspa.cl':        'oren',
  'orenbarbercl.synaptechspa.cl':      'oren',
  // Dominio propio del local (jul-2026). Se SUMA a los de synaptechspa.cl, que
  // siguen vivos: si el DNS del cliente falla, el enlace antiguo lo salva.
  // Un solo hostname a propósito: /barbero y /admin21 son RUTAS, no
  // subdominios — menos certificados y menos mapas que mantener en espejo.
  'agenda.oren.cl':                    'oren',
  'omega.synaptechspa.cl':             'omega',
  'restodemo.synaptechspa.cl':         'restodemo',
  // Sion Barbería (2026-07-27) — NO confundir con 'sionbarberia' (Estudio Dieciséis).
  'sion.synaptechspa.cl':              'sion',
  // Blood Habib · Viña del Mar (2026-08-03, recreado desde Weibook).
  'bloodhabib.synaptechspa.cl':        'bloodhabib',
  'blood-habib.synaptechspa.cl':       'bloodhabib',
  // Clinical Glow · Clínica estética Viña del Mar (2026-08-06). 1er tenant
  // no-barbería en rubro estético (BeautySalon).
  'clinicalglow.synaptechspa.cl':      'clinicalglow',
  // Local de PRÁCTICA del equipo comercial (scripts/seed-practica.js). Va acá
  // aunque sea un tenant dinámico: sin la entrada, abrir el panel en una
  // pestaña nueva sin `?local=practica` cae al fallback 'elegance' de abajo y
  // quien está aprendiendo termina hurgando la agenda REAL de un cliente.
  'practica.synaptechspa.cl':          'practica',
};

// ── Kronnos multi-sede (Camino 1, D2) ─────────────────────────────
// Espejo del mapa en middleware.js. Fuente de verdad para SedeContext.
// D3/D4: cuando cutover DOMAIN_MAP a 'kronnos', esta tabla resuelve la sede.
/**
 * Dominio público CANÓNICO de cada tenant, derivado de DOMAIN_MAP.
 *
 * DOMAIN_MAP tiene varios hosts por tenant (yugenstudio.cl, yugen.synaptechspa.cl…);
 * nos quedamos con el PRIMERO, que es el principal.
 *
 * Existe porque las vistas armaban links con su propia lista de dominios y se
 * quedaban cortas: la de Equipo.jsx tenía 7 tenants de 30, así que para el resto
 * caía a `window.location.hostname`. En Kronnos eso rompía de verdad — con el
 * selector de sede puedes estar viendo Limache desde el dominio de Peñablanca, y
 * el link del barbero salía apuntando al local equivocado (404).
 */
export const TENANT_PUBLIC_DOMAIN = Object.entries(DOMAIN_MAP)
  .reduce((acc, [host, tid]) => {
    if (!acc[tid]) acc[tid] = host;
    return acc;
  }, {});

/** Dominio público del tenant, con fallback al patrón estándar. */
export function tenantDomain(tid) {
  return TENANT_PUBLIC_DOMAIN[tid] || `${tid}.synaptechspa.cl`;
}

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

/* ── Hosts de LOBBY: una marca, varios locales ────────────────────────────
   No representan a UN tenant, así que no van en DOMAIN_MAP: si fueran una
   entrada más, ganarían por hostname y mandarían al usuario al local
   equivocado de su propia marca (Claudio, admin de Limache, cayendo en
   Peñablanca cada vez que abre la app). Se resuelven DESPUÉS del claim, que
   sabe cuál es el local de quien mira, y esto queda solo como default para
   quien todavía no tiene claim persistido. */
const LOBBY_HOSTS = {
  'admin.kronnos.synaptechspa.cl': 'kronnos_penablanca',
  'kronnos.synaptechspa.cl':       'kronnos_penablanca',
};

/* El tenant del claim, persistido en localStorage por fijarTenantDelUsuario().
   localStorage y no sessionStorage a propósito: sessionStorage se BORRA al
   cerrar la ventana, y el caso que reparamos es justo el arranque en frío de
   la PWA. Es solo un default de resolución — Firestore rules siguen siendo el
   enforcement real, así que un valor viejo no abre ninguna puerta. */
const CLAIM_TENANT_KEY = 'saas_claim_tenant';

export function resolveTenantId() {
  const url    = new URL(window.location.href);
  const local  = url.searchParams.get('local');
  if (local) {
    sessionStorage.setItem('saas_current_tenant', local);
    return local;
  }
  // sessionStorage ANTES que DOMAIN_MAP: si en esta pestaña el user ya
  // eligió un tenant vía ?local= (típicamente vía SedeSwitcher desde un
  // subdomain de OTRA sede — ej. `kronnoslimache…/gestion-interna/?local=kronnos_woman`),
  // esa elección explícita debe pisar la resolución por hostname. Sin este
  // orden, React Router hace un <Navigate replace> al defaultRoute (agenda)
  // apenas entrás al panel, y ese redirect DROPEA el ?local del URL — las
  // llamadas subsiguientes a resolveTenantId() caían a DOMAIN_MAP y
  // resolvían al tenant del subdominio, aunque TenantContext (memoizado
  // en el mount inicial) sí tuviera el tenant correcto. Resultado: sidebar
  // con el nombre correcto pero queries de barberos/citas/etc. yendo al
  // tenant del subdominio (Ignacio en Woman viendo el equipo de Limache).
  // sessionStorage es per-tab, así que no cross-contamina entre sesiones.
  const fromSession = sessionStorage.getItem('saas_current_tenant');
  if (fromSession) return fromSession;
  const host = window.location.hostname.toLowerCase();
  const fromDomain = DOMAIN_MAP[host];
  if (fromDomain) return fromDomain;

  /* Antes de acá se caía derecho a 'elegance', y 'elegance' NO es un tenant
     vacío: es una barbería viva que vive en las colecciones RAÍZ (ver
     tenantCol más abajo). O sea que cualquier host sin mapear terminaba
     mostrando el equipo de Elegance dentro del panel de otro local.

     Pasó con Kronnos (08-08-2026): Claudio abre la PWA instalada desde
     admin.kronnos.synaptechspa.cl, que middleware.js sí conoce pero DOMAIN_MAP
     no. Sin `?local=` en la URL y con sessionStorage recién nacido (arranque en
     frío de la app), resolvía 'elegance' y le aparecían Giox, Checho y Joaquin
     Amiri en su agenda. Se veían solo porque /barberos raíz es de lectura
     pública; las citas las negaban las rules, por eso las columnas salían
     vacías. Intermitente porque entrando por el lobby el `?local=` lo tapaba.

     El token ya trae la respuesta: el claim tenantId. Se usa acá. */
  try {
    const fromClaim = localStorage.getItem(CLAIM_TENANT_KEY);
    if (fromClaim) return fromClaim;
  } catch (_) { /* modo privado / storage bloqueado */ }

  // Sin claim todavía (primer arranque): al menos quedarse dentro de la marca.
  if (LOBBY_HOSTS[host]) return LOBBY_HOSTS[host];

  return 'elegance';
}

/* ── Candado: la elección de pestaña no puede sacarte de TU local ─────────
   `saas_current_tenant` vive en sessionStorage y pisa al subdominio (arriba
   está el porqué). El agujero: si esa pestaña visitó otro tenant con
   `?local=`, el valor queda pegado y un usuario de UN solo local termina
   consultando las colecciones de OTRO — Firestore le niega TODO (citas,
   reservas, chats, productos) y parece un problema de permisos del rol.
   Pasó con la recepción de Kronnos Limache (02-08-2026).

   Solución: quien NO es operador de SynapTech solo puede quedarse en el
   tenant de su claim. Si la sesión apunta a otro, se limpia y manda al suyo.
   Los operadores (que sí navegan entre locales) no se tocan. */
export function fijarTenantDelUsuario(claimTenantId, { esOperador = false } = {}) {
  if (!claimTenantId) return null;

  /* Persistir el claim SIEMPRE, incluso para operadores y aunque no haya nada
     que corregir: es el insumo del paso "fromClaim" de resolveTenantId(), que
     evita caer en Elegance cuando el host no está en DOMAIN_MAP. Se reescribe
     en cada resolución de auth, así que si en el mismo dispositivo entra otra
     persona, queda el suyo y no el del anterior. */
  try { localStorage.setItem(CLAIM_TENANT_KEY, claimTenantId); } catch (_) {}

  if (esOperador) return null;
  try {
    const actual = sessionStorage.getItem('saas_current_tenant');
    if (actual && actual !== claimTenantId) {
      sessionStorage.setItem('saas_current_tenant', claimTenantId);
      console.warn(`[tenant] la pestaña apuntaba a "${actual}" y tu cuenta es de "${claimTenantId}": corregido.`);
      return { corregido: true, antes: actual, ahora: claimTenantId };
    }
  } catch (_) {}
  return null;
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
