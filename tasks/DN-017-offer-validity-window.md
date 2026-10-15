# DN-017: Offer validity windows

Status: Complete

## Outcome

Offers now require an explicit effective start and end timestamp. Publishing
rejects offers whose end time has passed, establishing the eligibility data
needed by discovery.

## Scope

- Add `startAt` and `endAt` to offer persistence and API responses.
- Require both timestamps when creating an offer.
- Validate that `endAt` is after `startAt`.
- Reject publishing after the validity window ends.
- Add Flyway migration, tests, and API documentation.

## Out of scope

- Automatic expiration transitions.
- Pause/resume lifecycle.
- PostGIS, discovery implementation, Kafka, Redis, AWS, Kubernetes, or
  frontend work.

## Verification

- Offer-service `mvn test -q`: passed, including reversed-window and expired
  publish rejection tests.
- `git diff --check`: passed.

## Recommended next task

Define automatic expiration behavior, then implement the first PostGIS-backed
discovery query using the documented contract.
