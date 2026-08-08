'use strict';

// scripts/lib-clientes-existentes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Set de "no prospectar": los negocios que YA son clientes de SynapTech.
//  Los importadores de marketplaces (AgendaPro/Weibook) lo consultan para no
//  meter a un cliente en la cartera de prospección — mandarle un DM de ventas
//  a quien ya paga es la peor cara posible.
//
//  Se deriva de los tenants (regla de oro: listDocuments(), jamás .get() de la
//  colección) por nombre e Instagram. El match de nombre es por SUBSTRING
//  normalizado en ambos sentidos: el marketplace dice "Kronnos Studio Limache"
//  y el tenant se llama "Kronnos" — un igual exacto no los cruzaría.
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s) => String(s || '').toLowerCase().normalize('NFD')
  .replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

async function cargarClientes(db) {
  const nombres = new Set();
  const handles = new Set();
  try {
    const refs = await db.collection('tenants').listDocuments();
    await Promise.all(refs.map(async (r) => {
      const v = (await r.get()).data() || {};
      const n = norm(v.nombre || v.nombreFantasia || r.id);
      if (n.length >= 4) nombres.add(n);
      const ig = norm(v.instagram).replace(/\s/g, '');
      if (ig.length >= 3) handles.add(ig);
    }));
  } catch (e) { console.warn('[clientes] no pude cargar tenants:', e.message); }
  return { nombres, handles };
}

/** ¿Este negocio del marketplace ya es cliente? Nombre por substring, IG exacto. */
function esCliente(clientes, negocio, instagram) {
  const n = norm(negocio);
  const ig = norm(instagram).replace(/\s/g, '');
  if (ig && clientes.handles.has(ig)) return true;
  for (const c of clientes.nombres) {
    if (n === c || n.includes(c) || c.includes(n)) return true;
  }
  return false;
}

module.exports = { cargarClientes, esCliente, _norm: norm };
