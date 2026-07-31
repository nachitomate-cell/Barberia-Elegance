#!/usr/bin/env node
/**
 * reparar-fusiones-erroneas.js — devuelve al buscador a los clientes que el
 * auto-merge del club se comió por compartir teléfono con otra persona.
 *
 * El trigger linkLegacy buscaba candidatos SOLO por teléfono. Cuando dos
 * humanos comparten número (pareja, hermanos, mamá e hijo), el segundo que
 * llegaba absorbía al primero: le ponía `fusionadoCon`, y el panel esconde
 * todo doc fusionado (useClubUsers) → el cliente desaparece del buscador de
 * la agenda y de Clientes. Además sus citas quedaban con el `userId` del
 * otro, o sea que sus sellos se los llevaba un humano distinto.
 *
 * El trigger ya no lo hace (functions/link-legacy-on-auth.js, decidirFusion).
 * Este script limpia lo que quedó mal antes del arreglo.
 *
 * CRITERIO — se revierte solo cuando son personas distintas de verdad:
 *   · correos distintos Y
 *   · nombres de pila distintos (más allá de un typo o una tilde).
 * Un "Joaquin Lopez" fusionado con "Joaquín López Arévalo" es la misma
 * persona con el correo mal escrito: esa fusión se DEJA. Deshacerla crearía
 * el duplicado que tanto costó cerrar.
 *
 * Qué hace al revertir:
 *   1. Borra `fusionadoCon` / `fusionadoEn` del doc absorbido → vuelve a
 *      aparecer en el buscador y en Clientes.
 *   2. Devuelve las citas: las que son suyas (por teléfono + nombre) vuelven
 *      a apuntar a su uid.
 *   3. Si en la fusión se movieron sellos o packs, NO adivina: lo reporta
 *      para revisarlo a mano (los montos originales no quedaron guardados).
 *
 * Uso:
 *   node scripts/reparar-fusiones-erroneas.js            → simulacro (no escribe)
 *   node scripts/reparar-fusiones-erroneas.js --aplicar  → escribe
 *   node scripts/reparar-fusiones-erroneas.js --tenant oren [--aplicar]
 */
const path  = require('path');
const admin = require('firebase-admin');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const APLICAR    = process.argv.includes('--aplicar');
const soloTenant = (() => {
  const i = process.argv.indexOf('--tenant');
  return i >= 0 ? process.argv[i + 1] : null;
})();

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const digitos = s => String(s || '').replace(/\D+/g, '');

