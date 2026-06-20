# Activar login con Google en PWA (auth same-origin) — setup por unica vez

Fuente: config.js (tenants) + vercel.json (dominios custom). Total: 37 dominios.
Mientras un dominio no este registrado en ambas consolas, Google da Error 400 redirect_uri_mismatch.

## 1) Firebase Console -> Authentication -> Settings -> Authorized domains
- admin.kronnos.synaptechspa.cl
- alfamen.synaptechspa.cl
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
- kronnos-limache.synaptechspa.cl
- kronnos-penablanca.synaptechspa.cl
- kronnos-woman.synaptechspa.cl
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
- memphissalon.synaptechspa.cl
- omegastudio.synaptechspa.cl
- sionbarberia.synaptechspa.cl
- thelatincaribe.synaptechspa.cl
- yugen.synaptechspa.cl
- yugenstudio.synaptechspa.cl

## 2) Google Cloud -> Credenciales -> Web client (auto created by Google Service)

### Origenes autorizados de JavaScript
```
https://admin.kronnos.synaptechspa.cl
https://alfamen.synaptechspa.cl
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
https://kronnos-limache.synaptechspa.cl
https://kronnos-penablanca.synaptechspa.cl
https://kronnos-woman.synaptechspa.cl
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
https://memphissalon.synaptechspa.cl
https://omegastudio.synaptechspa.cl
https://sionbarberia.synaptechspa.cl
https://thelatincaribe.synaptechspa.cl
https://yugen.synaptechspa.cl
https://yugenstudio.synaptechspa.cl
```

### URIs de redireccionamiento autorizados
```
https://admin.kronnos.synaptechspa.cl/__/auth/handler
https://alfamen.synaptechspa.cl/__/auth/handler
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
https://kronnos-limache.synaptechspa.cl/__/auth/handler
https://kronnos-penablanca.synaptechspa.cl/__/auth/handler
https://kronnos-woman.synaptechspa.cl/__/auth/handler
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
https://memphissalon.synaptechspa.cl/__/auth/handler
https://omegastudio.synaptechspa.cl/__/auth/handler
https://sionbarberia.synaptechspa.cl/__/auth/handler
https://thelatincaribe.synaptechspa.cl/__/auth/handler
https://yugen.synaptechspa.cl/__/auth/handler
https://yugenstudio.synaptechspa.cl/__/auth/handler
```

## 3) A futuro
Cada tenant nuevo: agregar su dominio en los 2 lugares con el mismo patron. El codigo ya lo soporta solo.
