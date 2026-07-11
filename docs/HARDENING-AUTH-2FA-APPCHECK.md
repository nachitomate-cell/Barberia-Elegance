# Endurecimiento de autenticación (Sprint 3.1)

Runbook para activar **2FA para roles admin/jefe** y **Firebase App Check con reCAPTCHA v3** para bloquear bots en formularios públicos.

Requiere configuración en Firebase Console + reCAPTCHA admin de Google. Sin esos pasos manuales, el código ya está listo pero inactivo.

---

## 1. 2FA (TOTP) para admins y jefes

### Por qué TOTP y no SMS

- **TOTP** (Google Authenticator, 1Password, Authy) → $0/mes. Cero fricción operativa.
- **SMS** → costo por envío + latencia. Solo tiene sentido si el user no puede usar app authenticator.

### Habilitar en Firebase Console

1. Firebase Console → proyecto `barberia-elegance` → **Authentication** → **Sign-in method**.
2. Baja hasta **Multi-factor authentication** → habilita **TOTP**.
3. En **Advanced** habilita la opción "Require email verification for multi-factor enrollment".

### Código ya disponible en el repo

- `js/services/mfa.service.js` — helper con métodos:
  - `MFA.iniciarEnrolamientoTotp(user)`
  - `MFA.completarEnrolamientoTotp(user, enrolInfo, codigo)`
  - `MFA.abrirResolver(errorMfa)` para el login
  - `MFA.resolverConCodigo(info, codigo)`
  - `MFA.tieneMfa(user)`
  - `MFA.esObligatoria(rol)`

### UI pendiente de armar

Los siguientes screens no están construidos todavía y son responsabilidad del sprint frontend:

1. **En `gestion-interna/`** → una página `/2fa` (o modal) con:
   - Botón "Activar 2FA" → llama `iniciarEnrolamientoTotp` y pinta un QR (usar `window.QRCode` que ya se carga en varios HTMLs).
   - Input de 6 dígitos → llama `completarEnrolamientoTotp`.
   - Mensaje de éxito + botón "cerrar".

2. **En el login del panel gestión-interna**:
   - Cuando `signInWithEmailAndPassword` falla con `auth/multi-factor-auth-required`, usar `MFA.abrirResolver(err)` para obtener el resolver.
   - Pedir el código TOTP → llamar `MFA.resolverConCodigo(info, codigo)`.

3. **Auth guard**:
   - Al cargar el panel, después del auth check, chequear rol y `MFA.tieneMfa`.
   - Si es admin/jefe sin MFA → banner rojo persistente con link a `/2fa`.
   - Meta: después de una fecha X (a definir por Ignacio), forzar el enrolamiento antes de dejar entrar (redirigir a `/2fa`).

### Rollout sugerido

- Semana 1: activar TOTP en Console + implementar UI + banner de activación opcional.
- Semana 2: notificar a todos los admins por WhatsApp/email para activarlo.
- Semana 3: forzar. Sin 2FA no se puede entrar al panel.

### Bootstrap superadmin (Ignacio)

`ignaciiio.mate@gmail.com` es el único email que en `crearAccesoStaff` está en `SUPERADMINS`. Debe activar 2FA **primero** — si te bloqueas de este correo, pierdes acceso a todos los tenants. Guarda los códigos de respaldo TOTP en 1Password.

---

## 2. Firebase App Check (reCAPTCHA v3)

### Qué protege

- Firestore: bloquea escrituras que vengan de clientes sin token de App Check válido.
- Cloud Functions callables: mismo bloqueo.
- Cubre todos los formularios públicos (`/crea`, `registro`, reserva pública, Bioo) sin tener que instrumentar cada uno con reCAPTCHA vanilla.

### Setup en Firebase Console

1. Firebase Console → **App Check** → **Get started**.
2. En **Apps** → selecciona la web app `barberia-elegance` → **Register**.
3. Elige **reCAPTCHA v3** como proveedor.
4. Firebase te pide una **site key** — puedes:
   - a) dejar que Firebase la cree automáticamente (recomendado), o
   - b) usar una existente de Google reCAPTCHA admin.
