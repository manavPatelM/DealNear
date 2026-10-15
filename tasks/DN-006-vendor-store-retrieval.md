# DN-006: Retrieve an owned vendor store

Status: Done

## Outcome

An authenticated vendor can retrieve one of its stores by ID, while another
vendor cannot discover that the store exists.

## Scope

- Add `GET /api/vendors/stores/{storeId}` to `vendor-service`.
- Enforce ownership in the repository query using the authenticated vendor ID.
- Return the existing store response contract for an owned store.
- Return a documented `404` error for missing or non-owned stores.
- Add focused authorization and contract tests.

## Out of scope

- Store listing, editing, deletion, verification, or search.
- Gateway proxying.
- New services, database tables, migrations, Kafka, Redis, or AWS resources.

## Acceptance criteria

- [x] An authenticated vendor can retrieve its own store with HTTP `200`.
- [x] An unauthenticated request returns HTTP `401`.
- [x] A different vendor receives HTTP `404` without store details.
- [x] A malformed store ID returns an explicit client error.
- [x] The response matches the create-store response fields.
- [x] Existing tests and gateway behavior remain passing.

## Architecture and security

- `vendor-service` remains the sole owner of the `stores` table.
- The query must constrain both `storeId` and authenticated `vendorId`.
- No token, credential, or unnecessary personal data is logged.
- No remote calls, retries, events, or idempotency behavior are introduced.

## Verification

- `mvn test` from `services/vendor-service`.
- `npm test` from `services/api-gateway`.
- `git diff --check`.

## AI completion report

- Changed files:
  - `services/vendor-service/src/main/java/com/dealnear/vendor/store/StoreController.java`
  - `services/vendor-service/src/main/java/com/dealnear/vendor/store/StoreRepository.java`
  - `services/vendor-service/src/main/java/com/dealnear/vendor/store/StoreNotFoundException.java`
  - `services/vendor-service/src/main/java/com/dealnear/vendor/api/ApiExceptionHandler.java`
  - `services/vendor-service/src/test/java/com/dealnear/vendor/store/StoreControllerTest.java`
  - `docs/api/VENDOR_STORE_ENDPOINT.md`
  - `docs/status/PROJECT_STATUS.md`
- Commands actually run:
  - `mvn test -q` from `services/vendor-service`
  - `npm test` from `services/api-gateway`
  - `git diff --check`
- Results:
  - Vendor service tests passed.
  - Gateway tests passed: 2 tests, 0 failures.
  - Ownership is enforced in the repository query.
- Remaining limitations:
  - Store listing, editing, and deletion are not implemented.
- Recommended next task:
  - Add authenticated vendor store listing with bounded pagination.
