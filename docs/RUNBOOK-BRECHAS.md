# Runbook — Respuesta a incidentes de seguridad y brechas de datos

Procedimiento interno de SynapTech SpA para atender un incidente de seguridad que involucre datos personales, conforme al artículo 18 de la Ley 21.719 (plazo de notificación **72 horas**).

**Última actualización:** 2026-07-11
**Responsable:** DPO (privacidad@synaptechspa.cl)

---

## 0. Definiciones rápidas

- **Incidente:** cualquier evento de seguridad (intrusión, error, fuga) que pueda afectar la confidencialidad, integridad o disponibilidad de datos.
- **Brecha (con notificación):** incidente confirmado que afecta datos personales y **puede** generar riesgo para los titulares. Requiere notificar a la Agencia y, según el caso, a los titulares.
- **Titular:** persona natural cuyos datos fueron comprometidos.
- **Cliente:** barbería/salón/creador que actúa como Responsable en cuyos datos ocurrió la brecha (SynapTech es Encargado).

---

## 1. Roles y contacto de emergencia

| Rol | Persona | Contacto |
|-----|---------|----------|
| DPO | Ignacio Mateluna | privacidad@synaptechspa.cl · +56 9 8356 8212 |
| Bootstrap superadmin | Ignacio Mateluna | mismo |
| Sub-encargados críticos | Google Cloud Support · Meta Business · Mercado Pago · Stripe | por consola de cada uno |

---

## 2. Fases de respuesta

### FASE 1 — Detección (T+0)

Fuentes típicas de detección:
- Alerta automática (Firebase Security Rules Insights, Cloud Logging).
- Reporte de un usuario o barbero.
- Notificación de un sub-encargado (Google, Meta, MP, Stripe).
- Investigación proactiva del DPO.

**Acciones inmediatas** (dentro de 1h):
1. Documentar en un Google Doc privado: `Incidente-YYYYMMDD-HHMM`.
2. Registrar: hora de detección, fuente, síntomas observados.
3. Notificar al DPO por WhatsApp/llamada si no estaba enterado.
4. **No** comunicar públicamente hasta terminar Fase 3.

### FASE 2 — Contención (T+0 a T+6h)

Objetivo: parar el daño en curso.

**Acciones técnicas** según el tipo:

| Escenario | Acción |
|-----------|--------|
| Cuenta admin comprometida | Firebase Console → deshabilitar cuenta + revocar sesiones + rotar contraseñas + activar 2FA. |
| Fuga de token API (Stripe, MP, WhatsApp) | Firebase Secret Manager: rotar el secret; revocar el anterior desde la consola del proveedor. |
| Regla Firestore rota | Firebase Console → editar rules → deploy inmediato. `firebase deploy --only firestore:rules`. |
| Cloud Function con vulnerabilidad | Deshabilitar la función en Firebase Console; publicar patch. |
| Sub-encargado brechado | Aplicar recomendaciones del proveedor; suspender integración si corresponde. |
| Ataque DDoS | Firebase App Check + Cloudflare (si activo); reducir rate limits. |

### FASE 3 — Evaluación (T+6h a T+48h)

Investigación técnica y de impacto:

1. **Alcance**: qué colecciones, cuántos docs, qué tenants, cuántos titulares.
2. **Naturaleza de los datos**: identificar categorías (nombre, teléfono, historial, medios de pago, etc.).
3. **Sensibilidad**: ¿hay datos sensibles? En SynapTech idealmente no, pero verificar.
4. **Riesgo para titulares**: bajo / medio / alto.
5. **Causa raíz**: cómo entró el atacante o dónde estuvo el error.

Rellenar en el doc:
- Descripción precisa del incidente
- Categorías de datos afectadas
- Volumen (número aproximado de titulares)
- Fecha estimada del compromiso
- Medidas técnicas y organizativas ya adoptadas y las que se van a adoptar
- Consecuencias previsibles

### FASE 4 — Notificación (T+48h a T+72h máximo)

**A la Agencia de Protección de Datos** (obligatorio si hay riesgo relevante):
- Correo o portal (según lo defina la Agencia una vez operativa).
- Contenido mínimo: naturaleza, categorías y volumen aproximado de titulares, medidas adoptadas, punto de contacto, consecuencias previsibles.
- Plantilla en anexo A.

**Al Cliente (Responsable)** — siempre que la brecha afecte datos que él controla como Responsable:
- Correo al `ownerEmail` del tenant + WhatsApp confirmando envío.
- Contenido igual al de la Agencia, pero incluyendo la lista concreta de sus titulares afectados (si aplica).
- Plantilla en anexo B.

**A los titulares afectados** — cuando la brecha genere alto riesgo:
- Coordinar con el Cliente (Responsable) para que él ejecute la notificación en su nombre.
- SynapTech puede ejecutarla directamente vía correo/push/WhatsApp si el Cliente no responde en 24h.
- Plantilla en anexo C.

