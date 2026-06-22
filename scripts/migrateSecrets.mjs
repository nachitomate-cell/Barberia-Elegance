#!/usr/bin/env node
// scripts/migrateSecrets.mjs
// ─────────────────────────────────────────────────────────────────────────────
//  MIGRACIÓN DE SECRETOS DEL PAYWALL  (Fase 5 — legado)
//
//  Mueve la `hiddenUrl` de los bloques 'paywall' desde el array PÚBLICO
//  (bios/{username}.bloques) hacia la subcolección PRIVADA
//  bios/{username}/secrets/{blockId}, y la elimina del array público.
//
//  Esto cierra la fuga: hasta hoy la hiddenUrl viajaba en un doc de lectura
//  pública. Tras migrar, solo el dueño (reglas) puede leer /secrets.
//
//  NOTA DE ESQUEMA: en producción el array se guarda como `bloques` (español),
//  no `blocks`. El script detecta el campo real y escribe de vuelta en el mismo.
//
//  Seguridad: usa el Admin SDK (ignora las reglas de cliente). Por defecto corre
//  en DRY-RUN (no escribe nada). Pasa --commit para aplicar de verdad.
//
//  Uso:
//    # 1) Apunta a producción con una service account (ver instrucciones abajo)
//    export GOOGLE_APPLICATION_CREDENTIALS="/ruta/serviceAccountKey.json"
//    # 2) Simulación (no escribe):
//    node scripts/migrateSecrets.mjs
//    # 3) Aplicar de verdad:
//    node scripts/migrateSecrets.mjs --commit
// ─────────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

// ── Modo: DRY-RUN por defecto (true). Solo --commit escribe. ────────────────
const DRY_RUN = !process.argv.includes('--commit');

// ── Inicialización del Admin SDK ────────────────────────────────────────────
// Requiere GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de la service account
// (Application Default Credentials). El projectId se infiere de la clave.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('\n✖ Falta GOOGLE_APPLICATION_CREDENTIALS.');
  console.error('  Exporta la ruta a tu service account antes de ejecutar:');
  console.error('  export GOOGLE_APPLICATION_CREDENTIALS="/ruta/serviceAccountKey.json"\n');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

async function run() {
  console.log(`\n🔐 Migración de secretos del paywall — modo: ${DRY_RUN ? 'DRY-RUN (no escribe)' : 'COMMIT (escribe en prod)'}\n`);

  let totalBios = 0;
  let biosNeedingMigration = 0;
  let blocksMigrated = 0;
  const touched = [];

  // .stream() recorre la colección sin cargarla entera en memoria (apto a escala).
  const stream = db.collection('bios').stream();

  for await (const doc of stream) {
    totalBios++;
    const data = doc.data() || {};
    const username = doc.id;

    // El array puede estar en `bloques` (prod) o `blocks` (fallback).
    const field = Array.isArray(data.bloques) ? 'bloques' : (Array.isArray(data.blocks) ? 'blocks' : null);
    if (!field) continue;
    const arr = data[field];

    // ¿Hay paywalls con hiddenUrl todavía en el array público?
    const offenders = arr.filter((b) => b && b.tipo === 'paywall' && hasOwn(b, 'hiddenUrl'));
    if (offenders.length === 0) continue;

    biosNeedingMigration++;
    blocksMigrated += offenders.length;

    const ids = offenders.map((b) => b.id || '(sin-id)');
    touched.push({ username, ids });

    if (DRY_RUN) {
      console.log(`  [DRY] ${username}: migraría ${offenders.length} paywall(s) → ${JSON.stringify(ids)}`);
      continue;
    }

    // ── Aplicar: batch atómico por perfil (consistencia, como en saveBio) ──
    const batch = db.batch();

    // 1) Reescribe el array público sin la propiedad hiddenUrl en los paywalls.
    const cleaned = arr.map((b) => {
      if (b && b.tipo === 'paywall' && hasOwn(b, 'hiddenUrl')) {
        const { hiddenUrl, ...rest } = b; // eslint-disable-line no-unused-vars
        return rest;
      }
      return b;
    });
    batch.update(doc.ref, { [field]: cleaned });

    // 2) Escribe cada secreto en la subcolección privada.
    for (const b of offenders) {
      if (!b.id) {
        console.warn(`  ⚠ ${username}: paywall sin id, se omite (no se puede crear /secrets sin blockId).`);
        continue;
      }
      const secretRef = doc.ref.collection('secrets').doc(b.id);
      batch.set(secretRef, {
        uid: data.uid ?? null,
        blockId: b.id,
        hiddenUrl: typeof b.hiddenUrl === 'string' ? b.hiddenUrl : '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`  ✓ ${username}: ${offenders.length} secreto(s) migrado(s) y limpiados del público.`);
  }

  // ── Estadísticas finales ──
  console.log('\n──────── Resumen ────────');
  console.log(`  Total bios analizadas      : ${totalBios}`);
  console.log(`  Bios que necesitan migración: ${biosNeedingMigration}`);
  console.log(`  Bloques migrados           : ${blocksMigrated}`);
  if (DRY_RUN) {
    console.log('\n  DRY-RUN: no se escribió nada. Vuelve a ejecutar con --commit para aplicar.');
  } else {
    console.log('\n  ✅ Migración aplicada.');
  }
  console.log('');
}

run().then(() => process.exit(0)).catch((e) => { console.error('\n✖ Error en la migración:', e); process.exit(1); });
