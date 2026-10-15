# DN-033 — JWT expiration and token validation hardening

Status: Done

## Outcome
Access tokens expire and every service rejects expired tokens or tokens without `exp`.

## Changes
- identity-service issues `iat` and `exp` claims; TTL from `JWT_TTL_SECONDS`
  (default 3600). Login/register responses add `expiresAt`.
- identity, vendor, and offer JWT filters reject tokens whose `exp` is missing,
  non-numeric, or not in the future.
- discovery-service compares projection tokens in constant time.
- Frontend discards expired stored tokens, signs out when the expiry passes or
  any authenticated request returns 401, and shows a session-expired notice.
- Compose fix: `STORE_PROJECTION_DISPATCHER_ENABLED` moved from offer-service to
  vendor-service (where that dispatcher lives); store edits previously never
  reached discovery in the Compose stack.

## Verification
- `mvn test` in identity (expiry claim, expired token, missing exp), vendor and
  offer (expired vendor token) services.
- `npm test` in `frontend` (`src/lib/auth.test.js`).

## Remaining limitations
- No refresh tokens or revocation list; users sign in again after expiry.
