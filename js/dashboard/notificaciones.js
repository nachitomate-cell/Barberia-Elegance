let _notifEnabled  = localStorage.getItem('notif_granted') === '1';
let _notifSchedule = null; // intervalId

// ── PUSH FCM DEL CLIENTE ─────────────────────────────────────
// VAPID pública del proyecto (misma que usa agenda.html para barberos).
const FCM_VAPID_KEY = 'BMi1HRp3bdiOqBNqXRrtFc1jlB7qPhYXtZDOLLncbUjxP_pcWSbfrz2ZfACtiJu3fo5riJibq9AGmnBd--kY5jU';
let _fcmMsgInstance   = null;
let _fcmForegroundInit = false;

// Registra (o refresca) el token FCM del cliente en fcm_tokens.
// Lo lee la Cloud Function que envía el recordatorio push de 30 min
// (functions/recordatorio-cita.js → recordatorioCita30min) filtrando por userId.
// Idempotente: se puede llamar en cada login sin duplicar.
async function registrarTokenPush() {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'granted') return;
    if (!currentUser) return;
    if (typeof firebase === 'undefined' || !firebase.messaging) {
      console.warn('[FCM] SDK de messaging no disponible'); return;
    }

    const reg       = await navigator.serviceWorker.ready;
    const messaging = _fcmMsgInstance || firebase.messaging();
    _fcmMsgInstance = messaging;

    const token = await messaging.getToken({
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (!token) { console.warn('[FCM] Token vacío — revisa la VAPID key'); return; }

    const tid = window.CURRENT_TENANT_ID || 'elegance';
    await _tenantCol('fcm_tokens').doc(token).set({
      token,
      userId:      currentUser.uid,   // ← la CF de push al cliente filtra por este campo
      uid:         currentUser.uid,
      tenantId:    tid,
      activo:      true,
      plataforma:  'web-cliente',
      dispositivo: navigator.userAgent.substring(0, 120),
      updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      creadoEn:    firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('[FCM] Token de cliente guardado');

    // Notificaciones en primer plano (app abierta): FCM no las muestra solo.
    if (!_fcmForegroundInit) {
      _fcmForegroundInit = true;
      messaging.onMessage(payload => {
        const title = payload.notification?.title || payload.data?.title ||
                      `${SHOP.nombreCorto || SHOP.nombre || 'Elegance'} 💈`;
        const body  = payload.notification?.body  || payload.data?.body  ||
                      'Tienes una notificación.';
        reg.showNotification(title, {
          body,
          icon:  SHOP.logo || '/icons/icon-192.png',
          badge: SHOP.logo || '/icons/icon-192.png',
          // Mismo tag que el recordatorio local para que no se dupliquen en pantalla.
          tag:   payload.data?.citaId || 'recordatorio',
          data:  payload.data || {},
        });
        // Confirmar entrega (app en primer plano).
        const logId = payload.data?.logId;
        if (logId) {
          fetch('https://us-central1-barberia-elegance.cloudfunctions.net/confirmarEntregaPush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ logId, event: 'delivered' }),
          }).catch(() => {});
        }
      });
    }
  } catch (e) {
    console.warn('[FCM]', e.message);
  }
}

async function toggleNotificaciones() {
  if (_notifEnabled) {
    showToast('Notificaciones activas — recibirás aviso antes de tu cita', 'ok');
    return;
  }
  if (!('Notification' in window)) {
    showToast('Tu navegador no soporta notificaciones', 'err');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    showToast('Permite las notificaciones para recibir recordatorios', 'err');
    return;
  }
  _notifEnabled = true;
  localStorage.setItem('notif_granted', '1');
  actualizarIconoCampana(true);
  iniciarSchedulerRecordatorio();
  registrarTokenPush(); // registra token FCM para recibir el push de 30 min
  document.getElementById('notifBanner')?.classList.add('hidden');
  showToast('¡Notificaciones activadas!', 'ok');
  new Notification(`${SHOP.nombre} 💈`, {
    body: '¡Listo! Te avisaremos antes de tu próxima cita.',
    icon: '/icons/icon-192.png'
  });
}

// ── Banner para invitar a activar notificaciones ──────────────
const NOTIF_SNOOZE_KEY  = 'notif_prompt_snooze';
const NOTIF_SNOOZE_DAYS = 3;

function notifBannerSnoozed() {
  const t = parseInt(localStorage.getItem(NOTIF_SNOOZE_KEY) || '0', 10);
  return t ? (Date.now() - t) < NOTIF_SNOOZE_DAYS * 86400000 : false;
}

function initNotifBanner() {
  const banner = document.getElementById('notifBanner');
  if (!banner) return;
  // Sin soporte o ya concedido o pospuesto recientemente → no mostrar
  if (!('Notification' in window) || Notification.permission === 'granted' || notifBannerSnoozed()) {
    banner.classList.add('hidden');
    return;
  }
  if (Notification.permission === 'denied') {
    // El navegador no deja re-pedir: explicar cómo habilitarlo a mano
    document.getElementById('notifBannerTitle').textContent = 'Notificaciones bloqueadas';
    document.getElementById('notifBannerText').textContent  =
      'Actívalas desde los ajustes del navegador (icono junto a la dirección) para recibir recordatorios.';
    const btn = document.getElementById('notifBannerActivar');
    if (btn) btn.style.display = 'none';
  }
  banner.classList.remove('hidden');
}

async function activarDesdeBanner() {
  await toggleNotificaciones();
  if (Notification.permission === 'granted') {
    document.getElementById('notifBanner')?.classList.add('hidden');
    localStorage.removeItem(NOTIF_SNOOZE_KEY);
  } else {
    initNotifBanner(); // si lo denegó, refrescar al estado "bloqueadas"
  }
}

function posponerNotifBanner() {
  localStorage.setItem(NOTIF_SNOOZE_KEY, String(Date.now()));
  document.getElementById('notifBanner')?.classList.add('hidden');
}

function actualizarIconoCampana(activa) {
  const icon = document.getElementById('bellIcon');
  const btn  = document.getElementById('btnNotifBell');
  if (!icon || !btn) return;
  if (activa) {
    icon.className = 'ph-fill ph-bell text-lg';
    icon.style.color = 'var(--gold)';
    btn.style.borderColor  = 'rgba(201,168,76,0.4)';
  } else {
    icon.className = 'ph-bold ph-bell text-lg text-gray-400';
    icon.style.color = '';
    btn.style.borderColor  = '';
  }
}

// Inicializar estado de campana al cargar
(function initBellState() {
  if (_notifEnabled && Notification.permission === 'granted') {
    actualizarIconoCampana(true);
    iniciarSchedulerRecordatorio();
  } else if (_notifEnabled && Notification.permission !== 'granted') {
    // El permiso fue revocado manualmente
    _notifEnabled = false;
    localStorage.removeItem('notif_granted');
  }
  initNotifBanner();
})();

// ── Scheduler: revisar citas cada 5 min ──────────────────────
function iniciarSchedulerRecordatorio() {
  if (_notifSchedule) return; // ya corre
  _notifSchedule = setInterval(revisarProximaCita, 5 * 60 * 1000);
  revisarProximaCita(); // check inmediato
}

async function revisarProximaCita() {
  if (!currentUser || !_notifEnabled || Notification.permission !== 'granted') return;

  // Cero lecturas de Firestore: _citaCache es el espejo en vivo del listener
  // de citas (cargarCitasUsuario), que ya trae las citas por email/uid.
  const citas = Object.values(_citaCache);
  if (!citas.length) return;

  // Solo citas de los próximos 7 días
  const hoy = new Date();
  const fechas = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    fechas.push(d.toISOString().slice(0, 10));
  }

  const ahora  = new Date();
  const NOTIF_KEY = 'notif_sent_ids';
  const enviados  = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');

  for (const c of citas) {
    if (!fechas.includes(c.fecha)) continue;
    if (enviados.includes(c.id)) continue;

    const [hh, mm]  = (c.hora || '00:00').split(':').map(Number);
    const [yy, mo, dd] = (c.fecha || '').split('-').map(Number);
    const citaDate  = new Date(yy, mo - 1, dd, hh, mm);
    const diffMin   = (citaDate - ahora) / 60000;

    // Enviar notificación si faltan entre 25 y 35 minutos
    if (diffMin >= 25 && diffMin <= 35) {
      new Notification(`⏰ Tu cita se acerca — ${SHOP.nombreCorto || SHOP.nombre || 'Elegance'}`, {
        body:  `Tienes cita a las ${c.hora} (${c.servicioNombre || 'servicio'} con ${c.barbero || 'tu barbero'}). ¡Nos vemos pronto!`,
        icon:  SHOP.logo || '/icons/icon-192.png',
        badge: SHOP.logo || '/icons/icon-192.png',
        tag:   c.id
      });
      enviados.push(c.id);
      localStorage.setItem(NOTIF_KEY, JSON.stringify(enviados));
    }
  }
}

