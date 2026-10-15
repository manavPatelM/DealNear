# ADR-032: Uniform API error format and contract versioning strategy

- Status: Accepted
- Date: 2026-10-13
- Decision owners: API Gateway, Frontend, and Service Owners

## Context
As DealNear grows across multiple domain services (`identity-service`, `vendor-service`, `offer-service`, `discovery-service`) and entry points (`api-gateway`, React frontend), having disparate error response formats creates brittle client error handling, inconsistent error parsing, and risks leaking internal stack traces or database errors to end clients.

Furthermore, as features evolve (such as notification preferences, engagement services, or geolocation enhancements), DealNear requires an explicit, backward-compatible API versioning policy to avoid breaking web clients or inter-service contracts.

## Decision

### 1. Standard API Error Format
All services and the API gateway must return error responses conforming to the canonical error schema:

```json
{
  "error": {
    "code": "STRING_ENUM_UPPERCASE",
    "message": "Human-readable sanitized explanation",
    "details": []
  }
}
```

- `code` (string, required): A stable, machine-readable uppercase snake_case identifier (e.g., `VALIDATION_ERROR`, `STORE_NOT_FOUND`, `OFFER_NOT_FOUND`, `INVALID_REQUEST`, `UNAUTHORIZED`, `CONFLICT`, `UPSTREAM_TIMEOUT`, `UPSTREAM_UNAVAILABLE`, `INTERNAL_ERROR`).
- `message` (string, required): A user-friendly, sanitized message suitable for client display or logging. It must never include internal stack traces, SQL syntax, or internal hostnames.
- `details` (array, optional): Detailed validation or field-level issues (e.g. `[{"field": "email", "reason": "Email is already registered"}]`).

The API gateway normalizes proxy errors (network aborts, socket hangups, upstream 5xx) to match this format (`UPSTREAM_TIMEOUT` and `UPSTREAM_UNAVAILABLE`), ensuring clients receive consistent error structures regardless of where the failure originates.

### 2. API Versioning Strategy
- **Additive Evolution (Preferred)**: Non-breaking changes—such as adding optional request parameters, new response fields, or new independent endpoints—do not trigger a version increment. Clients are expected to follow Postel's Law (lenient parsing; ignoring unrecognized fields).
- **Breaking Changes via URI Versioning**: When a breaking change is strictly unavoidable (e.g. removing fields, altering data types, changing mandatory input semantics), new routes must be introduced using URI path versioning: `/api/v2/{resource}`. The previous `/api/{resource}` or `/api/v1/{resource}` route remains active during a defined deprecation and migration window.
- **Inter-Service Event Versioning**: Asynchronous and projection event contracts (e.g. `offer.projection.updated.v1`) must contain an explicit version suffix in the event name or payload envelope, allowing consumers to handle or reject incompatible event schemas safely.

## Alternatives considered
1. **RFC 7807 (Problem Details for HTTP APIs)**: Standardizes `type`, `title`, `status`, `detail`, `instance`. While comprehensive, it adds unnecessary overhead for our current lightweight React client and Node.js gateway, whereas `{ error: { code, message } }` is already cleanly established across gateway, vendor-service, and offer-service.
2. **Header-Based Versioning (`Accept: application/vnd.dealnear.v1+json`)**: Keeps URLs clean, but increases complexity for browser clients, CDN/reverse-proxy caching, and debugging via `curl`.
3. **Defer Decision**: Leaves services free to introduce divergent formats (e.g. Spring Boot default error maps vs Node.js error objects), causing client-side rendering failures.

## Consequences
### Positive
- Predictable, unified error handling across the entire React client (`body?.error?.message`).
- Strong protection against information leakage (no database or framework internals exposed to clients).
- Unambiguous client decisions based on stable machine-readable `code` enums.
- Clear guideline for future endpoint evolution without breaking existing clients.

### Negative / trade-offs
- Every new Spring Boot or Node.js service must configure an exception handler / middleware to enforce this format.
- Backward compatibility requires maintaining deprecated routes in the gateway and services when breaking changes occur.

## Security, reliability, and cost impact
- Sanitized error messages prevent sensitive configuration, user data, or query structures from leaking.
- Gateway timeout mapping (`UPSTREAM_TIMEOUT`) ensures frontends receive deterministic 502/504 errors rather than hanging connections.
- Zero infrastructure or cloud cost impact.

## Follow-up
- Ensure `identity-service` and `discovery-service` include explicit `@RestControllerAdvice` exception handlers conforming to this schema.
- Update API documentation and OpenAPI schemas to reflect standard error schemas.
