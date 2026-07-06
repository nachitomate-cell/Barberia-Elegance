/* sorteo.js — lógica de la página pública de inscripción a sorteos.
 *
 * IMPORTANTE: este archivo se carga vía <script src="/js/sorteo.js?v=..."></script>
 * en sorteo.html. Se sirve con Cache-Control: no-cache (regla /js/(.*)\.js
 * en vercel.json). Además, el query ?v= actúa como cache-buster: cada
 * deploy puede subir el número si algo raro pasa con CDN o service workers.
 *
 * Depende de:
 *   - firebase-app-compat.js  (window.firebase)
 *   - firebase-firestore-compat.js
 * Ambos se cargan ANTES de este script en el <head> de sorteo.html.
 */

/* ─── Resolución de tenant ─────────────────────────────────────
   IMPORTANTE: este mapa DEBE mantenerse sincronizado con el
   _domainMap de config.js (fuente de verdad para páginas públicas
   vanilla). Si agregás un tenant nuevo, actualizar ambos lados. */
const DOMAIN_TENANT_MAP = {
  'gitananails.synaptechspa.cl':          'gitana',
  'barberiaelegance.synaptechspa.cl':     'elegance',
  'barberiaferraza.synaptechspa.cl':      'ferraza',
  'ferrazabarber.synaptechspa.cl':        'ferraza',
  'mapubarbershop.synaptechspa.cl':       'mapubarbershop',
  'chameleonbarber.synaptechspa.cl':      'chameleon',
  'memphissalon.synaptechspa.cl':         'memphis',
  'deluxeperfumes.synaptechspa.cl':       'deluxeperfumes',
  'barberiadjones.synaptechspa.cl':       'lumen',
  'djonesbarberia.synaptechspa.cl':       'lumen',
  'delnerobarber.synaptechspa.cl':        'delnero',
  'marcelohairdressing.synaptechspa.cl':  'marcelo_hairdressing',
  'marcelo-hairdressing.synaptechspa.cl': 'marcelo_hairdressing',
  'marcelopalma.synaptechspa.cl':         'marcelo_hairdressing',
  'aurasalon.synaptechspa.cl':            'aura',
  'aurasalonmalegrooming.synaptechspa.cl':'aura',
  'aurasalonmalegrooming.synaptech.cl':   'aura',
  'latincaribe.synaptechspa.cl':          'latincaribe',
  'thelatincaribe.synaptechspa.cl':       'latincaribe',
  'machos.synaptechspa.cl':               'machos',
  'infinity.synaptechspa.cl':             'infinity',
  'studiodieciseis.synaptechspa.cl':      'sionbarberia',
  'sionbarberia.synaptechspa.cl':         'sionbarberia',
  'barberiasion.synaptechspa.cl':         'sionbarberia',
  'omegastudio.synaptechspa.cl':          'omegastudio',
  'alfamen.synaptechspa.cl':              'alfamen',
  'yugenstudio.synaptechspa.cl':          'yugen',
  'yugen.synaptechspa.cl':                'yugen',
  'yugenstudio.cl':                       'yugen',
  'www.yugenstudio.cl':                   'yugen',
  'sandbox.synaptechspa.cl':              'sandbox',
  'kronnospenablanca.synaptechspa.cl':    'kronnos_penablanca',
  'kronnos-penablanca.synaptechspa.cl':   'kronnos_penablanca',
  'kronnoslimache.synaptechspa.cl':       'kronnos_limache',
  'kronnos-limache.synaptechspa.cl':      'kronnos_limache',
  'kronnoswoman.synaptechspa.cl':         'kronnos_woman',
  'kronnos-woman.synaptechspa.cl':        'kronnos_woman',
  'barbersclub.synaptechspa.cl':          'barbersclub',
  'elbarberomoderno.synaptechspa.cl':     'elbarberomoderno',
};

function resolveTenant() {
  const fromQuery = new URLSearchParams(location.search).get('local');
  if (fromQuery) return { id: fromQuery, source: 'query' };
  const host = location.hostname.toLowerCase();
  if (DOMAIN_TENANT_MAP[host]) return { id: DOMAIN_TENANT_MAP[host], source: 'hostname' };
  console.warn(`[sorteo.js] Hostname "${host}" NO está en DOMAIN_TENANT_MAP. Fallback: 'elegance'. Sincronizar con config.js._domainMap.`);
  return { id: 'elegance', source: 'fallback' };
}

const _tenantResolved = resolveTenant();
const TENANT_ID = _tenantResolved.id;

