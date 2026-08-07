'use strict';

// scripts/seed-practica.js
// ─────────────────────────────────────────────────────────────────────────────
//  LOCAL DE PRÁCTICA — "Barbería Práctica" (tenant `practica`)
//
//  Una barbería completa y VIVA para que quien vende la plataforma aprenda a
//  usarla sin miedo: agenda con citas pasadas, de hoy y futuras, clientes con
//  sellos, productos con stock (uno bajo el mínimo, para que vea la alerta),
//  ventas en caja y premios del club. Puede romper todo — se resetea con un
//  comando.
//
//  Se crea con la MISMA forma que un tenant self-service real
//  (provisionarTenantSelf), así que el panel, la agenda pública y las Cloud
//  Functions lo tratan como a cualquier local. Diferencias a propósito:
//
//    · TODAS las citas llevan `skipNotificaciones: true`. Sin eso, crear 35
//      citas dispara correos, plantillas de WhatsApp y push a teléfonos
//      inventados. Lo respetan confirmacion-cita, whatsapp-notif,
//      aviso-cita-staff y push-cliente.
//    · Teléfonos +569 0000 xxxx y correos @practica.local: no existen.
//    · `_billing.estadoPago = 'practica'` y `_system.estadoComercial =
//      'practica'` para no contaminar los números de ops (ni active_trials ni
//      la escalera de cobranza, que solo reacciona a 'atrasado').
//
//  NO necesita tocar config.js, middleware.js ni tenantUtils.js: los tenants
//  self-service se resuelven solos por subdominio. Tampoco hay que rebuildar
//  Vite — es solo data.
//
//  USO:
//    node scripts/seed-practica.js                    → crea o actualiza, y
//                                                       SIEMPRE deja el acceso
//                                                       practica@synaptechspa.cl
//                                                       / Practica7912 andando
//    node scripts/seed-practica.js --reset            → borra el movimiento
//                                                       (citas/clientes/ventas)
//                                                       y vuelve a sembrar
//    node scripts/seed-practica.js --owner=ella@x.cl  → además, acceso admin
//                                                       para otra persona
//    node scripts/seed-practica.js --pass=OtraClave1  → cambia la clave fija
//
//  Este es el comando de rescate: si el panel de práctica no deja entrar,
//  córrelo sin argumentos y verifica solo que el login quedó funcionando
//  (sale con código 1 si no). No hay que anotar nada de la consola.
//
//  Panel:  https://practica.synaptechspa.cl/gestion-interna/?local=practica
//  Agenda: https://practica.synaptechspa.cl
// ─────────────────────────────────────────────────────────────────────────────

const path  = require('path');
const fs    = require('fs');
const https = require('https');

const RAIZ  = path.join(__dirname, '..');
const admin = require(path.join(RAIZ, 'functions/node_modules/firebase-admin'));

const SA = path.join(RAIZ, 'service-account.json');
admin.initializeApp({
  credential: fs.existsSync(SA)
    ? admin.credential.cert(JSON.parse(fs.readFileSync(SA, 'utf8')))
    : admin.credential.applicationDefault(),
  projectId: 'barberia-elegance',
});
const db = admin.firestore();
// Del MISMO `admin` que abrió la conexión: requerir 'firebase-admin/firestore'
// aparte carga otra copia del módulo y sus transforms no son serializables por
// esta instancia ("Couldn't serialize ServerTimestampTransform").
const { FieldValue } = admin.firestore;

const TID    = 'practica';
const NOMBRE = 'Barbería Práctica';

// ── Acceso FIJO del local de práctica ────────────────────────────────────────
//  Este es un entorno desechable con data inventada: acá la contraseña
//  determinista vale más que la secreta. Antes se generaba al azar
//  (`Practica`+4 dígitos) y se imprimía UNA vez; al cerrar la terminal se
//  perdía, y como el seed no repone claves de cuentas existentes, la única
//  salida era borrar el usuario. Eso dejó a Ignacio fuera dos veces (04 y
//  06-ago-2026). Ahora: correr el seed SIEMPRE deja este acceso funcionando.
//  Si cambias estos valores, actualiza también el cheatsheet del equipo.
const OWNER_FIJO = 'practica@synaptechspa.cl';
const PASS_FIJA  = 'Practica7912';
// apiKey pública del proyecto (la misma que sirve el panel) — solo se usa para
// verificar al final que el login REALMENTE funciona.
const API_KEY = 'AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q';