### FASE 5 — Aprendizaje (T+7d a T+30d)

Post-mortem sin culpas:
1. Causa raíz confirmada.
2. Métricas: tiempo de detección, contención, notificación.
3. Cambios técnicos o de proceso propuestos.
4. Actualizar reglas Firestore, checklists, alertas.
5. Registrar en la bitácora de incidentes (`_system/incidentes_log`).

---

## 3. Umbrales de notificación

| Situación | ¿Notificar Agencia? | ¿Notificar titulares? |
|-----------|--------------------:|:---------------------:|
| Fuga de datos de contacto (nombre, correo, teléfono) de <100 titulares, sin evidencia de explotación | Sí, salvo bajo riesgo demostrable | No obligatorio |
| Fuga con evidencia de exfiltración o >1.000 titulares | Sí | Sí |
| Compromiso de credenciales de admin sin acceso confirmado a datos | No (registrar internamente) | No |
| Compromiso de credenciales con acceso a datos | Sí | Depende del alcance |
| Pérdida de disponibilidad (downtime) sin fuga | No | No (comunicar por soporte) |

---

## 4. Anexo A — Plantilla notificación a la Agencia

```
Asunto: Notificación de brecha de seguridad — SynapTech SpA — [YYYY-MM-DD]

A la Agencia de Protección de Datos Personales:

Por medio del presente, SynapTech SpA (RUT [XX]), en su calidad de Encargado
del Tratamiento por cuenta de sus clientes barberías/salones/creadores, y
conforme al artículo 18 de la Ley 21.719, informa la siguiente brecha de
seguridad detectada el día [YYYY-MM-DD HH:MM]:

1. Naturaleza del incidente: [descripción breve]
2. Categorías de datos afectadas: [ej.: nombre, teléfono, correo]
3. Categorías de titulares: [clientes finales / personal / dueños]
4. Número aproximado de titulares afectados: [N]
5. Fecha estimada de inicio y de contención: [inicio] / [contención]
6. Consecuencias previsibles: [riesgo bajo/medio/alto y por qué]
7. Medidas técnicas y organizativas adoptadas: [lista]
8. Medidas propuestas para prevenir la recurrencia: [lista]
9. Punto de contacto: Ignacio Mateluna — privacidad@synaptechspa.cl — +56 9 8356 8212

Adjuntamos un informe técnico más detallado.

[firma]
```

---

## 5. Anexo B — Plantilla notificación al Cliente (Responsable)

```
Asunto: Notificación de incidente que afecta a tu local

Hola [nombre del dueño],

Detectamos un incidente de seguridad que afecta datos de tu local en la
plataforma SynapTech. Como Encargado, te informamos conforme al DPA anexo
del Contrato SaaS y a la Ley 21.719.

Resumen:
· Qué pasó: [descripción]
· A cuántos de tus clientes afecta: [N]
· Qué datos suyos se vieron comprometidos: [lista]
· Qué hicimos ya para contenerlo: [lista]
· Qué recomendamos que hagas tú: [acciones]

Estamos disponibles para conversarlo. Contáctanos en privacidad@synaptechspa.cl
o al WhatsApp +56 9 8356 8212.

Ignacio Mateluna
DPO — SynapTech SpA
```

---

## 6. Anexo C — Plantilla notificación al titular

```
Asunto: Aviso importante sobre tus datos en [Nombre del Local]

Hola [nombre],

Te escribimos desde SynapTech, la plataforma tecnológica que opera la agenda
y el club de fidelización de [Nombre del Local].

El [YYYY-MM-DD] se detectó un incidente de seguridad que puede haber expuesto
algunos de tus datos personales:
· [lista de campos: ej. nombre, teléfono, historial de servicios]
· Contraseñas y medios de pago NO se vieron afectados.

Ya hemos tomado estas medidas: [lista].

Recomendamos que: [acciones concretas: cambiar contraseña, revisar cuenta, etc.].

Puedes ejercer tus derechos ARCO+P escribiéndonos a privacidad@synaptechspa.cl.
Si prefieres eliminar tu cuenta ahora, entra a la app → Mi Perfil → Eliminar
Cuenta.

Lamentamos las molestias.

SynapTech — Equipo de Privacidad
```

---

## 7. Checklist rápido para el DPO durante un incidente

- [ ] Doc del incidente creado.
- [ ] Hora y fuente de detección registradas.
- [ ] Contención aplicada (medida técnica registrada).
- [ ] Alcance evaluado (colecciones, tenants, titulares).
- [ ] Riesgo estimado (bajo/medio/alto).
- [ ] Causa raíz identificada (aunque sea preliminar).
- [ ] Decisión de notificar tomada (Agencia sí/no, titulares sí/no).
- [ ] Notificación a Agencia enviada (si aplica) antes de 72h.
- [ ] Notificación al Cliente enviada.
- [ ] Notificación a titulares coordinada.
- [ ] Post-mortem programado (7-30 días).
- [ ] Bitácora de incidentes actualizada.
