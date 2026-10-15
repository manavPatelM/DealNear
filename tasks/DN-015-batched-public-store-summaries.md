# DN-015: Batched public store summaries

Status: Complete

## Outcome

Public offer listings enrich each page with one vendor-service store-summary
request instead of one request per offer.

## Scope

- Add a batch public store-summary endpoint.
- Add offer-service batch client support.
- Preserve the existing privacy-safe response shape and missing-store behavior.
- Add documentation and regression coverage.

## Out of scope

- Persistent discovery read models.
- PostGIS, radius filtering, Kafka, Redis, AWS, Kubernetes, and frontend work.

## Verification

- Vendor-service `mvn test -q`: passed.
- Offer-service `mvn test -q`: passed.
- `git diff --check`: passed.

## Remaining limitation

The batch call is still synchronous; a durable discovery read model remains
the appropriate next step before geographic filtering.
