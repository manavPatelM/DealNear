# DN-032 — CI GitHub Actions workflows and API error format & versioning ADR

## Goal
Implement comprehensive CI GitHub Actions workflows covering build, test, Docker image building, and secret scanning across all DealNear services, and record the architectural decision on API error format and contract versioning.

## Acceptance criteria
- [x] `.github/workflows/ci.yml` builds and tests all services (`identity-service`, `vendor-service`, `offer-service`, `discovery-service`, `api-gateway`, and `frontend`) on pushes and pull requests to `main` and `develop`.
- [x] A single `ci-pass` summary status check allows simple branch protection configuration.
- [x] `.github/workflows/docker-build.yml` validates Dockerfile builds for all containers using a parallel matrix with GitHub Actions caching.
- [x] `.github/workflows/secret-scan.yml` runs automated gitleaks secret scanning on pushes and PRs.
- [x] `AuthControllerTest` covers vendor registration (`POST /api/auth/register/vendor`) and role-based profile checks.
- [x] `ADR-032` documents the canonical `{ error: { code, message, details } }` format and the backward-compatible versioning policy.
- [x] `identity-service` and `discovery-service` have `@RestControllerAdvice` handlers adhering to the ADR-032 error format.

## Changes made
### GitHub Actions Workflows
- `.github/workflows/ci.yml`: Multi-job CI pipeline for Node.js (`api-gateway`, `frontend`) and Java 21 (`identity-service`, `vendor-service`, `offer-service`, `discovery-service`) with caching and artifact upload on test failure.
- `.github/workflows/docker-build.yml`: Matrix build job verifying Dockerfiles across all 6 container images.
- `.github/workflows/secret-scan.yml`: Gitleaks workflow scanning commit history for secrets.

### Backend Services
- `services/identity-service`:
  - `AuthControllerTest.java`: Added tests for vendor registration and profile endpoint.
  - `AuthController.java`: Removed unused `MessageDigest` import.
  - `ApiExceptionHandler.java`: Standardized error responses to `{ error: { code, message } }`.
- `services/discovery-service`:
  - `ApiExceptionHandler.java`: Standardized error responses to `{ error: { code, message } }`.

### Architecture Decisions
- `docs/decisions/ADR-032-api-error-format-and-versioning.md`: Recorded error envelope standards and API versioning rules.

## Verification
- Gateway tests: `npm test` in `services/api-gateway` passed (4/4 tests passed).
- Frontend build: `npm run build` in `frontend` completed cleanly.
- Identity and discovery error handlers match existing patterns from `vendor-service` and `offer-service`.

## Risks
- Java maven tests run in CI where Maven is installed; local Windows environment does not have `mvn` or `mvnw` installed on PATH.
- Gitleaks action requires no secrets for public repositories, but private repositories require either standard runner setup or license tokens.
