# DN-013: Public published-offer listing

Status: Complete

## Outcome

Customers can browse a bounded paginated list of published offers without
authentication.

## Scope

- Add `GET /api/offers/public`.
- Return only offers with `PUBLISHED` status.
- Apply page and size limits from 1 to 50.
- Order results by creation time descending and ID descending.
- Return the public response shape without the internal vendor identifier.
- Add tests and API documentation.

## Out of scope

- Radius, geographic, category, or text filtering.
- Store detail composition.
- Customer identity, saved offers, or analytics.
- Kafka, Redis, AWS, Kubernetes, and frontend work.

## AI completion report

- Changed files:
  - `services/offer-service/` (published-status repository query, public page
    response, unauthenticated listing route, and tests).
  - `docs/api/OFFER_ENDPOINT.md`.
  - `tasks/DN-013-public-published-offer-listing.md`.
- Commands actually run:
  - `mvn test -q` in `services/offer-service`.
  - `mvn package -DskipTests -q` in `services/offer-service`.
  - `mvn test -q` in `services/vendor-service`.
  - `npm test` in `services/api-gateway`.
  - `git diff --check`.
- Results:
  - Offer-service: 18 tests passed, 0 failures.
  - Vendor-service regression tests passed.
  - Gateway: 2 tests passed, 0 failures.
  - Offer-service packaging passed.
  - Public listing excludes drafts, omits vendor identifiers, and returns
    bounded pagination metadata.
- Remaining limitations:
  - No radius, geographic, category, or text filtering exists yet.
  - Store details are not composed into public offer results.
- Recommended next task:
  - Add a public store-summary contract for published offers or define the
    location discovery contract before introducing PostGIS.
