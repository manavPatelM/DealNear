# Vendor store endpoint

`vendor-service` owns store persistence and validation. It runs on port `8081`
by default and uses PostgreSQL through environment variables.

`GET /health` is unauthenticated and returns the service status:

```json
{
  "status": "ok",
  "service": "vendor-service",
  "version": "0.1.0"
}
```

## Authentication

The first local slice accepts an HMAC-SHA256 JWT in the `Authorization` header.
The token must contain:

- `sub`: vendor identifier
- `role`: `VENDOR`

The signing secret is supplied through `JWT_SECRET`. The default is only for
local development and must be replaced outside local development.

## `POST /api/vendors/stores`

Request:

```json
{
  "name": "Corner Market",
  "address": "1 Main Street",
  "city": "New York",
  "latitude": 40.7128,
  "longitude": -74.006
}
```

Successful response: `201 Created`.

Validation failures use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed"
  }
}
```

The store is persisted with the JWT subject as `vendorId`. No other service may
read or write the `stores` table directly.

## `GET /api/vendors/stores/public/{storeId}`

Returns the privacy-safe public summary for a store without authentication:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "name": "Corner Market",
  "city": "New York"
}
```

The public summary intentionally excludes the vendor identifier, street
address, and coordinates.

## `GET /api/vendors/stores/projection/{storeId}`

Returns location-bearing store details for the discovery synchronization path.
The endpoint requires:

```text
X-Projection-Token: ${VENDOR_PROJECTION_TOKEN}
```

The response includes `id`, `name`, `city`, `latitude`, and `longitude`, but
omits `vendorId` and `address`. The token defaults to a local-development
value and must be replaced outside local development.

## `GET /api/vendors/stores/public?ids={storeId}&ids={storeId}`

Returns public summaries for multiple stores in one request. Missing store IDs
are omitted. This endpoint is intended for bounded public offer-page
enrichment and does not expose private store fields.

## `GET /api/vendors/stores/{storeId}`

Returns `200 OK` with the store response when the authenticated vendor owns the
requested store. Missing stores and stores owned by another vendor both return
the same response to avoid revealing whether an inaccessible ID exists:

```json
{
  "error": {
    "code": "STORE_NOT_FOUND",
    "message": "Store not found"
  }
}
```

A malformed UUID returns `400 Bad Request`.

## `PATCH /api/vendors/stores/{storeId}`

Updates an owned store's name, address, city, and coordinates. The update is
stored transactionally with a vendor-service projection outbox event. When the
store projection dispatcher is enabled, discovery updates all projections for
that store using the new name, city, and location.

## `GET /api/vendors/stores`

Returns only stores owned by the authenticated vendor. Results are ordered by
newest creation time, with store ID as a deterministic tie-breaker.

Query parameters:

- `page`: zero-based page number, default `0`.
- `size`: page size from `1` to `50`, default `20`.

Example response:

```json
{
  "stores": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0
}
```

Invalid pagination returns `400` with error code `INVALID_PAGINATION`.

## Local configuration

```text
DATABASE_URL=jdbc:postgresql://localhost:5432/dealnear
DATABASE_USERNAME=dealnear
DATABASE_PASSWORD=dealnear
JWT_SECRET=replace-with-a-local-secret
VENDOR_PROJECTION_TOKEN=replace-with-a-projection-secret
```
