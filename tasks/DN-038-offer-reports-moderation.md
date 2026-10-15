# DN-038 — Offer reports and admin moderation

Status: Done

## Outcome
Customers report problem offers; admins dismiss reports or take offers down.

## Changes
- offer-service `V6`: `offer_reports` table (one report per customer per offer)
  and `offers.moderation_note`.
- `POST /api/offers/{id}/reports` (CUSTOMER) `{ "reason": "MISLEADING|UNAVAILABLE|INAPPROPRIATE|SPAM|OTHER", "details": "..." }`
  — `201` new, `200` repeat; only live offers (`404` otherwise).
- ADMIN endpoints:
  - `GET /api/offers/admin/reports?status=OPEN|DISMISSED|ACTIONED` (with offer attached)
  - `POST /api/offers/admin/reports/{id}/dismiss` `{ "note": "..." }` (optional body)
  - `POST /api/offers/admin/offers/{id}/remove` `{ "reason": "..." }` → `REMOVED`,
    projection removal, open reports closed as `ACTIONED`.
- URL rules: `/api/offers/admin/**` ADMIN, report POST CUSTOMER, everything
  else VENDOR.

## Verification
- offer-service tests: report idempotency and queue, report eligibility and
  role, removal closes reports and blocks republish, dismiss once, role checks.
