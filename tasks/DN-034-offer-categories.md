# DN-034 — Offer categories and category filtering

Status: Done

## Outcome
Vendors categorise offers; customers filter nearby and public listings by category.

## Changes
- offer-service: `OfferCategory` enum, `category` column (`V5`, existing rows
  `OTHER`). `category` is optional on create (defaults to `OTHER`) and on edit
  (keeps current). Unknown values return `400 INVALID_REQUEST`.
- `GET /api/offers/public?category=` filter (JPA Specification).
- Projection event `offer.projection.updated.v1` gains an additive `category`.
- discovery-service: `category` column (`V3`), optional `category` filter on
  `GET /api/discovery/offers`, response adds `category`, `startAt`, `endAt`.
  Events without a category are stored as `OTHER`.
- Frontend: category selector on offer form and search; category label on cards.

## Verification
- offer-service tests: create with/without category, invalid category, combined
  filters, category in outbox payload.
- discovery-service `DiscoveryCategoriesTest` (normalisation and rejection).
- The PostGIS query itself is only verified through the Compose stack.
