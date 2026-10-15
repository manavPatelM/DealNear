# DN-007: List owned vendor stores

Status: Done

## Outcome

An authenticated vendor can list only its own stores with bounded pagination.

## Acceptance criteria

- [x] Results are filtered by authenticated vendor ID.
- [x] Page and size are bounded and validated.
- [x] Ordering is deterministic.
- [x] Response includes store data and pagination metadata.
- [x] Unauthenticated listing is rejected.
- [x] Existing service and gateway tests remain passing.

## Verification

- `mvn test -q` from `services/vendor-service`
- `npm test` from `services/api-gateway`
- `git diff --check`

## AI completion report

- Changed files:
  - `services/vendor-service/src/main/java/com/dealnear/vendor/store/StoreController.java`
  - `services/vendor-service/src/main/java/com/dealnear/vendor/store/StoreRepository.java`
  - `services/vendor-service/src/main/java/com/dealnear/vendor/store/StorePageResponse.java`
  - `services/vendor-service/src/main/java/com/dealnear/vendor/store/InvalidPaginationException.java`
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
  - Listing filters by vendor, validates page size, and returns metadata.
- Remaining limitations:
  - The endpoint has no cursor pagination or filtering beyond ownership.
- Recommended next task:
  - Implement the first offer draft creation slice.
