# DN-021: Protected store projection contract

Status: Complete

## Outcome

Vendor-service now exposes a token-protected store projection endpoint for
discovery synchronization. It returns the store location required by PostGIS
while preserving the existing public summary privacy boundary.

## Contract

`GET /api/vendors/stores/projection/{storeId}`

Required header:

`X-Projection-Token: ${VENDOR_PROJECTION_TOKEN}`

Response fields:

- `id`
- `name`
- `city`
- `latitude`
- `longitude`

The response omits `vendorId` and `address`.

## Verification

- Vendor-service Maven tests: passed.
- Valid token returns location-bearing projection details.
- Invalid token returns `401 UNAUTHORIZED`.
- Existing public summary privacy test remains passing.

## Recommended next task

Implement bounded delivery of pending offer outbox events into discovery with
explicit HTTP timeouts, retry backoff, and idempotent updates.
