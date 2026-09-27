# Deployment

Two supported paths. Start with **one server + Docker Compose**; move to k3s + Helm when you need it.

## A. One server (recommended for launch)

Any Linux VPS with a public IPv4 (2 vCPU / 4 GB is plenty for hundreds of routers), Docker and
the compose plugin. `/dev/net/tun` must exist (it does on normal KVM VPSes).

1. **DNS** — point these A records at the server:
   `api.<domain>`, `app.<domain>`, `portal.<domain>`, `vpn.<domain>`.
   WISPs' own portal domains are CNAMEs to `portal.<domain>`; Caddy gets their certificates on demand.
2. **Firewall** — open TCP 80, 443 and UDP 51820 only.
3. **Secrets** — `cp .env.example .env`, then fill:
   ```sh
   openssl rand -base64 32   # LOCAL_KEK (or use KMS_KEY_ID)
   openssl rand -hex 32      # RADIUS_SECRET_SEED   (never change later)
   openssl rand -hex 24      # RADIUS_API_TOKEN
   openssl rand -hex 16      # POSTGRES_OWNER_PASSWORD, APP_DB_PASSWORD
   wg genkey | tee wg.key | wg pubkey   # WG_SERVER_PRIVATE_KEY / WG_SERVER_PUBLIC_KEY
   ```
   Set `APP_ENV=production`, the domains, `PUBLIC_API_URL=https://api.<domain>`,
   `PORTAL_BASE_URL=https://portal.<domain>`, `DASHBOARD_URL`/`ALLOWED_ORIGINS=https://app.<domain>`,
   `WG_SERVER_ENDPOINT=vpn.<domain>:51820`, Daraja + Africa's Talking credentials, `MPESA_ALLOWED_IPS`.
4. **Start**
   ```sh
   docker compose -f docker-compose.prod.yml up -d --build
   docker compose -f docker-compose.prod.yml logs -f api
   ```
   The API applies migrations on start. Open `https://app.<domain>/signup`.
5. **Backups** — `docker compose -f docker-compose.prod.yml exec postgres pg_dump -U owner wisp | gzip > wisp-$(date +%F).sql.gz`
   nightly, copied off the server. Keep `.env` (especially `LOCAL_KEK` and `RADIUS_SECRET_SEED`) in a
   password manager: without the KEK the encrypted PPPoE passwords and keys can't be read.

How it fits: `wg-gateway` owns the network namespace; `api`, `worker`, `radius`, `freeradius` and
`caddy` join it (`network_mode: service:wg-gateway`), so they reach routers at 10.200.x.x and routers
reach RADIUS at 10.200.0.1. RADIUS ports are never published to the internet.

### Upgrades
`git pull && docker compose -f docker-compose.prod.yml up -d --build`. Migrations run on API start.
RADIUS and the gateway restart in seconds; paid customers stay connected (sessions live on the routers).

## B. Kubernetes (k3s) with Helm

`infra/k8s/wisp` — one labelled gateway node runs `wg-gateway`, `radius` (FreeRADIUS + backend) and
`api`/`worker` with `hostNetwork` so they share the node's `wg0` route; `web` runs anywhere.

```sh
for c in api radius; do docker build -f infra/docker/go.Dockerfile --build-arg CMD=$c -t ghcr.io/<you>/wisp-$c .; done
docker build -f infra/docker/wg-gateway.Dockerfile -t ghcr.io/<you>/wisp-wg-gateway .
docker build -f infra/docker/freeradius.Dockerfile -t ghcr.io/<you>/wisp-freeradius .
docker build -f infra/docker/web.Dockerfile       -t ghcr.io/<you>/wisp-web .
kubectl label node <gateway-node> wisp/gateway=true
kubectl create secret generic wisp-env --from-env-file=.env
helm upgrade --install wisp infra/k8s/wisp --set image.registry=ghcr.io/<you>
```
Use a managed Postgres (or a StatefulSet) and put `DATABASE_URL` / `MIGRATE_DATABASE_URL` in the secret.
Open UDP 51820 to the gateway node.

## Production switches

| Setting | Why |
|---|---|
| `APP_ENV=production` | API refuses to start without Daraja keys, WG key, callback IP allowlist |
| `MPESA_ENV=production` per tenant | Each WISP flips Settings → M-Pesa → Live after a test payment |
| `SAFARICOM_PLATFORM_APPROVED=yes` | Only after Safaricom approves platform-mode STK in writing (CLAUDE.md §2.2) |
| `TRUST_CLOUDFLARE=true` | Only if the origin firewall accepts Cloudflare IPs alone |

## Health

`GET https://api.<domain>/healthz`, gateway `:8082/healthz` (peer sync), radius `127.0.0.1:8081/healthz`.
Logs are JSON (`log/slog`) with `request_id`, `tenant_id`, `router_id`.
