# DN-026: Customer identity

Status: Complete

## Outcome

Identity-service now owns customer credentials and supports registration and
sign-in. Passwords are stored as BCrypt hashes, and successful authentication
returns the interim HMAC JWT format already understood by the backend services.
The API gateway routes `/api/auth/*` to identity-service.

## Verification

- Identity-service tests: passed (5 tests).
- API gateway tests: passed (3 tests).
- `git diff --check`: passed.
