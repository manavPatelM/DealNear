# ADR-016: Discovery read model and location contract

- Status: Accepted
- Date: 2026-10-13
- Decision owners: DealNear project

## Context
DealNear needs nearby-offer discovery, but offer and store data belong to
different services. Direct cross-service table reads would violate ownership,
and composing every result synchronously would make latency and availability
depend on multiple services.

## Decision
Discovery will be a read-oriented capability backed by a purpose-built
read model. The public query will accept latitude and longitude in decimal
degrees and a maximum radius of 50 kilometers. Results will expose a
privacy-safe store summary and calculated `distanceKm`, but not exact
coordinates, street address, or vendor identity.

The read model will be populated through an explicitly defined synchronization
mechanism after the offer validity and lifecycle fields are available. The
first implementation should use PostgreSQL with PostGIS for distance queries;
Redis and Kafka remain deferred until a measured requirement exists.

## Alternatives considered
1. Query offer-service and vendor-service synchronously per request: simple to
   start, but creates N+1 calls and couples discovery availability to both
   services.
2. Let discovery read service tables directly: efficient, but violates data
   ownership and makes migrations unsafe.
3. Use a global list and filter in memory: incorrect for bounded radius
   queries and unsafe under growth.

## Consequences
### Positive
- Service boundaries remain explicit.
- Distance calculations and pagination can be indexed and optimized.
- Public privacy rules are stable before implementation.

### Negative / trade-offs
- A read model introduces synchronization lag and reconciliation work.
- Offer/store changes need a reliable propagation strategy.

## Security, reliability, and cost impact
- Input coordinates and radius are validated at the API boundary.
- Exact store coordinates are not returned to customers.
- The endpoint returns an explicit `503` rather than silently widening the
  search when discovery is unavailable.
- PostGIS is introduced only when this bounded feature is implemented.

## Follow-up
- Add offer effective start/end timestamps and define active eligibility.
- Choose the synchronization mechanism and idempotency key.
- Add PostGIS-backed schema/indexes and contract tests.

