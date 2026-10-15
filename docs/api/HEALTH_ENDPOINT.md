# API Gateway health endpoint

The first DealNear backend component is the dependency-free Node.js `api-gateway`
starter in [`services/api-gateway`](../../services/api-gateway/).

## Run locally

```text
cd services/api-gateway
npm start
```

The server listens on `PORT`, defaulting to `3000`.

## Contract

### `GET /health`

Returns HTTP `200` with:

```json
{
  "status": "ok",
  "service": "api-gateway",
  "version": "0.1.0"
}
```

Unknown routes return HTTP `404` with the repository error shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found"
  }
}
```

This endpoint has no database, AWS, credentials, or other external dependency.
