'use strict';

// scripts/test-ig-reservas.js
// ─────────────────────────────────────────────────────────────────────────────
//  Prueba VIVA del asistente de reservas por Instagram.
//
//  El guard estático (npm run test:ig) revisa que el código diga lo correcto.
//  Esto revisa que haga lo correcto: rutea contra los datos reales de Firestore
//  y hace pasar un DM completo por el cerebro, con el envío a Instagram
//  interceptado para que no le llegue nada a nadie.
//
//  Las dos cosas que no pueden fallar en silencio y que por eso se prueban acá:
//    1. QUIÉN contesta. El webhook es uno solo para todas las cuentas; si el
//       ruteo se equivoca, quien pregunta por una hora recibe el pitch de
//       ventas de SynapTech. Cinco docs comparten el id de @synaptechspa
//       (delnero, elegance, ferraza y renacer conectaron con la cuenta de
//       SynapTech), así que este caso es real, no teórico.
//    2. QUÉ contesta. Que el cerebro de agendamiento realmente responda por
//       este transporte, con el calendario masticado y sin pedir un teléfono
//       que en Instagram no existe.
//
//  Uso:  npm run test:ig-reservas
//        (el paso 2 necesita ANTHROPIC_API_KEY; sin ella se salta y avisa)
// ─────────────────────────────────────────────────────────────────────────────

const path = require('path');
const ROOT = path.join(__dirname, '..');
const F    = path.join(ROOT, 'functions');

const admin = require(require.resolve('firebase-admin', { paths: [F] }));
admin.initializeApp({ credential: admin.credential.cert(require(path.join(ROOT, 'service-account.json'))) });
const db = admin.firestore();

