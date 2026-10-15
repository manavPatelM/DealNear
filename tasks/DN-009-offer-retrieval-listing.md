# DN-009: Retrieve and list owned offers

Status: Complete

## Outcome

An authenticated vendor can retrieve one of its offers or list its offers with
bounded pagination. Offer-service owns and enforces the filtering directly from
its offer records.

## Scope

- Add `GET /api/offers/{offerId}`.
- Add `GET /api/offers` with bounded offset pagination.
- Return only offers owned by the authenticated vendor.
- Use deterministic ordering by creation time and ID.
- Add not-found, malformed-ID, and invalid-pagination error responses.
- Add tests and API documentation.

## Out of scope

- Offer editing, publishing, pausing, expiring, or deleting.
- Customer discovery, filtering, or geographic queries.
- Kafka, Redis, AWS, Kubernetes, and frontend work.

## AI completion report

- Changed files:
  - `services/offer-service/` (ownership-filtered repository queries, retrieval
    and listing endpoints, pagination/error types, and tests).
  - `docs/api/OFFER_ENDPOINT.md`.
  - `tasks/DN-009-offer-retrieval-listing.md`.
  - `docs/status/PROJECT_STATUS.md`.
- Commands actually run:
  - `mvn test -q` in `services/offer-service`.
  - `mvn package -DskipTests -q` in `services/offer-service`.
  - `mvn test -q` in `services/vendor-service`.
  - `npm test` in `services/api-gateway`.
  - `git diff --check`.
- Results:
  - Offer-service: 8 tests passed, 0 failures.
  - Vendor-service: 9 tests passed, 0 failures.
  - Gateway: 2 tests passed, 0 failures.
  - Offer-service packaging passed.
  - Ownership filtering, pagination metadata, malformed IDs, not-found
    behavior, and invalid pagination are covered.
- Remaining limitations:
  - Offer lifecycle operations remain out of scope.
  - Customer discovery and public offer queries are not implemented.
  - HMAC JWT remains an interim local authentication boundary.
- Recommended next task:
  - Add a bounded vendor offer-edit operation, preserving `DRAFT` ownership
    and validation rules.
