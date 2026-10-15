# DN-035 — Offer pause, resume, and expire lifecycle

Status: Done

## Outcome
Vendors can pause/resume published offers and end any offer early; invalid
transitions are rejected.

## Changes
- Statuses: `DRAFT`, `PUBLISHED`, `PAUSED`, `EXPIRED`, `REMOVED` (see ADR-033).
- New endpoints: `POST /api/offers/{id}/pause`, `/resume`, `/expire`.
  `unpublish` (back to draft) remains for compatibility.
- Taking a live offer offline records `offer.projection.removed.v1`; resuming
  records `offer.projection.updated.v1`.
- Expired/removed offers cannot be edited, published, or resumed
  (`409 INVALID_OFFER_TRANSITION`).
- Vendor responses add `expired` (true when ended or past `endAt`) and
  `moderationNote`.
- Frontend shows status-appropriate actions (`src/lib/offers.js`).

## Verification
- offer-service tests: pause/resume with outbox events, invalid transitions,
  early expiry blocks further changes.
- `npm test` (`src/lib/offers.test.js`).
