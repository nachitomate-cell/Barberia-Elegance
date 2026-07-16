'use strict';

// scripts/crear-acceso-renacer.js
// ─────────────────────────────────────────────────────────────────────────────
//  Alta de credenciales reales de PRISCILA — dueña de "Peluquería y Barbería
//  Renacer" (tenant `renacer`). Doble rol:
//    · ADMIN GENERAL   → acceso total a /gestion-interna (custom claims)
//    · PROFESIONAL      → reservable por clientes en /agenda.html
//
//  Aprovisionamiento atómico:
//    1) Crea/recupera la cuenta en Firebase Auth.
//    2) Inyecta custom claims { role:'admin', tenantId:'renacer' }.
//       (El trigger sincronizarClaimsTenant los reafirma desde el doc.)
//    3) Escribe el doc de staff UNIFICADO bajo su uid en
//       tenants/renacer/barberos/{uid}, con authUid=uid para que agenda.html
//       reconozca su login ("Acceso Nativo") y sus citas se liguen a su cuenta.
//    4) Migra config (horario/foto/…) del doc previo del seed y elimina
//       cualquier duplicado de "Priscila" para no dejarla dos veces en la grilla.
//
//  ── FLAGS DE RESERVABILIDAD (crítico) ──
//  Un doc rol:'admin' SIN estos flags queda OCULTO de la agenda y la reserva
//  (los filtros excluyen admins puros). Para que Priscila sea reservable —que
//  es medio requisito— se setean, igual que superadminCrearStaff hace para el
//  perfil "admin que atiende":
//        disponible: true, esBarbero: true, mostrarEnAgenda: true
//
//  ── CONTRASEÑA POR ENTORNO (seguridad) ──
//  La clave NO se hardcodea: este archivo se versiona en git y dejar la
//  contraseña en el historial sería una fuga. Se pasa por variable de entorno:
//        RENACER_ADMIN_PASSWORD='...' node scripts/crear-acceso-renacer.js
//
//  Uso:
//    RENACER_ADMIN_PASSWORD='<clave>' node scripts/crear-acceso-renacer.js
// ─────────────────────────────────────────────────────────────────────────────

const path  = require('path');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

const sa = require(path.resolve(__dirname, '..', 'service-account.json'));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db   = admin.firestore();
const auth = admin.auth();

// ── Parámetros ───────────────────────────────────────────────────────────────
const EMAIL        = 'salonybarberiarenacer2@gmail.com'; // Firebase Auth normaliza a minúsculas
const PASSWORD     = process.env.RENACER_ADMIN_PASSWORD || '';
const TENANT_ID    = 'renacer';
const NOMBRE       = 'Priscila';
const AGENDAPRO_ID = 479550; // ID de vinculación original (AgendaPro)

