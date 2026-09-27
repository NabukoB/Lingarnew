# FreeRADIUS (rlm_rest) setup

Image: `infra/docker/freeradius.Dockerfile` (official FreeRADIUS 3.2 image, which ships rlm_rest).
Config: `infra/freeradius/`. FreeRADIUS has no business logic; it forwards to `cmd/radius`
(`RADIUS_BACKEND_URL`, default `http://127.0.0.1:8081`, HTTP Basic `freeradius` / `RADIUS_API_TOKEN`).

| File | Purpose |
|---|---|
| `sites-available/wisp` | Only virtual server. Listens 1812/1813. Clients = dynamic network `WG_TUNNEL_CIDR` |
| `sites-available/wisp_dynamic_clients` | On a router's first packet asks the backend for its secret (cached 300s); 404 = dropped |
| `mods-available/wisp_rest` | `wisp_rest` (authorize + accounting) and `wisp_client` rlm_rest instances |
| `clients.conf` | Only localhost (for `radtest` inside the container) |

## Backend endpoints (`internal/session/handler.go`)

The router is identified by `%{Packet-Src-IP-Address}` passed as `?nas=` — its tunnel IP.

| Endpoint | Returns |
|---|---|
| `POST /radius/client?nas=` | `control:FreeRADIUS-Client-Secret` etc., or 404 |
| `POST /radius/authorize?nas=` | Accept: `control:Cleartext-Password`, `reply:Mikrotik-Rate-Limit`, `reply:Session-Timeout` (≤ 24h, until renewal + grace or Hotspot expiry), `reply:Acct-Interim-Interval` 300. Reject: `control:Auth-Type := Reject` + `reply:Reply-Message`, e.g. `Account expired. Pay via M-Pesa Paybill 123456, Account: JZM1042` |
| `POST /radius/accounting?nas=` | 204. Start / Interim-Update / Stop / Accounting-On/Off. Data caps enforced on interim updates |

There is no `/radius/authenticate`: with the cleartext password in `control`, FreeRADIUS's `pap`,
`chap` and `mschap` modules verify PAP, CHAP and MS-CHAPv2 themselves.

Hotspot devices authenticate with username = password = MAC. PPPoE users are account IDs.

## Disconnects (CoA)

`internal/session.Disconnect` sends RFC 5176 Disconnect-Request to `<tunnel ip>:3799` with the
router's secret; on failure it removes the session over REST. Both write `config_audit`.

## Testing

`make e2e-radius` builds the image and runs `tests/e2e`: a real FreeRADIUS, radclient as the
router, PAP / CHAP / MS-CHAPv2 accept, wrong password and expired account rejects, accounting,
and an unknown source dropped.
