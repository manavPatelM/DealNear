# DN-012: Public published-offer read

Status: Complete

## Outcome

Customers can read a published offer without authentication, while draft offers
remain private to vendor management endpoints.

## Scope

- Add `GET /api/offers/public/{offerId}`.
- Permit the route without authentication.
- Return only published offers.
- Use a public response DTO that omits the internal vendor identifier.
- Add tests and API documentation.

## Out of scope

- Offer listing, radius filtering, categories, or store composition.
- Customer identity, saving offers, or analytics.
- Kafka, Redis, AWS, Kubernetes, and frontend work.

## AI completion report

- Changed files:
  - `services/offer-service/` (public response DTO, published-only repository
    query, unauthenticated public route, security rule, and tests).
  - `docs/api/OFFER_ENDPOINT.md`.
  - `tasks/DN-012-public-published-offer-read.md`.
- Commands actually run:
  - `mvn test -q` in `services/offer-service`.
  - `mvn package -DskipTests -q` in `services/offer-service`.
  - `mvn test -q` in `services/vendor-service`.
  - `npm test` in `services/api-gateway`.
  - `git diff --check`.
- Results:
  - Offer-service: 16 tests passed, 0 failures.
  - Vendor-service regression tests passed.
  - Gateway: 2 tests passed, 0 failures.
  - Offer-service packaging passed.
  - Unauthenticated published reads succeed, drafts remain inaccessible, and
    the public response omits the internal vendor identifier.
- Remaining limitations:
  - No public offer listing, radius filtering, category filtering, or store
    detail composition exists yet.
  - The route is a bounded offer-service read, not the final discovery service.
- Recommended next task:
  - Define and implement a bounded public published-offer listing contract
    before introducing location or PostGIS queries.
