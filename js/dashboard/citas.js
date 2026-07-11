async function cargarCitasUsuario(user) {
  if (_citasUnsub) { _citasUnsub(); _citasUnsub = null; }

  const contenedor = document.getElementById('profileCitasContent');
  if (!contenedor) return;

  contenedor.innerHTML = `<div class="flex justify-center py-6"><div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>`;

  _citasUnsub = FDB.onCitasByClienteChange(user.email, user.uid, async (citas) => {
    try {
      // Autocomplete: citas encontradas por clienteId sin email → parchear en Firestore
      const citasSinEmail = citas.filter(c => c.clienteId === user.uid && !c.clienteEmail);
      if (citasSinEmail.length) {
        let perfilNombre = '', perfilTelefono = '';
        try {
          const usnap = await FDB.usersCol().doc(user.uid).get();
          if (usnap.exists) {
            perfilNombre   = usnap.data().nombre   || '';
            perfilTelefono = usnap.data().telefono || '';
          }
        } catch (_) {}
        await Promise.all(citasSinEmail.map(c => {
          const patch = { clienteEmail: user.email };
          if (!c.clienteNombre   && perfilNombre)   patch.clienteNombre   = perfilNombre;
          if (!c.clienteTelefono && perfilTelefono) patch.clienteTelefono = perfilTelefono;
          // refleja los cambios en el array local también
          Object.assign(c, patch);
          return FDB.citasCol().doc(c.id).update(patch);
        }));
      }

      if (!citas.length) {
        contenedor.innerHTML = `
          <div class="bg-zinc-900 rounded-2xl px-5 py-8 text-center">
            <i class="ph-fill ph-calendar-x text-4xl text-white/10 mb-3 block"></i>
            <p class="text-sm text-zinc-500">Aún no tienes citas registradas.<br>¡Reserva tu primera cita!</p>
            <a href="index.html" class="btn-reservar inline-block mt-5 px-5 py-2.5 rounded-xl text-xs font-bold" style="background:var(--gold);color:#050505;">Reservar ahora</a>
          </div>`;
        return;
      }

      // Poblar caché para el modal
      citas.forEach(c => { _citaCache[c.id] = c; });

      // Si hay una cita recién completada (pendingGoogleReview=true) y el
      // tenant tiene URL de Google configurada → mostrar el modal de Google
      // DIRECTO, sin pasar por la tarjeta intermedia de feedback. Una sola
      // vez por sesión para no spammear al cliente cuando cambian las citas.
      // Fallback: si el tenant no tiene googleReviewUrl, mostrar el feedback
      // card original como antes.
      const citaGoogleReview = citas.find(c => c.pendingGoogleReview === true);
      const fContainer = document.getElementById('interactiveFeedbackContainer');
      const hasGoogleUrl = !!(window.SHOP && window.SHOP.googleReviewUrl);

      if (citaGoogleReview && hasGoogleUrl) {
        if (fContainer) fContainer.classList.add('hidden');
        if (!window._googleModalShownSession) {
          window._googleModalShownSession = true;
          // Pequeño delay para que el dashboard termine de renderizar antes del modal.
          setTimeout(() => mostrarGoogleReviewModal(citaGoogleReview.id), 1500);
        }
      } else if (citaGoogleReview) {
        // Tenant sin Google review URL → comportamiento original (feedback card)
        initFeedbackCard(citaGoogleReview);
      } else {
        if (fContainer) fContainer.classList.add('hidden');
      }

      const ahora   = new Date();
      const sorted  = [...citas].sort((a, b) =>
        (b.fecha || '').localeCompare(a.fecha || '') || (b.hora || '').localeCompare(a.hora || ''));

      const futuras = citas.filter(c => {
        const [yy, mo, dd] = (c.fecha || '').split('-').map(Number);
        const [hh, mmm]    = (c.hora  || '00:00').split(':').map(Number);
        return new Date(yy, mo - 1, dd, hh, mmm) > ahora && c.estado !== 'Cancelada';
      }).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

      const proxima    = futuras[0] || null;
      const _blk       = proxima ? _limiteBloqueado(proxima.fecha, proxima.hora) : false;
      const _blkCls    = _blk ? ' opacity-50 cursor-not-allowed' : '';

      // ─── Tarjeta Hero de Próxima Cita Activa en Pestaña Fidelización ───
      const heroCardEl = document.getElementById('heroProximaCitaCard');
      if (heroCardEl) {
        if (proxima) {
          const fechaStr = formatearFechaCita(proxima.fecha);
          const [_fy, _fm, _fd] = proxima.fecha.split('-').map(Number);
          const [_fh, _fmin]    = proxima.hora.split(':').map(Number);
          const diffMs  = new Date(_fy, _fm - 1, _fd, _fh, _fmin) - ahora;
          const diffH   = Math.round(diffMs / 3600000);
          const diffD   = Math.floor(diffMs / 86400000);
          const enTiempo = diffH <= 2
            ? `<span class="text-red-400 font-bold">¡En ${diffH <= 0 ? 'menos de 1h' : diffH + 'h'}!</span>`
            : diffD === 0 ? `<span style="color:var(--gold)" class="font-bold">Hoy</span>`
            : diffD === 1 ? `<span style="color:var(--gold)" class="font-bold">Mañana</span>`
            : `En ${diffD} días`;

          heroCardEl.innerHTML = `
            <div class="rounded-3xl p-5 relative overflow-hidden shadow-lg mb-5"
                 style="background:linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.04)); border:1px solid var(--gold-dim);">
              <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-xl pointer-events-none" style="background:var(--gold-glow);"></div>
              <div class="relative z-10">
                <div class="flex items-center justify-between mb-3.5">
                  <p class="text-[9px] font-black uppercase tracking-[0.2em]" style="color:var(--gold);">📅 Tu Próxima Cita</p>
                  <span class="proxima-cita-chip text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse" style="background:var(--gold-glow); color:var(--gold); border:1px solid var(--gold-dim);">
                    ${proxima.estado || 'Confirmada'}
                  </span>
                </div>
                <div class="flex items-start gap-4 mb-4">
                  <div class="proxima-cita-icon-wrap w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style="background:var(--gold-glow); border:1px solid var(--gold-dim);">
                    <i class="ph-fill ph-calendar-blank text-xl" style="color:var(--gold);"></i>
                  </div>
                  <div class="flex-1 min-w-0 text-left">
                    <h4 class="text-sm font-black text-white leading-tight truncate">${proxima.servicioNombre || 'Servicio'}</h4>
                    <p class="text-xs text-white/70 mt-1.5 flex items-center gap-1">
                      <i class="ph-fill ph-user-circle text-[13px] text-zinc-400"></i> ${proxima.barbero || 'Profesional'}
                    </p>
                    <p class="text-xs text-white/50 mt-0.5 flex items-center gap-1">
                      <i class="ph-fill ph-clock text-[13px] text-zinc-400"></i> ${fechaStr} a las ${proxima.hora} hrs
                    </p>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-xs text-zinc-300 font-bold leading-tight">${enTiempo}</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button onclick="abrirModalReagendar('${proxima.id}')"
                          class="flex items-center justify-center gap-1.5 text-[10px] font-bold py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 active:scale-[0.98] transition-all text-white${_blkCls}">
                    <i class="ph-bold ph-calendar-dots text-sm"></i> Reagendar
                  </button>
                  <button onclick="abrirModalCancelar('${proxima.id}')"
                          class="flex items-center justify-center gap-1.5 text-[10px] font-bold py-2.5 rounded-xl border border-red-500/20 bg-red-950/15 active:scale-[0.98] transition-all text-red-400 hover:bg-red-950/30${_blkCls}">
                    <i class="ph-bold ph-x-circle text-sm"></i> Cancelar
                  </button>
                  <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(window.SHOP?.nombre + ' ' + (window.SHOP?.direccion || ''))}"
                     target="_blank"
                     class="flex items-center justify-center gap-1.5 text-[10px] font-bold py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 active:scale-[0.98] transition-all text-white">
                    <i class="ph-bold ph-map-pin text-sm"></i> Cómo llegar
                  </a>
                </div>
                <button onclick="agregarCitaACalendario('${proxima.id}')"
                        class="mt-2 w-full flex items-center justify-center gap-2 text-[10px] font-bold py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950/20 active:scale-[0.98] transition-all text-white/80">
                  <i class="ph-bold ph-calendar-plus text-sm"></i> Añadir a Google Calendar
                </button>
              </div>
            </div>`;
          if ((window.CURRENT_TENANT_ID || 'elegance') === 'aura') {
            const _aTiempo = diffH <= 2
              ? `<span style="font-size:10px;font-weight:800;color:#f87171;">¡En ${diffH <= 0 ? 'menos de 1h' : diffH + 'h'}!</span>`
              : diffD === 0
                ? `<span style="font-size:10px;font-weight:800;color:#93c5fd;">Hoy</span>`
                : diffD === 1
                  ? `<span style="font-size:10px;font-weight:800;color:#93c5fd;">Mañana</span>`
                  : `<span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);">En ${diffD} días</span>`;
            heroCardEl.innerHTML = `
              <div class="rounded-3xl relative overflow-hidden mb-5" style="background:linear-gradient(150deg,#0a1628 0%,#0d1f3c 60%,#001433 100%);border:1px solid rgba(255,255,255,0.08);box-shadow:0 20px 60px -15px rgba(0,20,60,0.45),inset 0 1px 0 rgba(255,255,255,0.06);">
                <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse at 85% -10%,rgba(0,53,128,0.4) 0%,transparent 55%);"></div>
                <div class="relative z-10 flex items-center justify-between px-5 pt-5 pb-0">
                  <div class="flex items-center gap-1.5">
                    <i class="ph-fill ph-calendar-check" style="font-size:13px;color:rgba(147,197,253,0.7);"></i>
                    <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.2em;color:rgba(255,255,255,0.4);">Tu Próxima Cita</span>
                  </div>
                  <span style="font-size:9px;font-weight:700;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.28);color:#86efac;padding:2px 10px;border-radius:100px;">${proxima.estado || 'Confirmada'}</span>
                </div>
                <div class="relative z-10 px-5 pt-4 pb-5">
                  <div class="flex items-start gap-3 mb-4">
                    <div class="flex-1 min-w-0">
                      <h4 class="font-black text-white leading-tight" style="font-size:1.1rem;">${proxima.servicioNombre || 'Servicio'}</h4>
                      <div class="flex items-center gap-1.5 mt-1.5">
                        <i class="ph-fill ph-user-circle" style="font-size:14px;color:rgba(255,255,255,0.3);"></i>
                        <span style="font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;">${proxima.barbero || 'Profesional'}</span>
                      </div>
                    </div>
                    <div class="text-right shrink-0 pt-0.5">
                      <p class="font-black text-white" style="font-size:2rem;line-height:1;letter-spacing:-0.03em;">${proxima.hora}</p>
                      <p style="font-size:9px;color:rgba(255,255,255,0.35);font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">hrs</p>
                    </div>
                  </div>
                  <div class="flex items-center justify-between px-3.5 py-2.5 rounded-2xl mb-4" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">
                    <div class="flex items-center gap-2">
                      <i class="ph-fill ph-calendar-blank" style="font-size:14px;color:rgba(147,197,253,0.6);"></i>
                      <span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.6);">${fechaStr}</span>
                    </div>
                    ${_aTiempo}
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <button onclick="abrirModalReagendar('${proxima.id}')" class="flex flex-col items-center gap-1 py-3 rounded-2xl active:scale-[0.96] transition-all${_blkCls}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);">
                      <i class="ph-bold ph-calendar-dots" style="font-size:18px;color:rgba(147,197,253,0.85);"></i>
                      <span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.04em;">Reagendar</span>
                    </button>
                    <button onclick="abrirModalCancelar('${proxima.id}')" class="flex flex-col items-center gap-1 py-3 rounded-2xl active:scale-[0.96] transition-all${_blkCls}" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);">
                      <i class="ph-bold ph-x-circle" style="font-size:18px;color:rgba(248,113,113,0.85);"></i>
                      <span style="font-size:9px;font-weight:700;color:rgba(248,113,113,0.7);text-transform:uppercase;letter-spacing:0.04em;">Cancelar</span>
                    </button>
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(window.SHOP?.nombre + ' ' + (window.SHOP?.direccion || ''))}" target="_blank" class="flex flex-col items-center gap-1 py-3 rounded-2xl active:scale-[0.96] transition-all" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);">
                      <i class="ph-bold ph-map-pin" style="font-size:18px;color:rgba(167,243,208,0.85);"></i>
                      <span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.04em;">Cómo llegar</span>
                    </a>
                  </div>
                  <button onclick="agregarCitaACalendario('${proxima.id}')" class="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-2xl active:scale-[0.96] transition-all" style="background:rgba(147,197,253,0.08);border:1px solid rgba(147,197,253,0.18);">
                    <i class="ph-bold ph-calendar-plus" style="font-size:14px;color:rgba(147,197,253,0.85);"></i>
                    <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.04em;">Añadir a Google Calendar</span>
                  </button>
                </div>
              </div>`;
          }
          heroCardEl.classList.remove('hidden');
        } else {
          heroCardEl.classList.add('hidden');
        }
      }

      // Últimas visitas en tab Lealtad
      const uvSection = document.getElementById('ultimasVisitasSection');
      const uvList    = document.getElementById('ultimasVisitasList');
      if (uvSection && uvList) {
        const ultimas = sorted.filter(c => c.estado === 'Completada').slice(0, 3);
        if (ultimas.length > 0) {
          uvList.innerHTML = ultimas.map(c => `
            <div class="flex items-center gap-3 rounded-xl px-4 py-3" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background:var(--gold-glow);border:1px solid var(--gold-dim);">
                <i class="ph-fill ph-scissors text-sm" style="color:var(--gold);"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-white truncate">${c.servicioNombre || 'Servicio'}</p>
                <p class="text-[11px]" style="color:rgba(255,255,255,0.35);">${c.barbero ? c.barbero + ' · ' : ''}${formatearFechaCita(c.fecha)}</p>
              </div>
              <i class="ph-fill ph-check-circle text-sm shrink-0" style="color:var(--gold);opacity:0.45;"></i>
            </div>`).join('');
          uvSection.classList.remove('hidden');
        } else {
          uvSection.classList.add('hidden');
        }
      }

      const total      = citas.length;
      const completadas = citas.filter(c => c.estado === 'Completada').length;
      let html = '';

      // ─ Tarjeta próxima cita ─
      if (proxima) {
        const fechaStr = formatearFechaCita(proxima.fecha);
        const [_fy, _fm, _fd] = proxima.fecha.split('-').map(Number);
        const [_fh, _fmin]    = proxima.hora.split(':').map(Number);
        const diffMs  = new Date(_fy, _fm - 1, _fd, _fh, _fmin) - ahora;
        const diffH   = Math.round(diffMs / 3600000);
        const diffD   = Math.floor(diffMs / 86400000);
        const enTiempo = diffH <= 2
          ? `<span class="text-red-400 font-bold">¡En ${diffH <= 0 ? 'menos de 1h' : diffH + 'h'}!</span>`
          : diffD === 0 ? `<span style="color:var(--gold)" class="font-bold">Hoy</span>`
          : diffD === 1 ? `<span style="color:var(--gold)" class="font-bold">Mañana</span>`
          : `En ${diffD} días`;

        html += `
          <div class="mb-3 rounded-2xl p-4 relative overflow-hidden" style="background:linear-gradient(135deg,rgba(201,168,76,0.1),rgba(201,168,76,0.04));border:1px solid rgba(201,168,76,0.35);">
            <div class="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-xl" style="background:rgba(201,168,76,0.1);"></div>
            <p class="text-[9px] font-black uppercase tracking-widest mb-2" style="color:var(--gold);">📅 Próxima Cita</p>
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1">
                <p class="text-sm font-black text-white leading-tight">${proxima.servicioNombre || 'Servicio'}</p>
                <p class="text-xs text-white/60 mt-0.5">${proxima.barbero || ''} · ${proxima.hora} hrs</p>
                <p class="text-xs text-white/60">${fechaStr}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-xs">${enTiempo}</p>
                <span class="proxima-estado-chip inline-block mt-1.5 text-[9px] font-bold px-2 py-1 rounded-md" style="background:rgba(201,168,76,0.15);color:var(--gold);">${proxima.estado || 'Confirmada'}</span>
              </div>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button onclick="abrirModalReagendar('${proxima.id}')"
                class="reagendar-proxima-btn flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-xl border active:scale-[0.98] transition-all${_blkCls}"
                style="color:var(--gold);">
                <i class="ph-bold ph-calendar-dots text-sm"></i> Reagendar
              </button>
              <button onclick="abrirModalCancelar('${proxima.id}')"
                class="flex items-center justify-center gap-1.5 text-red-400/80 text-xs font-semibold py-2 rounded-xl border border-red-500/20 bg-red-950/20 active:scale-[0.98] transition-all hover:bg-red-950/40${_blkCls}">
                <i class="ph-bold ph-x-circle text-sm"></i> Cancelar
              </button>
            </div>
            <button onclick="agregarCitaACalendario('${proxima.id}')"
              class="mt-2 w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-xl border border-zinc-800 hover:border-zinc-700 active:scale-[0.98] transition-all text-white/80">
              <i class="ph-bold ph-calendar-plus text-sm"></i> Añadir a Google Calendar
            </button>
          </div>`;
      } else {
        html += `
          <div class="mb-3 bg-zinc-900 rounded-2xl px-5 py-4 flex items-center gap-3">
            <i class="ph-fill ph-calendar-blank text-2xl text-white/20"></i>
            <div>
              <p class="text-sm font-bold text-white/50">Sin próximas citas</p>
              <a href="index.html" class="text-xs font-bold" style="color:var(--gold);">Reservar ahora →</a>
            </div>
          </div>`;
      }

      // ─ Stats ─
      html += `
        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="bg-zinc-900 rounded-2xl px-3 py-3 text-center">
            <p class="text-2xl font-black text-white">${total}</p>
            <p class="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Total</p>
          </div>
          <div class="bg-zinc-900 rounded-2xl px-3 py-3 text-center">
            <p class="text-2xl font-black" style="color:var(--gold);">${futuras.length}</p>
            <p class="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Próximas</p>
          </div>
          <div class="bg-zinc-900 rounded-2xl px-3 py-3 text-center">
            <p class="text-2xl font-black text-white/50">${completadas}</p>
            <p class="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Completadas</p>
          </div>
        </div>`;

      // ─ Historial ─
      html += `<div class="space-y-2">`;
      for (const c of sorted.slice(0, 8)) {
        const esFutura = futuras.some(f => f.id === c.id);
        const iconE = c.estado === 'Completada' ? 'ph-check-circle'
                    : c.estado === 'Cancelada'  ? 'ph-x-circle'
                    : 'ph-clock';
        const iconColor = c.estado === 'Completada' ? 'style="color:var(--gold);" cita-estado-completada'
                        : c.estado === 'Cancelada'  ? 'class="text-red-400 cita-estado-cancelada"'
                        : 'class="text-zinc-500 cita-estado-pendiente"';
        const estadoBadge = c.estado === 'Cancelada'
          ? `<span class="shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 cita-estado-cancelada">${c.estado}</span>`
          : c.estado === 'Completada'
          ? `<span class="shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md cita-estado-completada" style="background:var(--gold-glow);color:var(--gold);">${c.estado}</span>`
          : `<span class="shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/6 text-zinc-400 cita-estado-pendiente">${c.estado || 'Agendada'}</span>`;
        const _blkC = esFutura ? _limiteBloqueado(c.fecha, c.hora) : false;
        const _blkCC = _blkC ? ' opacity-50 cursor-not-allowed' : '';
        const cancelBtn = esFutura
          ? `<div class="flex gap-1 shrink-0">
               <button onclick="abrirModalReagendar('${c.id}')" title="Reagendar cita"
                 class="reagendar-hist-btn w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90${_blkCC}">
                 <i class="ph-bold ph-calendar-dots text-sm"></i>
               </button>
               <button onclick="abrirModalCancelar('${c.id}')" title="Cancelar cita"
                 class="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/60 hover:text-red-400 hover:bg-red-950/30 transition-all active:scale-90${_blkCC}">
                 <i class="ph-bold ph-x text-sm"></i>
               </button>
             </div>`
          : '';

        html += `
          <div class="bg-zinc-900 rounded-xl px-4 py-3 flex items-center gap-3">
            <i class="ph-fill ${iconE} text-lg shrink-0" ${iconColor}></i>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-white truncate">${c.servicioNombre || 'Servicio'}</p>
              <p class="text-xs text-zinc-500">${formatearFechaCita(c.fecha)} · ${c.hora}</p>
            </div>
            ${estadoBadge}
            ${cancelBtn}
          </div>`;
      }
      html += `</div>`;

      // ─ Banner cross-selling post-cita ─
      if (_isProductsEnabled && completadas > 0) {
        html += `
          <div class="mt-4 p-4 rounded-xl flex items-center justify-between gap-3"
               style="background:linear-gradient(to right,#111115,#0a0a0d);border:1px solid rgba(212,175,55,0.28);">
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-black uppercase tracking-widest mb-1" style="color:rgba(212,175,55,0.6);">Para tu próxima cita</p>
              <p class="text-xs text-gray-300 leading-snug">Mantén tu estilo como el primer día. Descubre nuestras ceras y pomadas.</p>
            </div>
            <button onclick="switchTab('productos')"
              class="shrink-0 px-3 py-2 rounded-lg text-xs font-bold text-black active:scale-95 transition-all"
              style="background:#D4AF37;">Ver Tienda</button>
          </div>`;
      }

      contenedor.innerHTML = html;

      // ─ Perfil de visitas ─
      const completadasArr = citas.filter(c => c.estado === 'Completada');
      if (completadasArr.length > 0) {
        const svcCount = {}, barCount = {};
        completadasArr.forEach(c => {
          if (c.servicioNombre) svcCount[c.servicioNombre] = (svcCount[c.servicioNombre] || 0) + 1;
          if (c.barbero)        barCount[c.barbero]        = (barCount[c.barbero]        || 0) + 1;
        });
        const topSvc = Object.entries(svcCount).sort((a,b) => b[1]-a[1])[0]?.[0];
        const topBar = Object.entries(barCount).sort((a,b) => b[1]-a[1])[0]?.[0];
        if (topSvc || topBar) {
          try {
            await FDB.usersCol().doc(user.uid).update({
              servicioFrecuente: topSvc || null,
              barberoFrecuente:  topBar || null,
            });
          } catch (_) {}
          const card = document.getElementById('perfilVisitasCard');
          if (card) {
            const el = document.getElementById('perfilServicio');
            const eb = document.getElementById('perfilBarbero');
            if (el) el.textContent = topSvc || '—';
            if (eb) eb.textContent = topBar || '—';
            card.classList.remove('hidden');
          }
        }
      }
    } catch (e) {
      console.warn('[Perfil] Error renderizando citas en tiempo real:', e.message);
      contenedor.innerHTML = `<p class="text-xs text-gray-600 text-center py-4">Error al renderizar citas.</p>`;
    }
  }, (err) => {
    console.warn('[Perfil] Error cargando citas en tiempo real:', err.message);
    contenedor.innerHTML = `<p class="text-xs text-gray-600 text-center py-4">No se pudieron cargar las citas en tiempo real.</p>`;
  });
}

