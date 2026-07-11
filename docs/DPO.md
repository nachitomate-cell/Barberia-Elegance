# Encargado de protección de datos (DPO) — SynapTech SpA

## Designación

**DPO transitorio:** Ignacio Mateluna Muñoz
**Correo oficial:** privacidad@synaptechspa.cl
**WhatsApp:** +56 9 8356 8212
**Fecha de designación:** 2026-07-11

Bajo la Ley 21.719, SynapTech no está obligada legalmente a designar un DPO por su tamaño actual, pero adoptamos voluntariamente el rol para dar cara única a los titulares y a los Clientes.

Cuando SynapTech supere los umbrales que active la designación obligatoria (tratamientos masivos o de alto riesgo), se formalizará con un contrato dedicado y podrá externalizarse a un profesional independiente.

## Responsabilidades

1. Mantener actualizado el **RAT** (`docs/RAT.md`).
2. Mantener actualizado el **Runbook de brechas** (`docs/RUNBOOK-BRECHAS.md`) y ejecutarlo cuando corresponda.
3. Atender las solicitudes ARCO+P (Acceso, Rectificación, Cancelación, Oposición, Portabilidad) recibidas en privacidad@synaptechspa.cl dentro del plazo legal (30 días corridos).
4. Coordinar con los Clientes (Responsables) cuando la solicitud provenga de sus titulares.
5. Actuar como interlocutor de SynapTech ante la Agencia de Protección de Datos.
6. Revisar cada 6 meses el RAT, el runbook, las reglas Firestore y las medidas técnicas.
7. Aprobar nuevos sub-encargados y actualizar el DPA + RAT en consecuencia.
8. Supervisar la política de retención y las purgas periódicas.

## Métricas mínimas a monitorear

- Número de solicitudes ARCO recibidas por mes y tiempo medio de respuesta.
- Número de brechas detectadas por trimestre y tiempo hasta la contención.
- Número de eliminaciones de cuenta procesadas (`/eliminaciones_log`).
- Número de opt-outs de WhatsApp registrados (`/wa_optout`).
- Cobertura de 2FA entre roles admin/jefe (`% con MFA activo`).

## Bandeja de entrada estandarizada

Todo correo a `privacidad@synaptechspa.cl` se registra internamente. Se responde dentro de:

- **48 horas** con acuse de recibo.
- **30 días corridos** con la respuesta o acción ejecutada.

Se archiva la conversación (con hashes de identidad, no PII cruda) en la bitácora de solicitudes.

## Plantilla de respuesta a solicitud ARCO

```
Hola [nombre],

Recibimos tu solicitud del derecho de [Acceso / Rectificación / Cancelación /
Oposición / Portabilidad] sobre tus datos personales tratados por SynapTech
en el contexto de [nombre del local / servicio].

[Si es Cancelación]: Puedes eliminar tu cuenta y datos directamente desde
la app → Mi Perfil → Eliminar Cuenta. Si prefieres que la ejecutemos
nosotros, confírmalo y lo procesamos.

[Si es Acceso o Portabilidad]: Adjuntamos/enviamos por correo un archivo
con los datos que tenemos asociados a tu identidad.

[Si es Rectificación]: Realizamos el cambio de [campo]: [valor viejo] → [valor
nuevo] el [fecha].

[Si es Oposición]: Deshabilitamos el envío de comunicaciones al canal que
indicaste. Puedes volver a activarlo cuando quieras.

Cualquier duda respondes este correo.

Ignacio Mateluna — DPO
SynapTech SpA
```
