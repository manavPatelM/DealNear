# DN-024: Published offer projection updates

Status: Complete

## Outcome

Editing a vendor-owned offer now updates the offer normally and records a new
`offer.projection.updated.v1` outbox event when the offer is already published.
The existing bounded dispatcher delivers the latest content to discovery, and
the existing projection version guard protects against stale deliveries.

## Verification

- Published-offer edit regression test: passed.
- Offer-service focused test suite: passed.
- Offer-service package compilation: passed.
- `git diff --check`: passed.

## Lifecycle removal

Published offers can now be unpublished or deleted. Both operations record a
versioned `offer.projection.removed.v1` event, and discovery removes the
projection only when the removal version is not older than the stored version.

## Lifecycle removal

Published offers can now be unpublished or deleted. Both operations record a
versioned `offer.projection.removed.v1` event, and discovery removes the
projection only when the removal version is not older than the stored version.
