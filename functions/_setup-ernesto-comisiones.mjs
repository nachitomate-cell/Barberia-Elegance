// Setea las comisiones por servicio de Ernesto (kronnos_woman).
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const key = JSON.parse(readFileSync('../service-account.json', 'utf-8'));
if (!getApps().length) initializeApp({ credential: cert(key) });
const db = getFirestore();

const overrides = {
  'aplicacion-tintura':          51,
  'babylights':                  51,
  'bano-color':                  51,
  'bloque-fantasia':             51,
  'corte-bob':                   42,
  'corte-bordado':               42,
  'corte-de-puntas':             42,
  'global':                      51,
  'masaje-brasil-cacao':         51,
  'masaje-capilar-nanno-botox':  51,
  'masaje-craneal':              42,
  'masaje-hidratacion-expres':   51,
  'mechas':                      51,
  'NrTJQ7hQYsLdBsjeWMNh':        42,  // Masaje de vitamino color spectrun LOREAL
  'rURQnBb4gWYDBn1wd22P':        42,  // Masaje absolut repair molecular LOREAL
  'T9scOXoiMReXMMiTmm6z':        51,  // Crecimiento Retoque
  'yqsLi55dNqTW0YFUtLwr':        51,  // Masaje Capilar (ácido hialurónico)
  'PefDvhpAZSRed6OfgR32':        51,  // Barrido de Color
  'rWP58fRwDS1PyCVERJcb':        42,  // corte promisión
  'kkJsG2o7fic24qKA9TnH':        51,  // crecimiento de raíces (L'Oreal)
  'oYlm4YacWiLRUA0H6TuX':        51,  // color completo (L'Oreal)
  '4pwCtI2O5hEaos2bUfJW':        42,  // Corte chasquilla
  'NAYaeNcP3X5yh4npDwWi':        51,  // Balayage
  'fzZPy75y6aP1FWOE1hsA':        51,  // Promo Otoño
  'ewFKGCKkEariDtNSbZPr':        42,  // Retoque de Raices (ALFA PARF)
  '61zaKwlnwdwQ9vDoSUOe':        42,  // brushing
  'kdZed0PpjBlQO1WGpO3Z':        42,  // planchado
  'vMJXiZalhtmDzjTAAWqY':        51,  // Peinados
  'QY9Sqsa02Ihhvpbgu2oY':        42,  // masaje de reconstrucción profunda
  'SsaXMQ8Mtrjz3LbI8aRi':        51,  // Botox alisado Brasil Cacau
  'uMTwVlHgLF6LtBBd7EY3':        42,  // Solo lavado de cabello
  'pyQREbF3KOndT63nusHj':        51,  // Tintura color completo
  'W7XFUtcltV7KX7hvYskA':        42,  // Corte Femenino
  'YlDzCRBEacj0Vej9Hi2x':        51,  // alisado keratina promoción
};

const ref = db.doc('tenants/kronnos_woman/barberos/ernesto');
const before = (await ref.get()).data();
console.log('Antes → overrides:', Object.keys(before.comisionPorServicio || {}).length);
await ref.update({ comisionPorServicio: overrides, updatedAt: new Date() });
const after = (await ref.get()).data();
console.log('Después → overrides:', Object.keys(after.comisionPorServicio || {}).length);
console.log('Contenido:', JSON.stringify(after.comisionPorServicio, null, 2));
console.log('\nGlobal de Ernesto sigue en:', after.comision + '% (no lo toco)');
console.log('\nNOTA: "Algaterapia" NO existe en el catálogo — se omitió (avisar al user para crear el servicio primero).');
