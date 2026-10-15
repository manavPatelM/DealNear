# DN-019: Discovery service bootstrap

Status: Complete

## Outcome

Added a dedicated discovery-service with a PostGIS-backed, service-owned read
model, a public nearby query, and an explicit idempotent projection-ingest
boundary.

## Verification

- Discovery-service Maven package: passed.
- `git diff --check`: passed.
- Local PostGIS migration: passed; Flyway created the discovery schema and
  applied the projection migration.
- Runtime projection upsert: passed, including an idempotent repeat.
- Nearby query: passed; an active nearby offer was returned while an expired
  projection was excluded.

## Limitations

- Projection ingestion is explicit and token-protected; automatic
  synchronization is not implemented.
- No Kafka or transactional outbox was introduced.

## Recommended next task

Design reliable projection synchronization, preferably with a transactional
outbox before introducing Kafka.