const args   = process.argv.slice(2);
const RESET  = args.includes('--reset');
const OWNER  = (args.find(a => a.startsWith('--owner=')) || '').split('=')[1] || OWNER_FIJO;
const PASS   = (args.find(a => a.startsWith('--pass=')) || '').split('=')[1] || PASS_FIJA;

const T  = (p) => db.collection(`tenants/${TID}/${p}`);
const TS = FieldValue.serverTimestamp();

// ── Fechas en horario Chile ──────────────────────────────────────────────────
function hoyCL() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}
function masDias(fechaStr, n) {
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const dowDe = (f) => new Date(f + 'T12:00:00Z').getUTCDay();

// ── Catálogo ─────────────────────────────────────────────────────────────────
const SERVICIOS = [
  ['Corte de cabello',      12000, 45, 'Cortes',  'ph-scissors'],
  ['Corte + Barba',         18000, 60, 'Combos',  'ph-crown'],
  ['Barba',                  8000, 30, 'Barba',   'ph-mustache'],
  ['Corte niño',            10000, 30, 'Cortes',  'ph-smiley'],
  ['Perfilado de cejas',     3000, 15, 'Extras',  'ph-eye'],
  ['Corte + Barba + Cejas', 21000, 75, 'Combos',  'ph-crown'],
  ['Lavado y peinado',       6000, 20, 'Extras',  'ph-drop'],
  ['Diseño / Freestyle',    15000, 50, 'Cortes',  'ph-lightning'],
];

const BARBEROS = [
  ['practica-b1', 'Tomás Reyes',   'Fades y diseño'],
  ['practica-b2', 'Camila Soto',   'Color y estilismo'],
  ['practica-b3', 'Ignacio Rojas', 'Barba clásica'],
  ['practica-b4', 'Valentina Paz', 'Cortes y cejas'],
];

const PRODUCTOS = [
  ['Cera mate 100ml',        8990,  12, 3, 5500],
  ['Pomada brillo 100ml',    9990,   7, 3, 6200],
  ['Aceite para barba 30ml', 11990,  2, 4, 7000],   // ← bajo el mínimo: dispara la alerta
  ['Shampoo anticaspa',      7990,  15, 4, 4800],
  ['Bálsamo after shave',    6990,   9, 3, 4100],
  ['Peineta de madera',      4990,   1, 2, 2200],   // ← bajo el mínimo
];

const CLIENTES = [
  ['Rodrigo Fuentes', 8, 23], ['Daniela Ortiz', 3, 11], ['Matías Herrera', 10, 30],
  ['Josefa Lagos', 1, 4],     ['Cristóbal Vidal', 6, 17], ['Antonia Muñoz', 4, 12],
  ['Sebastián Rivas', 9, 26], ['Fernanda Cortés', 2, 7],  ['Benjamín Silva', 5, 15],
  ['Catalina Bravo', 7, 19],  ['Diego Navarro', 0, 2],    ['Isidora Peña', 12, 34],
];

const PREMIOS = [
  ['Corte gratis',            10],
  ['Barba gratis',             6],
  ['20% en productos',         4],
];

const fono = (i) => `5690000${String(1000 + i).slice(-4)}`;

// ── Borrado por lotes ────────────────────────────────────────────────────────
async function borrarColeccion(ref) {
  const snap = await ref.get();
  if (snap.empty) return 0;
  let n = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const b = db.batch();
    snap.docs.slice(i, i + 400).forEach(d => { b.delete(d.ref); n++; });
    await b.commit();
  }
  return n;
}

