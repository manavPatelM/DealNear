# DN-023: Projection version protection

Status: Complete

## Outcome

Discovery projections now carry a timestamp version from the offer outbox
event. An incoming update is applied only when its version is newer than or
equal to the stored version, preventing delayed retries from overwriting newer
data.

## Verification

- Offer-service tests: passed.
- Discovery-service compilation: passed.
- Migration adds `projection_version`.
- `git diff --check`: passed.

## Runtime verification

- PostGIS, vendor-service, discovery-service, and offer-service started
  successfully.
- A real store and offer were created and published.
- The dispatcher delivered the versioned event to discovery.
- Nearby discovery returned the published offer with distance and privacy-safe
  store data.
- PostgreSQL confirmed the outbox row had a non-null `published_at` and zero
  retry attempts.