/* ─── Firebase init ─── */
const firebaseConfig = {
  apiKey: "AIzaSyDqVkAhkXALm3hLcrmzjiaS3flUezPFe2Q",
  authDomain: "barberia-elegance.firebaseapp.com",
  projectId: "barberia-elegance",
  storageBucket: "barberia-elegance.firebasestorage.app",
  messagingSenderId: "515311607907",
  appId: "1:515311607907:web:8add6005144015c5e85856",
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* Resuelve la ref del sorteo según tenant (elegance vive en root). */
function sorteoRef(id) {
  if (TENANT_ID === 'elegance') return db.collection('sorteos').doc(id);
  return db.collection('tenants').doc(TENANT_ID).collection('sorteos').doc(id);
}

/* ─── Helpers UI ─── */
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
function showScreen(name) {
  $$('[data-screen]').forEach(el => el.classList.add('hidden'));
  const target = $(`[data-screen="${name}"]`);
  if (target) target.classList.remove('hidden');
}
function setBind(key, value) {
  $$(`[data-bind="${key}"]`).forEach(el => { el.textContent = value; });
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function pad(n) { return String(n).padStart(2, '0'); }
function formatRange(start, end) {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (isNaN(s) || isNaN(e)) return '';
  const sameYear  = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  const sStr = sameMonth ? pad(s.getDate()) : `${pad(s.getDate())} ${MONTHS_ES[s.getMonth()]}`;
  const eStr = `${pad(e.getDate())} ${MONTHS_ES[e.getMonth()]} ${e.getFullYear()}`;
  return `Cierra el ${sStr} – ${eStr}`;
}

/* Pantalla de "no disponible" con copy separado para dos casos. */
function showUnavailable(reason) {
  const titleEl = document.querySelector('[data-screen="unavailable"] h1');
  const bodyEl  = document.querySelector('[data-screen="unavailable"] p');
  if (reason === 'finalizado') {
    if (titleEl) titleEl.textContent = 'Este sorteo ya terminó';
    if (bodyEl)  bodyEl.textContent  = 'La dinámica que buscas ya cerró sus inscripciones. ¡Gracias por tu interés! Pronto tendremos nuevas oportunidades.';
  } else {
    if (titleEl) titleEl.textContent = 'Sorteo no encontrado';
    if (bodyEl)  bodyEl.textContent  = 'El enlace es inválido o el sorteo no existe. Revisa que hayas escaneado el QR correcto o pídele al local que te comparta el enlace nuevamente.';
  }
  showScreen('unavailable');
}

/* ─── Lógica principal — recibe el ID como parámetro ─── */
async function cargarSorteo(SORTEO_ID) {
  const STORAGE_KEY = `participo_sorteo_${TENANT_ID}_${SORTEO_ID}`;
  const debugPath = TENANT_ID === 'elegance'
    ? `sorteos/${SORTEO_ID}`
    : `tenants/${TENANT_ID}/sorteos/${SORTEO_ID}`;

  console.log('[sorteo.js] cargarSorteo — path:', debugPath, '| tenant:', TENANT_ID);

  // Si ya participó antes (localStorage flag) → screen "already"
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      showScreen('already');
      return;
    }
  } catch (_) { /* sin localStorage: seguimos */ }

  try {
    const snap = await sorteoRef(SORTEO_ID).get();
    if (!snap.exists) {
      console.warn(`[sorteo.js] Doc no existe en "${debugPath}". Posibles causas: ID incorrecto, tenant mal resuelto, o el sorteo fue borrado.`);
      showUnavailable('not-found');
      return;
    }
    const data = snap.data() || {};
    console.log('[sorteo.js] sorteo encontrado:', { nombre: data.nombre, estado: data.estado });
    if (data.estado === 'finalizado') {
      showUnavailable('finalizado');
      return;
    }

    // Render del sorteo
    setBind('nombre', data.nombre || 'Sorteo');
    // Compat backward: `premio` puede ser string legacy o el objeto polimórfico
    // { textoDinamico, categoria, detalle } que emite el nuevo CreateSorteoModal.
    const premioTxt = !data.premio
      ? ''
      : (typeof data.premio === 'string' ? data.premio : (data.premio.textoDinamico || ''));
    if (premioTxt) {
      setBind('premio', premioTxt);
    } else {
      const wrap = $('[data-bind="premio-wrap"]');
      if (wrap) wrap.classList.add('hidden');
    }
    if (data.fecha_inicio && data.fecha_fin) {
      setBind('fechas', formatRange(data.fecha_inicio, data.fecha_fin));
    }
    // Sorteos de fútbol → mostrar scoreboard con equipos + botones [-][0][+]
    const isFutbol = data.tipo === 'FUTBOL' && data.partido;
    if (isFutbol) {
      montarScoreboard(data.partido);
    }
    showScreen('form');
    bindForm(SORTEO_ID, STORAGE_KEY, { isFutbol });
  } catch (err) {
    console.error('[sorteo.js] read error:', err);
    console.error('  → path:', debugPath);
    console.error('  → hostname:', location.hostname);
    console.error('  → Posiblemente rules bloquean el read (verificar deploy) o Firestore no responde.');
    showUnavailable('not-found');
  }
}

