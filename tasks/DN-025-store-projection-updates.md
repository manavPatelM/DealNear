# DN-025: Store projection updates

Status: Complete

## Outcome

Vendor store edits now use a transactional vendor-service outbox. An opt-in
dispatcher sends protected store updates to discovery, which updates all
offer projections for that store and protects newer data with the projection
version.

## Verification

- Store update and outbox regression test: passed.
- Vendor-service full test suite: passed.
- Discovery-service test suite: passed.
- `git diff --check`: passed.
