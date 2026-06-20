# Activar login con Google en PWA (auth same-origin) — setup por única vez

El código ya quedó listo: `authDomain` = dominio propio + proxy `/__/auth` y `/__/firebase`
en `vercel.json`. Falta **registrar estos dominios en las consolas una sola vez**.
Mientras no estén, Google responde **Error 400: redirect_uri_mismatch**.

> Tip: hazlo en lote (copiar/pegar). Propaga en unos minutos. Después reinstala/reabre cada
> PWA para limpiar el service worker.

---

## 1) Firebase Console → Authentication → Settings → Authorized domains
Agregar cada dominio (botón "Add domain"):

- admin.kronnos.synaptechspa.cl
- aurasalon.synaptechspa.cl
- aurasalonmalegrooming.synaptech.cl
- aurasalonmalegrooming.synaptechspa.cl
- barberiadjones.synaptechspa.cl
- barberiaelegance.synaptechspa.cl
- barberiaferraza.synaptechspa.cl
- barberiasion.synaptechspa.cl
- bioo.cl
- chameleonbarber.synaptechspa.cl
- delnerobarber.synaptechspa.cl
- deluxeperfumes.synaptechspa.cl
- djonesbarberia.synaptechspa.cl
- ferrazabarber.synaptechspa.cl
- gitananails.synaptechspa.cl
- infinity.synaptechspa.cl
- kronnos.synaptechspa.cl
- kronnoslimache.synaptechspa.cl
- kronnospenablanca.synaptechspa.cl
- kronnoswoman.synaptechspa.cl
- latincaribe.synaptechspa.cl
- links.synaptechspa.cl
- machos.synaptechspa.cl
- mapubarbershop.synaptechspa.cl
- marcelo-hairdressing.synaptechspa.cl
- marcelohairdressing.synaptechspa.cl
- marcelopalma.synaptechspa.cl
- sionbarberia.synaptechspa.cl
- thelatincaribe.synaptechspa.cl

---

## 2) Google Cloud Console → APIs y servicios → Credenciales
Abrir el **Cliente de OAuth 2.0 "Web client"** del proyecto `barberia-elegance`
(el que creó Firebase). Pegar ambas listas y **Guardar**.

### Orígenes de JavaScript autorizados
```
https://admin.kronnos.synaptechspa.cl
https://aurasalon.synaptechspa.cl
https://aurasalonmalegrooming.synaptech.cl
https://aurasalonmalegrooming.synaptechspa.cl
https://barberiadjones.synaptechspa.cl
https://barberiaelegance.synaptechspa.cl
https://barberiaferraza.synaptechspa.cl
https://barberiasion.synaptechspa.cl
https://bioo.cl
https://chameleonbarber.synaptechspa.cl
https://delnerobarber.synaptechspa.cl
https://deluxeperfumes.synaptechspa.cl
https://djonesbarberia.synaptechspa.cl
https://ferrazabarber.synaptechspa.cl
https://gitananails.synaptechspa.cl
https://infinity.synaptechspa.cl
https://kronnos.synaptechspa.cl
https://kronnoslimache.synaptechspa.cl
https://kronnospenablanca.synaptechspa.cl
https://kronnoswoman.synaptechspa.cl
https://latincaribe.synaptechspa.cl
https://links.synaptechspa.cl
https://machos.synaptechspa.cl
https://mapubarbershop.synaptechspa.cl
https://marcelo-hairdressing.synaptechspa.cl
https://marcelohairdressing.synaptechspa.cl
https://marcelopalma.synaptechspa.cl
https://sionbarberia.synaptechspa.cl
https://thelatincaribe.synaptechspa.cl
```

### URIs de redireccionamiento autorizados
```
https://admin.kronnos.synaptechspa.cl/__/auth/handler
https://aurasalon.synaptechspa.cl/__/auth/handler
https://aurasalonmalegrooming.synaptech.cl/__/auth/handler
https://aurasalonmalegrooming.synaptechspa.cl/__/auth/handler
https://barberiadjones.synaptechspa.cl/__/auth/handler
https://barberiaelegance.synaptechspa.cl/__/auth/handler
https://barberiaferraza.synaptechspa.cl/__/auth/handler
https://barberiasion.synaptechspa.cl/__/auth/handler
https://bioo.cl/__/auth/handler
https://chameleonbarber.synaptechspa.cl/__/auth/handler
https://delnerobarber.synaptechspa.cl/__/auth/handler
https://deluxeperfumes.synaptechspa.cl/__/auth/handler
https://djonesbarberia.synaptechspa.cl/__/auth/handler
https://ferrazabarber.synaptechspa.cl/__/auth/handler
https://gitananails.synaptechspa.cl/__/auth/handler
https://infinity.synaptechspa.cl/__/auth/handler
https://kronnos.synaptechspa.cl/__/auth/handler
https://kronnoslimache.synaptechspa.cl/__/auth/handler
https://kronnospenablanca.synaptechspa.cl/__/auth/handler
https://kronnoswoman.synaptechspa.cl/__/auth/handler
https://latincaribe.synaptechspa.cl/__/auth/handler
https://links.synaptechspa.cl/__/auth/handler
https://machos.synaptechspa.cl/__/auth/handler
https://mapubarbershop.synaptechspa.cl/__/auth/handler
https://marcelo-hairdressing.synaptechspa.cl/__/auth/handler
https://marcelohairdressing.synaptechspa.cl/__/auth/handler
https://marcelopalma.synaptechspa.cl/__/auth/handler
https://sionbarberia.synaptechspa.cl/__/auth/handler
https://thelatincaribe.synaptechspa.cl/__/auth/handler
```

---

## 3) Listo
No hay que tocar el código de nuevo. Cuando se agregue un **tenant nuevo**, sumar su dominio
en los 2 lugares de arriba (Firebase Authorized domains + las 2 listas de OAuth) con el mismo
patrón `https://<dominio>` y `https://<dominio>/__/auth/handler`.

Verificación: abrir `https://<dominio>/__/auth/handler` en el navegador → debe cargar la
página del handler de Firebase (confirma que el proxy funciona).
