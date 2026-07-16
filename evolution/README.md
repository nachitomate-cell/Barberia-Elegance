# Evolution API — infra del add-on "Asistente IA 24/7 + Confirmaciones"

VPS propio con Evolution API (WhatsApp por sesión/QR) para el bot conversacional y
las confirmaciones sobre el **número propio de cada local**. Corre **aislado** del
stack Firebase/Vercel. Cada barbería = una **instancia** aislada `instance_{tenantId}`.

> **Arquitectura híbrida (aprobada):** el número oficial de SynapTech (Cloud API de
> Meta) queda para avisos al DUEÑO; Evolution corre en el número del LOCAL para el
> bot + confirmaciones al CLIENTE. Ver `functions/whatsapp-notif.js` para el lado oficial.

## Deploy (una vez, ~10 min)

1. **VPS**: Hetzner CX22 (~$6/mes) o DigitalOcean, Ubuntu 24.04. Instala Docker + Compose:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. **DNS**: apunta un A record `wa.synaptechspa.cl` → IP del VPS (el wildcard de
   synaptechspa.cl ya existe, pero este subdominio debe ir directo al VPS, NO a Vercel).
3. **Archivos**: copia `docker-compose.yml`, `Caddyfile` y crea `.env` desde `.env.example`.
   - `EVOLUTION_API_KEY`: `openssl rand -hex 32`
   - `POSTGRES_PASSWORD`: otra fuerte
   - `EVOLUTION_DOMAIN`: `wa.synaptechspa.cl`
4. **Levanta**:
   ```bash
   docker compose up -d
   docker compose logs -f evolution-api   # espera "Server running"
   ```
5. **Verifica** (Caddy saca el TLS solo en ~30s):
   ```bash
   curl -s https://wa.synaptechspa.cl -H "apikey: TU_EVOLUTION_API_KEY"
   ```
   Debe responder JSON de Evolution (no error de conexión/TLS).

## Qué le pasas a Claude para enchufarlo a Firebase

Solo 2 datos → se guardan como **secrets** y las Cloud Functions del gateway se conectan:

| Secret Firebase | Valor |
|---|---|
| `EVOLUTION_API_URL` | `https://wa.synaptechspa.cl` |
| `EVOLUTION_API_KEY` | la misma `AUTHENTICATION_API_KEY` del `.env` |
| `EVOLUTION_WEBHOOK_TOKEN` | `openssl rand -hex 24` (valida que el webhook entrante venga de tu VPS) |

## Operación
- **Reiniciar una sesión pegada**: `docker compose restart evolution-api` (las instancias
  persisten en el volumen; se reconectan solas si el QR sigue vinculado).
- **Actualizar versión**: cambia el tag en `docker-compose.yml` → `docker compose pull && up -d`.
- **Backups**: el volumen `postgres_data` tiene las sesiones; respáldalo.

## Seguridad / anti-ban (recordatorio)
- Presencia `composing` 3–5s antes de responder (se activa desde el gateway).
- Rate-limits por instancia (gateway).
- El módulo anti-colisión ("efecto fantasma") silencia el bot 2h cuando el humano interviene.
- Checkbox de T&C obligatorio en `/gestion-interna` al vincular.
