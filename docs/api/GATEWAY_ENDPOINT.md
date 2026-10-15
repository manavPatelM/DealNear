# API gateway

The dependency-free Node.js gateway listens on port `3000` by default.

## Health

`GET /health` returns the gateway health contract without contacting an
upstream service.

## Service routing

The gateway forwards these path prefixes:

- `/api/vendors/*` -> `VENDOR_SERVICE_URL` (default `http://localhost:8081`)
- `/api/offers*` -> `OFFER_SERVICE_URL` (default `http://localhost:8082`)
- `/api/discovery/*` -> `DISCOVERY_SERVICE_URL` (default
  `http://localhost:8083`)
- `/api/auth/*` -> `IDENTITY_SERVICE_URL` (default
  `http://localhost:8084`)

Query strings and request methods are preserved. The gateway forwards only
the boundary headers needed by the current contracts:

- `Authorization`
- `Content-Type`
- `X-Projection-Token`

The default upstream timeout is three seconds and can be changed with
`GATEWAY_PROXY_TIMEOUT_MS`. Timeout and connection failures return
`502 UPSTREAM_TIMEOUT` or `502 UPSTREAM_UNAVAILABLE` without exposing upstream
details.
