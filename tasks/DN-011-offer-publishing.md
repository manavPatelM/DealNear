# DN-011: Publish offer drafts

Status: Complete

## Outcome

An authenticated vendor can publish an offer it owns. Publishing performs the
explicit `DRAFT` to `PUBLISHED` transition and is safe to repeat.

## Scope

- Add `POST /api/offers/{offerId}/publish`.
- Add `PUBLISHED` to the offer status model.
- Enforce ownership through an ownership-filtered repository query.
- Keep the publish operation idempotent for already published offers.
- Add tests and API documentation.

## Out of scope

- Pausing, expiring, deleting, or editing published offers.
- Customer discovery or event publication.
- Kafka, Redis, AWS, Kubernetes, and frontend work.

## AI completion report

- Changed files:
  - `services/offer-service/` (published status, publish endpoint, and tests).
  - `docs/api/OFFER_ENDPOINT.md`.
  - `tasks/DN-011-offer-publishing.md`.
- Commands actually run:
  - `mvn test -q` in `services/offer-service`.
  - `mvn package -DskipTests -q` in `services/offer-service`.
  - `mvn test -q` in `services/vendor-service`.
  - `npm test` in `services/api-gateway`.
  - `git diff --check`.
- Results:
  - Offer-service: 14 tests passed, 0 failures.
  - Vendor-service regression tests passed.
  - Gateway: 2 tests passed, 0 failures.
  - Offer-service packaging passed.
  - Publishing, repeated publishing, and cross-vendor rejection are covered.
- Remaining limitations:
  - Published offers do not yet have customer discovery or public read behavior.
  - Pause and expiration transitions remain out of scope.
  - No event is emitted; Kafka remains deferred until an asynchronous consumer
    is required.
- Recommended next task:
  - Add a customer-facing published-offer discovery/read slice only after
    defining its API visibility and filtering contract.