function formatearFechaCita(fechaStr) {
  if (!fechaStr) return '—';
  const [yy, mo, dd] = fechaStr.split('-').map(Number);
  const d = new Date(yy, mo - 1, dd);
  return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Modals de Citas (Reagendar / Cancelar) ──────────────────
let _citaSeleccionadaId = null;

function _limiteBloqueado(fechaStr, horaStr) {
  const lim = window._minutosLimiteReagendar || 0;
  if (!lim || !fechaStr || !horaStr) return false;
  const [y, m, d] = fechaStr.split('-').map(Number);
  const [hh, mm] = horaStr.split(':').map(Number);
  const diffMin = (new Date(y, m - 1, d, hh, mm) - Date.now()) / 60000;
  return diffMin >= 0 && diffMin <= lim;
}

function abrirModalReagendar(id) {
  _citaSeleccionadaId = id;
  const cache = window._citaCache || {};
  const cita = cache[id] || null;
  if (cita && _limiteBloqueado(cita.fecha, cita.hora)) {
    const lim = window._minutosLimiteReagendar;
    showToast(lim >= 60
      ? `No puedes reagendar con menos de ${Math.round(lim / 60)}h de anticipación`
      : `No puedes reagendar con menos de ${lim} min de anticipación`, 'err');
    return;
  }
  if (cita) {
    const fechaStr = formatearFechaCita(cita.fecha);
    const infoEl = document.getElementById('reagendarCitaInfo');
    if (infoEl) {
      infoEl.innerHTML = `
        <p class="text-white font-bold text-sm">${cita.servicioNombre || 'Servicio'}</p>
        <p class="text-[10px] text-zinc-400 mt-1">${fechaStr} a las ${cita.hora} hrs</p>
      `;
    }
  }
  const modalEl = document.getElementById('reagendarCitaModal');
  if (modalEl) modalEl.classList.remove('hidden');
}

function cerrarModalReagendar() {
  const modalEl = document.getElementById('reagendarCitaModal');
  if (modalEl) modalEl.classList.add('hidden');
}

async function confirmarReagendamiento() {
  if (!_citaSeleccionadaId) return;
  const btn = document.getElementById('btnConfirmarReagendamiento');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Procesando...';
  }
  try {
    await FDB.updateCitaEstado(_citaSeleccionadaId, 'Cancelada');
    showToast('🔄 Cita cancelada. Redirigiendo...', 'ok');
    cerrarModalReagendar();
    setTimeout(() => {
      window.location.href = 'index.html' + window.location.search;
    }, 1200);
  } catch (e) {
    console.error('[Reagendar] Error:', e);
    showToast('No se pudo cancelar la cita anterior', 'err');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sí, elegir nuevo horario';
    }
  }
}