5. Copia la site key.

### Setup en Google reCAPTCHA admin (si vas por la ruta b)

1. https://www.google.com/recaptcha/admin → crear una site v3.
2. En "Domains" agrega:
   - `synaptechspa.cl`
   - `*.synaptechspa.cl` (cubre todos los tenants self-service)
   - `barberia-elegance.firebaseapp.com` (fallback authDomain)
   - `barberia-elegance.web.app` (fallback authDomain)
   - `bioo.cl` (Bioo)
   - `localhost` (desarrollo)
3. Copia la site key.

### Habilitar en el código

En `firebase-config.js` ya hay un bloque comentado. Para activarlo:

1. Reemplaza `REEMPLAZAR_CON_SITE_KEY_RECAPTCHA_V3` por tu site key real.
2. Descomenta el bloque `/* ... */`.
3. Agrega en cada HTML público que use App Check, ANTES del `firebase-config.js`:
   ```html
   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check-compat.js"></script>
   ```
   Los HTMLs afectados: `crea.html`, `registro.html`, `index.html`, `links/registro.html`, `links/claim.html`, `dashboard.html`, todos los del panel `gestion-interna/`.

### Enforcement

App Check tiene dos modos:

- **Unenforced**: se emite el token pero no se bloquea nada. Ideal para probar por 1 semana viendo métricas en la consola.
- **Enforced**: bloquea escrituras/llamadas sin token válido. Es el estado final.

Después de una semana en unenforced:

1. Firebase Console → App Check → **Firestore** → **Enforce**.
2. Firebase Console → App Check → **Cloud Functions** → **Enforce**.

### Debug tokens (para desarrollo local)

En desarrollo, App Check bloquea localhost porque reCAPTCHA no funciona ahí. Usar debug tokens:

1. En `firebase-config.js`, para dev:
   ```js
   self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
   ```
   antes del `activate()`.
2. La primera vez, Firebase imprime en consola un token de debug — copiar y agregar en Firebase Console → App Check → **Debug tokens**.

---

## 3. Timeline sugerido

| Semana | Acción | Responsable |
|--------|--------|-------------|
| 1 | Habilitar TOTP en Firebase Console. Ignacio activa su propio 2FA. | Ignacio |
| 1 | Armar UI de enrolamiento en `gestion-interna/` con `mfa.service.js`. | Frontend |
| 1 | Setup reCAPTCHA v3 admin + Firebase App Check en modo unenforced. | Ignacio |
| 2 | Descomentar App Check en `firebase-config.js` con site key real. | Ignacio |
| 2 | Notificar admins de tenants a activar 2FA. | Ignacio |
| 3 | Enforce App Check en Firestore + Functions. | Ignacio |
| 3 | Forzar 2FA para admins/jefes que no lo activaron. | Frontend |

---

## 4. Pruebas de aceptación

- [ ] Un admin sin 2FA entra al panel y ve el banner "Activa 2FA".
- [ ] Al activar 2FA con Google Authenticator, el user puede escanear el QR y verificar.
- [ ] Al cerrar sesión y volver, el login pide el segundo factor y funciona con el código TOTP.
- [ ] Un intento de reserva desde `index.html` con reCAPTCHA blockeado (VPN sospechosa / bot) es rechazado.
- [ ] Un intento de `/crea` desde un bot con user-agent conocido malicioso es rechazado por App Check.
- [ ] El bootstrap `ignaciiio.mate@gmail.com` tiene 2FA activo y las contraseñas de respaldo guardadas.

---

## 5. Contactos y notas

- Configurador: Ignacio (bootstrap).
- Correo de emergencia si te bloqueas: `privacidad@synaptechspa.cl` (redirige a Ignacio).
- Firebase Console: https://console.firebase.google.com/project/barberia-elegance
- reCAPTCHA admin: https://www.google.com/recaptcha/admin

---

**Última actualización:** 2026-07-11.
