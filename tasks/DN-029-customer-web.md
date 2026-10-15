# DN-029: Customer web journey

Status: Complete

## Outcome

Added a React/Vite customer web application with registration/login, nearby
offer search, empty/error messaging, and authenticated save/unsave controls.
The frontend runs in Compose at `http://localhost:5173` and calls the API
gateway rather than accessing backend services directly.

## Verification

- Frontend production build: passed.
- API gateway tests: passed (4 tests).
- Compose manifest validation: passed.
- Full Compose smoke test: passed previously for gateway registration and
  saved-offer persistence.
- Browser flow: passed for registration, nearby discovery, and save/unsave.
