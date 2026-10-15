# DN-039 — Admin portal and vendor UI for verification and lifecycle

Status: Done

## Outcome
The React app has Customer, Vendor, and Admin portals covering the full MVP.

## Changes
- `src/AdminPortal.jsx`: admin sign-in (no registration), store verification
  queue (verify, reject/revoke with reason), report queue (dismiss, remove offer
  with reason), status filters.
- Vendor portal: store verification badges and rejection notes, offer category,
  pause/resume/end-now actions, removal notes.
- Shared components moved to `src/ui.jsx`; API client to `src/api.js`; pure
  helpers in `src/lib/` with `node --test` tests (now run in CI).
- Docker: `VITE_API_URL` is now a build arg so the Compose web image calls the
  gateway (it was previously ignored at runtime).

## Verification
- `npm test` (7 tests) and `npm run build` in `frontend`.
- No automated browser tests; see PROJECT_STATUS for the manual demo script.
