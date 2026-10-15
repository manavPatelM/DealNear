# DN-005: Implement vendor store creation

Status: Done

## Outcome

A vendor can create a store through a validated API owned by the vendor domain,
and the store is persisted locally with an automated test proving the flow.

## Type

- [x] Vertical feature slice
- [ ] Horizontal/platform capability
- [ ] Bug fix
- [ ] Refactor
- [ ] Security/quality
- [ ] Documentation

## Context

The repository currently contains only the dependency-free Node.js `api-gateway`
health endpoint. The architecture defines `vendor-service` as the owner of
vendors and stores, while the gateway owns routing and cross-cutting HTTP
concerns. The first domain slice should remain local and synchronous; Kafka,
Redis, AWS, and Kubernetes remain out of scope.

## Scope

### In scope

- Create a bounded `vendor-service` with a documented health endpoint.
- Define and implement `POST /api/vendors/stores`.
- Validate required store fields and coordinate ranges at the service boundary.
- Persist stores using PostgreSQL migrations and a local development configuration.
- Enforce that the request represents a vendor and that the vendor owns the
  created store.
- Add focused unit and integration/contract tests.
- Document the request, response, errors, and local verification commands.

### Out of scope

- Customer registration or full identity management.
- Store editing, deletion, verification, or admin moderation.
- Offer creation or discovery.
- Kafka, Redis, PostGIS, AWS, and Kubernetes.
- A production-grade identity provider.

## Dependencies

- A selected local authentication strategy for the first slice.
- Java 21 and Maven availability for the Spring Boot service.
- Docker Compose PostgreSQL availability for local persistence.

## Acceptance criteria

- [x] `vendor-service` starts locally without AWS credentials.
- [x] `POST /api/vendors/stores` accepts a valid vendor request and returns
      `201` with a stable store identifier and documented response fields.
- [x] Missing or invalid fields return the standard error shape and do not
      create a record.
- [x] Non-vendor requests are rejected.
- [x] Store data is owned and persisted by `vendor-service`; no other service
      accesses its tables directly.
- [x] Migration and rollback behavior are documented.
- [x] Focused tests pass for success, validation failure, authorization failure,
      and persistence.

## Tests and verification

- Unit: request validation and coordinate bounds.
- Integration/contract/e2e: controller-to-repository store creation against a
  disposable local PostgreSQL database; response contract assertions.
- Security/configuration: vendor-role and ownership checks; no credentials in
  source or logs.
- Commands to run:
  - `mvn test` from `services/vendor-service`
  - the documented local startup command
  - a local HTTP request against the create-store endpoint
  - `git diff --check`

## Files/components likely involved

- `services/vendor-service/pom.xml`
- `services/vendor-service/src/main/java/...`
- `services/vendor-service/src/main/resources/db/migration/...`
- `services/vendor-service/src/test/java/...`
- `docs/api/VENDOR_STORE_ENDPOINT.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/status/PROJECT_STATUS.md`

## Architecture design

### User journey

An authenticated vendor submits store details. The vendor service validates the
request, confirms the caller has the vendor role, persists the store, and
returns the created store representation.

### Components and ownership

- `api-gateway`: future routing boundary; it must not access vendor tables.
- `vendor-service`: owns vendor/store validation, persistence, and authorization.
- PostgreSQL: local persistence for vendor-service only.

### API contract

- `POST /api/vendors/stores`
- JSON request and response schemas will be finalized before implementation.
- Errors use the existing `{ "error": { "code", "message" } }` shape.
- No events are emitted in this slice.

### Failure, timeout, retry, and idempotency

- Validation failures are rejected before persistence.
- Database failures return an explicit server error without exposing internals.
- No remote calls or retries are introduced.
- If the selected client contract includes a request idempotency key, duplicate
  submissions will be handled explicitly; otherwise retries remain a follow-up.

### Security and privacy

- Require an authenticated vendor role.
- Do not log tokens, passwords, or unnecessary personal data.
- Keep local credentials in environment variables and ignored files.

### Rollout and rollback

- Run the migration before starting the service.
- Roll back by reverting the service change and applying the documented
  migration rollback procedure in a disposable local database.
- No production or cloud rollout is part of this task.

## Risks and rollback

- Introducing PostgreSQL now adds local setup complexity; this is necessary for
  the stated data constraint and store ownership model.
- Authentication details may need revision when `identity-service` is added.
- Rollback is a service revert plus removal of the local store schema.

## AI completion report

- Changed files:
  - `services/vendor-service/pom.xml`
  - `services/vendor-service/src/main/java/com/dealnear/vendor/...`
  - `services/vendor-service/src/main/resources/application.yml`
  - `services/vendor-service/src/main/resources/application-test.yml`
  - `services/vendor-service/src/main/resources/db/migration/V1__create_stores.sql`
  - `services/vendor-service/src/test/java/com/dealnear/vendor/store/StoreControllerTest.java`
  - `docs/api/VENDOR_STORE_ENDPOINT.md`
  - `docs/status/PROJECT_STATUS.md`
  - `compose.yaml`
  - `docs/LOCAL_DEVELOPMENT.md`
- Commands actually run:
  - Maven 3.9.11 installation and version check.
  - `mvn test -q` from `services/vendor-service`.
  - `docker compose up -d postgres`.
  - `mvn package -DskipTests -q` from `services/vendor-service`.
  - Started the packaged vendor service.
  - `GET http://127.0.0.1:8081/health`.
  - Authenticated `POST http://127.0.0.1:8081/api/vendors/stores`.
  - PostgreSQL read-back through `docker exec ... psql`.
  - `docker compose stop postgres`.
  - `git diff --check`.
- Results:
  - Vendor service tests passed with 3 tests and 0 failures.
  - Test coverage includes successful creation, unauthenticated access, and
    invalid-coordinate validation.
  - H2 is used only by the test profile; runtime configuration remains
    PostgreSQL with Flyway.
  - PostgreSQL 16 became healthy through Docker Compose.
  - Flyway-backed startup passed; `/health` returned HTTP 200.
  - Store creation returned HTTP 201 and the inserted row was read back from
    PostgreSQL.
- Remaining limitations:
  - JWT verification is a local interim boundary; identity-service integration,
    token expiry validation, and key rotation are follow-up work.
  - The local PostgreSQL verification is not a production deployment.
- Recommended next task:
  - Implement store retrieval or vendor/store listing.