/* ─── Normalización de contacto → ID predecible ───────────────────────
   Usamos el contacto (tel o email) como ID del doc en la subcolección para
   deduplicar a nivel base de datos: si alguien intenta reinscribirse con el
   mismo tel/email, el getDoc previo detecta la colisión y el rule del `update`
   público (no `create`) también lo rechazaría como red de seguridad.

   Preferimos teléfono (más discriminante que email compartido en familia).
   Sanitizamos para que el resultado sea un ID válido de Firestore:
     · sin `/`, sin comenzar por `__` (reservados),
     · sin espacios ni caracteres raros. */
function normalizarContactoId(telefono, email) {
  const digitos = (telefono || '').replace(/\D+/g, '');
  if (digitos.length >= 8) return `tel_${digitos}`;
  const mail = (email || '').trim().toLowerCase();
  if (mail) {
    // reemplaza @ y . por - para dejar un slug seguro
    const slug = mail.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (slug) return `mail_${slug}`;
  }
  return null;
}

/* ─── Scoreboard (solo sorteos tipo FUTBOL) ─────────────────────────
   Monta la sección oculta en sorteo.html: nombres de los equipos,
   fecha del partido y wire de los botones [-] [N] [+].
   El pronóstico vive en el DOM (spans #sb-goles-*) y se lee al submit. */
function montarScoreboard(partido) {
  const wrap = document.getElementById('scoreboard');
  if (!wrap) return;
  wrap.classList.remove('hidden');

  const nomLocal  = document.getElementById('sb-equipo-local');
  const nomVisita = document.getElementById('sb-equipo-visita');
  const fechaEl   = document.getElementById('sb-fecha');
  if (nomLocal  && partido.equipoLocal)  nomLocal.textContent  = partido.equipoLocal;
  if (nomVisita && partido.equipoVisita) nomVisita.textContent = partido.equipoVisita;

  if (fechaEl && partido.fechaPartido) {
    try {
      const d = new Date(partido.fechaPartido);
      if (!isNaN(d)) {
        const dia   = pad(d.getDate());
        const mes   = MONTHS_ES[d.getMonth()];
        const hora  = pad(d.getHours());
        const min   = pad(d.getMinutes());
        fechaEl.textContent = `${dia} ${mes} · ${hora}:${min}`;
      }
    } catch (_) { /* fallback silente */ }
  }

  // Wire de los 4 botones — clamp a [0, 20]
  const spanLocal  = document.getElementById('sb-goles-local');
  const spanVisita = document.getElementById('sb-goles-visita');
  const clamp = n => Math.max(0, Math.min(20, n));
  const bump = (span, delta) => { span.textContent = String(clamp(parseInt(span.textContent, 10) + delta)); };
  document.querySelectorAll('[data-sb-btn]').forEach(btn => {
    const attr = btn.getAttribute('data-sb-btn');
    btn.addEventListener('click', () => {
      if (attr === 'local-minus')   bump(spanLocal,  -1);
      if (attr === 'local-plus')    bump(spanLocal,  +1);
      if (attr === 'visita-minus')  bump(spanVisita, -1);
      if (attr === 'visita-plus')   bump(spanVisita, +1);
    });
  });
}

