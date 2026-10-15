# DN-008: Create offer drafts

Status: Complete

## Outcome

An authenticated vendor can create a draft offer for a store it owns.

## Scope

- Create `offer-service` with its own `offers` table and Flyway migration.
- Verify store ownership synchronously through `vendor-service`.
- Validate offer title, description, and store ID.
- Persist new offers with `DRAFT` status.
- Add health endpoint, tests, and API documentation.

## Out of scope

- Publishing, pausing, expiring, editing, or deleting offers.
- Kafka, Redis, AWS, Kubernetes, and frontend work.

## AI completion report

- Changed files:
  - `services/offer-service/` (Spring Boot service, draft endpoint, ownership
    client, schema migration, tests, and configuration).
  - `docs/api/OFFER_ENDPOINT.md`.
  - `tasks/DN-008-offer-draft-creation.md`.
  - `docs/status/PROJECT_STATUS.md`.
- Commands actually run:
  - `mvn test -q` in `services/offer-service`.
  - `mvn package -DskipTests -q` in `services/offer-service`.
  - `mvn test -q` in `services/vendor-service`.
  - `npm test` in `services/api-gateway`.
  - `docker compose up -d postgres`.
  - Live health checks for vendor-service and offer-service.
  - Authenticated store creation followed by authenticated offer creation.
  - PostgreSQL read-back from `offer_service.offers`.
  - `git diff --check`.
- Results:
  - Offer-service tests and packaging passed.
  - Vendor-service tests passed.
  - Gateway tests passed (2 tests).
  - Both services started against PostgreSQL.
  - Live offer creation returned `201 Created` with `DRAFT` status.
  - PostgreSQL read-back confirmed the persisted vendor, title, and status.
  - Offer-service uses an isolated `offer_service` schema and migration history
    table so service migrations cannot collide in the shared local database.
- Remaining limitations:
  - Offer creation has no idempotency key.
  - Offer lifecycle operations remain out of scope.
  - HMAC JWT remains an interim local authentication boundary.
- Recommended next task:
  - Add owned offer retrieval and listing before introducing lifecycle changes.
