# DN-042 — Homepage and location selector

Status: Done (Phase 1)

## Outcome
The homepage explains the platform and shows real content immediately.

## Contents
- Hero: "Discover the best deals around you.", with **Explore nearby offers** (opens the
  location picker first if none is set) and **Promote your business**.
- Location selector in the header: optional device location (never forced), 12 supported
  cities, radius chips of 2/5/10/25 km. Stored on the device only; the choice persists.
- Category tiles from `GET /api/categories`.
- Collections **Nearby for you** (discovery, needs a location) and **Recently added**
  (public listing). Collections render only when they have offers; no filler or fake numbers.
- Vendor promotion section: Register → Verify → Publish Offers → Track Results.
- Footer linking only pages that exist (support and legal pages arrive in Phase 8).

## Verification
- Unit tests for location helpers (validation, storage round-trip, distance formatting,
  discovery parameters).
- Playwright: hero, API-driven category tiles, vendor section, manual city selection with radius.

## Limitations
- Area and postal-code search needs a locations dataset (DN-053); a fixed city list
  covers manual selection for now.
- Ending Soon, Best Discounts and other collections need the sort options and price data
  from DN-046/DN-050/DN-051.
