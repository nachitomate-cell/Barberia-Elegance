// subscriptionUtils.js
// Lógica de negocio para membresías: consulta, descuento y activación.
// Usa el SDK modular de Firebase (importado desde lib/firebase).

import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { servicioAKey } from './plans';
import { withTimeout } from './firestore-helpers';

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Construye el path del doc de usuario según el tenant.
 * Elegance → /users/{uid}   |   Otros → /tenants/{tid}/users/{uid}
 */
function userDocRef(tenantId, uid) {
  return tenantId === 'elegance'
    ? doc(db, 'users', uid)
    : doc(db, `tenants/${tenantId}/users`, uid);
}

function clienteDocRef(tenantId, phone) {
  return tenantId === 'elegance'
    ? doc(db, 'clientes', phone)
    : doc(db, `tenants/${tenantId}/clientes`, phone);
}

/**
 * Lee la suscripción activa de un usuario.
 * Retorna null si no existe o está vencida/cancelada.
 */
export async function leerSuscripcion(tenantId, uid) {
  const snap = await withTimeout(getDoc(userDocRef(tenantId, uid)), 10000, 'sub/leer');
  if (!snap.exists()) return null;
  const sub = snap.data()?.subscription;
  if (!sub) return null;
  if (sub.status !== 'active') return null;
  const vence = sub.currentPeriodEnd?.toDate?.() ?? new Date(0);
  if (vence < new Date()) return null; // vencida
  return sub;
}

/**
 * Verifica si un cliente (por teléfono) tiene membresía activa
 * con usos disponibles para el servicio dado.
 *
 * Retorna:
 *   { aplicable: true,  uid, sub, servicioKey, restantes }
 *   { aplicable: false, razon }
 */
export async function verificarMembresia(tenantId, telefono, servicioNombre) {
  const phone = normalizePhone(telefono);
  if (!phone) return { aplicable: false, razon: 'sin_telefono' };

  // 1. Buscar uid en clientes por teléfono
  const clienteSnap = await withTimeout(getDoc(clienteDocRef(tenantId, phone)), 10000, 'sub/cliente');
  if (!clienteSnap.exists()) return { aplicable: false, razon: 'sin_cuenta' };

  const uid = clienteSnap.data()?.uid;
  if (!uid) return { aplicable: false, razon: 'sin_uid' };

  // 2. Leer suscripción
  const sub = await leerSuscripcion(tenantId, uid);
  if (!sub) return { aplicable: false, razon: 'sin_suscripcion_activa' };

  // 3. Verificar usos disponibles para este tipo de servicio
  const servicioKey = servicioAKey(servicioNombre);
  if (!servicioKey) return { aplicable: false, razon: 'servicio_no_cubierto' };

  const restantes = sub.remainingServices?.[servicioKey] ?? 0;
  if (restantes <= 0) return { aplicable: false, razon: 'sin_usos', servicioKey };

  return { aplicable: true, uid, sub, servicioKey, restantes };
}

/**
 * Descuenta un uso de la membresía al confirmar una cita.
 * Llama SOLO después de verificarMembresia() → aplicable === true.
 *
 * @param {string} tenantId
 * @param {string} uid          UID del usuario
 * @param {string} servicioKey  'cortes' | 'barba' | 'masaje'
 * @returns {{ ok: boolean, restantes: number }}
 */
export async function usarServicioMembresia(tenantId, uid, servicioKey) {
  const userRef = userDocRef(tenantId, uid);

  // Transacción simple: decrementa solo si > 0 (increment(-1) con guard en reglas)
  await updateDoc(userRef, {
    [`subscription.remainingServices.${servicioKey}`]: increment(-1),
    'subscription.ultimoUso': serverTimestamp(),
  });

  // Leer nuevo valor para devolverlo
  const snap = await withTimeout(getDoc(userRef), 10000, 'sub/refresh');
  const restantes = snap.data()?.subscription?.remainingServices?.[servicioKey] ?? 0;
  return { ok: true, restantes };
}

/**
 * Activa o actualiza la suscripción de un usuario desde el admin.
 * No procesa pagos — solo escribe el estado en Firestore.
 *
 * @param {string} tenantId
 * @param {string} uid
 * @param {import('./plans').PLANES[keyof PLANES]} plan
 */
export async function activarSuscripcion(tenantId, uid, plan) {
  const ahora     = new Date();
  const vencimiento = new Date(ahora);
  vencimiento.setMonth(vencimiento.getMonth() + 1);

  await updateDoc(userDocRef(tenantId, uid), {
    subscription: {
      planId:            plan.id,
      status:            'active',
      currentPeriodEnd:  vencimiento,
      remainingServices: { ...plan.servicios },
      mrr:               plan.precio,
      startedAt:         serverTimestamp(),
      updatedAt:         serverTimestamp(),
    },
  });
}

/**
 * Cancela la suscripción (no borra, cambia status a 'canceled').
 */
export async function cancelarSuscripcion(tenantId, uid) {
  await updateDoc(userDocRef(tenantId, uid), {
    'subscription.status':    'canceled',
    'subscription.updatedAt': serverTimestamp(),
  });
}
