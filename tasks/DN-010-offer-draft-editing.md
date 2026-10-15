# DN-010: Edit offer drafts

Status: Complete

## Outcome

An authenticated vendor can update the title and description of a draft offer
it owns without changing the offer's store, vendor, status, or creation time.

## Scope

- Add `PATCH /api/offers/{offerId}`.
- Enforce vendor ownership through an ownership-filtered repository query.
- Validate updated title and description at the API boundary.
- Keep store, vendor, status, and creation timestamp immutable.
- Add tests and API documentation.

## Out of scope

- Publishing, pausing, expiring, or deleting offers.
- Changing an offer's store after creation.
- Kafka, Redis, AWS, Kubernetes, and frontend work.

## AI completion report

- Changed files:
  - `services/offer-service/` (draft update request, update endpoint, entity
    mutation method, and controller tests).
  - `docs/api/OFFER_ENDPOINT.md`.
  - `tasks/DN-010-offer-draft-editing.md`.
  - `docs/status/PROJECT_STATUS.md`.
- Commands actually run:
  - `mvn test -q` in `services/offer-service`.
  - `mvn package -DskipTests -q` in `services/offer-service`.
  - `mvn test -q` in `services/vendor-service`.
  - `npm test` in `services/api-gateway`.
  - `git diff --check`.
- Results:
  - Offer-service: 11 tests passed, 0 failures.
  - Vendor-service: 9 tests passed, 0 failures.
  - Gateway: 2 tests passed, 0 failures.
  - Offer-service packaging passed.
  - Owned draft updates, cross-vendor rejection, and validation errors are
    covered.
- Remaining limitations:
  - Only title and description are editable.
  - Publishing and other lifecycle transitions remain out of scope.
  - HMAC JWT remains an interim local authentication boundary.
- Recommended next task:
  - Add a separate publish transition with explicit status modeling and
    validation.
