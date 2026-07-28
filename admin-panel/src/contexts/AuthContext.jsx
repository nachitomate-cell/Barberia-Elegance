import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { tenantDoc, resolveTenantId } from '../lib/tenantUtils';
import { withTimeout } from '../lib/firestore-helpers';

const AuthContext = createContext(null);

const SUPERADMIN_EMAIL = 'ignaciiio.mate@gmail.com';

// ── Admins de marca ──────────────────────────────────────────────
// Un dueño con acceso 'admin' a varias sedes (tenants) del mismo grupo,
// sin necesidad de registrarlo como barbero en cada una. Con esto inicia
// sesión una sola vez (mismo dominio + ?local=) y administra las 3 sedes.
// Kronnos: incluye 'kronnos' (marca unificada, Camino 1 D2) + 3 legacy hasta cutover D4-D5.
const BRAND_ADMINS = {
  'administracionkronnos@gmail.com': ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
  'claudio.burgos91@gmail.com':      ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
  'grupo.kratos.spa@gmail.com':      ['kronnos', 'kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'],
};

// Sedes Kronnos a las que un email tiene acceso de marca (para el switcher
// de sede del panel). Superadmin ve las 3. Devuelve null si no aplica.
export function getBrandTenants(email) {
  const e = (email || '').toLowerCase();
  if (e === SUPERADMIN_EMAIL) return ['kronnos_penablanca', 'kronnos_limache', 'kronnos_woman'];
  return BRAND_ADMINS[e] || null;
}

// Fallback: custom claims { role, tenantId } que setea superadminCrearStaff.
// Cubre cuentas SIN doc-espejo barberos/{uid} (flujos de alta antiguos solo
// dejaban authUid en el doc principal): sin esto, un admin real degradaba a
// 'barbero' en silencio y perdía el sidebar (caso Infinity, 2026-07-19).
// Los claims viven en el ID token cacheado, así que también sirven si la
// lectura de Firestore falla por red.
//
// Sin `tenantId !== resolveTenantId()` guard: si el claim dice admin de X y
// el user está en el subdomain de Y, el guard viejo lo degradaba a 'barbero'.
// Efecto: cualquier admin que entrara desde el hub app.synaptechspa.cl (donde
// resolveTenantId=sandbox hasta que HubTenantGate resuelva) o desde otro
// subdomain quedaba redirigido a /agenda.html. Confiamos en Firestore rules
// para el enforcement real: un admin de tenant X que quiera escribir en Y
// será rechazado por rules igualmente.
async function roleFromClaims(firebaseUser) {
  try {
    const tok = await firebaseUser.getIdTokenResult();
    const { role } = tok.claims || {};
    return (role === 'admin' || role === 'barbero') ? role : null;
  } catch {
    return null;
  }
}

// Scope de sucursal de un doc de barbero/admin. `sucursalScope` es el campo
// explícito de "qué sede puede ver este usuario" ('all' | id de sucursal). Si
// no está, cae al `sucursalId` del barbero (donde trabaja) — así un barbero ve
// su sede. Sin nada → 'all' (tenants de una sola sede quedan sin filtro).
function scopeFromDoc(data) {
  return data?.sucursalScope ?? data?.sucursalId ?? 'all';
}

