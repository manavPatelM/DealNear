# DN-018: Query-time offer expiration

Status: Complete

## Outcome

Expired offers remain available to vendor management but are excluded from
public offer reads and listings when `endAt` is not in the future.

## Scope

- Add active-offer repository queries using the database clock.
- Exclude expired offers from public detail and listing endpoints.
- Add regression tests for expired published offers.
- Document the non-materialized expiration behavior.

## Decision

Expiration is computed at query time. No scheduler or status mutation is
introduced, so offer history remains intact and expiration does not require a
background worker.

## Verification

- Offer-service `mvn test -q`: passed.
- `git diff --check`: passed.

## Recommended next task

Implement the first PostGIS-backed discovery read model using the documented
location contract.
