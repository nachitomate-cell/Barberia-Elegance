# Registro de Actividades de Tratamiento (RAT) — SynapTech SpA

Documento interno exigido por el artículo 15 quinquies de la Ley 21.719. Se mantiene actualizado por el DPO. Entra en vigor con la ley (diciembre 2026).

**Última actualización:** 2026-07-11
**Responsable interno del RAT:** Ignacio Mateluna (DPO transitorio)
**Vigencia:** el RAT se revisa cada 6 meses o cada vez que se agregue una nueva actividad de tratamiento, sub-encargado o funcionalidad.

---

## 1. Datos de la organización

- **Razón social:** SynapTech SpA
- **RUT:** [por completar]
- **Domicilio legal:** [por completar]
- **Representante legal:** Ignacio Mateluna Muñoz
- **Correo protección de datos:** privacidad@synaptechspa.cl
- **WhatsApp:** +56 9 8356 8212
- **Sitio:** synaptechspa.cl · bioo.cl

---

## 2. Marco general de tratamiento

SynapTech actúa en dos calidades:

| Rol | Actividades cubiertas |
|-----|----------------------|
| **Responsable** | Leads inbound (empieza.html), correo de contacto, contabilidad interna, comunicaciones comerciales propias, RRHH, gestión del propio equipo. |
| **Encargado (por cuenta de las barberías/salones/creadores)** | Toda la operación de agenda, fidelización, notificaciones, pagos, facturación, Bioo y Corte al Lápiz para los tenants. |

Cuando SynapTech actúa como Encargado, el tratamiento se rige por el DPA anexo al Contrato SaaS.

---

## 3. Actividades de tratamiento — SynapTech como Encargado

### 3.1 Gestión de agenda y reservas

- **Categorías de titulares:** Clientes finales del local, personal del local.
- **Categorías de datos:** nombre, teléfono, correo, historial de servicios, notas del barbero, preferencias.
- **Finalidad:** gestionar reservas, cancelaciones y ejecución del servicio.
- **Base legal:** ejecución de la relación contractual entre local y cliente (art. 12 Ley 21.719).
- **Retención:** durante la vigencia del tenant + 30 días post-terminación (portabilidad) + retención tributaria SII 6 años para citas facturadas.
- **Sub-encargados:** Google/Firebase (hosting, DB), Resend (email confirmaciones).
- **Transferencias internacionales:** sí — datos en Google Cloud (US, con cláusulas contractuales de Google Cloud).
- **Medidas de seguridad:** control de acceso por roles + custom claims + reglas Firestore por tenant.

### 3.2 Programa de fidelización (sellos, canjes, membresías)

- **Categorías de titulares:** Clientes finales.
- **Categorías de datos:** identidad, sellos acumulados, historial de canjes, membresías activas.
- **Finalidad:** operar el club y sus beneficios.
- **Base legal:** contrato entre local y cliente + consentimiento del cliente al inscribirse.
- **Retención:** igual que 3.1.
- **Sub-encargados:** Google/Firebase.
- **Medidas de seguridad:** reglas Firestore que restringen lectura al propio uid del cliente.

### 3.3 Notificaciones (Push FCM, Email, WhatsApp)

- **Categorías de titulares:** Clientes finales, personal del local.
- **Categorías de datos:** tokens FCM, correo, teléfono, contenido operativo del mensaje (fecha/hora/servicio).
- **Finalidad:** recordatorios, confirmaciones, avisos operacionales, comunicaciones comerciales (con opt-in explícito).
- **Base legal:** consentimiento del titular (opt-in para WhatsApp y campañas comerciales); interés legítimo para recordatorios operacionales de citas ya agendadas.
- **Retención:** tokens FCM se rotan y se marcan inactivos al no recibir eco; opt-outs se persisten indefinidamente para respetar la baja.
- **Sub-encargados:** Google Firebase Messaging, Meta (WhatsApp Cloud API), Resend.
- **Transferencias internacionales:** sí — US e Irlanda.
- **Medidas de seguridad:** cuarto candado de opt-in en `notificarCita` (whatsapp-notif.js); rate-limit por tenant; kill-switch `_system/whatsapp_notif`.

