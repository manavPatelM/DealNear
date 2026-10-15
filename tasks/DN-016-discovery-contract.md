# DN-016: Discovery contract and read-model boundary

Status: Complete

## Outcome

The nearby-offer discovery contract is defined before introducing PostGIS or a
new deployable service.

## Decisions

- Coordinates use decimal degrees.
- Radius uses kilometers and is limited to `50`.
- Results are public, paginated, and ordered by distance, creation time, and
  offer ID.
- Results expose store name and city but not exact coordinates, address, or
  vendor identity.
- Discovery uses a purpose-built read model rather than cross-service table
  reads or per-result synchronous composition.
- Only published offers within an effective validity window are eligible.

## Files

- `docs/api/DISCOVERY_ENDPOINT.md`
- `docs/decisions/ADR-016-discovery-read-model.md`
- `docs/status/PROJECT_STATUS.md`

## Out of scope

- PostGIS schema or migrations.
- Kafka, Redis, AWS, Kubernetes, frontend, or a production deployment.
- Offer validity timestamps and lifecycle changes.

## Recommended next task

Add offer effective start/end timestamps and define the publish-time
validation rules needed for active discovery eligibility.