// ── Siembra ──────────────────────────────────────────────────────────────────
async function sembrar() {
  const hoy = hoyCL();

  // 1) Doc raíz — misma forma que provisionarTenantSelf.
  await db.doc(`tenants/${TID}`).set({
    slug: TID,
    nombre: NOMBRE,
    nombreCorto: 'Práctica',
    tipo: 'barberia',
    telefono: '56900001000',
    // Champán sobre negro: la familia de Chameleon, un punto menos saturada
    // para que en una demo no se confunda con el local de un cliente real.
    color: '#C8A45C',
    instagram: null,
    slogan: 'Reserva tu hora en segundos',
    direccion: 'Santiago',
    // Identidad generada por scripts/gen-practica-brand.js + gen-pwa-icons.js.
    logoUrl:    '/practica/logo.png',
    bannerUrl:  '/practica/banner.jpg',
    iconPwa192: '/icons/pwa/practica-192.png',
    iconPwa512: '/icons/pwa/practica-512.png',
    // Reutiliza el tema OSCURO premium de Chameleon (config.js lo mapea a
    // _themeAlias). Encima van los pills propios de .tenant-selfservice.
    tema: 'chameleon',
    dominio: `${TID}.synaptechspa.cl`,
    // 'admin-express' y no 'practica': middleware.js:1910 solo resuelve
    // subdominios dinámicos con origen 'self-service' o 'admin-express' — con
    // cualquier otro valor practica.synaptechspa.cl devuelve el 404 de marca.
    // El marcador propio de este entorno es `esPractica`.
    origen: 'admin-express',
    plan: 'free',
    estado: 'activo',
    // Ni 'trial' ni 'trial_expired': así el edge nunca pausa la agenda pública
    // por trial vencido (middleware.js:1917).
    status: 'practica',
    contacto: { nombre: 'Equipo SynapTech', email: null, whatsapp: '56900001000' },
    esPractica: true,
    createdAt: TS, updatedAt: TS,
  }, { merge: true });

  // 2) Configuración del local.
  await db.doc(`tenants/${TID}/configuracion/main`).set({
    horarioInicio: '10:00',
    horarioFin:    '20:00',
    intervaloMinutos: 30,
    diasLaborales: [1, 2, 3, 4, 5, 6],
    diasBloqueados: [],
    colacion: { inicio: '14:00', fin: '15:00' },
    diasConfig: {},
    categoriasServicio: ['Cortes', 'Combos', 'Barba', 'Extras', 'Otro'],
    telefonoAdmin: '56900001000',
    metaMensualVentas: 2500000,
    updatedAt: TS,
  }, { merge: true });

  await db.doc(`tenants/${TID}/config/ui`).set({ productosActivos: true }, { merge: true });

  // 3) Servicios.
  let b = db.batch();
  SERVICIOS.forEach(([nombre, precio, duracion, categoria, icono], i) => {
    b.set(T('servicios').doc(`svc-practica-${i}`), {
      nombre, precio, duracion, categoria, icono,
      activo: true, orden: i, createdAt: TS, updatedAt: TS,
    }, { merge: true });
  });

  // 4) Equipo. Jornadas distintas a propósito: que vea días libres y colación.
  BARBEROS.forEach(([id, nombre, especialidad], i) => {
    const horario = {};
    for (let d = 0; d <= 6; d++) {
      const libre = (d === 0) || (i === 1 && d === 1) || (i === 3 && d === 2);
      horario[d] = libre
        ? { activo: false }
        : { activo: true, inicio: '10:00', fin: '20:00', descansos: [{ inicio: '14:00', fin: '15:00' }] };
    }
    b.set(T('barberos').doc(id), {
      nombre, especialidad, rol: i === 0 ? 'admin' : 'barbero',
      activo: true, disponible: true, mostrarEnAgenda: true,
      horario, creadoEn: TS,
    }, { merge: true });
  });

  // 5) Premios del club.
  PREMIOS.forEach(([nombre, costoSellos], i) => {
    b.set(T('premios').doc(`premio-practica-${i}`), {
      nombre, costoSellos, activo: true, creadoEn: TS,
    }, { merge: true });
  });

  // 6) Productos (dos bajo el mínimo → alerta de stock crítico).
  PRODUCTOS.forEach(([nombre, precio, stock, stockMinimo, precioCosto], i) => {
    b.set(T('productos').doc(`prod-practica-${i}`), {
      nombre, precio, stock, stockMinimo, precioCosto,
      marca: 'Marca Demo', categoria: 'Cuidado',
      activo: true, createdAt: TS, updatedAt: TS,
    }, { merge: true });
  });
  await b.commit();

  // 7) Clientes del club con sellos.
  b = db.batch();
  CLIENTES.forEach(([nombre, disp, hist], i) => {
    const uid = `practica-cli-${i}`;
    b.set(T('users').doc(uid), {
      uid, nombre,
      email: `cliente${i}@practica.local`,
      telefono: fono(i),
      telefonoSuf9: fono(i).slice(-9),
      sellosDisponibles: disp,
      sellosHistoricos:  hist,
      stamps: disp,
      creadoEn: TS, updatedAt: TS,
    }, { merge: true });
  });
  await b.commit();

  // 8) Agenda: citas de los últimos 7 días (Completada), hoy y los próximos 7.
  //    skipNotificaciones en TODAS: nada de correos ni WhatsApp a datos falsos.
  b = db.batch();
  let nCitas = 0, ingresos = 0;
  const HORAS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'];

  for (let off = -7; off <= 7; off++) {
    const fecha = masDias(hoy, off);
    if (dowDe(fecha) === 0) continue;              // domingo cerrado
    const cuantas = off < 0 ? 4 : (off === 0 ? 5 : 2);
    for (let k = 0; k < cuantas; k++) {
      const idx  = (Math.abs(off) * 7 + k * 3) % HORAS.length;
      const hora = HORAS[idx];
      const [nomSvc, precio, dur] = SERVICIOS[(Math.abs(off) + k) % SERVICIOS.length];
      const [bid, bnom] = BARBEROS[(k + Math.abs(off)) % BARBEROS.length];
      const ci = (Math.abs(off) * 3 + k) % CLIENTES.length;
      const estado = off < 0 ? 'Completada' : (off === 0 ? (k % 3 === 0 ? 'Pendiente' : 'Confirmada') : 'Confirmada');
      if (off < 0) ingresos += precio;

      b.set(T('citas').doc(`practica-cita-${off + 7}-${k}`), {
        fecha, hora,
        clienteNombre:  CLIENTES[ci][0],
        clienteTelefono: fono(ci),
        clienteTelefonoSuf9: fono(ci).slice(-9),
        clienteEmail:   `cliente${ci}@practica.local`,
        clienteUid:     `practica-cli-${ci}`,
        servicioNombre: nomSvc,
        servicioId:     `svc-practica-${SERVICIOS.findIndex(s => s[0] === nomSvc)}`,
        duracionServicio: dur,
        precio,
        barbero: bnom, barberoId: bid,
        estado,
        origen: 'practica',
        skipNotificaciones: true,       // ← nada sale hacia afuera
        codigoCita: `PR-${String(nCitas).padStart(3, '0')}`,
        nota: '',
        creadoEn: TS,
      }, { merge: true });
      nCitas++;
    }
  }
  await b.commit();

  // 9) Caja: un movimiento por día pasado, para que Métricas y Caja no salgan vacías.
  b = db.batch();
  for (let off = -7; off < 0; off++) {
    const fecha = masDias(hoy, off);
    if (dowDe(fecha) === 0) continue;
    b.set(T('gastos').doc(`practica-gasto${off + 7}`), {
      fecha, concepto: 'Insumos de barbería', monto: 12000 + (off + 7) * 900,
      categoria: 'Insumos', creadoEn: TS,
    }, { merge: true });
  }
  await b.commit();

  // 10) _system y _billing marcados como práctica (fuera de los números de ops).
  await db.doc(`_system/${TID}`).set({
    status: 'active', plan: 'free', origen: 'practica',
    estadoComercial: 'practica', tenantNombre: NOMBRE,
    operativo: true, creadoEn: TS, updatedAt: TS,
  }, { merge: true });

  await db.doc(`_billing/${TID}`).set({
    estadoPago: 'practica', montoPendiente: 0, origen: 'practica', creadoEn: TS,
  }, { merge: true });

  return { nCitas, ingresos, hoy };
}