### 3.4 Pagos online (membresías / arriendo sillón / Bioo)

- **Categorías de titulares:** Clientes finales.
- **Categorías de datos:** identidad básica, monto, medio de pago (procesado por la pasarela, no almacenado en Firestore).
- **Finalidad:** cobrar el servicio o membresía.
- **Base legal:** ejecución de contrato.
- **Retención:** transacciones se conservan por retención tributaria SII (6 años).
- **Sub-encargados:** Mercado Pago Chile, Stripe.
- **Medidas de seguridad:** SynapTech no almacena datos de tarjeta; recibe solo confirmaciones vía webhook con firma verificada.

### 3.5 Emisión de DTE (facturación electrónica)

- **Categorías de titulares:** Clientes finales, barberos (para BHE de terceros).
- **Categorías de datos:** RUT, nombre, monto, servicio, folio DTE.
- **Finalidad:** cumplir obligaciones tributarias del local o del barbero.
- **Base legal:** obligación legal del Cliente (SII).
- **Retención:** 6 años (obligación SII).
- **Sub-encargados:** Haulmer / SimpleAPI (OpenFactura).
- **Transferencias:** dentro de Chile.

### 3.6 Reseñas Google integradas

- **Categorías de titulares:** Clientes finales que reseñan.
- **Categorías de datos:** nombre público, texto de reseña, rating.
- **Finalidad:** sincronizar reseñas del local en su panel.
- **Base legal:** el titular ya expuso el dato públicamente en Google.
- **Sub-encargados:** Google My Business API.
- **Retención:** vigencia del tenant.

### 3.7 Autenticación

- **Categorías de titulares:** Clientes finales, personal del local, dueños.
- **Categorías de datos:** email, contraseña hasheada, sesiones activas, custom claims.
- **Finalidad:** control de acceso.
- **Base legal:** ejecución de contrato.
- **Retención:** vida de la cuenta.
- **Sub-encargados:** Firebase Auth, Google (Google Sign-In).
- **Medidas de seguridad:** contraseñas hasheadas por Firebase, MFA TOTP disponible (Sprint 3.1), 2FA obligatorio en roadmap para admins/jefes.

---

## 4. Actividades de tratamiento — SynapTech como Responsable

### 4.1 Captación de leads (empieza.html, /crea, referidos)

- **Categorías de titulares:** dueños/emprendedores interesados en la plataforma.
- **Categorías de datos:** nombre, correo, teléfono, tipo de negocio, comentario.
- **Finalidad:** responder consulta, calificar prospecto, cerrar contrato SaaS.
- **Base legal:** consentimiento (envío del formulario) + interés legítimo comercial.
- **Retención:** 24 meses desde el último contacto activo si no convierte; permanente mientras dure la relación B2B.
- **Sub-encargados:** Google Firebase, Resend (aviso email a Ignacio).
- **Medidas:** lead lograble solo por el bootstrap.

### 4.2 Registro contable interno

- **Categorías de titulares:** clientes B2B (barberías).
- **Categorías de datos:** razón social, RUT, montos facturados por SynapTech, planes contratados.
- **Finalidad:** contabilidad y tributación.
- **Base legal:** obligación legal.
- **Retención:** 6 años.

---

## 5. Sub-encargados autorizados (consolidado)

| Proveedor | Función | Ubicación | Documento aplicable |
|-----------|---------|-----------|---------------------|
| Google LLC / Firebase | Hosting, DB, Auth, FCM, Functions | US + regiones globales | Google Cloud Data Processing Addendum |
| Meta Platforms, Inc. | WhatsApp Cloud API | US / IE | Meta Business Terms |
| Mercado Pago Chile | Pasarela pagos CLP | Chile / Argentina | MP Términos de uso |
| Stripe, Inc. | Pasarela pagos (Bioo) | US / IE | Stripe DPA |
| Haulmer SpA / SimpleAPI | DTE electrónicos | Chile | Contrato Haulmer |
| Resend, Inc. | Email transaccional | US | Resend DPA |
| Anthropic, PBC | IA (AI Bio Builder de Bioo) | US | Anthropic API terms |

---

## 6. Registro de cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2026-07-11 | Creación inicial del RAT | Ignacio Mateluna |
