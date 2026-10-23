# Offer draft endpoint

`offer-service` owns offer records and does not access vendor-service tables.
It listens on port `8082` by default.

## `POST /api/offers`

An authenticated vendor submits a store ID, title, and description. The
offer-service calls `vendor-service` using the original bearer token to verify
ownership before saving an offer with `DRAFT` status.

```json
{
  "storeId": "11111111-1111-1111-1111-111111111111",
  "title": "20% off",
  "description": "Weekend offer",
  "startAt": "2026-10-13T00:00:00Z",
  "endAt": "2026-12-31T23:59:59Z"
}
```

Successful response: `201 Created`.
`startAt` and `endAt` are required ISO-8601 timestamps, and `endAt` must be
after `startAt`.
An offer remains stored after `endAt`, but public reads and listings treat it
as expired and exclude it.

If the store is missing, inaccessible, or vendor-service cannot verify
ownership, the response is `404 STORE_NOT_FOUND`. Invalid input returns
`400 VALIDATION_ERROR`.

The dependency call has a two-second connection timeout and a three-second
request timeout. No retries are performed because this is a synchronous
validation dependency and duplicate creation is not yet idempotent.

For the shared local PostgreSQL database, offer-service uses the
`offer_service` schema and `offer_service_schema_history` migration table.
This keeps its Flyway history and tables isolated from vendor-service.

## `GET /api/offers/{offerId}`

Returns an offer only when the authenticated vendor owns it. Offers owned by
another vendor and missing offers both return `404 OFFER_NOT_FOUND`.

Malformed UUID path values return `400 INVALID_REQUEST`.

## `GET /api/offers`

Returns only offers owned by the authenticated vendor. Results are ordered by
newest creation time, with offer ID as a deterministic tie-breaker.

Query parameters:

- `page`: zero-based page number, default `0`.
- `size`: page size from `1` to `50`, default `20`.

Example response:

```json
{
  "offers": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0
}
```

Invalid pagination returns `400 INVALID_PAGINATION`.

## `PATCH /api/offers/{offerId}`

Updates the title and description of an owned offer. The store, vendor, status,
and creation timestamp are immutable through this endpoint. When the offer is
already published, the update also creates a projection outbox event.

Request:

```json
{
  "title": "25% off",
  "description": "Updated weekend offer"
}
```

Successful response: `200 OK` with the updated offer response.

Missing offers and offers owned by another vendor return
`404 OFFER_NOT_FOUND`. Invalid title or description values return
`400 VALIDATION_ERROR`.

## `POST /api/offers/{offerId}/publish`

Publishes an owned draft offer by changing its status from `DRAFT` to
`PUBLISHED`. The operation does not change the offer's vendor, store, title,
description, validity window, or creation timestamp. Publishing an offer whose
validity window has already ended returns `400 INVALID_OFFER_VALIDITY`.

Successful response: `200 OK` with the published offer response. Repeating the
request for an already published offer returns the same successful response.
Missing offers and offers owned by another vendor return `404 OFFER_NOT_FOUND`.

## `POST /api/offers/{offerId}/unpublish`

Moves an owned published offer back to `DRAFT` and records a projection-removal
outbox event. Repeating the request for an already draft offer is idempotent.
Successful responses return `200 OK`.

## `DELETE /api/offers/{offerId}`

Deletes an owned offer. Deleting a published offer first records a
projection-removal outbox event so discovery can remove its read-model entry.
Successful responses return `204 No Content`.

## `GET /api/offers/public/{offerId}`

Returns a published offer without authentication. Draft, missing, and
expired offers return `404 OFFER_NOT_FOUND`. The public response omits the
internal vendor identifier and includes `storeName` and `storeCity` from the
vendor-service public store-summary contract.

This is a bounded public-read slice. Customer discovery and radius filtering
remain separate concerns.

## `GET /api/offers/public`

Returns only published offers without authentication. Results are ordered by
newest creation time, with offer ID as a deterministic tie-breaker.

Query parameters:

- `page`: zero-based page number, default `0`.
- `size`: page size from `1` to `50`, default `20`.

The response uses the public offer shape, including `storeName` and
`storeCity`, and omits the internal vendor identifier. Draft offers are
excluded.
The listing fetches store summaries in one bounded batch request per page.

Example response:

```json
{
  "offers": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0
}
```

Invalid pagination returns `400 INVALID_PAGINATION`.

## Categories (DN-034)

Offers carry `category`: `FOOD_AND_DRINK`, `GROCERY`, `FASHION`,
`ELECTRONICS`, `HEALTH_AND_BEAUTY`, `HOME_AND_GARDEN`, `SERVICES`,
`ENTERTAINMENT`, or `OTHER`. It is optional on create (default `OTHER`) and on
`PATCH` (unchanged when omitted). Unknown values return `400 INVALID_REQUEST`.

## Lifecycle (DN-035, ADR-033)

| Action | Endpoint | Allowed from | Result |
| --- | --- | --- | --- |
| Publish | `POST /api/offers/{id}/publish` | `DRAFT` | `PUBLISHED` (store must be verified) |
| Pause | `POST /api/offers/{id}/pause` | `PUBLISHED` | `PAUSED` |
| Resume | `POST /api/offers/{id}/resume` | `PAUSED` | `PUBLISHED` (store must be verified) |
| Back to draft | `POST /api/offers/{id}/unpublish` | `PUBLISHED`, `PAUSED` | `DRAFT` |
| End now | `POST /api/offers/{id}/expire` | `DRAFT`, `PUBLISHED`, `PAUSED` | `EXPIRED`, `endAt` set to now if later |

Repeating the current state is a no-op. Other transitions, and edits to
`EXPIRED` or `REMOVED` offers, return `409 INVALID_OFFER_TRANSITION`. Publishing
or resuming for an unverified store returns `409 STORE_NOT_VERIFIED`. Vendor
responses add `expired` and `moderationNote`.

## Public listing filters (DN-036)

`GET /api/offers/public` accepts optional `category`, `storeId`, and `ids`
(comma-separated, max 50). Offers whose store has no public summary are left
out of `offers`; `totalElements` may still count them.

## Reports and moderation (DN-038)

- `POST /api/offers/{id}/reports` (CUSTOMER) with
  `{ "reason": "MISLEADING|UNAVAILABLE|INAPPROPRIATE|SPAM|OTHER", "details": "optional" }`.
  Only live offers can be reported (`404 OFFER_NOT_FOUND` otherwise). The first
  report returns `201`; a repeat by the same customer returns the existing
  report with `200`.
- `GET /api/offers/admin/reports?status=OPEN|DISMISSED|ACTIONED` (ADMIN), oldest
  first, each with the reported `offer`.
- `POST /api/offers/admin/reports/{id}/dismiss` (ADMIN), optional `{ "note": "..." }`.
- `POST /api/offers/admin/offers/{id}/remove` (ADMIN) with `{ "reason": "..." }`:
  sets `REMOVED`, removes the offer from discovery, and marks open reports `ACTIONED`.

Resolving a report twice returns `409 REPORT_ALREADY_RESOLVED`.

## Category taxonomy (DN-041)

Categories are now admin-managed data (`GET /api/categories`), replacing the fixed list
above. Offers still store the category `code`. A code must exist and be enabled to be
assigned (`400 INVALID_CATEGORY` otherwise). `GET /api/offers/public?category=CODE`
includes the category's subcategories. Full contract: `tasks/DN-041-category-taxonomy.md`.
