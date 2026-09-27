# M-Pesa Daraja calls we make

Client: `internal/mpesa`. Business logic: `internal/billing`. Sandbox base
`https://sandbox.safaricom.co.ke`, production `https://api.safaricom.co.ke` (per tenant `mpesa_env`).

## Which credentials

| Payment | Shortcode | Daraja app |
|---|---|---|
| Customer → WISP, `mpesa_mode=platform` (default) | WISP's till/Paybill (`BusinessShortCode` = store number for tills) | Ours (`MPESA_PLATFORM_*`) — **needs Safaricom's written approval before production** |
| Customer → WISP, `mpesa_mode=own` | WISP's | WISP's own keys (sealed in `tenants.mpesa_credentials_enc`) |
| WISP → us (subscription, SMS credits) | `MPESA_PLATFORM_SHORTCODE` | Ours |

## Calls

| Call | Endpoint | Notes |
|---|---|---|
| OAuth | `GET /oauth/v1/generate?grant_type=client_credentials` | Cached in memory per key until `expires_in − 60s` |
| STK Push | `POST /mpesa/stkpush/v1/processrequest` | `Password = base64(shortcode + passkey + timestamp)`, Nairobi time. Till → `CustomerBuyGoodsOnline`, `PartyB` = till. Paybill → `CustomerPayBillOnline`. `AccountReference` = PPPoE account ID (e.g. `JZM1042`) or `HS<8 hex>` for Hotspot; truncated to 12 chars, `TransactionDesc` to 13 |
| STK Query | `POST /mpesa/stkpushquery/v1/query` | Sweeper: pending > 60s → query; > 5 min → `expired`. `500.001.1001` = still processing. Portal status polls query after 15s |
| C2B register | `POST /mpesa/c2b/v2/registerurl` | Dashboard → Settings → "Link Paybill payments". `ResponseType=Completed` |

## Callbacks we serve

`{PUBLIC_API_URL}/v1/mpesa/{tenant_slug}/{callback_token}/stk`, `/c2b/validate`, `/c2b/confirm`.

Security (Daraja doesn't sign callbacks): source IP must be in `MPESA_ALLOWED_IPS`, the 32-byte
per-tenant token is compared in constant time, unknown/foreign IDs are logged and acknowledged.
Always answer `{"ResultCode":0,"ResultDesc":"Accepted"}` once authorised.

- STK: row found by `CheckoutRequestID` (waits up to 3s for the insert). Idempotent on the receipt;
  a late callback after the sweeper settled the row only fills in the receipt. `CallbackMetadata` is
  optional. Result codes → messages in `mpesa.UserMessage` (0, 1, 1032, 1037, 2001, …).
- C2B confirm: `BillRefNumber` trimmed, upper-cased, matched to `subscribers.pppoe_username`. No match →
  `status='unmatched'`, shown on Money with a Match button. Never dropped.
- Payment effects: PPPoE renews whole periods from `max(now, next_renewal_at)`, keeps the remainder as
  credit, SMS receipt; partial payments become credit with an SMS of the balance. Hotspot purchase →
  `starts_at`/`expires_at` + receipt. Platform purpose → subscription months or SMS credits.