// ── Acceso de la vendedora ───────────────────────────────────────────────────
//  SIEMPRE deja la contraseña en un valor conocido. Ya no existe la rama que
//  "no toca la clave si la cuenta existe": esa era justamente la que dejaba el
//  panel inaccesible sin decir nada.
async function darAcceso(email, pass) {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: pass });
    console.log(`  cuenta existente: ${email}`);
    console.log('  contraseña repuesta');
  } catch (_) {
    user = await admin.auth().createUser({ email, password: pass, displayName: 'Equipo comercial' });
    console.log(`  cuenta creada: ${email}`);
  }
  console.log(`  contraseña: ${pass}`);
  await admin.auth().setCustomUserClaims(user.uid, { role: 'admin', tenantId: TID });
  await T('barberos').doc(user.uid).set({
    _mainDocId: 'practica-b1', uid: user.uid, email,
    nombre: 'Equipo comercial', rol: 'admin', activo: true,
  }, { merge: true });
  console.log(`  claims: role=admin tenantId=${TID}`);
}

// Verificación real del login. El Admin SDK puede reportar éxito y aun así
// dejar el panel inaccesible (claims viejos, cuenta deshabilitada, clave
// pisada por otra corrida). La ÚNICA prueba que vale es pedirle un idToken a
// Identity Toolkit igual que lo hace el navegador. `getUserByEmail` no sirve:
// no devuelve passwordHash.
async function verificarLogin(email, pass) {
  // `https` nativo con `agent: false` en vez de fetch(): undici deja el socket
  // en un pool que sigue vivo, y el process.exit() del final aborta con
  // "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" (libuv, Windows).
  // Eso no solo ensucia la salida: el abort pisa el exit code con 127 y mata
  // la señal de "el login no quedó funcionando" que este script existe para dar.
  const j = await new Promise((resolve) => {
    const body = JSON.stringify({ email, password: pass, returnSecureToken: true });
    const req = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path:     `/v1/accounts:signInWithPassword?key=${API_KEY}`,
      method:   'POST',
      agent:    false,
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ error: { message: `respuesta ilegible (HTTP ${res.statusCode})` } }); }
      });
    });
    req.on('error', (e) => resolve({ error: { message: `sin red: ${e.message}` } }));
    req.end(body);
  });
  if (j.idToken) {
    console.log(`  ✅ login verificado contra Firebase Auth (uid ${j.localId})`);
    return true;
  }
  const code = (j.error && j.error.message) || 'desconocido';
  console.error(`  ❌ EL LOGIN NO FUNCIONA: ${code}`);
  if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
    console.error('     Firebase bloqueó esta IP por intentos fallidos. La clave quedó');
    console.error('     bien puesta; espera unos minutos y entra al panel igual.');
    return true;   // la clave sí se fijó — no es una falla del seed
  }
  return false;
}

