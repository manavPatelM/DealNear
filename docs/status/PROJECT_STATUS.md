# DealNear Project Status

Update this file only after reviewing the actual repository and verification results.

## Current phase
Phase 2: First vertical slice.

## Last verified milestone
Vendor store creation was verified against local PostgreSQL with Flyway and a
real HTTP request; owned retrieval and paginated listing are covered by service
tests. Offer draft creation was also verified through the real vendor-service
ownership call and persisted to PostgreSQL.
Offer retrieval and vendor-owned pagination are covered by offer-service tests.
Vendor-owned draft editing is now implemented and under verification.
Unauthenticated reads are limited to published offers and omit the internal
vendor identifier.
Public published-offer listing is covered by bounded pagination tests.
Published public offer responses now include privacy-safe store name and city
summaries fetched through vendor-service.
Public offer pages use one bounded batch store-summary request instead of one
request per offer.
Nearby discovery now has a documented location, privacy, eligibility, and
read-model contract.
Offers now require explicit `startAt` and `endAt` timestamps, and publishing
rejects already-ended windows.
Expired offers are now excluded from public reads and listings at query time
without mutating their stored lifecycle status.
Dedicated discovery-service now owns a PostGIS-backed projection schema and
nearby query contract with an explicit idempotent projection boundary.
Offer publication now records a versioned discovery projection event in an
offer-service transactional outbox.
Vendor-service now exposes a token-protected location-bearing store projection
contract without expanding the public store summary.
Offer-service has an opt-in bounded outbox dispatcher with timeouts and capped
retry backoff for discovery synchronization.
Discovery rejects stale projection updates using an outbox event version.
The full local publish-to-discovery dispatcher flow has been verified against
PostGIS and PostgreSQL.
Offer projection delivery now records low-cardinality success/failure counters
and delivery duration through the offer-service actuator metrics endpoint.
Edits to already-published offers now create a fresh projection outbox event
so discovery can receive the updated content.
Published offers can now be unpublished or deleted through a versioned
projection-removal event.
Store edits now create a vendor-service projection outbox event for discovery
name, city, and coordinate synchronization.
Identity-service now supports customer registration and sign-in with BCrypt
password hashing and interim HMAC JWT access tokens.
Identity-service also exposes an authenticated customer profile endpoint at
`GET /api/auth/me`.
Customers can now save, list, and unsave offer references through
identity-service. Saved-offer ownership is isolated from offer-service data.
All current services now have Dockerfiles and are wired into the local
PostgreSQL/PostGIS Compose stack with health checks.
The complete Compose stack has been started and verified through gateway
health, customer registration, and saved-offer persistence.
Vendor portal UI is now complete. Vendors can register (`POST /api/auth/register/vendor`),
sign in, manage stores (create/edit) and offers (create/edit/publish/unpublish/delete)
through a dedicated Vendor tab in the React frontend. The frontend uses a premium dark-mode
design system with a portal switcher, modal forms, status badges, and fully role-aware
navigation.

GitHub Actions CI workflows are now established:
- `.github/workflows/ci.yml`: parallel builds and tests for all 4 Spring Boot services, api-gateway, and React frontend, gated by a required `ci-pass` check.
- `.github/workflows/docker-build.yml`: matrix Docker build validation with GHA layer caching.
- `.github/workflows/secret-scan.yml`: automated gitleaks secret detection across git history.
- `ADR-032`: standard API error envelope `{ error: { code, message, details } }` and backward-compatible URI/event versioning documented and wired across services.

MVP completion (DN-033 to DN-039, verified 2026-10-15):
- JWTs expire (`exp`, `JWT_TTL_SECONDS`) and every service rejects expired tokens.
- Offers have categories; nearby and public listings filter by category.
- Offer lifecycle: draft, publish, pause/resume, end now, admin removal (ADR-033).
- Customers can browse all offers, open offer details with the store's other offers,
  see saved offers by title, and report offers.
- Admin role with bootstrap account; store verification gates publishing and
  discovery; moderation queue with dismiss/remove.
- React app has Customer, Vendor, and Admin portals.
- `scripts/smoke-test.mjs` passed all 9 end-to-end checks against the local Compose
  stack (PostgreSQL/PostGIS, outbox dispatchers, nginx proxy).
- Single-host AWS deployment is defined in `infra/aws` (Terraform validated, not yet
  applied) and documented in `docs/deploy/AWS_DEPLOYMENT.md`.

Website specification, Phase 1 (2026-10-22): routed website (DN-040), admin-managed
category taxonomy (DN-041), new homepage with location selector (DN-042), and Playwright
browser tests in CI (DN-043). Full plan: `docs/plan/SPEC_IMPLEMENTATION_PLAN.md`.

## Working locally
- [ ] Repository cloned and dependencies installed
- [x] Documented local checks pass
- [x] First vertical slice passes tests

## Architecture decisions to resolve
- [x] Final initial service boundaries
- [x] Authentication approach
- [x] Local database/migration approach
- [x] API error format and versioning
- [ ] When to introduce Kafka and Redis
- [ ] AWS environment and budget plan

## Known issues
- The API gateway exposes health and bounded routing to vendor, offer, and
  discovery services with upstream timeouts.
- PostgreSQL runtime is configured and local Compose verification is part of the
  developer workflow.
- No refresh tokens; users sign in again when the access token expires.
- Public listing totals may count offers whose store verification was revoked.
- No automated browser (UI) tests yet.
- Each JVM service's first request after startup can take several seconds; the
  gateway timeout is 10s in Compose.

## Next task
Phase 2 of the website plan: DN-044 media uploads, DN-045 store profiles, DN-046 rich
offers, DN-047 offer details page, DN-048 vendor offer manager.