(async () => {
  if (!PASSWORD || PASSWORD.length < 6) {
    console.error('✗ Falta la contraseña (mín. 6). Uso: RENACER_ADMIN_PASSWORD="…" node scripts/crear-acceso-renacer.js');
    process.exit(1);
  }

  // ── 1) Crear o recuperar la cuenta Auth ────────────────────────────────────
  let uid, yaExistia = false;
  try {
    const rec = await auth.createUser({ email: EMAIL, password: PASSWORD, displayName: NOMBRE });
    uid = rec.uid;
    console.log(`✓ Auth: cuenta CREADA           uid=${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      yaExistia = true;
      const existing = await auth.getUserByEmail(EMAIL);
      uid = existing.uid;
      await auth.updateUser(uid, { password: PASSWORD, displayName: NOMBRE });
      console.log(`✓ Auth: cuenta YA EXISTÍA       uid=${uid} (clave/displayName actualizados)`);
    } else {
      throw err;
    }
  }

  // ── 2) Custom claims { role:'admin', tenantId:'renacer' } ──────────────────
  await auth.setCustomUserClaims(uid, { role: 'admin', tenantId: TENANT_ID });
  console.log(`✓ Claims seteados               { role: 'admin', tenantId: '${TENANT_ID}' }`);

  const barberosCol = db.collection(`tenants/${TENANT_ID}/barberos`);

  // ── 3) Inspeccionar la colección y detectar duplicados de "Priscila" ───────
  const snap = await barberosCol.get();
  console.log(`\nℹ tenants/${TENANT_ID}/barberos — ${snap.size} doc(s) actuales:`);
  snap.docs.forEach(d => {
    const x = d.data();
    console.log(`   · ${d.id}  nombre="${x.nombre}"  rol=${x.rol}  _mainDocId=${x._mainDocId || '-'}  horario=${x.horario ? 'sí' : 'no'}`);
  });

  // Duplicados = docs PRINCIPALES (no link-doc) llamados "Priscila", distintos al nuevo uid.
  const previos = snap.docs
    .map(d => ({ id: d.id, data: d.data() }))
    .filter(d => d.id !== uid
      && !d.data._mainDocId
      && String(d.data.nombre || '').trim().toLowerCase() === NOMBRE.toLowerCase());

  // Migrar config útil del doc previo para no perder su agenda/apariencia.
  const carry = {};
  if (previos.length) {
    const src = previos[0].data;
    for (const k of ['horario', 'foto', 'especialidad', 'servicios', 'comision', 'orden', 'telefono', 'instagram']) {
      if (src[k] !== undefined) carry[k] = src[k];
    }
    console.log(`\nℹ Doc(s) previo(s) de Priscila: ${previos.map(p => p.id).join(', ')}`);
    console.log(`  Migrando campos de config: ${Object.keys(carry).join(', ') || '(ninguno)'}`);
  } else {
    console.log('\nℹ Sin duplicados previos de "Priscila".');
  }

  // ── 4) Escribir el doc UNIFICADO bajo el uid ───────────────────────────────
  const docData = {
    nombre:          NOMBRE,
    email:           EMAIL,
    rol:             'admin',
    activo:          true,
    disponible:      true,   // pasa filtros públicos / agenda
    esBarbero:       true,   // ADMIN QUE ATIENDE → reservable + columna en agenda
    mostrarEnAgenda: true,   //  idem (mismo criterio que superadminCrearStaff)
    authUid:         uid,    // agenda.html detecta "Acceso Nativo" y liga citas
    uid,                     // patrón legacy, también reconocido por resolveUid
    agendaproId:     AGENDAPRO_ID,
    ...carry,
    fechaCreacion:   FieldValue.serverTimestamp(),
  };
  await barberosCol.doc(uid).set(docData, { merge: true });
  console.log(`\n✓ Firestore: doc UNIFICADO      tenants/${TENANT_ID}/barberos/${uid}`);

  // ── 5) Eliminar duplicados previos + link-docs huérfanos que los apunten ───
  const previosIds = new Set(previos.map(p => p.id));
  const linkHuerfanos = snap.docs
    .map(d => ({ id: d.id, data: d.data() }))
    .filter(d => d.data._mainDocId && previosIds.has(d.data._mainDocId));

  for (const p of previos) {
    await barberosCol.doc(p.id).delete();
    console.log(`  → duplicado eliminado:        ${p.id}`);
  }
  for (const l of linkHuerfanos) {
    await barberosCol.doc(l.id).delete();
    console.log(`  → link-doc huérfano eliminado: ${l.id}`);
  }

  // ── Resumen ────────────────────────────────────────────────────────────────
  console.log('\n════════════════ RESUMEN ════════════════');
  console.log(`UID Auth            : ${uid}   (yaExistía=${yaExistia})`);
  console.log(`Claims              : { role: 'admin', tenantId: '${TENANT_ID}' }`);
  console.log(`Doc Firestore       : tenants/${TENANT_ID}/barberos/${uid}`);
  console.log(`Reservable          : disponible=true · esBarbero=true · mostrarEnAgenda=true`);
  console.log(`AgendaPro ID        : ${AGENDAPRO_ID}`);
  console.log(`Duplicados borrados : ${previos.length}  · link-docs huérfanos: ${linkHuerfanos.length}`);
  console.log('══════════════════════════════════════════');
  process.exit(0);
})().catch(e => { console.error('✗ Error:', e.code || '', e.message); process.exit(1); });