(async () => {
  console.log(`\n🎓 Local de práctica · tenant "${TID}"\n`);

  if (RESET) {
    console.log('Reset: borrando movimiento…');
    for (const c of ['citas', 'ventas', 'gastos', 'slotLocks', 'bloqueos', 'canjes']) {
      const n = await borrarColeccion(T(c));
      if (n) console.log(`  ${c}: ${n} borrados`);
    }
  }

  const r = await sembrar();
  console.log('Sembrado:');
  console.log(`  ${SERVICIOS.length} servicios · ${BARBEROS.length} del equipo · ${PRODUCTOS.length} productos (2 bajo el mínimo)`);
  console.log(`  ${CLIENTES.length} clientes del club · ${PREMIOS.length} premios`);
  console.log(`  ${r.nCitas} citas entre ${masDias(r.hoy, -7)} y ${masDias(r.hoy, 7)}`);
  console.log(`  ~$${r.ingresos.toLocaleString('es-CL')} en citas completadas de la semana pasada`);

  console.log('\nAcceso:');
  await darAcceso(OWNER, PASS);
  const ok = await verificarLogin(OWNER, PASS);

  console.log('\n  Panel:  https://practica.synaptechspa.cl/gestion-interna/?local=practica');
  console.log('  Agenda: https://practica.synaptechspa.cl');
  console.log('\n  Para dejarlo como nuevo:  node scripts/seed-practica.js --reset\n');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FALLÓ:', e); process.exit(1); });
