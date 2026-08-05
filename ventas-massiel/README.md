# Kit de venta — Massiel · Providencia

Todo lo que Massiel necesita para salir a terreno este weekend.

## Contenido del kit

| Archivo | Uso |
|---|---|
| **`qr-massiel.png`** (512×512) | Para imprimir en tarjetas o mostrar en el celular. Decodifica a `crea.synaptechspa.cl/?ref=massiel`. |
| **`qr-lockscreen.png`** (1170×2532) | Wallpaper de pantalla de bloqueo del iPhone de Massiel. QR grande + texto "Escanea con la cámara". |
| **`cheatsheet.html`** | 1 página imprimible A4 con pitch, precios, objeciones y flujo de cierre. `Ctrl+P` para imprimir; o abrir en el celular como referencia rápida. |
| **`prospectos-providencia.md`** | 35 locales geolocalizados (Manuel Montt / Los Leones / Providencia / Marchant Pereira) con dirección exacta y ruta sugerida. |
| **`comisiones.md`** | Propuesta de comisiones (fijo por trial + bonus por plan + recurring). BORRADOR — validar con Massiel. |
| **`scripts/ver-comisiones-massiel.js`** | Script Node que corre contra Firestore y devuelve todos los trials creados con `ref=massiel`, su estado y la comisión estimada. Correr con `node scripts/ver-comisiones-massiel.js`. |

## Cómo se despliega en el celular de Massiel

1. **Wallpaper de bloqueo:** envíale `qr-lockscreen.png` por WhatsApp → ella lo pone como fondo de pantalla de bloqueo (no de inicio). Cualquiera puede escanear sin desbloquear.
2. **Cheatsheet:** abrir `cheatsheet.html` en Safari → "Compartir → Agregar a pantalla de inicio". Queda como ícono al lado de WhatsApp.
3. **Lista de prospectos:** compartir el .md por WhatsApp o abrir en la app Files.

## Verificación de atribución

Cuando alguien crea un tenant desde el QR de Massiel:
- Firestore `tenants/{slug}.atribucion.ref` = `"massiel"`
- Firestore `tenants/{slug}.refVendedor` = `"massiel"`
- Firestore `_billing/{slug}.refVendedor` = `"massiel"`
- Logs Cloud Functions: `[self-service] tenant creado: <slug> ... ref=massiel utm=<canal>`

## Follow-up

Después de crear un trial, Massiel debe:
1. Guardar el WhatsApp del dueño en la agenda como `Cliente SynapTech — {Nombre local}`.
2. Enviar mensaje mismo día con el link `{slug}.synaptechspa.cl` + foto del panel abierto.
3. **Día 3:** ¿ya llegó la primera reserva? Ofrecer ayuda con IG bio.
4. **Día 7:** compartir 3 tips (equipo, sellos, cupones).
5. **Día 12:** aviso de que vence trial, link de pago del plan que corresponda.

## Comisión — mecánica de cobro

Ver `comisiones.md`. Resumen:
- Fijo: **$3.000** por trial válido (72h de vida, 1 servicio editado, email único).
- Bonus: **$15.000** (Individual) / **$25.000** (Local) al activar plan pagado.
- Recurring: **15%** del pago mensual del tenant, meses 2 a 6.

## Actualizar el kit

Si quieres agregar más prospectos, editar el pitch, o generar QR con otro nombre:
- QR: `python scripts/gen-qr-massiel.py` (editar `URL` en el script)
- Prospectos: editar `prospectos-providencia.md` directo
- Cheatsheet: editar `cheatsheet.html` directo
