'use strict';

// scripts/diag-tope-ig-practica.js
// ─────────────────────────────────────────────────────────────────────────────
//  Prueba E2E del tope de conversaciones (tier Start) en el canal INSTAGRAM,
//  contra el tenant de práctica:
//
//    1. Se marca `practica` como tier Start y se deja el contador del día en
//       10/10 (con el aviso-al-dueño ya reclamado, para no molestar a nadie).
//    2. Un DM nuevo debe: bloquearse ANTES de gastar Claude (la apiKey falsa
//       revienta si algo llega al modelo), responder la derivación a humano
//       UNA vez, registrar el rechazo `tope_conversaciones_ig` y NO contar
//       conversación.
//    3. Un segundo DM del mismo chat no repite el aviso (claim de 12 h).
//
//  El envío real a Instagram se intercepta parchando lib/instagram-api (mismo
//  truco que test-ig-reservas.js). Al final se restaura todo lo tocado.
//
//    node scripts/diag-tope-ig-practica.js
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const ROOT = path.join(__dirname, '..');
const F    = path.join(ROOT, 'functions');

const admin = require(require.resolve('firebase-admin', { paths: [F] }));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'service-account.json'))) });
const db = admin.firestore();
const { FieldValue } = require(require.resolve('firebase-admin/firestore', { paths: [F] }));

const TID   = 'practica';
const IGSID = 'diag_tope_ig';

let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${String(extra ?? '')}`}`);
  if (!cond) fallos++;
};

const hoyChile = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());

(async () => {
  const fecha    = hoyChile();
  const sysRef   = db.doc(`_system/${TID}`);
  const cuotaRef = db.doc(`tenants/${TID}/wa_cuota/${fecha}`);
  const convRef  = db.doc(`tenants/${TID}/ig_conversaciones/${IGSID}`);

  // ── Setup (guardando el estado previo para restaurarlo) ──
  const sysAntes   = (await sysRef.get()).data() || {};
  const cuotaAntes = (await cuotaRef.get()).data();   // undefined si no existe
  await sysRef.set({ igAsistente: true, iaAsistenteTier: 'start' }, { merge: true });
  await cuotaRef.set({ fecha, convs: 10, avisoTopeConvs: true }, { merge: true });
  await convRef.delete().catch(() => {});

  // ── Intercepción del envío a Instagram ──
  const ig = require(path.join(F, 'lib', 'instagram-api.js'));
  const enviados = [];
  const enviarDMReal = ig.enviarDM;
  ig.enviarDM = async (_t, _u, sid, texto) => { enviados.push({ sid, texto }); };

  try {
    const reservas = require(path.join(F, 'instagram-reservas.js'));
    const con = { token: 'token-falso', igUserId: 'cuenta-falsa' };

    console.log('\n🧪 DM con el cupo del día lleno (10/10, tier start)');
    const r1 = await reservas.procesarDMReserva({
      tid: TID, igsid: IGSID, texto: 'hola, ¿tienen hora mañana?', mid: 'diag-tope-1',
      con, anthropicKey: 'clave-falsa-si-esto-llega-a-claude-revienta',
    });
    ok('el asistente se hizo cargo (return true)', r1 === true, r1);
    ok('respondió UNA derivación a humano (sin gastar Claude)',
      enviados.length === 1 && /no puedo responderte autom/i.test(enviados[0]?.texto || ''),
      JSON.stringify(enviados));

    const convDoc = (await convRef.get()).data() || {};
    ok('quedó el reclamo del aviso en el chat (convTopeAvisoAt)', !!convDoc.convTopeAvisoAt);
    ok('NO se abrió ventana de conversación (no se cuenta ni se salta el tope)',
      !convDoc.convVentanaHasta, JSON.stringify(convDoc));

    const cuota = (await cuotaRef.get()).data() || {};
    ok('el contador del día sigue en 10 (el rechazo no suma)', Number(cuota.convs) === 10, cuota.convs);

    const mes  = fecha.slice(0, 7);
    const uso  = (await db.doc(`tenants/${TID}/wa_uso/${mes}`).get()).data() || {};
    ok('el rechazo quedó auditado como tope_conversaciones_ig',
      Number(uso?.rechazadas?.tope_conversaciones_ig) >= 1,
      JSON.stringify(uso.rechazadas || {}));

    console.log('\n🔁 Segundo DM del mismo chat (no debe repetir el aviso)');
    const r2 = await reservas.procesarDMReserva({
      tid: TID, igsid: IGSID, texto: '¿hola?', mid: 'diag-tope-2',
      con, anthropicKey: 'clave-falsa',
    });
    ok('también se hizo cargo', r2 === true, r2);
    ok('pero NO repitió el aviso (claim de 12 h)', enviados.length === 1, enviados.length);
  } finally {
    // ── Restaurar TODO lo tocado ──
    ig.enviarDM = enviarDMReal;
    await convRef.delete().catch(() => {});
    const patchSys = {};
    patchSys.iaAsistenteTier = ('iaAsistenteTier' in sysAntes) ? sysAntes.iaAsistenteTier : FieldValue.delete();
    patchSys.igAsistente     = ('igAsistente' in sysAntes)     ? sysAntes.igAsistente     : FieldValue.delete();
    await sysRef.set(patchSys, { merge: true }).catch(() => {});
    if (cuotaAntes === undefined) {
      await cuotaRef.delete().catch(() => {});
    } else {
      await cuotaRef.set({
        convs:          ('convs' in cuotaAntes)          ? cuotaAntes.convs          : FieldValue.delete(),
        avisoTopeConvs: ('avisoTopeConvs' in cuotaAntes) ? cuotaAntes.avisoTopeConvs : FieldValue.delete(),
      }, { merge: true }).catch(() => {});
    }
  }

  console.log(fallos
    ? `\n❌ ${fallos} fallo(s) — el tope de Instagram no está aplicando como debe.`
    : '\n✅ El canal Instagram respeta el tope del tier: deriva, avisa una vez y no cuenta de más.');
  process.exit(fallos ? 1 : 0);
})().catch(err => { console.error('❌', err); process.exit(1); });
