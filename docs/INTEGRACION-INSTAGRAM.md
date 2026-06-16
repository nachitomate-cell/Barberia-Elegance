# 📸 Integración de Instagram → Lookbook

Guía para activar la importación automática de posts de Instagram al Lookbook de una barbería.

**Qué hace:** conecta la cuenta de Instagram (Business/Creator) del local y, cada 6 horas, baja sus últimas fotos al Lookbook (y a la app pública). Solo imágenes y carruseles — reels y videos se excluyen. Las categorías se detectan por hashtags (#fade, #barba, #clasico…). El token se renueva solo antes de expirar.

API usada: **Instagram API with Instagram Login** (reemplaza la Basic Display API, descontinuada). Scope: `instagram_business_basic` (solo lectura).

---

## ✅ Qué ya está construido (no tocar)

- **Vista del panel:** `admin-panel/src/views/Instagram.jsx`
- **Ruta:** `/instagram` en `admin-panel/src/App.jsx`
- **Backend:** `functions/instagram-sync.js`, exportado en `functions/index.js`:
  - `instagramOAuthCallback` (HTTP) — recibe la autorización y guarda el token.
  - `instagramSyncScheduled` (cron cada 6 h) — sincroniza todos los tenants.
  - `instagramSyncManual` (callable) — botón "Sincronizar ahora".

---

## 🙋 Qué pedirle a la barbería

1. **Cuenta de Instagram Profesional** (Empresa o Creador). La personal NO sirve.
   - Conversión: Instagram → *Configuración → Tipo de cuenta → Cambiar a cuenta profesional*. Gratis y reversible.
2. **Su @usuario de Instagram.**
3. **5 minutos del dueño** con sesión iniciada en esa cuenta de IG, para apretar **"Conectar Instagram"** en el panel y autorizar. (Nunca pedimos su contraseña.)
4. *(Recomendado)* Instagram vinculado a la **página de Facebook** del negocio.

⚠️ Si la App de Meta está en **modo Desarrollo**, agregar su @usuario como **Instagram Tester** y que acepte la invitación (IG → *Configuración → Apps y sitios web → Invitaciones de tester*). Para conexión abierta sin testers, la App debe pasar **App Review** y estar en **Live**.

---

## 🔧 Setup técnico (una sola vez por App de Meta)

1. **Crear la App** en https://developers.facebook.com → *Crear App* → tipo **Business**.
2. Agregar el producto **Instagram** → activar **"Instagram Login for Business"**.
3. En *Instagram → API setup with Instagram login → Business login settings*, agregar como
   **Valid OAuth Redirect URI**:
   ```
   https://us-central1-barberia-elegance.cloudfunctions.net/instagramOAuthCallback
   ```
4. **Guardar el App ID en Firestore** (no es secreto):
   - Colección `_system`, documento `instagram_app`, campo `appId` = `<App ID de Meta>`.
5. **Guardar el App Secret como secret de Functions:**
   ```bash
   firebase functions:secrets:set INSTAGRAM_APP_SECRET
   # pegar el "Instagram App Secret" de la App de Meta
   ```
6. **Desplegar las funciones:**
   ```bash
   firebase deploy --only functions:instagramOAuthCallback,functions:instagramSyncScheduled,functions:instagramSyncManual
   ```

> El App ID es **uno solo** y sirve para todas las barberías. Solo se hace una vez.

---

## 🏪 Activar para una barbería nueva (por cada tenant)

1. **Agregar el `tenantId` a la lista `ALL_TENANTS`** en `functions/instagram-sync.js`
   (línea ~38). Sin esto, el cron y el OAuth no reconocen al tenant y caen a `elegance`.
2. **Mostrar el ítem en el menú:** descomentar / agregar la entrada de Instagram en el
   grupo *Contenido* de `admin-panel/src/components/layout/Sidebar.jsx`.
   Recomendado mostrarlo solo a los tenants ya configurados (mismo patrón que `membresias`
   para Chameleon), para no mostrar la pantalla "Falta App ID" a quien aún no lo contrató.
3. Re-deploy de functions (si tocaste `ALL_TENANTS`) y build del panel.
4. El dueño entra a **Contenido → Instagram → "Conectar Instagram"**, autoriza, y aprieta
   **"Sincronizar ahora"** para la primera importación.

---

## 🩹 Diagnóstico rápido

| Síntoma | Causa probable |
|---|---|
| "Falta configurar el App ID…" (banner ámbar) | No existe `_system/instagram_app.appId`. |
| Error al autorizar / redirect | La Redirect URI no coincide exactamente con la del paso 3. |
| Conecta pero importa 0 fotos | La cuenta no es Business/Creator, o solo tiene reels/videos. |
| "Token expirado o inválido. Vuelve a conectar." | Token revocado o caducado (60 días sin actividad). Reconectar. |
| No conecta y la App está en Desarrollo | Falta agregar la cuenta como Instagram Tester y aceptar la invitación. |

El estado por tenant vive en Firestore: `_system/instagram_<tenantId>` (token, último sync, fotos importadas, errores).