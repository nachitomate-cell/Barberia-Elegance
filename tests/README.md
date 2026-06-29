# Tests E2E del chatbot

Script Node + Puppeteer que verifica los flujos principales del chat público,
del bio (FAB de Syna) y la integración con el panel admin.

## Setup (una vez)

```bash
cd tests
npm install
```

Puppeteer descarga Chrome automáticamente (~170 MB). Demora 1–2 min la 1ra vez.

## Pre-requisitos para correr

- El **chat público** servido en `http://localhost:3000` (`npm run dev` del repo raíz).
- El **admin Vite** servido en `http://localhost:5173` (`cd admin-panel && npm run dev`).
- **Anonymous Auth** activo en Firebase Console.
- **Reglas Firestore** desplegadas (`firebase deploy --only firestore:rules`).
- Al menos **1 servicio cargado** en `tenants/kronnos_penablanca/servicios`
  (para que el test de precios encuentre algo).

## Cómo correr

```bash
# Modo headless (rápido, sin UI)
npm test

# Ver el navegador en vivo (debug)
npm run test:headed

# Super lento, paso a paso (didáctico)
npm run test:slow
```

## Variables de entorno

| Variable | Default | Para qué |
|---|---|---|
| `TENANT` | `kronnos_penablanca` | Cambiar a otro local (`elegance`, `yugen`, etc) |
| `BASE`   | `http://localhost:3000` | URL del chat público |
| `ADMIN`  | `http://localhost:5173` | URL del admin Vite |
| `HEADED` | `0` | `1` para abrir el navegador visible |
| `SLOWMO` | `0` | Milisegundos de demora entre interacciones |

Ejemplo:

```bash
TENANT=elegance HEADED=1 SLOWMO=120 node chatbot.test.js
```

## Qué cubren los tests

15 tests automatizados:

1. **Infraestructura**: `/chat` responde 200, admin Vite responde 200.
2. **Welcome modal**: aparece, se completa, se cierra.
3. **Saludo**: el bot interpola el nombre.
4. **Quick replies**: aparecen >= 4 chips.
5. **Action `dynamic-prices`**: service cards se renderizan.
6. **Action `link-booking`**: aparece CTA button "Reserva aquí".
7. **Keyword matching**: "a que hora abren?" dispara respuesta.
8. **Fallback**: mensaje sin keyword cae en escalación.
9. **Action `cancel-reagendar`**: bot pide código.
10. **Validación de código**: código demasiado corto rechazado.
11. **Persistencia**: tras recarga, welcome no se repite.
12. **Bio**: carga el bio y el FAB de Syna aparece.
13. **FAB click**: abre modal con iframe del chat.

## Output

Cuando hay fallas:
- Se guarda un **screenshot full-page** en `tests/screenshots/`.
- Se loguea el último error de consola del navegador.
- Se genera `tests/last-run.json` con el resumen completo.

## 🧪 Test E2E completo: cancelar cita por código

Hay un **segundo script** que prueba el flujo end-to-end más crítico:

```bash
npm run test:e2e          # headless
npm run test:e2e:headed   # ver el navegador hacer todo solo
```

### Qué hace

1. **Crea una cita real en Firestore** con código único (vía Firebase Admin SDK).
2. **Abre el chat** y completa el welcome.
3. **Toca chip "Cancelar"** → escribe el código → el bot consulta.
4. **Verifica** que el bot muestra los detalles correctos (servicio, hora).
5. **Toca "❌ Cancelar"** → confirma con "Sí, cancelar".
6. **Lee el doc de Firestore** y valida que quedó:
   - `estado: 'Cancelada'`
   - `canceladaVia: 'cliente_chat'`
   - `canceladaAt: <timestamp>`
7. **Cleanup automático**: elimina la cita de prueba (siempre, incluso si falla).

### Requisitos extra

Este test necesita las **credenciales Admin SDK** de Firebase:

1. Andá a https://console.firebase.google.com/project/barberia-elegance/settings/serviceaccounts/adminsdk
2. Click en **"Generate new private key"** → descarga el JSON.
3. Renombrá el archivo a `.firebase-admin-key.json` y movelo a `tests/`.
4. **NO lo subas a git** (ya está en `.gitignore`).

Si el archivo no existe, el test sale con `SKIP` y te muestra las instrucciones.

### Por qué este test es importante

Es el único que valida **el flujo completo de extremo a extremo**:
chat público → Cloud Function → escritura en Firestore con campos correctos.
Si pasa, garantiza que el código de gestión funciona en producción.

---

## CI / integración con GitHub Actions

Salida con exit code != 0 si algo falla → se puede correr en CI.

```yaml
# .github/workflows/e2e.yml (esqueleto)
- run: npm run dev &
- run: cd admin-panel && npm run dev &
- run: sleep 8
- run: cd tests && npm install
- run: cd tests && npm test
```
