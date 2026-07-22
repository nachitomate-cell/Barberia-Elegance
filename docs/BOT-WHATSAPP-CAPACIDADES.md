# Asistente IA 24/7 por WhatsApp — Capacidades y límites

> Documento explícito de TODO lo que el bot puede y no puede hacer.
> Es el espejo de las herramientas reales de `functions/evolution/cerebro.js`
> y de la lista que ve cada local en el panel (WhatsAppAsistente.jsx →
> "¿Qué puede hacer el bot?"). **Si se agrega o quita una capacidad en el
> backend, actualizar los tres lugares en el mismo cambio.**
>
> Última actualización: 21-jul-2026 · commit `2b9f399`

## ✅ Lo que HACE

| Capacidad | Detalle | Respaldo técnico |
|---|---|---|
| **Responde 24/7 en el número propio del local** | Contesta al instante con el nombre, dirección y teléfono del local. La app del dueño sigue funcionando normal (dispositivo vinculado). | Evolution API, `instance_{tenantId}` aislada por local |
| **Informa servicios y precios reales** | Lee el catálogo tal como está en el panel. Nunca inventa un precio ni un servicio. | Tool `consultar_servicios` (lee `tenants/{tid}/servicios` activos) |
| **Revisa disponibilidad real** | Horas libres respetando: horario del local, **horario personal de cada profesional** (día libre, descansos, colación), duración del servicio y citas ya tomadas. | Tool `consultar_disponibilidad` (mismo motor que la agenda pública, `chat-horas-disponibles.js`) |
| **Agenda citas por sí solo** | Confirma servicio + fecha + hora con el cliente, elige profesional libre y crea la cita con código de reserva. Sin dobles reservas. | Tool `agendar_cita` — misma transacción de candado (`slotLocks`) que la agenda |
| **Consulta las citas del cliente que escribe** | "¿A qué hora era mi hora?" → busca las citas futuras de ESE número y las recuerda. | Tool `consultar_mis_citas` (match por sufijo-9 del teléfono) |
| **Cancela o cambia citas del propio cliente** | Solo citas del número que escribe (jamás ajenas). Respeta la política del local: cancelación online desactivada o anticipación mínima → explica y deriva. Cancelar libera el cupo al instante. Cambio de hora = cancelar + re-agendar. | Tool `cancelar_cita` (respeta `chatCancelEnabled` y `minutosLimiteReagendar`); trigger `liberarSlot` |
| **Pide confirmación de asistencia** | Con confirmaciones activas escribe antes de la cita (12/24/48 h configurables): "Responde CONFIRMAR o CANCELAR". CANCELAR libera el cupo solo. | Cron `evolutionConfirmaciones` (cada 30 min) + fast-path sin IA en el webhook |
| **Deriva a un humano cuando corresponde** | Si el cliente pide hablar con una persona, reclama, o pide algo fuera de alcance (pagos, convenios, cotizaciones): avisa que el equipo seguirá la conversación y se calla 2 h en ese chat. | Tool `pasar_con_humano` (`botSilencedUntil`) |
| **Habla español neutro o chileno** | Neutro por defecto (tú estándar, sin modismos). "Chileno cercano" activable por local: modismos suaves, máx. uno por mensaje, sin voseo escrito. | `configuracion/whatsapp.estiloChileno` |
| **Recuerda la conversación** | Mantiene los últimos 10 intercambios con cada cliente para no repreguntar. | `wa_conversaciones/{tel}.messages` (20 turnos) |

## 🚫 Lo que NO hace (a propósito)

| Límite | Qué pasa en la práctica | Por qué |
|---|---|---|
| **No entiende audios ni fotos** | Nota de voz o imagen → responde amable que solo lee texto y pide que se lo escriban (máx. 1 aviso cada 10 min). El texto que acompaña a una foto sí lo lee. | Costo + simplicidad; nunca queda en silencio |
| **No cobra ni maneja pagos** | No pide transferencias, no manda links de pago, no promete descuentos. | Fuera de alcance del add-on |
| **No hace marketing ni masivos** | Solo conversa con quien le escribe + confirmaciones opt-in. Cero difusión. | Blindaje anti-ban (regla de producto: por Evolution JAMÁS marketing) |
| **No responde grupos ni estados** | Chats directos de clientes solamente. | Filtro duro en el webhook |
| **No pisa al equipo del local** | Si alguien del local responde a mano, el bot se calla 2 h en ESA conversación. (Requiere apagar los automáticos nativos de WhatsApp Business — ver onboarding.) | Anti-colisión (`fromMe` + `botMsgIds`) |
| **No cae en abusos** | Máx. **30 respuestas al día por chat**: al topar avisa una vez que el equipo seguirá y se detiene. | Anti-troll / anti-loop (costo + señal anti-ban) |
| **No agenda en el pasado ni inventa horas** | Fechas pasadas se rechazan siempre; toda hora ofrecida sale del cálculo real. | Validación dura en `agendar_cita` + reglas del prompt |
| **No revive citas canceladas** | Un "CONFIRMAR" tardío no puede reactivar una cita que ya se canceló. | Limpieza de `citaPendiente` al cancelar |

## Reglas operativas del onboarding (resumen)

1. **Apagar los mensajes automáticos de WhatsApp Business** (bienvenida y ausencia) en el teléfono del local — si no, silencian al bot 2 h en cada chat nuevo.
2. Los humanos pueden intervenir cuando quieran: el bot se calla solo.
3. Números nuevos: warm-up de 1–2 semanas antes de vincular (anti-ban).
4. El dueño puede apagar bot y/o confirmaciones desde el panel, con efecto inmediato.
