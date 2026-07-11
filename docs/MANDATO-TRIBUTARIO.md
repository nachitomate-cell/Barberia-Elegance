# Mandato tributario para emisión de BHE — guía de implementación

Documento y flujo para autorizar a SynapTech a emitir BHE en nombre del barbero cuando opera bajo modelo de arriendo de sillón (Fase 3 del módulo de facturación).

**Última actualización:** 2026-07-11
**Riesgo si no se implementa:** el SII puede considerar la emisión no autorizada y sancionar tanto al barbero como al mandatario. La Fase 2 actual (afecta del local) NO requiere mandato — solo la Fase 3 (BHE de terceros).

---

## 1. Piezas ya disponibles

- **`mandato-tributario.html`** (raíz del repo). Documento imprimible/firmable con placeholders que se rellenan por query string:
  ```
  /mandato-tributario.html?nombre=Juan+Perez&rut=12.345.678-9&email=juan@x.cl&tenantId=elegance&tenantNombre=Elegance
  ```
- **`functions/facturacion-arriendo.js` → `facturacionEmitirNC`** (nueva CF). Callable que emite Nota de Crédito (DTE 61) para anular una boleta afecta cuando se cancela la cita. Cumple el requerimiento tributario de dejar en cero un folio ya emitido cuando se anula el servicio.

---

## 2. Pendiente por armar (frontend + backend)

### 2.1 Frontend — panel del barbero

En `gestion-interna/`, cuando el barbero acceda por primera vez a la sección de facturación (o cuando el admin del local active Fase 3):

1. Modal con iframe a `/mandato-tributario.html?...` con los datos precargados.
2. Botón "Firmo y acepto" → llama a un callable `firmarMandatoTributario`.
3. Guardar en el user doc:
   - `mandatoTributarioFirmadoAt: serverTimestamp`
   - `mandatoTributarioVersion: '2026-07-11'`
   - `mandatoTributarioUa: navigator.userAgent`
4. Después de firmar, habilitar la emisión de BHE en su nombre.

### 2.2 Backend — callable `firmarMandatoTributario`

```js
// functions/mandato-tributario.js (a crear)
exports.firmarMandatoTributario = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const { tenantId, rut } = req.data || {};
  if (!tenantId || !rut) throw new HttpsError('invalid-argument', 'Faltan datos.');

  const uid   = req.auth.uid;
  const email = (req.auth.token?.email || '').toLowerCase();
  const ua    = String(req.rawRequest?.headers?.['user-agent'] || '').slice(0, 500);

  // Persistir en el doc de barbero + doc de auditoría global (para
  // reconstruir la evidencia sin depender del tenant).
  const barberoRef = tenantId === 'elegance'
    ? db.collection('barberos').doc(uid)
    : db.collection('tenants').doc(tenantId).collection('barberos').doc(uid);
  await barberoRef.set({
    rut,
    mandatoTributarioFirmadoAt: FieldValue.serverTimestamp(),
    mandatoTributarioVersion:   '2026-07-11',
    mandatoTributarioUa:        ua,
  }, { merge: true });

  await db.collection('mandatos_tributarios').add({
    uid, email, rut, tenantId,
    version: '2026-07-11', ua,
    firmadoAt: FieldValue.serverTimestamp(),
  });

  return { ok: true };
});
```

Y agregar en `firestore.rules`:

```
match /mandatos_tributarios/{docId} {
  allow read:  if esBootstrap();
  allow write: if false;
}
```

### 2.3 Gate en `procesarBHE` (Fase 3, cuando se implemente)

En el trigger que emite la BHE del barbero, ANTES de llamar SimpleAPI:

```js
const barberoSnap = await barberoRef.get();
const mandatoAt = barberoSnap.data()?.mandatoTributarioFirmadoAt;
if (!mandatoAt) {
  logger.warn(`[bhe] barbero ${barberoUid} sin mandato firmado → BHE bloqueada`);
  await citaRef.set({ facturacionBhe: {
    estado: 'error', motivo: 'sin-mandato',
  } }, { merge: true });
  return;
}
```

### 2.4 UI de revocación

En el perfil del barbero, un botón "Revocar mandato" que llama a otro callable:

```js
exports.revocarMandatoTributario = onCall(...); // borra los campos y agrega evento en mandatos_tributarios/
```

---

## 3. Timeline sugerido

| Semana | Acción | Responsable |
|--------|--------|-------------|
| 1 | Redactar `firmarMandatoTributario` + reglas Firestore. | Backend |
| 1 | UI en gestión-interna para firmar (iframe + botón). | Frontend |
| 2 | Barbero de prueba (Ignacio) firma y verifica que el doc queda. | Ignacio |
| 3 | Rollout a todos los tenants Fase 3 (arriendo con BHE). | Ignacio |
| 3 | Fase 3 (emisión BHE) SOLO se enciende para tenants cuyos barberos tengan mandato. | Backend |

---

## 4. Consideraciones tributarias

- SII permite Nota de Crédito para anular boletas afectas dentro del **mismo mes** de emisión o hasta **60 días** después, según categoría (verificar tabla vigente).
- La `facturacionEmitirNC` implementada no valida ese plazo. Antes de exponerla en producción, agregar un guard: si la boleta original tiene más de 60 días, requiere aprobación del contador del local.
- Para BHE de terceros, el mandato es imprescindible según Circular 21/2020 del SII y modificaciones posteriores. Verificar la versión vigente al momento del rollout.

---

## 5. Contactos

- Contable / tributario: [por definir — contador externo de SynapTech]
- SimpleAPI (Haulmer): soporte@haulmer.com
- OpenFactura: portal Haulmer