// Distancia de edición, para no confundir un typo con otra persona.
function distancia(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const fila = [i];
    for (let j = 1; j <= n; j++) {
      fila[j] = Math.min(
        prev[j] + 1,
        fila[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = fila;
  }
  return prev[n];
}

/* ¿Son dos personas distintas, o el mismo humano escrito de dos formas?
   Miramos el nombre de pila: los apellidos se escriben incompletos todo el
   tiempo ("Joaquin Lopez" vs "Joaquín López Arévalo"), pero el nombre de pila
   no cambia. "Dayana Cosmelli" y "Emiliano Cosmelli" son dos personas. */
function sonPersonasDistintas(nombreA, nombreB) {
  const a = norm(nombreA), b = norm(nombreB);
  if (!a || !b) return false;                       // sin nombre no opinamos
  if (a === b) return false;
  if (distancia(a, b) <= 2) return false;           // typo/tilde en el nombre completo
  const pilaA = a.split(/\s+/)[0], pilaB = b.split(/\s+/)[0];
  if (pilaA === pilaB) return false;
  if (distancia(pilaA, pilaB) <= 1) return false;   // "matias" / "matías"
  // Un nombre contenido en el otro ("denzel" dentro de "denzel meza") tampoco
  // es otra persona.
  if (a.includes(b) || b.includes(a)) return false;
  return true;
}

async function main() {
  const tenants = soloTenant
    ? [soloTenant]
    : (await db.collection('tenants').listDocuments()).map(d => d.id);

  console.log(`\n╔═══ Fusiones erróneas ${APLICAR ? '(APLICANDO)' : '(simulacro — nada se escribe)'} ═══╗\n`);

  let revertidas = 0, revisar = 0, dejadas = 0;

  for (const tid of tenants) {
    const usersCol = db.collection(`tenants/${tid}/users`);
    const citasCol = db.collection(`tenants/${tid}/citas`);

    const snap = await usersCol.where('fusionadoCon', '!=', '').get().catch(() => ({ docs: [] }));
    if (!snap.docs.length) continue;

    const lineas = [];
    for (const d of snap.docs) {
      const src = d.data();
      const dstSnap = await usersCol.doc(String(src.fusionadoCon)).get();
      if (!dstSnap.exists) continue;
      const dst = dstSnap.data();

      const emailSrc = norm(src.email), emailDst = norm(dst.email);
      const correosDistintos = !!emailSrc && !!emailDst && emailSrc !== emailDst;
      if (!correosDistintos || !sonPersonasDistintas(src.nombre, dst.nombre)) { dejadas++; continue; }

      // ¿Se movieron sellos o packs en la fusión? Si sí, el monto original no
      // quedó guardado en ningún lado: se revierte la visibilidad igual, pero
      // el saldo hay que mirarlo a mano.
      const moviosellos = Number(dst.sellosHistoricos || 0) > 0 || Number(dst.sellosDisponibles || 0) > 0
                       || (Array.isArray(dst.packsActivos) && dst.packsActivos.length > 0);

      // Citas que son de la persona absorbida: mismo teléfono y mismo nombre.
      const telSrc = digitos(src.telefono);
      const suyas = [];
      if (telSrc) {
        const vars = [...new Set([src.telefono, telSrc, `+${telSrc}`].filter(Boolean))];
        for (const v of vars) {
          const q = await citasCol.where('clienteTelefono', '==', v).get();
          for (const c of q.docs) {
            if (norm(c.data().clienteNombre) !== norm(src.nombre)) continue;
            if (!suyas.some(x => x.id === c.id)) suyas.push(c);
          }
        }
      }

      lineas.push({ id: d.id, src, dst, dstId: dstSnap.id, suyas, moviosellos });
    }

    if (!lineas.length) continue;
    console.log(`── ${tid} ──`);

    for (const L of lineas) {
      console.log(`  ⟲ ${L.src.nombre} <${L.src.email || 's/correo'}>  ←  lo absorbió  ${L.dst.nombre} <${L.dst.email || 's/correo'}>`);
      console.log(`      ${L.id} → ${L.dstId} · tel compartido ${L.src.telefono || '—'} · ${L.suyas.length} cita(s) a devolver`);
      if (L.moviosellos) {
        revisar++;
        console.log(`      ⚠ revisar a mano: ${L.dst.nombre} tiene ${L.dst.sellosHistoricos || 0} sellos históricos / ${(L.dst.packsActivos || []).length} pack(s); parte puede ser de ${L.src.nombre}`);
      }

      if (APLICAR) {
        const batch = db.batch();
        batch.update(usersCol.doc(L.id), {
          fusionadoCon: admin.firestore.FieldValue.delete(),
          fusionadoEn:  admin.firestore.FieldValue.delete(),
          revertidoEn:  admin.firestore.FieldValue.serverTimestamp(),
          revertidoMotivo: 'fusion-por-telefono-compartido',
        });
        for (const c of L.suyas) batch.update(c.ref, { clienteUid: L.id, userId: L.id });
        await batch.commit();
      }
      revertidas++;
    }
    console.log('');
  }

  console.log(`Resumen: ${revertidas} fusión(es) revertida(s), ${dejadas} dejada(s) como están (mismo humano), ${revisar} con sellos/packs que revisar a mano.`);
  if (!APLICAR) console.log('\nSimulacro. Para escribir de verdad:  node scripts/reparar-fusiones-erroneas.js --aplicar\n');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
