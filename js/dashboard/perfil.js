// ─── Guardar perfil ───────────────────────────────────────────
// ─── Helper: ref a clientes/{phone} respetando tenant ────────────
function clientesDocRef(normalizedPhone) {
  const tid = window.CURRENT_TENANT_ID || 'elegance';
  const fs  = firebase.firestore();
  return tid === 'elegance'
    ? fs.collection('clientes').doc(normalizedPhone)
    : fs.collection('tenants').doc(tid).collection('clientes').doc(normalizedPhone);
}

async function guardarPerfil() {
  if (!currentUser) return;
  const nombre          = document.getElementById('editNombre').value.trim();
  const email           = document.getElementById('editEmail').value.trim();
  const telefono        = document.getElementById('editTelefono').value.trim();
  const cumpleEl        = document.getElementById('editFechaNacimiento');
  const fechaNacimiento = (!cumpleEl.readOnly && cumpleEl.value) ? cumpleEl.value : null;

  if (!nombre) { showToast('El nombre no puede estar vacío.', 'err'); return; }
  if (telefono && !validatePhone(telefono)) {
    showToast('Teléfono inválido. Ej: +56 9 1234 5678', 'err');
    return;
  }

  const btn = document.querySelector('[onclick="guardarPerfil()"]');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  try {
    // Actualizar users/{uid} — persistimos telefonoSuf9 (últimos 9 dígitos)
    // como índice denormalizado para que la CF sellosTenant pueda resolver
    // este uid aunque el teléfono en la cita venga con formato distinto.
    const _telDigits = String(telefono || '').replace(/\D+/g, '');
    const telefonoSuf9 = _telDigits.length >= 9 ? _telDigits.slice(-9) : '';
    const updateData = { nombre, email, telefono };
    if (telefonoSuf9) updateData.telefonoSuf9 = telefonoSuf9;
    if (fechaNacimiento !== null) updateData.fechaNacimiento = fechaNacimiento;
    await FDB.usersCol().doc(currentUser.uid).update(updateData);
    await currentUser.updateProfile({ displayName: nombre });
    if (email && email !== currentUser.email) await currentUser.updateEmail(email);

    // Sincronizar clientes/{phone} con cumpleDia para el cron de cumpleaños.
    // Es SECUNDARIO: si ese doc ya pertenece a otra cuenta (mismo teléfono,
    // otro uid — p. ej. la cita se registró bajo otro usuario), las reglas
    // rechazan la escritura. Eso NO debe bloquear el guardado del perfil,
    // cuya fuente de verdad es users/{uid} (ya guardado arriba).
    const normalizedPhone = telefono.replace(/\D/g, '');
    if (normalizedPhone) {
      const clienteData = {
        nombre,
        telefono,
        uid: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (fechaNacimiento) {
        const parts = fechaNacimiento.split('-'); // ["YYYY","MM","DD"]
        clienteData.fechaNacimiento = fechaNacimiento;
        clienteData.cumpleDia       = `${parts[1]}-${parts[2]}`;
      }
      try {
        await clientesDocRef(normalizedPhone).set(clienteData, { merge: true });
      } catch (e2) {
        console.warn(`[Perfil] No se pudo sincronizar clientes/${normalizedPhone} (probable colisión de teléfono con otra cuenta):`, e2.code || e2.message);
      }
    }

    document.getElementById('profileName').textContent  = nombre;
    document.getElementById('profileEmail').textContent = email;
    const msg = document.getElementById('profileSaveMsg');
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
    showToast('Datos guardados', 'ok');
  } catch (e) {
    if (e.code === 'auth/requires-recent-login') {
      showToast('Para cambiar el correo, vuelve a iniciar sesión.', 'err');
    } else {
      showToast('Error: ' + e.message, 'err');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = ''; }
  }
}

async function signOut() {
  await auth.signOut();
  window.location.href = 'registro.html' + window.location.search;
}

function confirmDeleteAccount() { document.getElementById('deleteModal').classList.remove('hidden'); }
function closeDeleteModal()     { document.getElementById('deleteModal').classList.add('hidden'); }

async function deleteAccount() {
  if (!currentUser) return;
  try {
    await FDB.usersCol().doc(currentUser.uid).delete();
    await currentUser.delete();
    window.location.href = 'index.html' + window.location.search;
  } catch (err) {
    closeDeleteModal();
    if (err.code === 'auth/requires-recent-login') {
      showToast('Por seguridad, cierra sesión e ingresa de nuevo primero.', 'err');
    } else {
      showToast('Error al eliminar. Intenta de nuevo.', 'err');
    }
  }
}

// ────────────────────────────────────────────────────────────────
//  NOTIFICACIONES
// ────────────────────────────────────────────────────────────────
