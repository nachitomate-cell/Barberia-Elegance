// ─── Auth Guard ───────────────────────────────────────────────
// IMPORTANTE: este archivo debe cargarse ULTIMO (ver dashboard.html).
// El callback de onAuthStateChanged puede disparar apenas se registra
// (lee IndexedDB local) y llama funciones de TODOS los modulos previos;
// si algun modulo no cargo aun, seria ReferenceError.
auth.onAuthStateChanged(async user => {
  // Deep link de anuncio: trackear apertura si el user está logueado
  if (user && !user.isAnonymous) {
    trackAperturaAnuncioDesdeUrl(user);
    _loadAnuncioOptOut();
  }
  // MODO PREVIEW: ignora el estado real de auth y ejecuta el flujo con mock user.
  // Solo la primera vez — llamadas subsecuentes (por cambios de auth) son no-op.
  if (PREVIEW) {
    if (currentUser) return;
    return runPreviewMode();
  }
  // Sesion "fantasma": anonima (residual del guard legacy) o real-sin-email
  // (cuentas vacias persistidas en IndexedDB de la PWA). Ambas hacen que el
  // dashboard se muestre como "Cliente" y/o crasheen leyendo
  // user.email.toLowerCase(). Las cerramos antes de dejar correr el resto.
  if (user && (user.isAnonymous || !user.email)) {
    try { await auth.signOut(); } catch(_) {}
    return; // El proximo callback con user=null redirige a registro.html.
  }
  if (!user) {
    if (_userUnsub)     { _userUnsub();     _userUnsub     = null; }
    if (_citasUnsub)    { _citasUnsub();    _citasUnsub    = null; }
    if (_premiosUnsub)  { _premiosUnsub();  _premiosUnsub  = null; }
    if (_pendingRewardsUnsub) { _pendingRewardsUnsub(); _pendingRewardsUnsub = null; }
    if (_lookbookUnsub) { _lookbookUnsub(); _lookbookUnsub = null; }
    if (_sfUnsub)       { _sfUnsub();       _sfUnsub       = null; }
    if (_productosUnsub) { _productosUnsub(); _productosUnsub = null; }
    if (_notifSchedule) { clearInterval(_notifSchedule); _notifSchedule = null; }
    // _chatUnsub vive en pwa-install.js (carga después de este archivo);
    // typeof evita ReferenceError si el callback dispara antes de que cargue.
    if (typeof _chatUnsub !== 'undefined' && _chatUnsub) { _chatUnsub(); _chatUnsub = null; }
    const _chatWidgetEl = document.getElementById('chatWidget');
    if (_chatWidgetEl) _chatWidgetEl.classList.add('hidden');
    // Preservar ?local=<tid> para que config.js resuelva el tenant correcto
    // al aterrizar en registro.html (sin esto cae al fallback 'elegance').
    window.location.href = 'registro.html' + window.location.search;
    return;
  }
  currentUser = user;
  initAuraAnimations();
  // Mostrar widget de chat (currentUser ya está asignado aquí)
  const _chatWidgetEl = document.getElementById('chatWidget');
  if (_chatWidgetEl) _chatWidgetEl.classList.remove('hidden');
  // Prefetch barberos en background para que el modal abra sin espera
  FDB.getBarberos().then(b => { _equipoBarberosCache = b; }).catch(() => {});

  // Config de rangos (nombres + beneficios definidos en el panel)
  loadRangos();
  // Planes anuales del Club (sólo Aura — falla silenciosamente en otros tenants)
  loadPlanesAnualesAura();

  subscribeUserData(user);

  _premiosUnsub = FDB.onPremiosChange(premios => {
    _premiosDynamic = premios;
    renderPremiosDashboard(premios);
    renderStamps(userStamps);
  });

  // Suscripción a redemptions pendientes del user — se llena en tiempo real
  // cuando la CF (Fase 2) otorga una recompensa, o cuando el propio user
  // genera un canje desde la tabla de premios. Se ordena por createdAt desc.
  subscribePendingRewards(user);

  initLookbook();
  initServicioFavorito(user);
  cargarServicios();
  cargarCitasUsuario(user);
  initProductosTab();
  cargarAnuncio();
  manejarDeepLinkRecordatorio();
  // Si el cliente ya había concedido permiso en una sesión previa, asegurar
  // que su token FCM esté registrado/fresco para recibir el push de 30 min.
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    registrarTokenPush();
  }
  initNotifBanner();
});