// Semilla anti-flash: si en el reload anterior había un usuario logueado, el
// primer render ya lo sabe y NO parpadea el LoginPage antes de que Firebase
// termine su check. Se actualiza en cada onAuthStateChanged.
const LAST_UID_KEY  = '_panel_last_uid';
const LAST_ROLE_KEY = '_panel_last_role';
function _seedUidSync() {
  try { return localStorage.getItem(LAST_UID_KEY) || null; } catch { return null; }
}
// Rol seed: evita el flash de RoleRedirectScreen mientras useAuth resuelve el
// rol real. En el reload anterior guardamos el rol que quedó → el primer render
// ya asume ese rol (que se sobreescribe con el real en cuanto llega). No es
// autoritativo (Firestore rules son la fuente real), es solo UX.
function _seedRoleSync() {
  try { return localStorage.getItem(LAST_ROLE_KEY) || null; } catch { return null; }
}
function _persistRole(r) {
  try { localStorage.setItem(LAST_ROLE_KEY, r); } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  // `user`: undefined = todavía no sabemos; null = confirmado sin sesión;
  // objeto = user de Firebase. Anti-flash: si teníamos un UID persistido en
  // reloads previos, arrancamos con un "placeholder" truthy para no renderizar
  // LoginPage antes de que onAuthStateChanged confirme el user real.
  const [user,    setUser]    = useState(() => {
    const uid = _seedUidSync();
    return uid ? { uid, _seed: true } : undefined;
  });
  const [role,    setRole]    = useState(() => _seedRoleSync());
  const [sucursalScope, setSucursalScope] = useState('all');
  const [loading, setLoading] = useState(true);
  // UID cuyo rol ya terminamos de resolver. Sirve para saber si un evento de
  // onAuthStateChanged trae un usuario NUEVO (login) o es el mismo de siempre
  // (refresh de token, que Firebase dispara solo). Ver `setLoading(true)` abajo.
  const resolvedUid = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        try {
          localStorage.removeItem(LAST_UID_KEY);
          localStorage.removeItem(LAST_ROLE_KEY);
        } catch { /* ignore */ }
        resolvedUid.current = null;
        setUser(null);
        setRole(null);
        setSucursalScope('all');
        setLoading(false);
        return;
      }
      try { localStorage.setItem(LAST_UID_KEY, firebaseUser.uid); } catch { /* ignore */ }
      setUser(firebaseUser);

      // ⚠ CLAVE — reabrir `loading` en cada usuario nuevo.
      // Al entrar desde el LoginPage, el evento previo (sesión nula) ya dejó
      // loading=false. Sin esto, el render que sigue a setUser() ve
      // user=truthy + loading=false + role=null → App.jsx concluye "no es
      // admin" y muestra RoleRedirectScreen ("aún no resolvió") durante todo
      // el tiempo que tarde resolver el rol. Si tardaba >4 s, su timer
      // expulsaba al admin a /agenda.html. Bug reportado 2026-07-27.
      // Solo para UID nuevo: los refreshes de token del mismo usuario no
      // deben mandar el panel entero de vuelta al spinner.
      if (resolvedUid.current !== firebaseUser.uid) setLoading(true);
      const finish = (r, scope) => {
        resolvedUid.current = firebaseUser.uid;
        setRole(r);
        _persistRole(r);
        setSucursalScope(scope);
        setLoading(false);
      };

      const email = firebaseUser.email?.toLowerCase();

      // Superadmin de SynapTech — acceso total en cualquier tenant
      if (email === SUPERADMIN_EMAIL) return finish('admin', 'all');

      // Admin de marca — dueño con 'admin' en sus sedes (sin re-login al cambiar)
      if (email && BRAND_ADMINS[email]?.includes(resolveTenantId())) {
        return finish('admin', 'all');
      }

      // Los custom claims son source of truth: los setea el script server-side
      // vía Admin SDK y no son manipulables desde el cliente. Si el claim dice
      // 'admin' → aceptamos INMEDIATAMENTE sin esperar la lectura de Firestore
      // (que puede fallar por red/rules/timeout y dejar al admin colgado en
      // 'barbero' → redirect a /agenda.html, caso reportado por Ignacio 2026-07-27).
      //
      // Primero leemos los claims del token CACHEADO (sin red): resuelve en
      // microsegundos. El refresh forzado contra el servidor sigue siendo
      // necesario —es la única forma de ver claims aplicados server-side
      // después de que el navegador cacheó el token (admin recién creado, o
      // admin degradado)— pero YA NO bloquea el login de todos:
      //   · cache dice admin → entra ya, y el refresh corre en background.
      //     Las Firestore rules leen el token refrescado igual, así que la
      //     revocación real no se pierde: solo llega un instante después.
      //   · cache NO dice admin → ahí sí esperamos el refresh, porque es el
      //     caso en que el claim nuevo es lo que lo deja entrar.
      let rolClaims = await roleFromClaims(firebaseUser);
      if (rolClaims === 'admin') {
        (async () => {
          try {
            await firebaseUser.getIdToken(true);
            const fresco = await roleFromClaims(firebaseUser);
            // Solo degradamos ante un claim explícito de no-admin. Si vuelve
            // null (cuenta sin claims que se apoya en barberos/{uid}) no
            // tocamos nada: las rules son el enforcement real.
            if (fresco === 'barbero') { setRole('barbero'); _persistRole('barbero'); }
          } catch { /* sin red: seguimos con el claim cacheado */ }
        })();
      } else {
        try { await firebaseUser.getIdToken(true); } catch { /* noop */ }
        rolClaims = await roleFromClaims(firebaseUser);
      }
      // Bypass manual del RoleRedirectScreen: si el user tocó "Soy admin,
      // entrar de todos modos", respetamos su elección aunque los claims no
      // digan admin. Firestore rules siguen enforceando; el override solo
      // deja pasar la UI del panel.
      let roleOverride = null;
      try {
        if (sessionStorage.getItem('_role_override_admin') === '1') roleOverride = 'admin';
      } catch { /* ignore */ }
      if (rolClaims === 'admin' || roleOverride === 'admin') {
        // Fast-path SÍNCRONO: setRole + setLoading juntos, sin awaits en el
        // medio. Cualquier await acá agrega gap donde loading=false pero
        // role=null todavía → RoleRedirectScreen se muestra por unos ms.
        // El scope preciso se resuelve en background.
        finish('admin', 'all');    // scope 'all' = default seguro
        // Scope real en background (fire-and-forget) — el sucursalScope se
        // actualiza cuando la lectura vuelve, sin bloquear el render inicial.
        (async () => {
          try {
            const snap = await withTimeout(getDoc(tenantDoc('barberos', firebaseUser.uid)), 5000, 'auth/scope');
            if (snap.exists()) {
              const data = snap.data();
              if (data._mainDocId) {
                const main = await withTimeout(getDoc(tenantDoc('barberos', data._mainDocId)), 5000, 'auth/scope-link');
                if (main.exists()) setSucursalScope(scopeFromDoc(main.data()));
              } else {
                setSucursalScope(scopeFromDoc(data));
              }
            }
          } catch { /* mantener 'all' */ }
        })();
        return;
      }
      // Sin claim admin: cae al flujo tradicional (barbero por doc + fallback claim).
      try {
        const snap = await withTimeout(getDoc(tenantDoc('barberos', firebaseUser.uid)), 10000, 'auth/role');
        if (snap.exists()) {
          const data = snap.data();
          let rolDoc, scope;
          if (data._mainDocId) {
            const main = await withTimeout(getDoc(tenantDoc('barberos', data._mainDocId)), 10000, 'auth/role-link');
            rolDoc = main.exists() ? (main.data().rol || 'barbero') : 'barbero';
            scope  = main.exists() ? scopeFromDoc(main.data()) : 'all';
          } else {
            rolDoc = data.rol || 'barbero';
            scope  = scopeFromDoc(data);
          }
          finish(rolDoc, scope);
        } else {
          finish(rolClaims || 'barbero', 'all');
        }
      } catch {
        finish(rolClaims || 'barbero', 'all');
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, sucursalScope, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
