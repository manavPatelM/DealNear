# DN-004: Add first health endpoint

Status: Done

## Outcome
Prove that the first backend component starts and can report health.

## Scope
- Choose the first service only after repository/architecture review.
- Add one health endpoint and focused test.
- Do not create all microservices.

## Acceptance criteria
- [x] App starts using documented local instructions.
- [x] Health endpoint returns documented status/schema.
- [x] Focused test passes.
- [x] No credentials or cloud dependency are required.

## AI completion report
- Changed files:
  - `services/api-gateway/package.json`
  - `services/api-gateway/src/server.js`
  - `services/api-gateway/test/health.test.js`
  - `docs/api/HEALTH_ENDPOINT.md`
  - `README.md`
- Commands actually run:
  - `npm test` from the repository root (failed because the root has no `package.json`; corrected by running from the service directory)
  - `npm test` from `services/api-gateway`
  - `npm start` from `services/api-gateway`, followed by `Invoke-WebRequest http://127.0.0.1:3000/health`
- Results:
  - Focused tests passed: 2 tests, 0 failures.
  - Live health check passed: HTTP 200 with the documented JSON body.
  - `git diff --check` passed.
- Remaining limitations:
  - The gateway has no domain routes, authentication, persistence, or external integrations yet.
- Recommended next task:
  - Plan the first vendor/store domain slice.