function bindForm(SORTEO_ID, STORAGE_KEY, opts = {}) {
  const isFutbol = !!opts.isFutbol;
  const form    = $('#form-sorteo');
  const btn     = $('#btn-submit');
  const spinner = $('[data-bind="btn-spinner"]');
  const label   = $('[data-bind="btn-label"]');
  const errEl   = $('#form-error');
  const errTxt  = $('[data-bind="form-error-text"]');

  function setBusy(busy) {
    btn.disabled = busy;
    spinner.classList.toggle('hidden', !busy);
    label.textContent = busy ? 'Enviando…' : 'Participar ahora';
  }
  function showError(msg) {
    errTxt.textContent = msg;
    errEl.classList.remove('hidden');
  }
  function clearError() { errEl.classList.add('hidden'); }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (btn.disabled) return;
    clearError();

    const nombre   = $('#f-nombre').value.trim();
    const telefono = $('#f-telefono').value.trim();
    const email    = $('#f-email').value.trim();

    if (!nombre) { showError('Ingresa tu nombre completo.'); return; }
    if (nombre.length > 80) { showError('El nombre es demasiado largo.'); return; }
    if (telefono && telefono.length > 30) { showError('Teléfono demasiado largo.'); return; }
    if (email && email.length > 120) { showError('Correo demasiado largo.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('Correo no válido.'); return; }

    // Necesitamos al menos un contacto para poder deduplicar server-side.
    const contactoId = normalizarContactoId(telefono, email);
    if (!contactoId) {
      showError('Ingresa un teléfono o correo válido para participar.');
      return;
    }

    setBusy(true);
    try {
      const ref            = sorteoRef(SORTEO_ID);
      const participanteRef = ref.collection('participantes').doc(contactoId);

      // Dedup a nivel BD: NO usamos getDoc previo porque la rule del doc de
      // participante es `read: esAdmin` — un visitante anónimo no puede leer
      // (ni siquiera para chequear existencia), Firestore devuelve
      // permission-denied indistinguible de "no existe".
      // En su lugar confiamos en el batch.set: si el doc ya existe, la
      // operación cae en `update` (que solo admite admin) y todo el batch
      // aborta con permission-denied → catch abajo lo traduce a mensaje amigable.
      const payload = {
        nombre,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (telefono) payload.telefono = telefono;
      if (email)    payload.email    = email;

      // Sorteos FUTBOL: leer del scoreboard el pronóstico y adjuntarlo al doc
      if (isFutbol) {
        const gLocal  = parseInt(document.getElementById('sb-goles-local')?.textContent  || '0', 10);
        const gVisita = parseInt(document.getElementById('sb-goles-visita')?.textContent || '0', 10);
        payload.pronostico = {
          local:  Number.isFinite(gLocal)  ? gLocal  : 0,
          visita: Number.isFinite(gVisita) ? gVisita : 0,
        };
      }

      // 2) Escritura atómica: batch con set(participante) + increment(counter).
      //    Si algo falla, ninguna de las dos se aplica → nunca queda el
      //    contador desincronizado respecto de los inscritos reales.
      const batch = db.batch();
      batch.set(participanteRef, payload);
      batch.update(ref, {
        participantes_count: firebase.firestore.FieldValue.increment(1),
      });
      await batch.commit();

      // 3) Flag local — capa adicional para evitar recargas repetidas de este browser.
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}

      // 4) Pantalla de éxito personalizada con el nombre
      const first = nombre.split(/\s+/)[0] || 'tú';
      $('[data-bind="success-name"]').textContent = `¡Listo ${first}! Tu inscripción quedó registrada.`;
      showScreen('success');
    } catch (err) {
      console.error('[sorteo.js] submit error:', err);
      // Firestore permission-denied típico cuando alguien intentó reinscribirse
      // (set sobre doc existente cae en `update` que solo admite counter+1).
      if (err && err.code === 'permission-denied') {
        showError('Este número de contacto ya está participando en este sorteo.');
      } else {
        showError('No pudimos registrar tu inscripción. Intenta de nuevo.');
      }
      setBusy(false);
    }
  });
}

/* ─── Entry point — window.onload garantiza que el DOM y todos los
       recursos estén listos (incluyendo Firebase compat scripts). ─── */
window.onload = function () {
  // Detección infalible del ID: pathname.split('/') + búsqueda de 'sorteo'
  // Cubre las tres formas que puede venir el URL:
  //   /sorteo/abc123          → ['','sorteo','abc123']            → id=abc123
  //   /sorteo/abc123/          → ['','sorteo','abc123','']         → id=abc123
  //   sorteo.html?id=abc123   → pathname='/sorteo.html'           → cae al query
  const pathParts = window.location.pathname.split('/');
  const sorteoIndex = pathParts.indexOf('sorteo');
  const id = (sorteoIndex !== -1 && pathParts[sorteoIndex + 1])
    ? pathParts[sorteoIndex + 1]
    : new URLSearchParams(window.location.search).get('id');

  console.group('[sorteo.js debug]');
  console.log('full URL:       ', location.href);
  console.log('hostname:       ', location.hostname);
  console.log('pathname:       ', location.pathname);
  console.log('search:         ', location.search || '(vacío)');
  console.log('pathParts:      ', pathParts);
  console.log('sorteoIndex:    ', sorteoIndex);
  console.log('ID detectado:   ', id || '(ninguno)');
  console.log('resolved tenant:', TENANT_ID, `(source: ${_tenantResolved.source})`);
  console.groupEnd();

  if (id) {
    cargarSorteo(id.trim());
  } else {
    console.error('[sorteo.js] No se pudo detectar el ID en la URL');
    showUnavailable('not-found');
  }
};
