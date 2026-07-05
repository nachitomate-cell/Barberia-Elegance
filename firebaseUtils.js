// firebaseUtils.js — Capa de datos Firestore
// Requiere: config.js y firebase-config.js cargados antes.
// Reemplaza completamente la dependencia de localStorage para
// citas, servicios y configuración.

'use strict';

/* ════════════════════════════════════════════════════════════════
   FDB — API de Firestore (equivalente a firebaseUtils.js en React)
   ════════════════════════════════════════════════════════════════ */
const FDB = (() => {

  // Nombres canónicos de colecciones
  const COL = {
    CITAS:     'citas',
    SERVICIOS: 'servicios',
    CONFIG:    'configuracion',
    USERS:     'users',
    BLOQUEOS:  'bloqueos',
    PREMIOS:   'premios',
    BARBEROS:  'barberos',
  };

  // Para elegance usamos las colecciones planas existentes (retrocompat).
  // Para cualquier otro tenant usamos tenants/{id}/{coleccion}.
  function tenantCol(name) {
    const tid = window.CURRENT_TENANT_ID || 'elegance';
    if (tid === 'elegance') return db.collection(name);
    return db.collection('tenants').doc(tid).collection(name);
  }

  const configRef = () => tenantCol(COL.CONFIG).doc('main');

  /* ──────────────────────────────────────────────────────────────
     FALLBACK REST — para navegadores in-app (Instagram/Facebook, iOS)
     donde el transporte del SDK de Firestore se cuelga sin resolver.
     La REST API es un simple fetch HTTPS que funciona en cualquier
     WebView y respeta las mismas reglas de seguridad (lectura pública).
     Solo se usa cuando el SDK no responde dentro del timeout.
     ────────────────────────────────────────────────────────────── */
  function _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('fs-timeout')), ms)),
    ]);
  }

  // Convierte un valor en formato REST de Firestore a JS plano.
  function _restValue(v) {
    if (v == null) return null;
    if ('stringValue'    in v) return v.stringValue;
    if ('integerValue'   in v) return Number(v.integerValue);
    if ('doubleValue'    in v) return v.doubleValue;
    if ('booleanValue'   in v) return v.booleanValue;
    if ('nullValue'      in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue'     in v) return (v.arrayValue.values || []).map(_restValue);
    if ('mapValue'       in v) return _restFields(v.mapValue.fields || {});
    if ('geoPointValue'  in v) return v.geoPointValue;
    if ('referenceValue' in v) return v.referenceValue;
    return null;
  }
  function _restFields(fields) {
    const o = {};
    for (const k in fields) o[k] = _restValue(fields[k]);
    return o;
  }
  function _restPath(relPath) {
    const tid = window.CURRENT_TENANT_ID || 'elegance';
    return (tid === 'elegance') ? relPath : ('tenants/' + tid + '/' + relPath);
  }
  function _restUrl(relPath, extra) {
    const opt = firebase.app().options;
    return 'https://firestore.googleapis.com/v1/projects/' + opt.projectId +
           '/databases/(default)/documents/' + _restPath(relPath) +
           '?key=' + opt.apiKey + (extra || '');
  }
  // Lee una colección del tenant vía REST → [{ id, ...data }]
  async function _restGetCollection(colName) {
    const res = await fetch(_restUrl(colName, '&pageSize=300'), { cache: 'no-store' });
    if (!res.ok) throw new Error('REST ' + res.status);
    const json = await res.json();
    return (json.documents || []).map(d => Object.assign(
      { id: d.name.split('/').pop() }, _restFields(d.fields || {})
    ));
  }
  // Lee un documento del tenant vía REST → data (o null si no existe)
  async function _restGetDoc(colName, docId) {
    const res = await fetch(_restUrl(colName + '/' + docId), { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('REST ' + res.status);
    const json = await res.json();
    return _restFields(json.fields || {});
  }

  /* ──────────────────────────────────────────────────────────────
     MIGRACIÓN: localStorage → Firestore (se ejecuta solo 1 vez)
     Mueve datos existentes sin borrar nada de Firestore.
     ────────────────────────────────────────────────────────────── */
  async function migrarDesdeLocalStorage() {
    // La migración solo aplica a elegance (datos legacy de localStorage)
    if ((window.CURRENT_TENANT_ID || 'elegance') !== 'elegance') return;
    const FLAG = 'fs_migrated_v2';
    if (localStorage.getItem(FLAG)) return;

    console.info('[FDB] Migrando localStorage → Firestore…');

    // ── Servicios ────────────────────────────────────────────────
    const lsSrvs = JSON.parse(localStorage.getItem('barber_services') || '[]');
    if (lsSrvs.length) {
      const snap = await tenantCol(COL.SERVICIOS).limit(1).get();
      if (snap.empty) {
        const batch = db.batch();
        lsSrvs.forEach((s, i) => {
          const ref = tenantCol(COL.SERVICIOS).doc(String(s.id));
          batch.set(ref, {
            nombre:   s.nombre,
            precio:   Number(s.precio),
            duracion: Number(s.duracion),
            orden:    i,
            activo:   true,
          });
        });
        await batch.commit();
        console.info('[FDB] Servicios migrados:', lsSrvs.length);
      }
    }

    // ── Configuración ────────────────────────────────────────────
    const lsSet = JSON.parse(localStorage.getItem('barber_settings') || '{}');
    // Leer config antigua de Firestore si existe (barber_settings/main)
    let fsOldData = {};
    try {
      const oldSnap = await db.collection('barber_settings').doc('main').get();
      if (oldSnap.exists) fsOldData = oldSnap.data();
    } catch (_) { /* ignorar */ }

    const configInit = {
      horarioInicio:    fsOldData.horarioInicio    || lsSet.horarioInicio    || '09:00',
      horarioFin:       fsOldData.horarioFin       || lsSet.horarioFin       || '20:00',
      intervaloMinutos: fsOldData.intervaloMinutos || lsSet.intervaloMinutos || 30,
      diasLaborales:    fsOldData.diasLaborales    || lsSet.diasLaborales    || [1,2,3,4,5,6],
      telefonoAdmin:    fsOldData.telefonoAdmin    || lsSet.telefonoAdmin    || SHOP.telefono,
      diasBloqueados:   fsOldData.fechasBloqueadas || [],
      colacion:         fsOldData.colacion         || null,
      diasConfig:       fsOldData.diasConfig        || {},
    };
    await configRef().set(configInit, { merge: true });

    // ── Citas ────────────────────────────────────────────────────
    const lsCitas = JSON.parse(localStorage.getItem('barber_bookings') || '[]');
    if (lsCitas.length) {
      const snap = await tenantCol(COL.CITAS).limit(1).get();
      if (snap.empty) {
        // Firestore permite 500 escrituras por batch
        const chunks = [];
        for (let i = 0; i < lsCitas.length; i += 400) chunks.push(lsCitas.slice(i, i + 400));
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach(b => {
            const ref = tenantCol(COL.CITAS).doc(String(b.id));
            batch.set(ref, {
              fecha:            b.fecha            || '',
              hora:             b.hora             || '',
              clienteNombre:    b.clienteNombre    || '',
              clienteTelefono:  b.clienteTelefono  || '',
              clienteEmail:     b.clienteEmail     || '',
              servicioNombre:   b.servicioNombre   || '',
              duracionServicio: Number(b.duracionServicio) || 30,
              barbero:          b.barbero          || '',
              estado:           b.estado           || 'Confirmada',
              nota:             b.nota             || '',
              creadoEn:         firebase.firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        }
        console.info('[FDB] Citas migradas:', lsCitas.length);
      }
    }

    // ── Barberos (Permisos) ──────────────────────────────────────
    const snapBarberos = await tenantCol(COL.BARBEROS).limit(1).get();
    if (snapBarberos.empty) {
      console.info('[FDB] Inicializando colección de barberos…');
      const initialBarberos = [
        { email: 'ignaciiio.mate@gmail.com' },
        { email: 'barrazanicolasfabian@gmail.com' },
        { uid: 'MRbgFWo4dtUoauZea2YhkYXcjtJ3' },
        { uid: 'oQicdNhcCwbTFXU7NyNyfNeeXqZ2' }
      ];
      const batch = db.batch();
      initialBarberos.forEach(b => {
        const id = b.uid || tenantCol(COL.BARBEROS).doc().id;
        const ref = tenantCol(COL.BARBEROS).doc(id);
        batch.set(ref, { 
          email: b.email ? b.email.toLowerCase() : null, 
          uid: b.uid || null,
          activo: true 
        }, { merge: true });
      });
      await batch.commit();
    }

    localStorage.setItem(FLAG, '1');
    console.info('[FDB] Migración completada.');
  }

  /* ──────────────────────────────────────────────────────────────
     SERVICIOS
     ────────────────────────────────────────────────────────────── */
  async function getServicios() {
    try {
      const snap = await _withTimeout(tenantCol(COL.SERVICIOS).orderBy('orden').get(), 5000);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) {
      // Fallback si no existe campo 'orden' en los documentos
      try {
        const snap = await _withTimeout(tenantCol(COL.SERVICIOS).get(), 5000);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        // Último recurso: REST API (el SDK se colgó, típico en WebView in-app).
        const arr = await _restGetCollection(COL.SERVICIOS);
        return arr.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      }
    }
  }

  async function addServicio({ nombre, precio, duracion, categoria, icono }) {
    // Calcular el siguiente orden
    const snap = await tenantCol(COL.SERVICIOS).orderBy('orden', 'desc').limit(1).get();
    const nextOrden = snap.empty ? 0 : (snap.docs[0].data().orden || 0) + 1;
    const ref = await tenantCol(COL.SERVICIOS).add({
      nombre,
      precio:   Number(precio),
      duracion: Number(duracion),
      categoria: categoria || 'Otro',
      icono:    icono || 'ph-scissors',
      orden:    nextOrden,
      activo:   true,
    });
    return ref.id;
  }

  async function updateServicio(id, data) {
    await tenantCol(COL.SERVICIOS).doc(String(id)).update(data);
  }

  async function deleteServicio(id) {
    await tenantCol(COL.SERVICIOS).doc(String(id)).delete();
  }

  async function reordenarServicios(serviciosOrdenados) {
    // serviciosOrdenados: array de {id, ...} en el nuevo orden
    const batch = db.batch();
    serviciosOrdenados.forEach((s, i) => {
      batch.update(tenantCol(COL.SERVICIOS).doc(String(s.id)), { orden: i });
    });
    await batch.commit();
  }

  async function reordenarBarberos(barberosOrdenados) {
    // barberosOrdenados: array de {id, ...} en el nuevo orden
    const batch = db.batch();
    barberosOrdenados.forEach((b, i) => {
      batch.update(tenantCol(COL.BARBEROS).doc(String(b.id)), { orden: i });
    });
    await batch.commit();
  }

  // onSnapshot → callback recibe array de servicios en tiempo real
  function onServiciosChange(callback) {
    return tenantCol(COL.SERVICIOS).orderBy('orden').onSnapshot(snap => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => console.error('[FDB] onServiciosChange:', err));
  }

  /* ──────────────────────────────────────────────────────────────
     CONFIGURACIÓN
     ────────────────────────────────────────────────────────────── */
  const _defaultConfig = () => ({
    horarioInicio:    '09:00',
    horarioFin:       '20:00',
    intervaloMinutos: 30,
    diasLaborales:    [1, 2, 3, 4, 5, 6],
    telefonoAdmin:    '',
    diasBloqueados:   [],
    colacion:         null,
    diasConfig:       {},
  });

  async function getConfig() {
    try {
      const snap = await _withTimeout(configRef().get(), 5000);
      if (!snap.exists) {
        // Solo intentar crear si estamos logueados y es posible escribir
        if (firebase.auth().currentUser) {
          const def = _defaultConfig();
          await configRef().set(def).catch(() => {});
          return def;
        }
        return _defaultConfig();
      }
      return { ..._defaultConfig(), ...snap.data() };
    } catch (e) {
      // SDK colgado/caído (típico en WebView in-app): intentar REST antes de
      // caer al default, para no perder la configuración real del local.
      try {
        const data = await _restGetDoc(COL.CONFIG, 'main');
        if (data && Object.keys(data).length) return { ..._defaultConfig(), ...data };
      } catch (_) {}
      return _defaultConfig();
    }
  }

  async function updateConfig(data) {
    await configRef().set(data, { merge: true });
  }

  // onSnapshot → callback recibe el objeto de configuración
  function onConfigChange(callback) {
    return configRef().onSnapshot(snap => {
      if (snap.exists) callback({ ..._defaultConfig(), ...snap.data() });
    }, err => console.error('[FDB] onConfigChange:', err));
  }

  /* ──────────────────────────────────────────────────────────────
     CONFIGURACIÓN POR BARBERO — barberos/{barberoid}/configuracion/main
     ────────────────────────────────────────────────────────────── */
  const _barberConfigRef = (barberoid) =>
    tenantCol(COL.BARBEROS).doc(barberoid).collection('configuracion').doc('main');

  async function getConfigBarbero(barberoid) {
    try {
      // Leer en paralelo: config del barbero, doc principal del barbero,
      // y config del tenant (para heredar intervaloMinutos y otros campos globales).
      const [cfgSnap, barbSnap, tenantSnap] = await Promise.all([
        _barberConfigRef(barberoid).get(),
        tenantCol(COL.BARBEROS).doc(barberoid).get(),
        configRef().get(),
      ]);
      const cfgData   = cfgSnap.exists   ? cfgSnap.data()   : {};
      const barbData  = barbSnap.exists  ? barbSnap.data()  : {};
      const tenantCfg = tenantSnap.exists ? tenantSnap.data() : {};
      // intervaloMinutos es un setting de tenant — siempre gana sobre barbero-específico
      return {
        ..._defaultConfig(),
        ...cfgData,
        ...(barbData.horario ? { horario: barbData.horario } : {}),
        ...(tenantCfg.intervaloMinutos != null ? { intervaloMinutos: tenantCfg.intervaloMinutos } : {}),
      };
    } catch (e) {
      console.error('[FDB] getConfigBarbero:', e);
      return _defaultConfig();
    }
  }

  async function updateConfigBarbero(barberoid, data) {
    await _barberConfigRef(barberoid).set(data, { merge: true });
  }

  function onConfigBarberoChange(barberoid, callback) {
    return _barberConfigRef(barberoid).onSnapshot(async snap => {
      try {
        const [barbSnap, tenantSnap] = await Promise.all([
          tenantCol(COL.BARBEROS).doc(barberoid).get(),
          configRef().get(),
        ]);
        const barbData  = barbSnap.exists  ? barbSnap.data()  : {};
        const cfgData   = snap.exists ? snap.data() : {};
        const tenantCfg = tenantSnap.exists ? tenantSnap.data() : {};
        callback({
          ..._defaultConfig(),
          ...cfgData,
          ...(barbData.horario ? { horario: barbData.horario } : {}),
          ...(tenantCfg.intervaloMinutos != null ? { intervaloMinutos: tenantCfg.intervaloMinutos } : {}),
        });
      } catch(_) {
        callback(snap.exists ? { ..._defaultConfig(), ...snap.data() } : _defaultConfig());
      }
    }, err => console.error('[FDB] onConfigBarberoChange:', err));
  }

  /* ──────────────────────────────────────────────────────────────
     CITAS
     ────────────────────────────────────────────────────────────── */
  async function getCitas(fecha, barberoId = null) {
    try {
      let q = tenantCol(COL.CITAS).where('fecha', '==', fecha);
      if (barberoId) q = q.where('barberoId', '==', barberoId);
      const snap = await q.get();
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.hora.localeCompare(b.hora));
    } catch(e) {
      console.warn('[FDB] getCitas falló, asumiendo sin citas:', e.code || e.message);
      return [];
    }
  }

  async function getCitasByCliente(email, uid) {
    const queries = [
      tenantCol(COL.CITAS).where('clienteEmail', '==', email).limit(50).get(),
    ];
    if (uid) {
      queries.push(tenantCol(COL.CITAS).where('clienteId', '==', uid).limit(50).get());
    }
    const snaps = await Promise.all(queries);
    const seen = new Set();
    const results = [];
    for (const snap of snaps) {
      for (const d of snap.docs) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          results.push({ id: d.id, ...d.data() });
        }
      }
    }
    return results;
  }

  function onCitasByClienteChange(email, uid, callback) {
    let snapEmailDocs = [];
    let snapUidDocs = [];

    function emit() {
      const seen = new Set();
      const results = [];
      for (const d of snapEmailDocs) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          results.push(d);
        }
      }
      for (const d of snapUidDocs) {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          results.push(d);
        }
      }
      callback(results);
    }

    let unsubEmail = null;
    if (email) {
      unsubEmail = tenantCol(COL.CITAS)
        .where('clienteEmail', '==', email)
        .limit(50)
        .onSnapshot(snap => {
          snapEmailDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          emit();
        }, err => console.error('[FDB] onCitasByClienteChange email:', err));
    }

    let unsubUid = null;
    if (uid) {
      unsubUid = tenantCol(COL.CITAS)
        .where('clienteId', '==', uid)
        .limit(50)
        .onSnapshot(snap => {
          snapUidDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          emit();
        }, err => console.error('[FDB] onCitasByClienteChange uid:', err));
    }

    return () => {
      if (unsubEmail) unsubEmail();
      if (unsubUid) unsubUid();
    };
  }


  async function clearGoogleReviewFlag(citaId) {
    await tenantCol(COL.CITAS).doc(citaId).update({ pendingGoogleReview: false });
  }

  async function getCitasMes(yyyyMM) {
    // yyyyMM = "2026-04"
    const snap = await tenantCol(COL.CITAS)
      .where('fecha', '>=', yyyyMM + '-01')
      .where('fecha', '<=', yyyyMM + '-31')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  // Legacy: el flujo publico multi-tenant usa BookingService.createBooking().
  // Se mantiene temporalmente para compatibilidad con vistas antiguas.
  async function addCita(cita) {
    const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const startMin = toMins(cita.hora);
    const dur = Number(cita.duracionServicio) || 30;

    // Sobrecupo público: un cliente reservó un cupo VIP (opt-in del barbero).
    // Regla invariante: NUNCA toma un slotLock propio — se apoya en el lock de
    // la cita "dueña" del slot si hay una, o simplemente vive sin candado si
    // es after-hours. Saltamos el pre-check de conflict porque el sobrecupo
    // se agenda a sabiendas de que puede haber otra cita en ese horario.
    const esSobrecupo = cita.sobrecupo === true;

    // Re-check overlap usando slotLocks (lectura pública, a diferencia de citas).
    // Se generan las horas a verificar: ventana de ±2h alrededor del slot pedido.
    if (cita.barberoId && !esSobrecupo) {
      const fromMin = m => `${Math.floor(m/60).toString().padStart(2,'0')}:${(m%60).toString().padStart(2,'0')}`;
      const checkHoras = [];
      for (let m = Math.max(0, startMin - 120); m < startMin + dur + 120; m += 30) checkHoras.push(fromMin(m));
      const locks = await getSlotLocksDia(cita.fecha, cita.barberoId, checkHoras);
      const conflict = locks.some(s => {
        const ss = toMins(s.hora);
        const se = ss + (Number(s.duracion) || 30);
        return startMin < se && (startMin + dur) > ss;
      });
      if (conflict) {
        const err = new Error('Esa hora ya fue tomada. Por favor elige otro horario.');
        err.code = 'slot-taken';
        throw err;
      }
    }

    // Slot lock: evita doble reserva exactamente simultánea para el mismo barbero+hora
    const safeHora = (cita.hora || '').replace(':', '');
    const safeBid  = String(cita.barberoId || 'any').replace(/[^a-zA-Z0-9_-]/g, '_');
    const lockId   = `${safeBid}_${cita.fecha}_${safeHora}`;
    const lockRef  = tenantCol('slotLocks').doc(lockId);
    const citaRef  = tenantCol(COL.CITAS).doc();
    const citaId   = citaRef.id;

    // Código corto formato XXX-XXX para que el cliente pueda gestionar su
    // cita en /chat sin login. Se usa también para incrustarlo en el email
    // de confirmación y el recordatorio. Si el caller ya lo pasó (flujo
    // público lo genera con window._generarCodigoCita), lo respetamos.
    function _genCodigoCitaLocal() {
      const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
      return code.slice(0, 3) + '-' + code.slice(3);
    }
    const codigoCitaFinal = (typeof cita.codigoCita === 'string' && cita.codigoCita.trim())
      ? cita.codigoCita.trim()
      : _genCodigoCitaLocal();

    const citaData = {
      fecha:            cita.fecha            || '',
      hora:             cita.hora             || '',
      clienteNombre:    cita.clienteNombre    || '',
      clienteTelefono:  cita.clienteTelefono  || '',
      clienteEmail:     cita.clienteEmail     || '',
      servicioNombre:   cita.servicioNombre   || '',
      duracionServicio: Number(cita.duracionServicio) || 30,
      precio:           Number(cita.precio)   || 0,
      barbero:          cita.barbero          || '',
      barberoId:        cita.barberoId        || null,
      estado:           'Confirmada',
      nota:             '',
      origen:           cita.origen || (esSobrecupo ? 'reserva_online_sobrecupo' : 'reserva_online'),
      codigoCita:       codigoCitaFinal,
      // Sobrecupo público: slotLockId:null siempre (regla invariante). Para
      // cita normal se referencia el lock que crearemos en la transacción.
      slotLockId:       esSobrecupo ? null : (cita.barberoId ? lockId : null),
      creadoEn:         firebase.firestore.FieldValue.serverTimestamp(),
    };
    // Desglose del cupo VIP: se persiste tal cual lo mandó el cliente
    // (validado en el front porque el motor de disponibilidad lo emitió).
    if (esSobrecupo) {
      citaData.sobrecupo        = true;
      citaData.horarioEspecial  = !!cita.horarioEspecial;
      if (cita.precioBase        != null) citaData.precioBase        = Number(cita.precioBase)       || 0;
      if (cita.recargoSobrecupo  != null) citaData.recargoSobrecupo  = Number(cita.recargoSobrecupo) || 0;
      if (cita.precioTotal       != null) citaData.precioTotal       = Number(cita.precioTotal)      || 0;
    }
    if (cita.sucursalId)     citaData.sucursalId     = cita.sucursalId;
    if (cita.sucursalNombre) citaData.sucursalNombre = cita.sucursalNombre;
    // Productos reservados en el cross-sell del paso final (entrega/pago presencial).
    if (Array.isArray(cita.productosReservados) && cita.productosReservados.length) {
      citaData.productosReservados = cita.productosReservados.map(p => ({
        nombre: String(p.nombre || ''),
        precio: Number(p.precio) || 0,
      }));
    }

    if (cita.barberoId && !esSobrecupo) {
      try {
        await db.runTransaction(async (tx) => {
          const lockSnap = await tx.get(lockRef);
          if (lockSnap.exists) {
            const err = new Error('Esa hora ya fue tomada. Por favor elige otro horario.');
            err.code = 'slot-taken';
            throw err;
          }
          tx.set(lockRef, {
            citaId,
            fecha:     cita.fecha,
            hora:      cita.hora,
            barberoId: cita.barberoId,
            duracion:  dur,
            creadoEn:  firebase.firestore.FieldValue.serverTimestamp(),
          });
          tx.set(citaRef, citaData);
        });
        return citaId;
      } catch (e) {
        if (e.code === 'slot-taken') throw e;
        // Transacción fallida (p.ej. regla de Firestore pendiente): fallback a
        // escritura directa. Antes dejábamos slotLockId=null lo que rompía la
        // liberación del slot al cancelar/reagendar. Ahora intentamos crear el
        // slotLock por separado (best-effort) y mantener el lockId en la cita.
        console.warn('[addCita] Transaction fallback:', e.code || e.message);
        try {
          await lockRef.set({
            citaId,
            fecha:     cita.fecha,
            hora:      cita.hora,
            barberoId: cita.barberoId,
            duracion:  dur,
            creadoEn:  firebase.firestore.FieldValue.serverTimestamp(),
          });
          // Lock OK → conservamos el ID en la cita para que la cancelación
          // (panel admin o /chat) lo encuentre y lo borre vía liberarSlot CF.
        } catch (lockErr) {
          console.warn('[addCita] slotLock standalone fallback failed:', lockErr.message);
          citaData.slotLockId = null;
        }
        await citaRef.set(citaData);
        return citaId;
      }
    }

    await citaRef.set(citaData);
    return citaId;
  }

  async function updateCitaEstado(id, estado) {
    const citaRef = tenantCol(COL.CITAS).doc(id);
    // Solo actualiza el estado. Si pasa a Cancelada, la Cloud Function
    // liberarSlot{Elegance,Tenant} libera el slotLock asociado. Esto evita
    // que el cliente (que no tiene permisos para borrar slotLocks) falle
    // al intentar hacerlo desde su dashboard.
    await citaRef.update({ estado });
  }

  async function updateCitaNota(id, nota) {
    await tenantCol(COL.CITAS).doc(id).update({ nota });
  }

  async function deleteCita(id) {
    const citaRef = tenantCol(COL.CITAS).doc(id);
    const snap = await citaRef.get();
    const lockId = snap.exists ? snap.data().slotLockId : null;
    const batch = db.batch();
    batch.delete(citaRef);
    if (lockId) batch.delete(tenantCol('slotLocks').doc(lockId));
    await batch.commit();
  }

  // onSnapshot para un día específico → autoactualiza el panel admin
  function onCitasDiaChange(fecha, callback) {
    return tenantCol(COL.CITAS)
      .where('fecha', '==', fecha)
      .onSnapshot(snap => {
        const citas = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.hora.localeCompare(b.hora));
        callback(citas);
      }, err => console.error('[FDB] onCitasDiaChange:', err));
  }

  /* ──────────────────────────────────────────────────────────────
     BLOQUEOS MANUALES
     ────────────────────────────────────────────────────────────── */
  async function addBloqueo({ fecha, todo_el_dia, hora_inicio, hora_fin, motivo, barberoId = null }) {
    const ref = await tenantCol(COL.BLOQUEOS).add({
      fecha,
      barberoId:    barberoId || null,
      todo_el_dia:  !!todo_el_dia,
      hora_inicio:  todo_el_dia ? null : (hora_inicio || null),
      hora_fin:     todo_el_dia ? null : (hora_fin    || null),
      motivo:       motivo || '',
      creadoEn:     firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async function getBloqueosDia(fecha, barberoId = null) {
    let todos;
    try {
      const q = tenantCol(COL.BLOQUEOS).where('fecha', '==', fecha);
      const snap = await _withTimeout(q.get(), 5000);
      todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      // SDK colgado/caído (WebView in-app): REST de toda la colección, filtrada.
      try {
        const all = await _restGetCollection(COL.BLOQUEOS);
        todos = all.filter(b => b.fecha === fecha);
      } catch(_) {
        console.warn('[FDB] getBloqueosDia falló, asumiendo sin bloqueos:', e.code || e.message);
        return [];
      }
    }
    if (!barberoId) return todos;
    // Retorna bloqueos globales (sin barberoId) + los del barbero específico
    return todos.filter(b => !b.barberoId || b.barberoId === barberoId);
  }

  async function getBloqueosMes(yyyyMM) {
    try {
      const snap = await _withTimeout(tenantCol(COL.BLOQUEOS)
        .where('fecha', '>=', yyyyMM + '-01')
        .where('fecha', '<=', yyyyMM + '-31')
        .get(), 5000);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Fallback REST: traer la colección y filtrar por mes en el cliente.
      try {
        const all = await _restGetCollection(COL.BLOQUEOS);
        return all.filter(b => typeof b.fecha === 'string' && b.fecha.startsWith(yyyyMM + '-'));
      } catch (_) { return []; }
    }
  }

  async function deleteBloqueo(id) {
    await tenantCol(COL.BLOQUEOS).doc(id).delete();
  }

  function onBloqueosDiaChange(fecha, callback) {
    return tenantCol(COL.BLOQUEOS)
      .where('fecha', '==', fecha)
      .onSnapshot(
        snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err  => console.error('[FDB] onBloqueosDiaChange:', err)
      );
  }

  /* ──────────────────────────────────────────────────────────────
     SLOT LOCKS — fuente pública de ocupación (lectura sin auth)
     Reemplaza getCitas() en el flujo público de reservas.
     ────────────────────────────────────────────────────────────── */

  // Construye el lockId en el mismo formato que addCita
  function _buildLockId(barberoId, fecha, hora) {
    const safeBid  = String(barberoId || 'any').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeHora = hora.replace(':', '');
    return `${safeBid}_${fecha}_${safeHora}`;
  }

  // Devuelve slotLocks para la fecha+barbero dados.
  // Combina dos fuentes:
  //   1. Query por campo `fecha` (slotLocks NUEVOS que tienen los metadatos completos)
  //   2. GET directo por ID construido (slotLocks ANTIGUOS sin campo `fecha`)
  // `allHoras` = lista de todas las horas posibles del día (para la búsqueda directa).
  async function getSlotLocksDia(fecha, barberoId = null, allHoras = []) {
    const result = [];
    const foundHoras = new Set();

    // ① New-format: query by fecha field
    try {
      const snap = await tenantCol('slotLocks').where('fecha', '==', fecha).get();
      snap.docs.forEach(d => {
        const s = d.data();
        if (!s.hora) return; // ignorar docs sin metadatos
        if (barberoId && s.barberoId !== barberoId) return;
        result.push(s);
        foundHoras.add(s.hora);
      });
    } catch(_) {}

    // ② Old-format fallback: GET directo por IDs construidos
    if (allHoras.length > 0) {
      const toCheck = allHoras.filter(h => !foundHoras.has(h));
      if (toCheck.length > 0 && barberoId) {
        // Caso: barbero específico — un GET por slot
        try {
          const gets = toCheck.map(h =>
            tenantCol('slotLocks').doc(_buildLockId(barberoId, fecha, h)).get()
          );
          const snaps = await Promise.all(gets);
          snaps.forEach((snap, i) => {
            if (snap.exists && !snap.data().hora) {
              result.push({ hora: toCheck[i], barberoId, duracion: snap.data().duracion || 30 });
            }
          });
        } catch(_) {}
      } else if (toCheck.length > 0 && !barberoId) {
        // Sin barberoId: no sabemos qué IDs buscar → omitir el fallback
        // (este caso solo ocurre en getHorasDisponiblesMulti que lo maneja por barbero)
      }
    }

    return result;
  }

  function onSlotLocksChange(fecha, callback) {
    return tenantCol('slotLocks')
      .where('fecha', '==', fecha)
      .onSnapshot(
        snap => callback(snap.docs.map(d => d.data()).filter(s => s.hora)),
        err  => console.warn('[FDB] onSlotLocksChange:', err.code || err.message)
      );
  }

  /* ──────────────────────────────────────────────────────────────
     PREMIOS DEL CLUB
     ────────────────────────────────────────────────────────────── */
  async function getPremios() {
    const snap = await tenantCol(COL.PREMIOS).orderBy('costoSellos').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function addPremio(nombre, costoSellos) {
    const ref = await tenantCol(COL.PREMIOS).add({
      nombre,
      costoSellos: Number(costoSellos),
      creadoEn:    firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async function updatePremio(id, data) {
    await tenantCol(COL.PREMIOS).doc(id).update({
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async function deletePremio(id) {
    await tenantCol(COL.PREMIOS).doc(id).delete();
  }

  function onPremiosChange(callback) {
    return tenantCol(COL.PREMIOS)
      .orderBy('costoSellos')
      .onSnapshot(
        snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err  => console.error('[FDB] onPremiosChange:', err)
      );
  }

  /* ──────────────────────────────────────────────────────────────
     DISPONIBILIDAD (reemplaza DB.getAvailableHours — ahora async)
     Filtra citas ocupadas, colación y bloqueos manuales.
     ────────────────────────────────────────────────────────────── */
  // Legacy: el flujo publico multi-tenant usa BookingService.getAvailableSlots().
  // Se mantiene temporalmente para compatibilidad con paneles existentes.
  // vipOpts (opcional): { allowVipOverbook: bool, afterHoursHasta: 'HH:MM', vipRecargo: number }
  //   allowVipOverbook: convierte slots ocupados en cupos VIP y estira el
  //     rango hasta afterHoursHasta. Solo se activa cuando el barbero tiene
  //     `permitirSobrecupoPublico: true`; sin él, el comportamiento es el
  //     histórico (occupied se muestra deshabilitado, sin after-hours).
  async function getHorasDisponibles(fecha, duracionServicio, configOverride = null, barberoId = null, vipOpts = null) {
    let cfg;
    try { cfg = configOverride || await getConfig(); } catch(e) { cfg = _defaultConfig(); }

    // Si configOverride ya trae el horario del barbero (tiene campo .horario), usarlo.
    // Si no, cargar la config del barbero por separado cuando hay barberoId.
    let barbCfg = null;
    if (barberoId) {
      if (cfg.horario) {
        barbCfg = cfg; // configOverride ya es la config del barbero
      } else {
        try { barbCfg = await getConfigBarbero(barberoId); } catch(e) {}
      }
    }

    const toMins  = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fromMin = m => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

    // Horario específico del día — prioriza horario del barbero
    const dw = new Date(fecha + 'T12:00:00').getDay();
    let ini, fin, interval;

    if (barbCfg && barbCfg.horario && barbCfg.horario[String(dw)]) {
      const dayH = barbCfg.horario[String(dw)];
      if (!dayH.activo) return []; // este barbero no trabaja ese día
      ini = toMins(dayH.inicio || barbCfg.horarioInicio || cfg.horarioInicio || '09:00');
      fin = toMins(dayH.fin    || barbCfg.horarioFin    || cfg.horarioFin    || '20:00');
    } else if (barbCfg) {
      const dc = (barbCfg.diasConfig || {})[dw] || {};
      ini = toMins(dc.inicio || barbCfg.horarioInicio || cfg.horarioInicio || '09:00');
      fin = toMins(dc.fin    || barbCfg.horarioFin    || cfg.horarioFin    || '20:00');
    } else {
      // Sin config de barbero: verificar si el local está abierto ese día
      const dl = cfg.diasLaborales;
      if (Array.isArray(dl) && dl.length > 0 && !dl.includes(dw)) return [];
      const dc = (cfg.diasConfig || {})[dw] || {};
      ini = toMins(dc.inicio || cfg.horarioInicio || '09:00');
      fin = toMins(dc.fin    || cfg.horarioFin    || '20:00');
    }
    // Sanidad: si el horario del barbero está corrupto (fin <= ini, NaN, valores
    // fuera de [0, 24*60]), forzamos el fallback default 09:00–20:00. Sin este
    // guard, un fin=720 (12:00) por error humano marcaría todo el resto del día
    // como after-hours y detonaría VIP en slots libres normales.
    const ORIG_INI = ini, ORIG_FIN = fin;
    if (!Number.isFinite(ini) || !Number.isFinite(fin) || fin <= ini || ini < 0 || fin > 24*60) {
      try { console.warn('[FDB] horario barbero corrupto — usando 09:00–20:00 default', { barberoId, dw, ini: ORIG_INI, fin: ORIG_FIN }); } catch(_) {}
      ini = 9 * 60;
      fin = 20 * 60;
    }
    interval = (barbCfg?.intervaloMinutos || cfg.intervaloMinutos || 30);

    // Descansos por día configurados en el panel (Equipo → horario[dia].descansos).
    // Antes solo se respetaba cfg.colacion (global), por eso los descansos del
    // barbero no se aplicaban en la reserva pública.
    let descansosDia = [];
    if (barbCfg && barbCfg.horario && barbCfg.horario[String(dw)]) {
      descansosDia = barbCfg.horario[String(dw)].descansos || [];
    } else if (barbCfg) {
      descansosDia = ((barbCfg.diasConfig || {})[dw] || {}).descansos || [];
    } else {
      descansosDia = ((cfg.diasConfig || {})[dw] || {}).descansos || [];
    }
    const descansoRanges = (Array.isArray(descansosDia) ? descansosDia : [])
      .filter(d => d && d.inicio && d.fin)
      .map(d => ({ start: toMins(d.inicio), end: toMins(d.fin) }));

    // Todas las horas posibles del día (para fallback old-format en getSlotLocksDia)
    const allHoras = [];
    for (let t = ini; t < fin; t += interval) allHoras.push(fromMin(t));

    // Usar slotLocks (lectura pública) en lugar de citas (requiere auth)
    const [slotLocks, bloqueos] = await Promise.all([
      getSlotLocksDia(fecha, barberoId, allHoras),
      getBloqueosDia(fecha, barberoId),
    ]);

    // Día completamente bloqueado → sin slots
    if (bloqueos.some(b => b.todo_el_dia)) return [];

    const ocupados = slotLocks.map(s => ({
      start: toMins(s.hora),
      end:   toMins(s.hora) + (Number(s.duracion) || 30),
    }));

    // Rangos de bloqueo manual parciales
    const rangosBloq = bloqueos
      .filter(b => !b.todo_el_dia && b.hora_inicio && b.hora_fin)
      .map(b => ({ start: toMins(b.hora_inicio), end: toMins(b.hora_fin) }));

    // Si el barbero tiene descansos por día configurados, esos mandan: se ignora
    // la colación global del local (que de otro modo aplicaría un break oculto).
    const col   = descansoRanges.length ? null : cfg.colacion;
    const slots = [];
    let cur = ini;

    // Sobrecupos VIP: si el barbero permite reservas VIP en la agenda pública,
    // extendemos el rango hasta `afterHoursHasta` para ofrecer cupos fuera del
    // turno normal, y los slots que caigan ocupados se marcan como VIP en vez
    // de deshabilitados.
    const allowVip = !!(vipOpts && vipOpts.allowVipOverbook);
    const vipRecargo = allowVip ? (Number(vipOpts.vipRecargo) || 0) : 0;
    let finEff = fin;
    if (allowVip && vipOpts.afterHoursHasta) {
      const afterMins = toMins(vipOpts.afterHoursHasta);
      if (Number.isFinite(afterMins) && afterMins > fin) finEff = afterMins;
    }

    const durNum = parseInt(duracionServicio);

    while (cur + durNum <= finEff) {
      // Restricción temporal estricta: after-hours SOLO si el inicio del slot
      // es >= al cierre normal (fin). En turno normal (cur < fin) este flag
      // NUNCA puede ser true, aunque el barbero permita VIP.
      const esHorarioAfterHours = cur >= fin;
      const enTurnoNormal = cur >= ini && cur < fin;
      // Saltar colación: excluye slots que empiezan O que se extienden dentro del bloque
      // (los after-hours quedan fuera del rango de colación por definición).
      if (col && !esHorarioAfterHours) {
        const colS = toMins(col.inicio), colE = toMins(col.fin);
        if (cur < colE && (cur + durNum) > colS) { cur += interval; continue; }
      }
      // Saltar descansos del día (panel): omite slots que solapan algún descanso
      if (!esHorarioAfterHours && descansoRanges.some(r => cur < r.end && (cur + durNum) > r.start)) { cur += interval; continue; }
      // Saltar bloqueo manual (aplica tanto al rango normal como al after-hours):
      // si el dueño bloqueó ese horario expresamente, no ofrecemos ni siquiera VIP.
      const bloqueado = rangosBloq.some(r =>
        cur < r.end && (cur + durNum) > r.start
      );
      if (bloqueado) { cur += interval; continue; }

      const slotOcupado = ocupados.some(o =>
        cur < o.end && (cur + durNum) > o.start
      );

      // ── PATH 1: libre + en turno normal → SLOT NORMAL, sin excepciones ──
      // Este caso tiene PRIORIDAD ABSOLUTA. No hay ninguna combinación de
      // flags que pueda convertirlo en VIP. Emitimos y avanzamos.
      if (enTurnoNormal && !slotOcupado) {
        slots.push({ time: fromMin(cur), occupied: false });
        cur += interval;
        continue;
      }

      // ── PATH 2: gate VIP estricto ──────────────────────────────────────
      // Solo se llega aquí si NO estamos en la ruta 1. La condición VIP
      // exige (a) allowVip true y (b) al menos una razón concreta:
      // slot ocupado (sobrecupo) o slot fuera del cierre (after-hours).
      const esVipSlot = allowVip && (esHorarioAfterHours || slotOcupado);

      if (esVipSlot) {
        // Diagnóstico: si esto se dispara para un slot en turno normal y libre
        // (no debería suceder), lo advertimos porque implicaría datos raros
        // que el gate anterior no atrapó.
        if (enTurnoNormal && !slotOcupado) {
          try { console.warn('[FDB] VIP falso positivo en turno normal libre', { time: fromMin(cur), ini, fin, allowVip }); } catch(_) {}
        }
        slots.push({
          time: fromMin(cur),
          occupied: false,
          esSobrecupo: true,
          recargo: vipRecargo,
          horarioEspecial: esHorarioAfterHours,
        });
      } else {
        // Slot ocupado sin VIP, o after-hours sin VIP: se devuelve tal cual.
        slots.push({ time: fromMin(cur), occupied: slotOcupado });
      }
      cur += interval;
    }
    return slots;
  }

  // Calcula slots disponibles considerando TODOS los barberos.
  // Un slot es disponible si al menos un barbero está libre en ese horario.
  // Retorna los slots con { time, occupied, availableBarberoIds[] }.
  // vipOpts (opcional): igual que en getHorasDisponibles. El recargo debe ser
  // uniforme para todos los barberos del set (viene del servicio elegido).
  async function getHorasDisponiblesMulti(fecha, duracionServicio, configOverride = null, barberos = [], vipOpts = null) {
    let cfg;
    try { cfg = configOverride || await getConfig(); } catch(e) { cfg = _defaultConfig(); }

    // Cargar configs individuales de cada barbero en paralelo
    const barberoConfigs = new Map();
    await Promise.all(barberos.map(async b => {
      try { barberoConfigs.set(b.id, await getConfigBarbero(b.id)); } catch(e) { barberoConfigs.set(b.id, null); }
    }));

    const [todasSlots, todosBloqueos] = await Promise.all([
      getSlotLocksDia(fecha, null),  // new-format, todos los barberos
      getBloqueosDia(fecha, null),
    ]);

    if (todosBloqueos.some(b => b.todo_el_dia && !b.barberoId)) return [];

    const toMins  = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fromMin = m => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

    const dw = new Date(fecha + 'T12:00:00').getDay();

    // Rango global: unión de todos los horarios de barberos activos ese día
    let globalIni = Infinity, globalFin = 0;
    for (const barbero of barberos) {
      const bc = barberoConfigs.get(barbero.id);
      let bIni, bFin;
      if (bc && bc.horario && bc.horario[String(dw)]) {
        const dayH = bc.horario[String(dw)];
        if (!dayH.activo) continue;
        bIni = toMins(dayH.inicio || bc.horarioInicio || cfg.horarioInicio || '09:00');
        bFin = toMins(dayH.fin    || bc.horarioFin    || cfg.horarioFin    || '20:00');
      } else if (bc) {
        const dc = (bc.diasConfig || {})[dw] || {};
        bIni = toMins(dc.inicio || bc.horarioInicio || cfg.horarioInicio || '09:00');
        bFin = toMins(dc.fin    || bc.horarioFin    || cfg.horarioFin    || '20:00');
      } else {
        const dc = (cfg.diasConfig || {})[dw] || {};
        bIni = toMins(dc.inicio || cfg.horarioInicio || '09:00');
        bFin = toMins(dc.fin    || cfg.horarioFin    || '20:00');
      }
      if (bIni < globalIni) globalIni = bIni;
      if (bFin > globalFin) globalFin = bFin;
    }
    // Fallback si no hay barberos con horario configurado
    if (globalIni === Infinity) {
      const dc = (cfg.diasConfig || {})[dw] || {};
      globalIni = toMins(dc.inicio || cfg.horarioInicio || '09:00');
      globalFin = toMins(dc.fin    || cfg.horarioFin    || '20:00');
    }

    const interval = cfg.intervaloMinutos || 30;
    const dur = parseInt(duracionServicio);
    const col = cfg.colacion;
    // Si algún barbero tiene descansos por día, esos mandan y se ignora la
    // colación global del local (que de otro modo aplicaría un break oculto).
    const anyDescansos = barberos.some(b => {
      const bc = barberoConfigs.get(b.id);
      let dd;
      if (bc && bc.horario && bc.horario[String(dw)]) dd = bc.horario[String(dw)].descansos;
      else if (bc) dd = ((bc.diasConfig || {})[dw] || {}).descansos;
      return Array.isArray(dd) && dd.length > 0;
    });

    // Todas las horas posibles del día (rango global)
    const allHoras = [];
    for (let t = globalIni; t < globalFin; t += interval) allHoras.push(fromMin(t));

    // Fallback old-format: GET directo por barbero en paralelo
    const oldSlotsByBarbero = new Map();
    await Promise.all(barberos.map(async barbero => {
      const newHoras = new Set(todasSlots.filter(s => s.barberoId === barbero.id).map(s => s.hora));
      const toCheck = allHoras.filter(h => !newHoras.has(h));
      if (!toCheck.length) { oldSlotsByBarbero.set(barbero.id, []); return; }
      try {
        const snaps = await Promise.all(
          toCheck.map(h => tenantCol('slotLocks').doc(_buildLockId(barbero.id, fecha, h)).get())
        );
        const old = [];
        snaps.forEach((snap, i) => {
          if (snap.exists && !snap.data().hora) {
            old.push({ hora: toCheck[i], barberoId: barbero.id, duracion: snap.data().duracion || 30 });
          }
        });
        oldSlotsByBarbero.set(barbero.id, old);
      } catch(_) { oldSlotsByBarbero.set(barbero.id, []); }
    }));

    const globalBloqRanges = todosBloqueos
      .filter(b => !b.todo_el_dia && !b.barberoId && b.hora_inicio && b.hora_fin)
      .map(b => ({ start: toMins(b.hora_inicio), end: toMins(b.hora_fin) }));

    // ── Sobrecupos VIP ──
    // Si algún barbero del set permite VIP, estiramos el fin del rango hasta
    // el mayor `afterHoursHasta` declarado, y los slots ocupados/after-hours
    // se ofrecen como cupos VIP disponibles (recargo aplicado por el cliente).
    const allowVip = !!(vipOpts && vipOpts.allowVipOverbook);
    const vipRecargo = allowVip ? (Number(vipOpts.vipRecargo) || 0) : 0;
    const vipBarberoIds = new Set();
    let globalFinEff = globalFin;
    if (allowVip) {
      for (const barbero of barberos) {
        if (!barbero || !barbero.permitirSobrecupoPublico) continue;
        vipBarberoIds.add(barbero.id);
        const ah = barbero.afterHoursHasta ? toMins(barbero.afterHoursHasta) : null;
        if (Number.isFinite(ah) && ah > globalFinEff) globalFinEff = ah;
      }
    }
    const anyVipEnabled = allowVip && vipBarberoIds.size > 0;

    const result = [];

    for (let cur = globalIni; cur + dur <= globalFinEff; cur += interval) {
      // `esHorarioAfterHours` a nivel global solo es true cuando el slot cae
      // fuera del cierre normal de TODOS los barberos (globalFin = max de los
      // cierres). En la mañana o durante turno normal esto SIEMPRE es false.
      const esHorarioAfterHours = cur >= globalFin;
      if (col && !anyDescansos && !esHorarioAfterHours) {
        const colS = toMins(col.inicio), colE = toMins(col.fin);
        if (cur < colE && (cur + dur) > colS) continue;
      }
      const globalBlocked = globalBloqRanges.some(r => cur < r.end && (cur + dur) > r.start);
      if (globalBlocked) continue;

      const availableBarberoIds = [];
      const vipAvailableIds = [];
      // Motivo del VIP por-barbero: si al menos uno aporta por sobrecupo (slot
      // ocupado dentro del turno), la etiqueta pública es "Sobrecupo VIP"; solo
      // si TODOS los aportes VIP son por after-hours real se marca como
      // "Cupo especial fuera de turno". Nunca por defecto en la mañana.
      let vipPorSobrecupo = false;
      let vipPorAfterHours = false;

      for (const barbero of barberos) {
        if (todosBloqueos.some(b => b.todo_el_dia && b.barberoId === barbero.id)) continue;

        // Verificar que el slot esté dentro del horario de este barbero
        const bc = barberoConfigs.get(barbero.id);
        let bIni, bFin;
        if (bc && bc.horario && bc.horario[String(dw)]) {
          const dayH = bc.horario[String(dw)];
          if (!dayH.activo) continue;
          bIni = toMins(dayH.inicio || bc.horarioInicio || cfg.horarioInicio || '09:00');
          bFin = toMins(dayH.fin    || bc.horarioFin    || cfg.horarioFin    || '20:00');
        } else if (bc) {
          const dc = (bc.diasConfig || {})[dw] || {};
          bIni = toMins(dc.inicio || bc.horarioInicio || cfg.horarioInicio || '09:00');
          bFin = toMins(dc.fin    || bc.horarioFin    || cfg.horarioFin    || '20:00');
        } else {
          const dc = (cfg.diasConfig || {})[dw] || {};
          bIni = toMins(dc.inicio || cfg.horarioInicio || '09:00');
          bFin = toMins(dc.fin    || cfg.horarioFin    || '20:00');
        }
        // Sanidad por-barbero: si el horario está corrupto (fin <= inicio, NaN,
        // fuera de rango), saltamos este barbero por completo. Nunca lo
        // usamos como fuente de after-hours ni de sobrecupo — evita que un
        // dato malo lo convierta en "always after-hours".
        if (!Number.isFinite(bIni) || !Number.isFinite(bFin) || bFin <= bIni || bIni < 0 || bFin > 24*60) {
          try { console.warn('[FDB] barbero con horario corrupto, ignorado', { barberoId: barbero.id, dw, bIni, bFin }); } catch(_) {}
          continue;
        }

        const esVipBarbero = vipBarberoIds.has(barbero.id) && !!barbero.permitirSobrecupoPublico;
        const afterMinsB = esVipBarbero && barbero.afterHoursHasta ? toMins(barbero.afterHoursHasta) : null;
        const bFinExt = Number.isFinite(afterMinsB) && afterMinsB > bFin ? afterMinsB : bFin;
        // Fuera del turno normal — se acepta si el barbero permite VIP y cae
        // dentro de su ventana after-hours.
        if (cur < bIni || cur + dur > bFinExt) continue;
        const fueraDeTurno = cur >= bFin;
        if (fueraDeTurno && !esVipBarbero) continue;

        // Descansos del día de este barbero (panel → horario[dia].descansos)
        let barDescansos = [];
        if (bc && bc.horario && bc.horario[String(dw)]) barDescansos = bc.horario[String(dw)].descansos || [];
        else if (bc) barDescansos = ((bc.diasConfig || {})[dw] || {}).descansos || [];
        const barDescRanges = (Array.isArray(barDescansos) ? barDescansos : [])
          .filter(d => d && d.inicio && d.fin)
          .map(d => ({ start: toMins(d.inicio), end: toMins(d.fin) }));
        if (!fueraDeTurno && barDescRanges.some(r => cur < r.end && (cur + dur) > r.start)) continue;

        const barBloqs = todosBloqueos
          .filter(b => !b.todo_el_dia && b.barberoId === barbero.id && b.hora_inicio && b.hora_fin)
          .map(b => ({ start: toMins(b.hora_inicio), end: toMins(b.hora_fin) }));

        if (barBloqs.some(r => cur < r.end && (cur + dur) > r.start)) continue;

        const barSlots = [
          ...todasSlots.filter(s => s.barberoId === barbero.id),
          ...(oldSlotsByBarbero.get(barbero.id) || []),
        ].map(s => ({ start: toMins(s.hora), end: toMins(s.hora) + (Number(s.duracion) || 30) }));

        const solapa = barSlots.some(o => cur < o.end && (cur + dur) > o.start);
        if (solapa) {
          // Barbero ocupado en ese slot. Solo cuenta como VIP si permite sobrecupos públicos.
          if (esVipBarbero) {
            vipAvailableIds.push(barbero.id);
            // Distingue el motivo: si el choque ocurre dentro del turno normal
            // es un sobrecupo; si ocurre fuera del turno, es after-hours.
            if (fueraDeTurno) vipPorAfterHours = true;
            else vipPorSobrecupo = true;
          }
          continue;
        }

        if (fueraDeTurno) {
          // Libre pero fuera de turno → VIP after-hours para este barbero.
          // (esVipBarbero ya está garantizado por el `continue` anterior).
          vipAvailableIds.push(barbero.id);
          vipPorAfterHours = true;
        } else {
          // Libre y en turno normal → slot NORMAL. Nunca se marca VIP aquí,
          // sin importar el flag permitirSobrecupoPublico del barbero.
          availableBarberoIds.push(barbero.id);
        }
      }

      // ── PATH 1: al menos un barbero libre en turno normal → SLOT NORMAL ──
      // Ruta con PRIORIDAD ABSOLUTA. Si hay siquiera un barbero disponible en
      // su turno normal, el slot se emite como normal, sin badge VIP y sin
      // recargo, sin importar cuántos otros barberos VIP-elegibles existan.
      if (availableBarberoIds.length > 0) {
        result.push({ time: fromMin(cur), occupied: false, availableBarberoIds });
        continue;
      }

      // ── PATH 2: gate VIP estricto ──────────────────────────────────────
      // Solo se llega aquí si NADIE quedó libre en turno normal. Requiere
      // que (a) el VIP esté globalmente habilitado, (b) haya al menos un
      // barbero VIP-elegible con disponibilidad por sobrecupo o after-hours,
      // y (c) exista una razón concreta registrada (choque o fuera de turno).
      const emitirVip = anyVipEnabled
        && vipAvailableIds.length > 0
        && (vipPorSobrecupo || vipPorAfterHours);

      if (emitirVip) {
        result.push({
          time: fromMin(cur),
          occupied: false,
          esSobrecupo: true,
          recargo: vipRecargo,
          // horarioEspecial=true solo si NINGÚN barbero aportó por sobrecupo
          // (i.e. todos los aportes VIP fueron after-hours). Si hubo cualquier
          // choque dentro del turno, la etiqueta correcta es "Sobrecupo VIP".
          horarioEspecial: vipPorAfterHours && !vipPorSobrecupo,
          availableBarberoIds: vipAvailableIds,
        });
      } else if (!esHorarioAfterHours) {
        // Sin VIP y sin disponibles: se conserva como ocupado (histórico).
        result.push({ time: fromMin(cur), occupied: true, availableBarberoIds: [] });
      }
      // After-hours sin VIP no se emite → mantiene la agenda pública normal
      // exactamente igual que antes cuando no hay opt-in.
    }

    return result;
  }

  /* ──────────────────────────────────────────────────────────────
     USUARIOS / CLIENTES
     Toda operación sobre 'users' pasa por tenantCol para
     mantener clientes separados por local.
     ────────────────────────────────────────────────────────────── */
  function usersCol()    { return tenantCol(COL.USERS);    }
  function barberosCol() { return tenantCol(COL.BARBEROS); }
  function citasCol()    { return tenantCol(COL.CITAS);    }

  async function getClientes() {
    const snap = await tenantCol(COL.USERS).get();
    return snap.docs.map(d => ({ uid: d.id, stamps: 0, ...d.data() }));
  }

  async function getClienteByEmail(email) {
    const snap = await tenantCol(COL.USERS).where('email', '==', email.toLowerCase()).limit(1).get();
    return snap.empty ? null : { uid: snap.docs[0].id, ...snap.docs[0].data() };
  }

  async function getClienteByNombre(nombre) {
    const snap = await tenantCol(COL.USERS).where('nombre', '==', nombre).limit(1).get();
    return snap.empty ? null : { uid: snap.docs[0].id, ...snap.docs[0].data() };
  }

  function onClienteChange(uid, callback) {
    return tenantCol(COL.USERS).doc(uid).onSnapshot(snap => {
      callback(snap.exists ? { uid: snap.id, ...snap.data() } : null);
    }, err => console.error('[FDB] onClienteChange:', err));
  }

  async function ensureCliente(uid, data) {
    const ref  = tenantCol(COL.USERS).doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set(data);
    } else if (data.photoURL && snap.data().photoURL !== data.photoURL) {
      await ref.update({ photoURL: data.photoURL });
    }
  }

  async function incrementarSellos(uid, nota = 'Sello sumado') {
    await tenantCol(COL.USERS).doc(uid).update({
      stamps:      firebase.firestore.FieldValue.increment(1),
      ultimoSello: new Date().toISOString(),
      historialSellos: firebase.firestore.FieldValue.arrayUnion({
        fecha: new Date().toISOString(), tipo: 'suma', cantidad: 1, nota,
      }),
    });
  }

  async function modificarSellos(uid, delta, nota = '') {
    await tenantCol(COL.USERS).doc(uid).update({
      stamps: firebase.firestore.FieldValue.increment(delta),
      historialSellos: firebase.firestore.FieldValue.arrayUnion({
        fecha: new Date().toISOString(),
        tipo:  delta > 0 ? 'suma' : 'resta',
        cantidad: delta,
        nota,
      }),
    });
  }

  async function canjearSellos(uid, costo, premio) {
    const ref  = tenantCol(COL.USERS).doc(uid);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Cliente no encontrado.');
    const actual = snap.data().stamps || 0;
    if (actual < costo) throw new Error(`Sellos insuficientes (tiene ${actual}, necesita ${costo}).`);
    await ref.update({
      stamps: firebase.firestore.FieldValue.increment(-costo),
      historialSellos: firebase.firestore.FieldValue.arrayUnion({
        fecha: new Date().toISOString(), tipo: 'canje', cantidad: -costo, nota: premio,
      }),
    });
    return (await ref.get()).data();
  }

  /* ──────────────────────────────────────────────────────────────
     BARBEROS / PERMISOS
     ────────────────────────────────────────────────────────────── */
  async function getBarberos() {
    // Adquisición de datos: SDK con timeout, con fallback a REST si se cuelga
    // (caso del WebView in-app de Instagram/Facebook donde el streaming falla).
    let rawDocs;
    try {
      const snap = await _withTimeout(tenantCol(COL.BARBEROS).get(), 5000);
      rawDocs = snap.docs.map(doc => ({ id: doc.id, data: doc.data() }));
    } catch (e) {
      try {
        const arr = await _restGetCollection(COL.BARBEROS);
        rawDocs = arr.map(o => { const { id, ...data } = o; return { id, data }; });
      } catch (e2) {
        console.error('[FDB] Error obteniendo barberos:', e2);
        return [];
      }
    }

    const todos = rawDocs
      .map(({ id, data: d }) => {
        const nombre = d.nombre || d.displayName || (d.email ? d.email.split('@')[0] : null) || 'Barbero';
        return { id, nombre, foto: d.foto || d.photoURL || null, disponible: d.disponible !== false, ...d };
      })
      // Filtro publico: excluye barberos apagados desde el panel. El toggle
      // "Desactivar" de Equipo.jsx escribe `disponible: false`; mantenemos
      // tambien `activo !== false` por compat con seeds legacy que usaron ese
      // nombre. Ambos "default true" — solo bloquea cuando el campo es
      // literalmente false, docs sin el campo pasan.
      .filter(b => b.disponible !== false && b.activo !== false && !b._mainDocId && (b.rol !== 'admin' || (window.CURRENT_TENANT_ID || 'elegance') === 'delnero'))
      .sort((a, b) => {
        // Priorizar docs cuyo id NO coincide con uid — son los docs "originales"
        // que ya tienen citas asignadas. Si el seed creó uno nuevo (uid===id) para
        // el mismo barbero, ese va al final y será descartado al deduplicar.
        const aOrig = (!a.uid || a.uid !== a.id) ? 0 : 1;
        const bOrig = (!b.uid || b.uid !== b.id) ? 0 : 1;
        return aOrig - bOrig || (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre);
      });

    // Deduplicar por email: conserva el primer doc (original) por cada email
    const seenEmails = new Set();
    const deduped = todos.filter(b => {
      const key = b.email?.toLowerCase().trim();
      if (!key) return true;
      if (seenEmails.has(key)) return false;
      seenEmails.add(key);
      return true;
    });

    // Re-ordenar por `orden` limpio (el sort anterior era solo para deduplicar)
    return deduped.sort((a, b) => (a.orden ?? 9999) - (b.orden ?? 9999) || a.nombre.localeCompare(b.nombre));
  }

  async function esBarbero(email, uid) {
    const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];
    try {
      // 0. Bootstrap: Permitir siempre a los admins originales para que puedan inicializar la BD
      if (email && BOOTSTRAP_ADMINS.includes(email.toLowerCase())) return true;

      // 1. Verificar por UID (más seguro y directo)
      if (uid) {
        const doc = await tenantCol(COL.BARBEROS).doc(uid).get();
        if (doc.exists && doc.data().activo !== false) return true;
      }
      if (email) {
        const snap = await tenantCol(COL.BARBEROS).get();
        const targetEmail = email.toLowerCase();
        const doc = snap.docs.find(d => {
          const data = d.data();
          if (data.activo === false) return false;
          const docEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
          return docEmail === targetEmail;
        });
        if (doc) return true;

        console.warn('[FDB] esBarbero: correo no encontrado o barbero inactivo:', email);
      }
      return false;
    } catch (e) {
      console.error('[FDB] Error verificando barbero:', e);
      return false;
    }
  }

  async function getBarberoId(email, uid) {
    try {
      if (uid) {
        const doc = await tenantCol(COL.BARBEROS).doc(uid).get();
        if (doc.exists && doc.data().activo !== false) {
          // Si es doc de enlace, devolver el ID del doc principal
          return doc.data()._mainDocId || uid;
        }
      }
      if (email) {
        const snap = await tenantCol(COL.BARBEROS).get();
        const targetEmail = email.toLowerCase();
        const doc = snap.docs.find(d => {
          const data = d.data();
          if (data.activo === false || data._mainDocId) return false;
          const docEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
          return docEmail === targetEmail;
        });
        if (doc) return doc.id;
      }
      return null;
    } catch (e) {
      console.error('[FDB] Error obteniendo ID de barbero:', e);
      return null;
    }
  }

  async function esAdminJefe(email, uid) {
    const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];
    try {
      if (email && BOOTSTRAP_ADMINS.includes(email.toLowerCase())) return true;

      if (uid) {
        const doc = await tenantCol(COL.BARBEROS).doc(uid).get();
        if (doc.exists && doc.data().activo !== false) {
          const rol = doc.data().rol;
          return rol === 'admin' || rol === 'jefe';
        }
      }
      if (email) {
        const snap = await tenantCol(COL.BARBEROS).get();
        const targetEmail = email.toLowerCase();
        const doc = snap.docs.find(d => {
          const data = d.data();
          if (data.activo === false) return false;
          const docEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
          return docEmail === targetEmail;
        });
        if (doc) {
          const rol = doc.data().rol;
          return rol === 'admin' || rol === 'jefe';
        }
      }
      return false;
    } catch (e) {
      console.error('[FDB] Error verificando admin/jefe:', e);
      return false;
    }
  }

  async function getRol(email, uid) {
    const BOOTSTRAP_ADMINS = ['ignaciiio.mate@gmail.com', 'barrazanicolasfabian@gmail.com'];
    if (email && BOOTSTRAP_ADMINS.includes(email.toLowerCase())) return 'admin';
    try {
      if (uid) {
        const doc = await tenantCol(COL.BARBEROS).doc(uid).get();
        if (doc.exists) return doc.data().rol || 'barbero';
      }
      if (email) {
        const snap = await tenantCol(COL.BARBEROS).get();
        const targetEmail = email.toLowerCase();
        const doc = snap.docs.find(d => {
          const data = d.data();
          const docEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
          return docEmail === targetEmail;
        });
        if (doc) return doc.data().rol || 'barbero';
      }
      return 'invitado';
    } catch (e) {
      return 'error';
    }
  }

  /* ──────────────────────────────────────────────────────────────
     ENLACE UID: garantiza que barberos/{uid} exista para que las
     reglas de Firestore (que verifican por UID) reconozcan al
     barbero. Se crea un doc de enlace mínimo con _mainDocId
     apuntando al doc principal del barbero.
     ────────────────────────────────────────────────────────────── */
  // mainDocId: ID del doc original del barbero (ya resuelto por resolverInfoBarbero).
  // Pasarlo evita una búsqueda extra y funciona aunque el doc no tenga email.
  async function ensureBarberoUidDoc(uid, email, mainDocId) {
    if (!uid) return;
    try {
      const uidDoc = await tenantCol(COL.BARBEROS).doc(uid).get();

      const existingData = uidDoc.exists ? uidDoc.data() : null;
      const isSelfRef = existingData && existingData._mainDocId === uid;
      // Doc ya correcto y no necesita resync
      if (uidDoc.exists && !isSelfRef && !existingData._needsSync) return;

      let mainDoc = null;

      // 1. Usar mainDocId ya conocido (evita búsqueda si ya lo tenemos)
      if (mainDocId && mainDocId !== uid) {
        const snap = await tenantCol(COL.BARBEROS).doc(mainDocId).get();
        if (snap.exists) mainDoc = snap;
      }

      // 2. Fallback: buscar por email
      if (!mainDoc) {
        const targetEmail = (email || '').toLowerCase().trim();
        const allSnap = await tenantCol(COL.BARBEROS).get();
        mainDoc = allSnap.docs.find(d => {
          if (d.id === uid) return false;
          const data = d.data();
          if (data.activo === false || data._mainDocId) return false;
          const docEmail = typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
          return targetEmail && docEmail === targetEmail;
        }) || null;

        // 3. Fallback: buscar por nombre (cubre barberos sin campo email)
        if (!mainDoc && existingData?.nombre) {
          const nombreRef = existingData.nombre.toLowerCase().trim();
          mainDoc = allSnap.docs.find(d => {
            if (d.id === uid) return false;
            const data = d.data();
            if (data.activo === false || data._mainDocId) return false;
            return (data.nombre || '').toLowerCase().trim() === nombreRef;
          }) || null;
        }
      }

      if (!mainDoc) {
        console.warn('[FDB] ensureBarberoUidDoc: no se encontró doc principal para uid', uid, '— agrega email al doc del barbero.');
        return;
      }

      const mData = typeof mainDoc.data === 'function' ? mainDoc.data() : mainDoc;
      const linkData = {
        activo: true,
        uid,
        email: (email || '').toLowerCase().trim() || mData.email || '',
        _mainDocId: typeof mainDoc.id === 'string' ? mainDoc.id : mainDocId,
        rol: mData.rol || 'barbero',
        nombre: mData.nombre || mData.displayName || '',
      };

      await tenantCol(COL.BARBEROS).doc(uid).set(linkData, { merge: true });
      console.info('[FDB] ensureBarberoUidDoc: enlace creado/corregido', uid, '→', linkData._mainDocId);
    } catch (e) {
      console.warn('[FDB] ensureBarberoUidDoc:', e.message);
    }
  }

  /* ──────────────────────────────────────────────────────────────
     MIGRACIÓN: backfill barberoId en citas antiguas
     Asocia citas sin barberoId al barbero cuyo nombre coincida.
     Se ejecuta una sola vez por sesión de admin (flag en sessionStorage).
     ────────────────────────────────────────────────────────────── */
  async function migrarBarberoIdCitas() {
    const FLAG = 'fs_migrated_barberoId_v1';
    if (sessionStorage.getItem(FLAG)) return;
    sessionStorage.setItem(FLAG, '1');

    try {
      // Obtener barberos y construir mapa nombre → id (insensible a mayúsculas/espacios)
      const barbSnap = await tenantCol(COL.BARBEROS).get();
      const nombreAId = {};
      barbSnap.docs.forEach(d => {
        const data = d.data();
        if (data.activo === false) return;
        const nombre = (data.nombre || data.displayName || '').toLowerCase().trim();
        if (nombre) nombreAId[nombre] = d.id;
      });

      if (!Object.keys(nombreAId).length) return;

      // Obtener citas sin barberoId (o con barberoId == null)
      const citasSnap = await tenantCol(COL.CITAS).get();
      const sinId = citasSnap.docs.filter(d => {
        const data = d.data();
        return !data.barberoId;
      });

      if (!sinId.length) return;
      console.info(`[FDB] Migrando barberoId en ${sinId.length} citas antiguas…`);

      // Procesar en batches de 400
      const chunks = [];
      for (let i = 0; i < sinId.length; i += 400) chunks.push(sinId.slice(i, i + 400));

      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach(doc => {
          const nombreBarbero = (doc.data().barbero || '').toLowerCase().trim();
          const barbId = nombreAId[nombreBarbero] || null;
          if (barbId) {
            batch.update(doc.ref, { barberoId: barbId });
          } else if (Object.keys(nombreAId).length === 1) {
            // Si solo hay un barbero activo, asignar todas las citas sin coincidencia a él
            batch.update(doc.ref, { barberoId: Object.values(nombreAId)[0] });
          }
        });
        await batch.commit();
      }
      console.info('[FDB] Migración de barberoId completada.');
    } catch (e) {
      console.warn('[FDB] Error en migración de barberoId:', e.message);
      sessionStorage.removeItem(FLAG); // Permitir reintento
    }
  }

  async function getShopSettings() {
    try {
      const snap = await tenantCol('settings').doc('general').get();
      return snap.exists ? snap.data() : null;
    } catch (e) {
      return null;
    }
  }

  /* ── API pública ────────────────────────────────────────────── */
  return {
    migrarDesdeLocalStorage,
    migrarBarberoIdCitas,
    // Servicios
    getServicios, addServicio, updateServicio, deleteServicio,
    reordenarServicios, onServiciosChange,
    // Configuración
    getConfig, updateConfig, onConfigChange,
    // Configuración por barbero
    getConfigBarbero, updateConfigBarbero, onConfigBarberoChange,
    // Citas
    getCitas, getCitasMes, getCitasByCliente, onCitasByClienteChange, addCita,
    updateCitaEstado, updateCitaNota, deleteCita,
    onCitasDiaChange, clearGoogleReviewFlag,
    // Disponibilidad
    getHorasDisponibles, getHorasDisponiblesMulti,
    // Slot locks (fuente pública de ocupación)
    getSlotLocksDia, onSlotLocksChange,
    // Bloqueos manuales
    addBloqueo, getBloqueosDia, getBloqueosMes, deleteBloqueo, onBloqueosDiaChange,
    // Premios del club
    getPremios, addPremio, updatePremio, deletePremio, onPremiosChange,
    // Colecciones tenant-aware (para uso directo en admin panel)
    barberosCol, citasCol,
    // Clientes / Usuarios
    usersCol, getClientes, getClienteByEmail, getClienteByNombre,
    onClienteChange, ensureCliente,
    // Sellos
    incrementarSellos, modificarSellos, canjearSellos,
    // Barberos (Permisos + Orden)
    getBarberos, esBarbero, esAdminJefe, getBarberoId, getRol,
    ensureBarberoUidDoc, reordenarBarberos,
    // Shop settings (Configuracion panel: features, nombre, etc.)
    getShopSettings,
  };
})();


/* ════════════════════════════════════════════════════════════════
   AppState — Equivalente al Context Provider de React
   Centraliza datos de Firestore y notifica a los suscriptores.
   Uso:
     AppState.subscribe('servicios', srvs => renderServicios(srvs));
     AppState.subscribe('config',    cfg  => applyConfig(cfg));
   ════════════════════════════════════════════════════════════════ */
const AppState = (() => {
  const _state = { servicios: [], config: null, premios: [], loading: true };
  const _subs  = {};       // { key: [fn, fn, ...] }
  const _unsubs = [];      // funciones de cleanup onSnapshot

  function subscribe(key, fn) {
    if (!_subs[key]) _subs[key] = [];
    _subs[key].push(fn);
    // Emitir valor actual de inmediato si ya existe
    if (_state[key] !== null && _state[key] !== undefined) fn(_state[key]);
    // Retorna función para desuscribirse
    return () => { _subs[key] = (_subs[key] || []).filter(f => f !== fn); };
  }

  function _emit(key, value) {
    _state[key] = value;
    (_subs[key] || []).forEach(fn => fn(value));
  }

  function get(key) { return _state[key]; }

  // Subscripción temporal para citas de un día (se gestiona externamente)
  function subscribeCitasDia(fecha, fn) {
    return FDB.onCitasDiaChange(fecha, fn);
  }

  async function init() {
    // 1. Migrar datos locales si es la primera vez
    try { await FDB.migrarDesdeLocalStorage(); } catch (e) { console.warn('[AppState] Migración:', e.message); }

    // 2. Asegurar que existe doc de configuración
    try { await FDB.getConfig(); } catch (e) { console.warn('[AppState] getConfig:', e.message); }

    // 3. Suscripciones en tiempo real (se mantienen durante toda la sesión)
    _unsubs.push(
      FDB.onServiciosChange(srvs => _emit('servicios', srvs)),
      FDB.onConfigChange(cfg   => _emit('config',    cfg)),
      FDB.onPremiosChange(ps   => _emit('premios',   ps)),
    );

    _emit('loading', false);
  }

  function destroy() {
    _unsubs.forEach(u => u());
    _unsubs.length = 0;
  }

  return { init, subscribe, subscribeCitasDia, get, destroy };
})();
