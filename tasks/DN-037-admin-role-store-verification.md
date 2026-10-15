# DN-037 — Admin role and store verification

Status: Done

## Outcome
Admins review store submissions; only verified stores' offers can go live or be
discovered. See ADR-033.

## Changes
- identity-service: `ADMIN` role accepted; bootstrap admin from
  `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` (Compose sets local values).
- vendor-service: `V4` adds `verification_status`, `verification_note`,
  `reviewed_at`. New endpoints (ADMIN only):
  - `GET /api/vendors/admin/stores?status=PENDING|VERIFIED|REJECTED`
  - `POST /api/vendors/admin/stores/{id}/verify`
  - `POST /api/vendors/admin/stores/{id}/reject` `{ "reason": "..." }`
  Verify/reject record a store projection event carrying `storeActive`.
  Public summaries only return verified stores; batch lookup capped at 50 IDs.
- offer-service: publish/resume require a verified store (`409 STORE_NOT_VERIFIED`).
- discovery-service: `V4` adds `store_active`; nearby search excludes inactive stores.

## Verification
- vendor-service tests: pending by default, hidden from public, verify/reject/
  resubmit flow, role separation, projection flag.
- identity-service tests: bootstrap admin sign-in, idempotent bootstrap,
  weak password rejected, admin cannot use saved offers.
- offer-service test: publish refused for a pending store with no outbox event.
