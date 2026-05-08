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
              estado:           b.estado           || 'Confirmado',
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
      const snap = await tenantCol(COL.SERVICIOS).orderBy('orden').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_) {
      // Fallback si no existe campo 'orden' en los documentos
      const snap = await tenantCol(COL.SERVICIOS).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    telefonoAdmin:    (typeof SHOP !== 'undefined' ? SHOP.telefono : '56900000000'),
    diasBloqueados:   [],
    colacion:         null,
    diasConfig:       {},
  });

  async function getConfig() {
    try {
      const snap = await configRef().get();
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
      // Si falla por permisos o red, devolver default para no romper la app
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
      const snap = await _barberConfigRef(barberoid).get();
      return snap.exists ? { ..._defaultConfig(), ...snap.data() } : _defaultConfig();
    } catch (e) {
      console.error('[FDB] getConfigBarbero:', e);
      return _defaultConfig();
    }
  }

  async function updateConfigBarbero(barberoid, data) {
    await _barberConfigRef(barberoid).set(data, { merge: true });
  }

  function onConfigBarberoChange(barberoid, callback) {
    return _barberConfigRef(barberoid).onSnapshot(snap => {
      callback(snap.exists ? { ..._defaultConfig(), ...snap.data() } : _defaultConfig());
    }, err => console.error('[FDB] onConfigBarberoChange:', err));
  }

  /* ──────────────────────────────────────────────────────────────
     CITAS
     ────────────────────────────────────────────────────────────── */
  async function getCitas(fecha, barberoId = null) {
    let q = tenantCol(COL.CITAS).where('fecha', '==', fecha);
    if (barberoId) q = q.where('barberoId', '==', barberoId);
    const snap = await q.get({ source: 'server' });
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  async function getCitasByCliente(email) {
    const snap = await tenantCol(COL.CITAS)
      .where('clienteEmail', '==', email)
      .limit(50)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    const ref = await tenantCol(COL.CITAS).add({
      fecha:            cita.fecha            || '',
      hora:             cita.hora             || '',
      clienteNombre:    cita.clienteNombre    || '',
      clienteTelefono:  cita.clienteTelefono  || '',
      clienteEmail:     cita.clienteEmail     || '',
      servicioNombre:   cita.servicioNombre   || '',
      duracionServicio: Number(cita.duracionServicio) || 30,
      barbero:          cita.barbero          || '',
      barberoId:        cita.barberoId        || null,
      estado:           'Confirmado',
      nota:             '',
      creadoEn:         firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async function updateCitaEstado(id, estado) {
    await tenantCol(COL.CITAS).doc(id).update({ estado });
  }

  async function updateCitaNota(id, nota) {
    await tenantCol(COL.CITAS).doc(id).update({ nota });
  }

  async function deleteCita(id) {
    await tenantCol(COL.CITAS).doc(id).delete();
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
    let q = tenantCol(COL.BLOQUEOS).where('fecha', '==', fecha);
    // Sin filtrar por barberoId aquí: los bloqueos globales (barberoId==null) también aplican.
    // El filtro por barbero se hace en getHorasDisponibles combinando globales + del barbero.
    const snap = await q.get({ source: 'server' });
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!barberoId) return todos;
    // Retorna bloqueos globales (sin barberoId) + los del barbero específico
    return todos.filter(b => !b.barberoId || b.barberoId === barberoId);
  }

  async function getBloqueosMes(yyyyMM) {
    const snap = await tenantCol(COL.BLOQUEOS)
      .where('fecha', '>=', yyyyMM + '-01')
      .where('fecha', '<=', yyyyMM + '-31')
      .get({ source: 'server' });
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  async function getHorasDisponibles(fecha, duracionServicio, configOverride = null, barberoId = null) {
    const cfg = configOverride || await getConfig();

    // Cargar citas y bloqueos en paralelo, filtrando por barbero si se especifica
    const [citas, bloqueos] = await Promise.all([
      getCitas(fecha, barberoId),
      getBloqueosDia(fecha, barberoId),
    ]);

    // Día completamente bloqueado → sin slots
    if (bloqueos.some(b => b.todo_el_dia)) return [];

    const toMins  = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fromMin = m => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

    // Horario específico del día (si está configurado)
    const dw  = new Date(fecha + 'T12:00:00').getDay();
    const dc  = (cfg.diasConfig || {})[dw] || {};
    const ini = toMins(dc.inicio || cfg.horarioInicio || '09:00');
    const fin = toMins(dc.fin    || cfg.horarioFin    || '20:00');
    const interval = cfg.intervaloMinutos || 30;

    const ocupados = citas
      .filter(c => c.estado !== 'Cancelada')
      .map(c => ({
        start: toMins(c.hora),
        end:   toMins(c.hora) + (parseInt(c.duracionServicio) || 30),
      }));

    // Rangos de bloqueo manual parciales
    const rangosBloq = bloqueos
      .filter(b => !b.todo_el_dia && b.hora_inicio && b.hora_fin)
      .map(b => ({ start: toMins(b.hora_inicio), end: toMins(b.hora_fin) }));

    const col   = cfg.colacion;
    const slots = [];
    let cur = ini;

    while (cur + parseInt(duracionServicio) <= fin) {
      // Saltar colación
      if (col) {
        const colS = toMins(col.inicio), colE = toMins(col.fin);
        if (cur >= colS && cur < colE) { cur += interval; continue; }
      }
      // Saltar bloqueo manual: omite el slot si el servicio solaparía el rango
      const bloqueado = rangosBloq.some(r =>
        cur < r.end && (cur + parseInt(duracionServicio)) > r.start
      );
      if (bloqueado) { cur += interval; continue; }

      const occupied = ocupados.some(o =>
        cur < o.end && (cur + parseInt(duracionServicio)) > o.start
      );
      slots.push({ time: fromMin(cur), occupied });
      cur += interval;
    }
    return slots;
  }

  // Calcula slots disponibles considerando TODOS los barberos.
  // Un slot es disponible si al menos un barbero está libre en ese horario.
  // Retorna los slots con { time, occupied, availableBarberoIds[] }.
  async function getHorasDisponiblesMulti(fecha, duracionServicio, configOverride = null, barberos = []) {
    const cfg = configOverride || await getConfig();
    const [todasCitas, todosBloqueos] = await Promise.all([
      getCitas(fecha, null),
      getBloqueosDia(fecha, null),
    ]);

    if (todosBloqueos.some(b => b.todo_el_dia && !b.barberoId)) return [];

    const toMins  = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const fromMin = m => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

    const dw  = new Date(fecha + 'T12:00:00').getDay();
    const dc  = (cfg.diasConfig || {})[dw] || {};
    const ini = toMins(dc.inicio || cfg.horarioInicio || '09:00');
    const fin = toMins(dc.fin    || cfg.horarioFin    || '20:00');
    const interval = cfg.intervaloMinutos || 30;
    const dur = parseInt(duracionServicio);
    const col = cfg.colacion;

    const globalBloqRanges = todosBloqueos
      .filter(b => !b.todo_el_dia && !b.barberoId && b.hora_inicio && b.hora_fin)
      .map(b => ({ start: toMins(b.hora_inicio), end: toMins(b.hora_fin) }));

    const result = [];

    for (let cur = ini; cur + dur <= fin; cur += interval) {
      if (col) {
        const colS = toMins(col.inicio), colE = toMins(col.fin);
        if (cur >= colS && cur < colE) continue;
      }
      const globalBlocked = globalBloqRanges.some(r => cur < r.end && (cur + dur) > r.start);
      if (globalBlocked) continue;

      const availableBarberoIds = [];

      for (const barbero of barberos) {
        if (todosBloqueos.some(b => b.todo_el_dia && b.barberoId === barbero.id)) continue;

        const barBloqs = todosBloqueos
          .filter(b => !b.todo_el_dia && b.barberoId === barbero.id && b.hora_inicio && b.hora_fin)
          .map(b => ({ start: toMins(b.hora_inicio), end: toMins(b.hora_fin) }));

        if (barBloqs.some(r => cur < r.end && (cur + dur) > r.start)) continue;

        const barCitas = todasCitas
          .filter(c => c.estado !== 'Cancelada' && c.barberoId === barbero.id)
          .map(c => ({ start: toMins(c.hora), end: toMins(c.hora) + (parseInt(c.duracionServicio) || 30) }));

        if (barCitas.some(o => cur < o.end && (cur + dur) > o.start)) continue;

        availableBarberoIds.push(barbero.id);
      }

      result.push({ time: fromMin(cur), occupied: availableBarberoIds.length === 0, availableBarberoIds });
    }

    return result;
  }

  /* ──────────────────────────────────────────────────────────────
     USUARIOS / CLIENTES
     Toda operación sobre 'users' pasa por tenantCol para
     mantener clientes separados por local.
     ────────────────────────────────────────────────────────────── */
  function usersCol() { return tenantCol(COL.USERS); }

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
    try {
      const snap = await tenantCol(COL.BARBEROS).get();
      const todos = snap.docs
        .map(doc => {
          const d = doc.data();
          const nombre = d.nombre || d.displayName || (d.email ? d.email.split('@')[0] : null) || 'Barbero';
          return { id: doc.id, nombre, foto: d.foto || d.photoURL || null, disponible: d.disponible !== false, ...d };
        })
        .filter(b => b.activo !== false && b.rol !== 'admin' && !b._mainDocId)
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
      return todos.filter(b => {
        const key = b.email?.toLowerCase().trim();
        if (!key) return true;
        if (seenEmails.has(key)) return false;
        seenEmails.add(key);
        return true;
      });
    } catch (e) {
      console.error('[FDB] Error obteniendo barberos:', e);
      return [];
    }
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
    getCitas, getCitasMes, getCitasByCliente, addCita,
    updateCitaEstado, updateCitaNota, deleteCita,
    onCitasDiaChange,
    // Disponibilidad
    getHorasDisponibles, getHorasDisponiblesMulti,
    // Bloqueos manuales
    addBloqueo, getBloqueosDia, getBloqueosMes, deleteBloqueo, onBloqueosDiaChange,
    // Premios del club
    getPremios, addPremio, updatePremio, deletePremio, onPremiosChange,
    // Clientes / Usuarios
    usersCol, getClientes, getClienteByEmail, getClienteByNombre,
    onClienteChange, ensureCliente,
    // Sellos
    incrementarSellos, modificarSellos, canjearSellos,
    // Barberos (Permisos)
    getBarberos, esBarbero, esAdminJefe, getBarberoId, getRol,
    ensureBarberoUidDoc,
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
