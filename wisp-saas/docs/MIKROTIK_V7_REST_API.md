# RouterOS v7 REST calls we make

All over the WireGuard tunnel to `https://<tunnel ip>/rest/...` with HTTP Basic auth as the
`wisp-api` user the setup script creates (group policy `read,write,api,rest-api,test`, allowed only
from 10.200.0.1). Never the binary API on 8728. Client: `internal/routeros`. Every call is tested
against `mocks/mikrotik-mock`.

RouterOS REST verbs: `GET` list/read, `PUT` create, `PATCH` update, `DELETE` remove, `POST` console
command (`/rest/<menu>/<command>`). CLAUDE.md §6 writes "POST" for creates; RouterOS actually uses `PUT`.

| When | Call | Code |
|---|---|---|
| Health poll (60s) | `GET /rest/system/resource` → board-name, version, cpu-load, free-memory, architecture-name | `Service.Poll` |
| First contact | `GET /rest/system/routerboard` → serial-number (absent on CHR) | `Client.Serial` |
| Config sync | `GET /rest/radius?comment=wisp-saas`, `PUT`/`PATCH /rest/radius` `{address, secret, src-address, service: "ppp,hotspot"}` | `Service.Sync` |
| Config sync | `GET /rest/radius/incoming`, `POST /rest/radius/incoming/set {accept: yes}` | `Service.Sync` |
| Config sync (Hotspot routers) | `GET/PUT /rest/ip/hotspot/walled-garden {dst-host, action: allow}` and `/rest/ip/hotspot/walled-garden/ip {dst-host, action: accept}` | `Service.Sync` |
| Checklist | `GET /rest/radius`, `/rest/interface/pppoe-server/server?service-name=WISP-PPPoE`, `/rest/ip/hotspot?name=wisp-hotspot`, `/rest/ip/hotspot/walled-garden`, `/rest/ip/firewall/filter` | `Service.Checklist` |
| Kick (CoA fallback) | `GET /rest/ppp/active?name=<user>` → `POST /rest/ppp/active/remove {".id"}`; Hotspot: `/rest/ip/hotspot/active?user=<mac>` → `POST /rest/ip/hotspot/active/remove` | `Service.Kick` |

Bandwidth is not pushed as queues: RADIUS returns `Mikrotik-Rate-Limit` (`upload/download`,
e.g. `2M/5M`) and RouterOS creates the dynamic simple queue per session.

## One-time setup script (`internal/router/templates/setup.rsc`)

The only CLI the product generates. The dashboard shows:

```
/tool fetch url="https://api.<domain>/onboard/<token>" dst-path=wisp-setup.rsc; /import file-name=wisp-setup.rsc
```

The script (one `{ }` block so locals survive `/import`) does, printing `WISP setup: … done` lines:

1. Pre-flight: RouterOS ≥ 7, ≥ 1 MB free, `/ping 8.8.8.8`, DNS resolves the API host, chosen ports
   exist and none is the internet uplink. Each failure stops with the fix.
2. Removes anything tagged `wisp-saas` from an earlier run (safe to re-run).
3. `wg-saas` interface (private key generated on the router), server peer with
   `allowed-address=10.200.0.1/32 persistent-keepalive=25s`, `/32` tunnel address, input accept on wg-saas.
4. `wisp-api` user + group, self-signed cert, `www-ssl` limited to 10.200.0.1.
5. `/radius` (ppp + hotspot, src-address = tunnel IP), `/radius incoming accept=yes`, PPP AAA via RADIUS.
6. PPPoE: `bridge-pppoe`, pool `172.21.0.0/16`, profile `wisp-pppoe`, server `WISP-PPPoE` (pap, chap, mschap2), NAT, drop non-PPPoE forwarding.
7. Hotspot: `bridge-hotspot` 172.20.0.1/22 + DHCP, portal pages fetched from `/onboard/<token>/hotspot/*.html` (redirect to the portal with `mac`, `link-login-only`, `router`), profile `wisp-portal` (`login-by=mac,http-pap`, RADIUS accounting 5m), walled garden for portal + API hosts.
8. Anti-bypass: DNS forced to the router, DoT blocked, hotspot users can't reach private ranges or manage the router; wisp rules moved above existing ones.
9. `POST /onboard/<token>` with the public key → the gateway adds the peer; the first poll marks it online and syncs.

Render a sample for a lab router or CHR: `go run ./tools/script-generator -hotspot ether3 -pppoe ether2`.