function abrirModalCancelar(id) {
  _citaSeleccionadaId = id;
  const cache = window._citaCache || {};
  const cita = cache[id] || null;
  if (cita && _limiteBloqueado(cita.fecha, cita.hora)) {
    const lim = window._minutosLimiteReagendar;
    showToast(lim >= 60
      ? `No puedes cancelar con menos de ${Math.round(lim / 60)}h de anticipación`
      : `No puedes cancelar con menos de ${lim} min de anticipación`, 'err');
    return;
  }
  if (cita) {
    const fechaStr = formatearFechaCita(cita.fecha);
    const infoEl = document.getElementById('cancelCitaInfo');
    if (infoEl) {
      infoEl.innerHTML = `
        <p class="text-white font-bold text-sm">${cita.servicioNombre || 'Servicio'}</p>
        <p class="text-[10px] text-zinc-400 mt-1">${fechaStr} a las ${cita.hora} hrs</p>
      `;
    }
  }
  const modalEl = document.getElementById('cancelCitaModal');
  if (modalEl) modalEl.classList.remove('hidden');
}

function cerrarModalCancelar() {
  const modalEl = document.getElementById('cancelCitaModal');
  if (modalEl) modalEl.classList.add('hidden');
}

// Añadir la próxima cita al calendario del cliente (Google Calendar template URL).
// Funciona en cualquier dispositivo: en móvil con la app de Google Calendar instalada
// abre la app; en escritorio o sin app abre calendar.google.com pre-rellenado.
function agregarCitaACalendario(citaId) {
  const cache = window._citaCache || {};
  const cita  = cache[citaId];
  if (!cita || !cita.fecha || !cita.hora) {
    if (typeof showToast === 'function') showToast('No se pudo leer la cita', 'err');
    return;
  }
  const shop = window.SHOP || {};
  const [yy, mo, dd] = cita.fecha.split('-').map(Number);
  const [hh, mm]     = cita.hora.split(':').map(Number);
  const dur   = parseInt(cita.duracionServicio || cita.duracion || 30, 10) || 30;
  const start = new Date(yy, mo - 1, dd, hh, mm);
  const end   = new Date(start.getTime() + dur * 60000);
  const fmt = d => {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  };
  const tienda = shop.nombre || shop.nombreCorto || 'Barbería';
  const titulo = `${cita.servicioNombre || 'Cita'} — ${tienda}`;
  const detalles = [
    cita.barbero ? `Barbero: ${cita.barbero}` : '',
    `Reservado en ${tienda}.`
  ].filter(Boolean).join('\n');
  const ubicacion = shop.direccion || tienda;
  const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text='     + encodeURIComponent(titulo)
    + '&dates='    + fmt(start) + '/' + fmt(end)
    + '&details='  + encodeURIComponent(detalles)
    + '&location=' + encodeURIComponent(ubicacion);
  window.open(url, '_blank', 'noopener');
}
window.agregarCitaACalendario = agregarCitaACalendario;

async function confirmarCancelacion() {
  if (!_citaSeleccionadaId) return;
  const btn = document.getElementById('btnConfirmarCancelacion');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Cancelando...';
  }
  try {
    await FDB.updateCitaEstado(_citaSeleccionadaId, 'Cancelada');
    showToast('✅ Cita cancelada correctamente', 'ok');
    cerrarModalCancelar();
  } catch (e) {
    console.error('[Cancelar] Error:', e);
    showToast('No se pudo cancelar la cita', 'err');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Sí, cancelar mi cita';
    }
  }
}

