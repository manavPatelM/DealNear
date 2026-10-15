# DN-036 — Customer offer and store details

Status: Done

## Outcome
Customers can open an offer, see its store's other live offers, browse all
offers without a location, and see real titles in their saved list.

## Changes
- `GET /api/offers/public` adds `storeId` and `ids` (max 50) filters; offers
  whose store has no public summary are omitted instead of failing the page.
- Frontend: offer detail modal (description, validity, category, "More from
  this store"), "Browse all" mode, saved offers resolved to titles with a
  "no longer available" state.
- Fixed: customer sign-in did not update the page until reload.

## Decision kept
Store details stay limited to name and city per ADR-014. Showing the street
address or map location requires amending ADR-014.

## Verification
- offer-service tests for `storeId`/`ids` filters and hidden-store filtering.
- Frontend `npm run build`; no browser e2e tests exist yet.
