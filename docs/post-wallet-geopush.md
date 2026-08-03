# Post Instagram — Wallet con geo-push

Ángulo: **no competir en "tengo tarjeta en la Wallet"** (WeiBook lanzó eso el 2 de
agosto). El terreno propio es el **geo-push**: la tarjeta aparece sola en la
pantalla bloqueada cuando el cliente pasa cerca del local. Eso no lo mencionan
en su lanzamiento y no se improvisa — necesita el anillo de geofence
(`functions/lib/wallet-geo.js`), porque Apple y Google topan el radio por punto
en ~100 m.

Está configurado y vivo en los 4 locales con Wallet: aura (300 m), oren (350 m),
sion (460 m), delnero (200 m).

Español neutro, "tú" imperativo. Sin chilenismos.

---

## Carrusel (5 slides)

**01 — Hook**
> Tu cliente pasa por tu esquina.
>
> Su teléfono se lo recuerda.

*Visual: pantalla bloqueada con la notificación de la tarjeta apareciendo.*

**02 — Qué es**
> La tarjeta de tu barbería vive en su Apple Wallet o Google Wallet.
>
> Sin descargar ninguna app.

**03 — El diferencial**
> Cuando pasa a menos de 300 metros de tu local, la tarjeta se le
> asoma sola en la pantalla bloqueada.
>
> No es un mensaje que mandas tú. Es su propio teléfono.

**04 — Se mantiene sola**
> Sus sellos se actualizan en cada visita.
> Su próxima cita aparece en la tarjeta.
>
> Nadie tiene que abrir nada.

**05 — Cierre**
> Deja de recordarle a tus clientes que existes.
> Que lo haga su bolsillo.
>
> SynapTech Studio

*Firma: Powered by SynapTech con `/synaptech/ig.png`.*

---

## Caption

> Tu cliente no necesita abrir una app para acordarse de ti. 📍
>
> Su tarjeta de sellos vive en la Wallet del teléfono — la misma donde
> guarda su tarjeta de embarque. Y cuando pasa cerca de tu local, aparece
> sola en la pantalla bloqueada.
>
> ⭐ Los sellos se actualizan en cada visita.
> 📅 Su próxima cita, visible sin entrar a ningún lado.
> 📲 Apple Wallet y Google Wallet. Sin descargar nada.
>
> Escríbenos por DM y te la dejamos andando en tu barbería.
>
> #barberia #barbershop #fidelizacion #applewallet #googlewallet #viñadelmar

---

## Notas para cuando se publique

- **No publicar hasta tener capturas reales** de la tarjeta con sellos y con
  próxima cita. Un mockup se nota y el diferencial acá es que funciona.
- El slide 02 responde su dardo ("Sin descargar otra aplicación") sin nombrarlos.
- Si preguntan por el radio: es configurable por local desde el estudio
  (`wallets.bioo.cl`), de 0 a 1500 m sobre un mapa.
- No comparar de frente con nadie. Ellos son 7 países; el terreno asimétrico
  no conviene.
