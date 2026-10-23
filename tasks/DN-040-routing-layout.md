# DN-040 — Real routes, site layout and navigation

Status: Done (Phase 1)

## Outcome
The single-page tab UI is replaced by a routed website that follows the spec's URL map.
Every page has its own shareable URL.

## Routes added
| Route | Page |
| --- | --- |
| `/` | Homepage (DN-042) |
| `/explore` | All live offers with category filter; `?mode=nearby` for radius results; filters in the URL |
| `/nearby` | Nearby deals for the chosen location |
| `/categories`, `/categories/:slug` | Category directory and category landing pages (DN-041) |
| `/offers/:offerId` | Offer details with share/copy link, save, report, store link, more from the store |
| `/stores/:storeId` | Public store profile (verified stores only) with its live offers |
| `/auth/login`, `/auth/register` | One sign-in for every role (role-aware redirect, safe `?next=`), customer registration |
| `/business/register` | Business landing and vendor registration |
| `/account/saved` | Customer saved offers (titles resolved in one batch request) |
| `/business/offers`, `/business/stores` | Vendor dashboard |
| `/admin/vendors`, `/admin/reports`, `/admin/categories` | Admin portal |
| `*` | 404 page; role-gated pages show 403 or redirect to sign-in |

Navigation: Home, Explore Offers, Categories, Nearby Deals, For Businesses, Log in/Sign up,
and a profile menu after sign-in. On mobile, a bottom bar (Home, Explore, Saved, Profile).
Trending and Map View join the navigation when DN-051/DN-052 build them, so no link
leads to an unfinished page.

## Design system
Neutral surfaces with one coral accent, light by default, with automatic dark mode. It
adds skeleton loaders, toasts, empty states, focus styles, a skip link and reduced-motion
support.

## Structure
`src/state.jsx` (auth, categories, location, toasts), `src/components/` (Layout,
RequireRole, Offers), `src/pages/` (Public, Detail, Account, Business, Admin),
`src/lib/` (pure helpers with unit tests).

## Verification
- `npm test` (13 unit tests: auth, offers, location helpers) and `npm run build`.
- Playwright navigation tests (DN-043), on desktop and mobile viewports.

## Limitations
- Header search arrives with DN-049. Offer URLs use IDs until slugs arrive (DN-046).
- No server-side rendering (decision: React Router, not Next.js).
