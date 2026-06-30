/**
 * Backfill de clientes históricos de Yügen Studio.
 *
 * Recorre tenants/yugen/citas y, para cada cliente único (por teléfono
 * normalizado), crea su perfil pasivo en tenants/yugen/users/{telN}
 * y tenants/yugen/clientes/{telN} si todavía no existe. Replica el
 * comportamiento de auto-enroll-cliente.js (CF autoEnrollTenant) pero
 * sobre el histórico de citas.
 *
 * Esto hace que el buscador del módulo "Corte al Lápiz" del panel pueda
 * listar a todos los clientes que ya tienen al menos una cita en Yügen
 * (no sólo los registrados activamente en el club).
 *
 *   node scripts/backfill-yugen-clientes.js [--dry-run] [--tenant=yugen]
 *
 * Por defecto corre sobre yugen. Pasa --dry-run para sólo reportar.
 */

const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const args   = process.argv.slice(2);
const DRY    = args.includes('--dry-run');
const TENANT = (args.find(a => a.startsWith('--tenant=')) || '--tenant=yugen').split('=')[1];

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'))),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
const { FieldValue } = admin.firestore;

function normalizePhone(p) { return (p || '').replace(/\D/g, ''); }

function phoneVariants(rawPhone) {
  const variants = new Set();
  if (!rawPhone) return [];
  const raw  = String(rawPhone).trim();
  const norm = raw.replace(/\D/g, '');
  if (raw)  variants.add(raw);
  if (norm) {
    variants.add(norm);
    variants.add('+' + norm);
    if (norm.startsWith('56') && norm.length >= 10) {
      const sin56 = norm.slice(2);
      variants.add(sin56);
      variants.add('+' + sin56);
    }
    if (!norm.startsWith('56') && norm.length === 9) {
      variants.add('56' + norm);
      variants.add('+56' + norm);
    }
  }
  return [...variants].filter(Boolean);
}

async function existeEnUsers(tid, telRaw, email) {
  const usersCol = db.collection(`tenants/${tid}/users`);
  if (telRaw) {
    const variants = phoneVariants(telRaw);
    const snaps = await Promise.all(variants.map(v => usersCol.doc(v).get().catch(() => null)));
    if (snaps.some(s => s && s.exists)) return true;
    const fieldSnaps = await Promise.all(
      variants.map(v => usersCol.where('telefono', '==', v).limit(1).get().catch(() => ({ docs: [] })))
    );
    if (fieldSnaps.some(q => q.docs.length > 0)) return true;
  }
  const emailN = (email || '').toLowerCase().trim();
  if (emailN) {
    const q = await usersCol.where('email', '==', emailN).limit(1).get().catch(() => ({ docs: [] }));
    if (q.docs.length > 0) return true;
  }
  return false;
}

(async () => {
  console.log(`▶ Backfill tenants/${TENANT}/clientes desde /citas — ${DRY ? 'DRY-RUN' : 'ESCRITURA REAL'}`);

  const citasSnap = await db.collection(`tenants/${TENANT}/citas`).get();
  console.log(`  ${citasSnap.size} citas encontradas`);

  // Agrupar por teléfono normalizado para evitar re-procesar al mismo cliente
  // muchas veces. Quedamos con la cita más nueva por nombre/email actualizado.
  const byTel = new Map(); // telN → { nombre, telefono, email, ultimaCitaId }
  for (const doc of citasSnap.docs) {
    const c = doc.data();
    const telRaw = String(c.clienteTelefono || '').trim();
    const telN   = normalizePhone(telRaw);
    if (!telN) continue; // sólo trabajamos con clientes que tengan teléfono
    const prev = byTel.get(telN);
    if (!prev || (c.fecha && c.fecha > (prev._fecha || ''))) {
      byTel.set(telN, {
        nombre:   String(c.clienteNombre || '').trim() || prev?.nombre || 'Cliente',
        telefono: telRaw || prev?.telefono || telN,
        email:    (c.clienteEmail || prev?.email || '').toLowerCase().trim(),
        _fecha:   c.fecha || prev?._fecha || '',
        citaId:   doc.id,
      });
    }
  }
  console.log(`  ${byTel.size} clientes únicos por teléfono`);

  let creados = 0, omitidos = 0, errores = 0;
  for (const [telN, info] of byTel) {
    try {
      if (await existeEnUsers(TENANT, info.telefono, info.email)) { omitidos++; continue; }

      const userData = {
        uid:                telN,
        nombre:             info.nombre,
        telefono:           info.telefono || telN,
        ...(info.email ? { email: info.email } : {}),
        sellosDisponibles:  0,
        sellosHistoricos:   0,
        stamps:             0,
        autoEnrolledFrom:   `backfill_cita_${info.citaId}`,
        autoEnrolledAt:     FieldValue.serverTimestamp(),
        creadoEn:           FieldValue.serverTimestamp(),
        updatedAt:          FieldValue.serverTimestamp(),
      };
      const clienteData = {
        nombre:           info.nombre,
        telefono:         info.telefono || telN,
        uid:              telN,
        ...(info.email ? { email: info.email } : {}),
        autoEnrolledFrom: `backfill_cita_${info.citaId}`,
        autoEnrolledAt:   FieldValue.serverTimestamp(),
        updatedAt:        FieldValue.serverTimestamp(),
      };

      if (!DRY) {
        const batch = db.batch();
        batch.set(db.doc(`tenants/${TENANT}/users/${telN}`),    userData,    { merge: true });
        batch.set(db.doc(`tenants/${TENANT}/clientes/${telN}`), clienteData, { merge: true });
        await batch.commit();
      }
      creados++;
      if (creados % 25 === 0) console.log(`  …${creados} creados`);
    } catch (e) {
      errores++;
      console.error(`  ✖ ${telN} (${info.nombre}):`, e.message);
    }
  }

  console.log('───────────────────────────────────────');
  console.log(`✔ creados:  ${creados}`);
  console.log(`• omitidos: ${omitidos} (ya existían en users)`);
  console.log(`✖ errores:  ${errores}`);
  if (DRY) console.log('(modo dry-run; vuelve a ejecutar sin --dry-run para escribir)');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
