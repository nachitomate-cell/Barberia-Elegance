# Migración de clientes Chameleon (AgendaPro → Firestore)

## Resumen

Migra 595 clientes desde un export de AgendaPro a `tenants/chameleon/clientes/{telefono}`.

## Filtros aplicados al raw export

| Regla | Filas removidas |
|-------|----------------|
| Filas originales | 1.054 |
| − Sin teléfono y sin email | -208 |
| − Solo email (sin teléfono) | -185 |
| − Duplicados por teléfono (fusionados al más completo) | -66 |
| **Resultado final** | **595** |

Teléfonos internacionales (Francia, USA, Rusia, Colombia, etc.) se mantienen tal cual.

## Cómo correr

Desde la raíz del repo:

```bash
# 1. Asegurate de tener service-account.json en la raíz del repo
ls ../service-account.json

# 2. Instalá deps si hace falta (admin SDK)
npm install firebase-admin

# 3. Dry run primero (NO escribe nada, muestra qué haría)
node migraciones/migrate-chameleon-clientes.js

# 4. Si todo OK, ejecutá real
node migraciones/migrate-chameleon-clientes.js --commit
```

## Garantías

- **Idempotente**: usa `set(..., merge: true)`. Se puede correr múltiples veces sin duplicar ni pisar datos del cliente (sellos, uid del club, fecha de nacimiento si ya existían).
- **Atómico por batch**: 500 docs por commit, si un batch falla se detiene (no deja estado parcial corrupto en ese batch).
- **No toca sellos**: `sellosDisponibles`, `sellosHistoricos` y `stamps` se inicializan con `increment(0)` → si el doc ya existe los deja intactos; si es nuevo arrancan en 0.

## Tiempo y costo estimados

- ~2 batches de 500 = 2-3 segundos
- 595 writes ≈ **$0.001 USD** en cuota Firestore

## Después de migrar

Andá a `/gestion-interna/clientes` (tenant chameleon) y los 595 clientes aparecerán listados. Como no hay registro de uid del Club Chameleon, los clientes se ven sin enlace al club hasta que se registren ellos mismos vía `registro.html`. En ese momento, si su teléfono coincide, el sistema los une automáticamente al doc existente.

---

# Dedup retroactivo: `dedupe-chameleon-clientes.js`

Cuando un cliente migrado se registra en el Club con un teléfono distinto al que tenía en AgendaPro, queda con dos perfiles en `tenants/chameleon/users/`:

- **Legacy**: `users/{telefono}` con `uid === telefono` (creado por la migración).
- **Real**: `users/{firebaseAuthUid}` con `uid === firebaseAuthUid` (creado al registrarse).

Este script:
1. Agrupa docs de `users/` por email.
2. Cuando hay 1 real + 1+ legacies → fusiona sellos/historial/fechaRegistroOriginal/telefonoAnterior en el real y borra los legacy (de `users/` y de `clientes/`).
3. Cuando solo hay legacies (cliente nunca se registró): no toca.
4. Cuando solo hay reales (cliente nuevo, sin migración): no toca.

```bash
# Dry run primero — muestra qué haría
node migraciones/dedupe-chameleon-clientes.js

# Cuando estés conforme:
node migraciones/dedupe-chameleon-clientes.js --commit
```

Idempotente: se puede correr múltiples veces. Es seguro correrlo periódicamente o tras cada lote de nuevos registros.

---

# Migración Aura (sin contraseña al Club): `migrate-aura-clientes.js`

Aura tiene **612 clientes** importados de AgendaPro y **NO requiere contraseña** para el Club de Fidelidad. El script crea ambas colecciones en una sola corrida:

  - `tenants/aura/clientes/{telefono}` — lookups rápidos
  - `tenants/aura/users/{telefono}` — perfil "pasivo" con `uid=telefono`

El cliente queda 100% enrolado al Club automáticamente. La CF `sello-automatico` le suma sello al completar citas aunque nunca se registre activamente. Si en el futuro se registra con email+password, la CF `dedupeOnCreateTenant` mergea sellos/historial.

## Filtros aplicados

| Regla | Filas |
|---|---|
| Filas originales | 708 |
| − Sin teléfono ni email | -1 |
| − Teléfonos inválidos (muy cortos, todo ceros, dígitos repetidos) | -9 |
| − Duplicados por teléfono (fusionados al más completo) | -86 |
| **Resultado** | **612** |

## Cómo correr

```bash
# Dry run
node migraciones/migrate-aura-clientes.js

# Commit (crea 612×2 = 1.224 docs)
node migraciones/migrate-aura-clientes.js --commit
```

Tiempo: ~5-8 segundos. Costo: ~$0.002 USD.

## Resultado en el panel

- 612 clientes aparecen en `/gestion-interna/clientes` con badge **MIGRADO** (ámbar).
- Botón **"Invitar migrados"** funciona igual que con Chameleon: WhatsApp masivo con templates.
- Como Aura tiene **auto-enroll** activado (CF `autoEnrollTenant`), los clientes nuevos que reserven también entrarán al Club automáticamente.