let fallos = 0;
const ok = (n, cond, extra) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${n}${cond ? '' : `  → ${extra}`}`);
  if (!cond) fallos++;
};

// El local de práctica: existe justo para esto, y su plata no es de nadie.
const TENANT_PRUEBA = 'practica';

(async () => {
  /* ── 1. Ruteo: ¿a qué cerebro va cada DM? ───────────────────────────────── */
  console.log('\n🔀 Ruteo del webhook (datos reales)');
  const plataforma = require(path.join(F, 'instagram-plataforma.js'));
  const tenantDeCuenta = plataforma._tenantDeCuenta;

  const platCon = (await db.doc('_system/instagram_synaptech').get()).data() || {};
  const platId  = String(platCon.instagramUserId || '');

  ok('un DM a @synaptechspa NO se rutea a ningún local',
    platId ? (await tenantDeCuenta(platId)) === null : false,
    'los leads de los anuncios los contestaría el bot de reservas de una barbería');

  ok('un id desconocido cae en el bot de ventas',
    (await tenantDeCuenta('999999999999999')) === null,
    'un id basura devolvería un tenant y se contestaría con su token');

  ok('un id vacío no revienta',
    (await tenantDeCuenta('')) === null && (await tenantDeCuenta(null)) === null,
    'un evento mal formado tumbaría el webhook entero');

  // Un local con cuenta PROPIA sí tiene que resolver a su tenant.
  const refs = await db.collection('_system').listDocuments();
  let propio = null;
  for (const r of refs) {
    if (!r.id.startsWith('instagram_')) continue;
    const tid = r.id.slice('instagram_'.length);
    if (tid === 'synaptech') continue;
    const c = (await r.get()).data() || {};
    const id = String(c.instagramUserId || '');
    if (id && id !== platId && c.accessToken && c.enabled !== false) { propio = { tid, id }; break; }
  }
  if (propio) {
    const r = await tenantDeCuenta(propio.id);
    ok(`la cuenta propia de ${propio.tid} resuelve a su tenant`,
      r && r.tid === propio.tid && !!r.con.token,
      `devolvió ${r ? r.tid : 'null'}`);
  } else {
    console.log('  — ningún local tiene cuenta propia conectada todavía (nada que rutear)');
  }

  /* Los cuatro que conectaron con la cuenta de SynapTech son el caso que más se
     parece a "está listo" sin estarlo. Ninguno puede robarse los DM de la
     plataforma. */
  const prestados = [];
  for (const r of refs) {
    if (!r.id.startsWith('instagram_')) continue;
    const tid = r.id.slice('instagram_'.length);
    if (tid === 'synaptech') continue;
    const c = (await r.get()).data() || {};
    if (String(c.instagramUserId || '') === platId) prestados.push(tid);
  }
  if (prestados.length) {
    ok(`los ${prestados.length} locales con la cuenta prestada no interceptan los DM de la plataforma (${prestados.join(', ')})`,
      (await tenantDeCuenta(platId)) === null,
      'un DM a @synaptechspa se contestaría como si fuera esa barbería');

    const d = await plataforma._diagnosticoLocal(prestados[0]);
    ok(`${prestados[0]} se marca como cuenta prestada, no como conectado`,
      d.cuentaPrestada === true && d.conectado === false && d.operativo === false,
      'desde ops se vería listo para encender y no lo está');
  }

  /* ── 2. Entitlement: sin llave, nadie contesta ──────────────────────────── */
  console.log('\n🔑 Habilitación en dos capas');
  const reservas = require(path.join(F, 'instagram-reservas.js'));

  const eInexistente = await reservas._estadoDelLocal('tenant_que_no_existe');
  ok('un tenant inexistente no contesta', eInexistente.ok === false, eInexistente.motivo);

  // Se prende el de práctica para el resto de la prueba y se deja prendido: es
  // el local donde se entrena al equipo comercial, tiene sentido que esté vivo.
  await db.doc(`_system/${TENANT_PRUEBA}`).set({ igAsistente: true }, { merge: true });
  const eOk = await reservas._estadoDelLocal(TENANT_PRUEBA);
  ok(`con igAsistente el local de ${TENANT_PRUEBA} sí contesta`, eOk.ok === true, eOk.motivo);

  // El interruptor del local manda sobre el entitlement.
  await db.doc(`tenants/${TENANT_PRUEBA}/configuracion/instagram`).set({ botEnabled: false }, { merge: true });
  const eApagado = await reservas._estadoDelLocal(TENANT_PRUEBA);
  ok('el interruptor del local lo calla aunque esté habilitado',
    eApagado.ok === false && /apagado/.test(eApagado.motivo), eApagado.motivo);
  await db.doc(`tenants/${TENANT_PRUEBA}/configuracion/instagram`).set({ botEnabled: true }, { merge: true });

  /* ── 3. Las reglas del canal, sin el modelo de por medio ────────────────
     Acá se llama la herramienta directo. Lo que varía en una conversación es
     el modelo; las reglas no pueden variar, y son estas las que impiden que
     Instagram deje citas que nadie puede contactar. */
  console.log('\n📞 El teléfono: lo único que Instagram no trae');
  const cerebro = require(path.join(F, 'evolution', 'cerebro.js'));
  const ctxIG = { tid: TENANT_PRUEBA, canal: 'instagram', telefono: '', chatId: 'ig_guard', confirmacionesEnabled: false };
  const ctxWA = { tid: TENANT_PRUEBA, telefono: '56977778888', chatId: '56977778888', confirmacionesEnabled: false };

  const enTresDias = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' })
    .format(new Date(Date.now() + 3 * 86400e3));
  // La fecha la manda la herramienta: si el día pedido está cerrado devuelve el
  // siguiente hábil, y agendar sobre el día pedido rebota por cupo inexistente.
  const disp = await cerebro._ejecutarTool('consultar_disponibilidad',
    { fecha: enTresDias, servicio_nombre: 'Corte de cabello' }, ctxIG);
  const dia   = disp.fecha || enTresDias;
  const horas = disp.horas || disp.horarios || [];

  const creadas = [];
  if (horas.length < 2) {
    console.log(`  — ${TENANT_PRUEBA} no tiene cupos libres el ${dia}: no se puede probar el agendamiento`);
  } else {
    const base = { servicio_nombre: 'Corte de cabello', fecha: dia, hora: horas[0] };

    const sinFono = await cerebro._ejecutarTool('agendar_cita',
      { ...base, cliente_nombre: 'Guard Sin Fono' }, ctxIG);
    ok('por Instagram NO agenda sin teléfono',
      sinFono.ok === false && /tel[eé]fono/i.test(sinFono.motivo || ''),
      'quedaría una cita que el local no puede contactar ni el cliente consultar');

    const malFono = await cerebro._ejecutarTool('agendar_cita',
      { ...base, cliente_nombre: 'Guard Mal Fono', cliente_telefono: '123' }, ctxIG);
    ok('un número mal escrito se rechaza diciendo qué estaba mal',
      malFono.ok === false && /no es un celular chileno/i.test(malFono.motivo || ''),
      'el modelo volvería a pedirlo igual y el cliente repetiría el mismo error');

    /* Sin número, `where('clienteTelefonoSuf9','==','')` devuelve las citas de
       cualquiera que se haya reservado sin teléfono. Es una fuga, no un vacío. */
    for (const t of ['consultar_mis_citas', 'cancelar_cita', 'reagendar_cita']) {
      const inp = t === 'consultar_mis_citas' ? {} : { cita_id: 'x', fecha: dia, hora: horas[0] };
      const r = await cerebro._ejecutarTool(t, inp, ctxIG);
      ok(`${t} no busca con el número vacío`,
        r.ok === false && /No tengo el n[uú]mero/.test(r.motivo || ''),
        'devolvería —o cancelaría— citas de otras personas');
    }

    const conFono = await cerebro._ejecutarTool('agendar_cita',
      { ...base, cliente_nombre: 'Guard IG', cliente_telefono: '+56 9 1111 2222' }, ctxIG);
    ok('con teléfono válido sí agenda', conFono.ok === true, JSON.stringify(conFono));
    if (conFono.ok) {
      const q = await db.collection(`tenants/${TENANT_PRUEBA}/citas`)
        .where('fecha', '==', dia).where('codigoCita', '==', conFono.codigo).get();
      const c = q.docs[0]?.data() || {};
      if (q.docs[0]) creadas.push(q.docs[0]);
      ok('el teléfono se guarda como lo escribe WhatsApp (569…)',
        c.clienteTelefono === '56911112222',
        `quedó "${c.clienteTelefono}": la misma persona sería dos según por dónde reservó`);
      ok('la cita queda marcada `ig_bot`, no `wa_bot`',
        c.origen === 'ig_bot',
        'sin esto no hay forma de saber qué canal trae reservas');
      ok('queda registrado de dónde salió el consentimiento',
        c.waOptInFuente === 'ig_bot',
        'la Ley 21.719 pregunta de dónde salió ese teléfono');
    }

    const wa = await cerebro._ejecutarTool('agendar_cita',
      // Un cliente_telefono DISTINTO a propósito: por WhatsApp tiene que ganar
      // el número desde el que escribe, no el que sugiera el modelo.
      { ...base, hora: horas[1], cliente_nombre: 'Guard WA', cliente_telefono: '56900000000' }, ctxWA);
    ok('por WhatsApp nada cambia: agenda igual', wa.ok === true, JSON.stringify(wa));
    if (wa.ok) {
      const q = await db.collection(`tenants/${TENANT_PRUEBA}/citas`)
        .where('fecha', '==', dia).where('codigoCita', '==', wa.codigo).get();
      const c = q.docs[0]?.data() || {};
      if (q.docs[0]) creadas.push(q.docs[0]);
      ok('manda el número del chat, no el que sugirió el modelo',
        c.clienteTelefono === '56977778888',
        `quedó "${c.clienteTelefono}": la cita saldría a nombre de un teléfono que nadie usó`);
      ok('sigue marcándose `wa_bot`', c.origen === 'wa_bot', `origen "${c.origen}"`);
    }

    /* Las citas de prueba no se quedan ocupando cupos reales. El candado se
       busca POR citaId además de por `slotLockId`: borrar la cita y dejar su
       candado bloquea una hora libre para siempre, y es justo lo que detecta
       `check:slotlocks` —lo dejé una vez escrito así y saltó ahí—. */
    for (const d of creadas) {
      const citaId = d.id;
      const lock = d.data()?.slotLockId;
      await d.ref.delete().catch(() => {});
      if (lock) await db.doc(`tenants/${TENANT_PRUEBA}/slotLocks/${lock}`).delete().catch(() => {});
      const sueltos = await db.collection(`tenants/${TENANT_PRUEBA}/slotLocks`)
        .where('citaId', '==', citaId).get().catch(() => ({ docs: [] }));
      for (const s of sueltos.docs) await s.ref.delete().catch(() => {});
    }
  }

  /* ── 4. Un DM de verdad, de punta a punta ──────────────────────────────── */
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.log('\n💬 DM completo — SALTADO (falta ANTHROPIC_API_KEY en el entorno)');
    console.log(fallos ? `\n❌ ${fallos} problema(s)\n` : '\n✅ Ruteo y habilitación en orden (la conversación no se probó).\n');
    process.exit(fallos ? 1 : 0);
  }

  console.log('\n💬 DM completo por el cerebro de reservas');
  /* Se intercepta el envío ANTES de cargar el módulo: instagram-reservas hace
     `require('./lib/instagram-api')` al tope, así que si se parcha después ya
     tiene la referencia vieja y le llega un DM a una persona real. */
  const igApi = require(path.join(F, 'lib', 'instagram-api.js'));
  const enviados = [];
  igApi.enviarDM = async (_t, _u, destino, texto) => { enviados.push({ destino, texto }); return { ok: true }; };

  const igsid = `prueba_${Date.now()}`;
  const con = { token: 'token-de-prueba', igUserId: '000000000000000', username: 'cuenta.de.prueba' };
  const t0 = Date.now();
  await reservas.procesarDMReserva({
    tid: TENANT_PRUEBA, igsid, texto: 'hola, tienen hora para un corte esta semana?',
    mid: `mid_${Date.now()}`, con, anthropicKey: key,
  });
  const segs = ((Date.now() - t0) / 1000).toFixed(1);

  ok('contestó algo', enviados.length === 1, `mandó ${enviados.length} mensajes`);
  const resp = enviados[0]?.texto || '';
  console.log(`     ↳ (${segs}s) "${resp.replace(/\n/g, ' ').slice(0, 160)}"`);
  ok('la respuesta no viene vacía ni con el fallback de emergencia',
    resp.length > 15 && !/^Perdona, ¿me repites eso/.test(resp),
    `respondió: "${resp}"`);
  ok('no pide el número de teléfono de entrada',
    !/tu (número|numero|teléfono|telefono)/i.test(resp),
    'en Instagram no hay teléfono hasta que el cliente lo escriba: pedirlo traba la conversación');

  /* Dedup: Meta reintenta el webhook cuando la respuesta tarda. El mismo mid
     dos veces no puede contestar dos veces —ni, peor, agendar dos veces. */
  const mid = `mid_dedup_${Date.now()}`;
  await reservas.procesarDMReserva({ tid: TENANT_PRUEBA, igsid, texto: 'y cuánto sale?', mid, con, anthropicKey: key });
  const trasPrimero = enviados.length;
  await reservas.procesarDMReserva({ tid: TENANT_PRUEBA, igsid, texto: 'y cuánto sale?', mid, con, anthropicKey: key });
  ok('el reintento de Meta con el mismo mid no vuelve a contestar',
    enviados.length === trasPrimero,
    `mandó ${enviados.length - trasPrimero} mensaje(s) de más`);

  const conv = (await db.doc(`tenants/${TENANT_PRUEBA}/ig_conversaciones/${igsid}`).get()).data() || {};
  ok('guarda la conversación dentro del tenant, no en la raíz',
    Array.isArray(conv.messages) && conv.messages.length >= 2 && conv.canal === 'instagram',
    'los DM de un local no pueden quedar mezclados con los de otro');
  ok('registra cuándo escribió el cliente (ventana de 24 h)',
    !!conv.ultimoMensajeEn,
    'sin esa marca no hay cómo saber si todavía se le puede escribir');

  // Limpieza: la conversación de prueba no tiene por qué quedar en el historial.
  await db.doc(`tenants/${TENANT_PRUEBA}/ig_conversaciones/${igsid}`).delete().catch(() => {});

  console.log(fallos === 0
    ? '\n✅ Asistente de Instagram: rutea al cerebro correcto, respeta las dos capas y conversa.\n'
    : `\n❌ ${fallos} problema(s) en el asistente de Instagram.\n`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error('\n💥', e); process.exit(1); });
