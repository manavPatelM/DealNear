# DN-043 — Browser end-to-end tests (Playwright)

Status: Done (Phase 1)

## Outcome
The main journeys are tested in a real browser against the running stack, locally and in CI.

## Tests (`frontend/e2e/`)
- `navigation.spec.js` (desktop and mobile viewport): homepage content, all main routes,
  404, sign-in redirects for portal pages, manual location selection, category pages.
- `journeys.spec.js`:
  - customer registers, filters by category, saves an offer, opens the offer and store pages, and finds it in Saved;
  - vendor registers and submits a store, which shows Pending review;
  - admin creates a category, which appears publicly, then disables it, which removes it.
- Test data is created through the public API with unique emails. Seeded offers are removed
  by the admin at the end, so they never stay discoverable.

## Running
```bash
docker compose up -d --build --wait
cd frontend
npx playwright install chromium        # first time only
E2E_BASE_URL=http://localhost:5173 npm run test:e2e
```
Against another environment, set `E2E_BASE_URL`, `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`.

## CI
`.github/workflows/e2e.yml` starts the Compose stack on pull requests (and on demand),
runs `scripts/smoke-test.mjs` and the Playwright suite, and uploads the HTML report and
service logs on failure.
