# ADR-017: Transactional outbox for discovery projection updates

- Status: Accepted
- Date: 2026-10-13
- Decision owners: Offer and discovery service owners

## Context

Published offers must reach the discovery read model without losing updates
when the discovery service is unavailable. A direct HTTP call inside the offer
transaction would create a distributed transaction and could make publishing
depend on discovery availability.

## Decision

The offer-service records a versioned `offer.projection.updated.v1` outbox row
in the same transaction as publishing an offer. A delivery worker is deferred
until a protected vendor projection contract can provide the store location
without weakening the public privacy boundary. Discovery remains the owner of
its projection table.

## Alternatives considered

1. Direct synchronous projection call: simpler, but loses atomicity and couples
   publishing availability to discovery.
2. Kafka immediately: supports durable delivery, but adds broker operations
   before the first reliable synchronous flow is needed.
3. Defer synchronization: leaves discovery stale and makes the user journey
   unreliable.

## Consequences

### Positive

- Offer publication and event creation are atomic.
- Pending events are durable and can be retried once the delivery contract is
  available.
- No service reads another service's tables.

### Negative / trade-offs

- Discovery is eventually consistent.
- A protected store projection endpoint now provides coordinates without
  weakening the public store summary.
- Discovery stores a projection version and ignores older outbox deliveries.
- The local multi-service flow has been verified against PostgreSQL/PostGIS.

## Security, reliability, and cost impact

- Outbox rows contain no credentials or sensitive user data.
- Delivery uses separate vendor and discovery projection tokens.
- No new paid infrastructure is introduced.

## Follow-up

- Delivery is enabled only with `PROJECTION_DISPATCHER_ENABLED=true`.
- Add operational metrics and stale-write protection before production rollout.
- Add exponential retry/backoff and delivery metrics.
- Add stale-write protection and deactivation events.
