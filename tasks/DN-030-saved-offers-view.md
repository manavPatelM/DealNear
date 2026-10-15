# DN-030: Saved offers view

Status: Complete

## Outcome

Signed-in customers can now see their saved-offer references in the web
application, refresh the list, and remove saved entries. The view handles an
empty saved list without exposing cross-service offer data.

## Verification

- Frontend production build: passed.
- API gateway tests: passed.
- `git diff --check`: passed.
