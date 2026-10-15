# DN-027: Customer saved offers

Status: Complete

## Outcome

Identity-service now owns customer saved-offer references. Customers can save,
list, and unsave offer IDs without exposing or sharing offer-service tables.
Saving the same offer repeatedly is idempotent, and removing a missing saved
reference is also idempotent.

## Verification

- Identity-service tests: passed (7 tests).
- Saved-offer endpoints require a customer bearer token.
- `git diff --check`: passed.
