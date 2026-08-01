# Canales para hablar con el cliente — catálogo y riesgos

Cuatro formas de que el local converse con su cliente. **Ninguna es "la mejor"**:
se eligen por cuánto riesgo corre el número del local y cuánto cuesta el mensaje.
Este documento es la fuente de la comparación que ve el dueño en
`/gestion-interna/whatsapp`.

| | **1. Bot en el número del local** | **2. Confirmaciones por chip SynapTech** | **3. Bot por API oficial de Meta** | **4. Chat interno de la app** |
|---|---|---|---|---|
| **Qué es** | Asistente IA 24/7 sobre el WhatsApp propio del local (Evolution API, sesión por QR) | Recordatorios/confirmaciones que salen de un número de SynapTech | Asistente IA sobre el número verificado de la plataforma (Cloud API) | Chat dentro de la web/PWA del cliente, sin WhatsApp |
| **Número que se expone** | El del local | Un chip nuestro, desechable | El de plataforma (+56 9 6589 7142) | Ninguno |
| **¿El dueño sigue usando su teléfono?** | Sí, pero el bot escribe desde ahí | Sí, intacto | **Sí, intacto** | Sí, intacto |
| **Costo por mensaje** | $0 | $0 | Plantillas ~$10–18 CLP · sesión **gratis hasta 1-oct-2026** | $0 |
| **Riesgo principal** | 🔴 **Bloqueo del número del local** por Meta (es su línea comercial) | 🟠 Que se queme el chip (afecta a todos los locales de ese chip) | 🟢 Casi nulo: número verificado y con reglas | 🟢 Nulo |
| **Otros riesgos** | Sesión se cae y hay que re-escanear QR; el dueño y el bot pueden pisarse (mitigado: silencio 2h) | Un chip = varios locales; el tope diario es del chip, no del local | El número no puede usarse en la app de WhatsApp (se atiende desde el panel); costo por mensaje desde octubre | **El cliente tiene que entrar a la app**: no llega notificación a WhatsApp |
| **Alcance** | Total: agenda, reagenda, cancela, responde | Solo confirmar/cancelar la cita | Total (mismo cerebro que 1) | Total, pero solo con clientes que abren la app |
| **Estado hoy** | ✅ Vivo (Kronnos ×3) | ⚠️ Chip principal restringido por Meta (31-jul) | 🟡 Construido y **apagado** (`_system/whatsapp_notif.botOficial`) | 🔵 Por construir |

## Riesgos transversales (aplican a los canales 1, 2 y 3)

- **Opt-out obligatorio.** Un STOP frena TODOS los canales: el libro es global
  (`/wa_optout`). La tasa de bajas es el indicador adelantado del bloqueo —
  Meta no avisa antes de suspender.
- **Tope diario anti-ban** escalonado por antigüedad del número (40 → 120 → 300).
  Visible para ops, oculto para el dueño a propósito: un techo visible se lee
  como cuota de plan e invita a pedir que se lo suban.
- **Cambio de pricing de Meta (1-oct-2026):** los mensajes de sesión dejan de
  ser gratis. Afecta al canal 3, **no** al 1 ni al 2 (Evolution no paga por
  mensaje). Es la ventaja estructural de costo frente a la competencia que
  opera 100% sobre la API oficial.
- **Consentimiento.** Las plantillas solo salen con opt-in explícito
  (`cita.waOptIn`, casilla de la reserva). Sin checkbox, no hay envío: la cita
  nace verde y el checkbox desaparece si el local se queda sin bolsa.

## Cómo se elige (recomendación comercial)

- **Local que teme por su número** (caso Renacer) → canal 3 + canal 2.
  Su teléfono queda intacto y el riesgo lo corre la plataforma.
- **Local con volumen y número maduro** (caso Kronnos) → canal 1 para conversar
  (gratis) + canal 2/3 solo para los avisos proactivos.
- **Cliente que ya vive en la app** (club, fidelización) → canal 4 como
  complemento: cero costo y cero riesgo, pero nunca como único canal.

## Pendientes

- Canal 4 (chat interno) — por construir; el widget flotante del dashboard del
  cliente es el punto de entrada natural.
- Bandeja en el panel para leer/contestar/pausar los chats del canal 3.
- Reflejar esta tabla dentro de `/gestion-interna/whatsapp` (hoy vive acá).
