# DN-014: Privacy-safe public store summary

Status: Complete

## Outcome

Published public offer responses now include the owning store's name and city
without exposing vendor identity, street address, or coordinates.

## Scope

- Persist an explicit store city in vendor-service.
- Add `GET /api/vendors/stores/public/{storeId}`.
- Add a privacy-safe store-summary client in offer-service.
- Enrich public single-offer and paginated-list responses.
- Add timeout, missing-store, and privacy-boundary behavior.
- Document the contract and record the architecture decision.

## Out of scope

- Address or coordinate exposure.
- Radius, geographic, category, or text filtering.
- Discovery read models, PostGIS, Kafka, Redis, AWS, Kubernetes, and frontend
  work.

## AI completion report

- Changed files:
  - `services/vendor-service/` (city persistence, public summary endpoint,
    security rule, and tests).
  - `services/offer-service/` (summary client, enriched public DTOs, error
    handling, and tests).
  - `docs/api/VENDOR_STORE_ENDPOINT.md`.
  - `docs/api/OFFER_ENDPOINT.md`.
  - `docs/decisions/ADR-014-public-store-summary.md`.
  - `docs/status/PROJECT_STATUS.md`.
- Commands actually run:
  - `mvn test -q` in `services/vendor-service`.
  - `mvn test -q` in `services/offer-service`.
  - `git diff --check`.
- Results:
  - Vendor-service tests passed, including the unauthenticated privacy-safe
    summary test.
  - Offer-service tests passed, including store name/city enrichment.
  - Whitespace validation passed.
- Remaining limitations:
  - Public listing performs one bounded synchronous store lookup per offer.
  - Location discovery and radius filtering are not implemented.
- Recommended next task:
  - Define a discovery query contract and read-model strategy before adding
    PostGIS or radius filtering.
