# ADR-014: Privacy-safe public store summaries

- Status: Accepted
- Date: 2026-10-13
- Decision owners: DealNear project

## Context
Published offers need enough store context for customer browsing, but vendor
records contain private ownership, address, and coordinate data. Offer-service
must not read vendor-service tables directly.

## Decision
Vendor-service owns a public store-summary endpoint returning only the store
ID, name, and city. Offer-service calls that endpoint when producing public
offer responses. The store city is persisted explicitly rather than inferred
from a free-form street address.

## Alternatives considered
1. Return only `storeId`: avoids a dependency but provides poor customer
   context.
2. Expose the full store response: simpler technically but leaks vendor,
   address, and coordinate data.
3. Defer enrichment: preserves the current contract but delays a useful
   customer-facing detail.

## Consequences
### Positive
- Store data remains owned by vendor-service.
- Public responses expose only approved summary fields.
- The contract can later be reused by a discovery service.

### Negative / trade-offs
- Public offer reads now have a synchronous vendor-service dependency.
- Public listings perform one summary lookup per returned offer.

## Security, reliability, and cost impact
- Vendor identifiers, addresses, and coordinates remain private.
- The lookup uses a two-second connection timeout and three-second request
  timeout.
- Dependency failures return `503 STORE_SUMMARY_UNAVAILABLE`; missing stores
  return `404 OFFER_NOT_FOUND`.

## Follow-up
- Replace per-offer listing lookups with a discovery read model before adding
  location/radius filtering.
