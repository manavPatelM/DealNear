# DN-020: Transactional offer projection outbox

Status: Complete

## Outcome

The offer-service now records a versioned projection event in its own
transactional outbox when an offer is published. The outbox is durable,
service-owned, and separate from the discovery database.

## Verification

- Offer-service Maven tests: passed.
- Outbox migration is included in the Flyway history.
- `git diff --check`: passed.

## Limitations

- Delivery is not enabled yet. The current public store-summary contract
  intentionally omits coordinates, so a protected store-location projection
  contract is required before dispatch can safely populate PostGIS.
- Retry scheduling, delivery metrics, and stale-write protection remain
  follow-up work.

## Recommended next task

Add a protected vendor-service projection contract that returns store location
only to the discovery synchronization path, then implement bounded outbox
delivery.
