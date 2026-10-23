# Website Specification: Gap Analysis and Implementation Plan

Source: "Complete Website Specification — Hyperlocal Offer Discovery Platform"
(provided by the user on 2026-10-22). This file maps every requirement to its
current state, the service that will own it, and the phase that delivers it.
Per `AGENTS.md`, nothing beyond the current MVP is built until it is scheduled here.

Status key: **Done** = implemented and tested · **Partial** = some of it exists ·
**Missing** = not started · **Later** = deliberately deferred.

---

## 1. Validation summary

The specification fits the existing architecture: the four Java services, the
Node gateway, PostgreSQL/PostGIS, and the outbox all stay. Most of the work is in
three places:

1. **Richer data models.** Offers need prices, offer type, terms, limits and images.
   Stores need a slug, logo, hours and contacts. Categories must move from a
   hard-coded enum to admin-managed data.
2. **A real multi-page website.** The current React app is one page with tabs. The
   spec needs ~40 routes with shareable URLs (`/offers/:slug`, `/stores/:slug`), a
   map, filters, and separate customer, vendor and admin areas.
3. **New capabilities.** Media uploads, engagement analytics, notifications,
   redemption codes and audit logs.

### Points that conflict with the spec or need a decision
| Spec item | Issue | Recommendation |
| --- | --- | --- |
| Next.js / server-side rendering | The app is React + Vite. Migrating to Next.js means rewriting routing and the build, and adds a Node server per page render. | Keep React + Vite and add **React Router** for real URLs. Add page metadata per route. Revisit SSR only if SEO becomes a graded goal. |
| "Kafka offer publication event" | `AGENTS.md` says to add Kafka only when an async workflow needs it. Amazon MSK is expensive (~US$3+/day minimum) and may be blocked in Learner Lab. The HTTP outbox already works. | Introduce a broker in Phase 6, when notifications and analytics genuinely need fan-out. Local: Kafka in Compose. AWS: Amazon MSK Serverless if allowed, otherwise SNS/SQS. |
| Email verification, password reset | Needs an email sender. Amazon SES is usually blocked in Learner Lab. | Build the token flows fully. Locally, capture emails in **Mailpit**. On AWS, log a masked link or use SES only if allowed. |
| Google sign-in | Needs a Google OAuth client registered by you. | **Later**, after core auth is hardened. |
| Image uploads | Needs object storage. | **Amazon S3** (allowed in Learner Lab) with presigned uploads. **MinIO** in Compose locally, so no AWS credentials are needed for development. |
| Map | Google Maps needs a paid API key. | **Leaflet + OpenStreetMap** tiles (free, no key). PostGIS bounding-box queries for "search this area". |
| Typo-tolerant search | Elasticsearch/OpenSearch would add a large, costly service. | **PostgreSQL full-text search + `pg_trgm`** in discovery-service. Good enough for this scale. |
| Recommendations / AI search | ML without usage data would invent results. | Rules-based recommendations first (preferred categories, radius, saves). AI is **Later**. |
| Store address visibility | ADR-014 hides street address and coordinates. The spec shows address, map and directions on store and offer pages. | **Needs your approval** to amend ADR-014: publish the business address and map pin of *verified* stores, never vendor identity. |
| Legal pages | Must reflect the real product and law. | I draft them from the actual behaviour; you or faculty review the wording. They are not legal advice. |

### Scale
This is roughly **40 tasks**. Built one at a time, with tests and docs each, it is
weeks of work, not a single session. Phases are ordered so the site stays
demonstrable after every phase.

---

## 2. Requirement map (spec section → status → owner → phase)

### 1. Overall structure and navigation
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Public site, customer, vendor and admin portals | Partial: tabs, no routes | frontend | 1 |
| Main navigation (Home, Explore, Categories, Nearby, Trending, Map, For Businesses, Login, Profile) | Missing | frontend | 1 |
| Mobile bottom navigation | Missing | frontend | 1 |

### 2. Homepage
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Header with logo, location selector, search, saved shortcut, "List your business" | Missing | frontend | 1 |
| Location: current location (optional permission), manual city/area/postal code, radius 2/5/10/25 km | Partial: lat/lng inputs + geolocation | frontend + discovery (`/locations` lookup) | 2 |
| Hero section with CTAs | Missing | frontend | 1 |
| Category shortcuts from admin-managed data | Partial: hard-coded enum | offer-service (categories) | 1 |
| Offer cards: image, discount label, prices, store logo, distance, area, expiry, verified badge, save | Partial: text-only cards | offer + vendor + discovery | 2 |
| Collections: Nearby, Recently Added, Ending Soon, Best Discounts, Under Budget, Favourite Categories, New Businesses, Weekend, Flash, Recommended | Partial: nearby only | discovery-service | 3 (Popular/Recommended in 5) |
| Map preview with pins and list sync | Missing | frontend + discovery | 3 |
| Flash deals with real countdown | Missing | offer + discovery | 6 |
| Vendor promotion section | Missing | frontend | 1 |
| Footer with support/legal links | Missing | frontend | 8 |

### 3. Explore page
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Search: offers, products, services, shops, categories, locations; suggestions, recent searches, typo tolerance | Missing | discovery-service (full-text + trigram) | 3 |
| Filters: location, distance, category, discount, budget, offer type, validity, business type, verified, availability | Partial: location, radius, category | discovery-service | 3 |
| Sorting: relevance, nearest, newest, highest discount, lowest price, ending soon, popular | Partial: nearest only | discovery-service | 3 (popular in 5) |
| Pagination, skeletons, debounced search, URL filter params, clear-all, empty state | Partial: API pagination | frontend | 3 |
| "Notify me when matching offers appear" | Missing | notification-service | 6 |

### 4. Offer details page
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Shareable URL `/offers/:slug` | Missing (modal only) | offer + frontend | 2 |
| Title, gallery, offer type, prices, dates, status (upcoming/active/expired) | Partial: title, description, dates | offer-service | 2 |
| Includes, products covered, minimum purchase, exclusions, usage limits, terms | Missing | offer-service | 2 |
| Business info: logo, verified, address, distance, hours, contact, View Store | Partial: name and city | vendor-service | 2 (address needs ADR-014 decision) |
| Map, address, Open Directions | Missing | frontend | 3 |
| Save, share, copy link, report | Partial: save, report | frontend | 2 |
| Redeem / reveal code | Missing | offer-service | 6 |
| Social proof: saves/views, reviews | Missing | engagement-service | 5 (reviews 7) |
| Related offers: same store, similar nearby, same category | Partial: same store | discovery-service | 3 |
| Expired offers viewable as expired, never redeemable | Missing (404 today) | offer-service | 2 |

### 5. Store profile pages
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| `/stores/:slug` with logo, cover, name, verified badge, category, description | Missing | vendor-service | 2 |
| Address, map, contact, opening and holiday hours, website, social links | Missing | vendor-service | 2 |
| Active and upcoming offers | Partial | offer-service | 2 |
| Products/services, photos | Missing | vendor-service (media) | 2 |
| Reviews and ratings | Missing | engagement-service | 7 |
| Follow/favourite store, share, report business | Missing | identity (favourites), offer/vendor (reports) | 4 |
| Multi-location branches with per-branch offers | Partial: a vendor can own many stores; offers link to one store | vendor + offer | 2 (multi-branch offers in 7) |

### 6. Category pages
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| `/categories/:slug` with intro, subcategories, nearby offers, featured businesses, trending, popular searches | Missing | offer (taxonomy) + discovery | 3 |
| Extensible categories without a frontend rebuild | Missing (enum) | offer-service categories API | 1 |

### 7. Map view
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Location, markers, clustering, popups, "search this area", radius, filters, synced list, directions, permission fallback | Missing | frontend (Leaflet) + discovery (bounds query) | 3 |

### 8. Advanced discovery
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Rules-based personalized recommendations | Missing | discovery + engagement | 5 |
| Flash deals with scheduling and limits | Missing | offer-service | 6 |
| Saved deals and collections | Partial: saved offers | identity-service | 4 |
| Redemption QR/codes | Missing | offer-service | 6 |
| Smart alerts | Missing | notification-service | 6 |
| Offer comparison | Missing | frontend | 7 |
| AI search, AI descriptions, price history, multilingual, PWA | Later | — | Later |

### 9. Customer authentication and account
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Browse without account | Done | — | — |
| Sign up, login, logout | Done | identity-service | — |
| Email verification, forgot/reset password | Missing | identity-service (+ Mailpit locally) | 4 |
| Google sign-in | Later | identity-service | Later |
| Session/security settings, password change | Missing | identity-service | 4 |
| Profile: overview, saved, favourite stores, redemptions, notifications, preferences, settings | Partial: saved offers | identity + frontend | 4 (redemptions 6, notifications 6) |
| Preferences: location, categories, radius, notifications; privacy; account deletion | Missing | identity-service | 4 |
| Recently viewed (with privacy control) | Missing | engagement-service | 5 |

### 10. Vendor onboarding
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Account with name, email/phone, terms acceptance | Partial: email + password | identity-service | 4 |
| Business form: category, description, logo/cover, contacts, address, postal code, map pin, hours, links | Partial: name, address, city, lat/lng | vendor-service | 2 |
| Verification: admin review | Done | vendor-service | — |
| Verification: email/phone, documents (private) | Missing | identity + vendor (private S3) | 4 |
| Guided first-offer step; status and required actions | Partial: status badges | frontend | 2 |

### 11. Vendor dashboard
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Metrics: active/scheduled/expired, views, saves, shares, redemptions, conversion, with definitions | Missing | engagement-service + offer-service | 5 |
| Create, draft, edit, pause, unpublish, expire | Done | offer-service | — |
| Preview, schedule, duplicate, renew, rejected list with reasons, table search/filter/sort | Partial: no scheduled status, preview, duplicate or renew | offer-service + frontend | 2 |
| Full create-offer form (type, prices, auto-calculated discount, products, minimum purchase, limits, terms, branches, images, publish/schedule) | Partial: title, description, category, dates | offer-service | 2 |
| Campaigns | Missing | offer-service | 7 |
| Analytics: impressions, views, saves, shares, directions/contact clicks, redemptions, by period/campaign, no customer identities | Missing | engagement-service | 5 |
| Business settings: profile, branches, hours, images, notifications, security, verification status | Partial: store edit | vendor + identity | 2 / 4 |
| Team access, billing | Later | — | Later |

### 12. Admin dashboard
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Overview counts | Missing | each service exposes admin stats; gateway aggregates | 7 |
| Vendor applications approve/reject | Done | vendor-service | — |
| Suspend/reinstate vendors, business history, reasons | Missing | vendor + identity | 7 |
| Offer pre-moderation (Pending Review), approve/reject, suspicious-discount flags | Missing (post-moderation only) | offer-service | 7 |
| Remove offers, manage reports | Done | offer-service | — |
| User management: search, status, suspend, deletion requests | Missing | identity-service | 7 |
| Category management: add, edit, icons, reorder, disable, subcategories | Missing | offer-service | 1 (API) / 7 (UI polish) |
| Reports: fake, misleading, duplicate, resolution history; business reports | Partial: offer reports | offer + vendor | 7 |
| Configuration: rules, featured content, announcements, cities/regions | Missing | per owning service | 7 |
| Audit logs with who/when for sensitive actions | Missing | each service writes; admin reads | 7 |
| Platform analytics | Missing | engagement-service | 7 |

### 13. Notifications
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| In-app notifications for customers, vendors and admins; preferences and rate limits | Missing | **new notification-service (Node.js)** | 6 |
| Email/push | Later | notification-service | Later |

### 14. Redemption
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Time-limited unique codes/QR, vendor verification, single use, per-customer and global limits, safe under concurrency, backend-decided | Missing | offer-service (row locks, unique constraints, idempotency keys) | 6 |

### 15. Trust and safety
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Verified label with explanation | Partial | frontend | 2 |
| Offer reports with the spec's reasons, request clarification, close with explanation | Partial: different reasons, no clarification | offer-service | 7 |
| Business reports | Missing | vendor-service | 7 |
| Reviews (verified only with evidence) | Missing | engagement-service | 7 |
| Duplicate detection, image/content validation, rate limits | Missing | offer + gateway | 7 |
| Audit trails | Missing | all | 7 |

### 16. Help, legal and communication pages
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| About, How It Works, Help, Contact form, FAQs, Terms, Privacy, Vendor Terms, Cookies, Community Guidelines, Report a Problem, Accessibility | Missing | frontend (+ contact endpoint) | 8 |

### 17. Business rules
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Explicit lifecycle: Draft → Pending Review → Scheduled/Active → Expired/Paused/Rejected/Removed | Partial: no Pending Review, Scheduled or Rejected | offer-service | 2 (Scheduled), 7 (Pending/Rejected) |
| Vendor ownership enforced | Done | offer + vendor | — |
| Timezone-consistent validation | Done (UTC instants) | — | — |
| Expired excluded at query time | Done | offer + discovery | — |
| Suspended vendors' offers hidden | Partial (store revocation) | vendor + discovery | 7 |
| Public APIs hide internal data and moderation notes | Done for current fields | — | each phase |
| Audit history for critical edits | Missing | offer-service | 7 |
| Deleting stores keeps redemption and audit history | Missing | vendor + offer (soft delete) | 6 |
| Pagination and request limits | Done (max 50) | — | — |
| Duplicate-submission and concurrency safety | Partial | offer-service (idempotency keys, optimistic locking) | 2 / 6 |

### 18. UI/UX
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| Polished card layout, brand accent, imagery, responsive, skeletons, toasts, confirm dialogs, inline validation, accessibility | Partial: dark theme, modals | frontend | 1 then every phase |

### 19. Technical requirements
| Requirement | Status | Owner | Phase |
| --- | --- | --- | --- |
| React app, REST, consistent errors | Done | — | — |
| Server-side authorization | Done | — | — |
| Migrations and constraints | Done | — | — |
| Geospatial radius | Done; map bounds missing | discovery | 3 |
| Media storage | Missing | S3 / MinIO | 2 |
| Caching popular public offers | Missing | gateway or discovery (Redis only if measured) | 8 |
| Async work and scheduled tasks | Partial: outbox dispatchers | broker in 6 | 6 |
| Rate limiting | Missing | api-gateway | 4 |
| Unit, integration, API tests | Done | — | each phase |
| End-to-end UI tests | Missing | Playwright | 1 then each phase |
| Structured logs, metrics, traces | Partial: health, offer metrics | all | 8 |
| Docker, CI, ECS | Done | — | — |

### 20. Route map
All routes in section 20 of the spec are planned; each phase lists the routes it adds.

### 21. Initial release checklist (the spec's own first version)
| Checklist item | Phase |
| --- | --- |
| Homepage with categories and nearby offers | 1–3 |
| Search, filters and sorting | 3 |
| Offer details and store profiles | 2 |
| Manual location selection and map | 2–3 |
| Signup, login and secure access | Done (hardening in 4) |
| Save and share offers | 2 |
| Customer profile and preferences | 4 |
| Vendor registration and verification status | Done (onboarding in 2/4) |
| Create, edit and expire offers | Done (rich form in 2) |
| Store profile and image uploads | 2 |
| Basic engagement analytics | 5 |
| Admin login and role restrictions | Done |
| Vendor approval | Done |
| Offer moderation | Done (pre-moderation in 7) |
| Category and report management | 1 / 7 |
| REST APIs and service-owned data | Done |
| Dockerized services | Done |
| Kafka offer publication event | 6 |
| Automated tests and CI/CD | Done (deploy pipeline in 8) |
| Health checks, metrics, structured logs | Partial → 8 |

---

## 3. Service ownership after the changes

| Service | Owns (new items in bold) |
| --- | --- |
| identity-service | Users, roles, saved offers, **email verification, password reset, preferences, favourite stores, collections, account deletion, user suspension** |
| vendor-service | Stores (branches), verification, **slug, logo/cover, description, hours, contacts, links, photos, business reports, vendor suspension** |
| offer-service | Offers, lifecycle, reports, moderation, **category taxonomy, offer type/prices/terms/limits/images, scheduling, duplicate/renew, redemption codes, campaigns, audit log** |
| discovery-service | Read model, **full-text and trigram search, all filters and sorts, map bounds, homepage collections, category pages, recommendations** |
| **engagement-service (new, Node.js)** | **View/save/share/directions events, aggregated analytics, popularity, recently viewed, reviews** |
| **notification-service (new, Node.js)** | **In-app notifications, alert subscriptions, rate limits** |
| api-gateway | Routing, **rate limiting**, admin overview aggregation |
| **Object storage** | **S3 (AWS) / MinIO (local) for images**, uploaded through presigned URLs issued by the owning service |

New Node services follow `AGENTS.md` (JavaScript, NestJS if accepted). They only
come in when their phase starts.

---

## 4. Phases and tasks

Each task gets its own `tasks/DN-0xx-*.md`, tests, API docs and a smoke-test
extension, and is reported before the next one starts.

**Phase 1 — Foundation (site structure and taxonomy)** — ✅ Done 2026-10-22 (see `tasks/DN-040`–`DN-043`)
- DN-040: React Router with the spec's route map, layout, header/nav, mobile bottom nav, 404/403/error pages, design tokens refresh.
- DN-041: Category taxonomy as data in offer-service (categories + subcategories, slugs, icons, order, enabled), seeded from the current enum; public `GET /api/categories`; admin CRUD API; offers reference category IDs; discovery projects the slug.
- DN-042: Homepage shell: hero, category tiles from the API, vendor promotion section, location selector UI (manual + optional geolocation + radius).
- DN-043: Playwright E2E harness in CI (home, browse, vendor, admin happy paths).

**Phase 2 — Rich offers and stores**
- DN-044: Media uploads (MinIO locally, S3 on AWS), validated type and size, presigned URLs.
- DN-045: Store profile model: slug, logo, cover, description, hours, contacts, links, postal code, photos; public store page `/stores/:slug` (address per ADR-014 decision).
- DN-046: Offer model: offer type, original/offer price, auto discount with consistency validation, products, minimum purchase, limits, terms, images, slug; `Scheduled` derived status.
- DN-047: Offer details page `/offers/:slug` (gallery, terms, status incl. expired view, share/copy, related same-store).
- DN-048: Vendor offer manager: full create form, preview, schedule, duplicate, renew, table search/filter/sort; guided first-offer onboarding.

**Phase 3 — Discovery**
- DN-049: Discovery search: full-text + `pg_trgm`, suggestions, recent searches (client side).
- DN-050: All filters and sorts with URL parameters; Explore page with skeletons, debounce, clear-all, empty states.
- DN-051: Homepage collections (Recently Added, Ending Soon, Best Discounts, Under Budget, New Businesses, Weekend) shown only when data exists.
- DN-052: Map view (Leaflet + OSM): bounds query, clustering, synced list, directions; map preview on homepage and offer/store pages.
- DN-053: Category landing pages `/categories/:slug`; manual location search (city/area/postal code lookup table owned by discovery).

**Phase 4 — Customer accounts**
- DN-054: Email verification and forgot/reset password (token tables, expiry, single use; Mailpit locally).
- DN-055: Preferences, favourite stores, collections, account settings, password change, account deletion.
- DN-056: Gateway rate limiting for auth, reports and writes.
- DN-057: Vendor account details (name, phone, terms acceptance) and private verification documents.

**Phase 5 — Engagement and analytics**
- DN-058: engagement-service: event ingestion (view, save, share, directions, contact), privacy-safe aggregates.
- DN-059: Vendor analytics dashboard with metric definitions; popular/trending collection; recently viewed.
- DN-060: Rules-based recommendations.

**Phase 6 — Async workflows**
- DN-061: Message broker ADR and introduction (Kafka locally; MSK Serverless or SNS/SQS on AWS), outbox publishes `offer.published.v1`.
- DN-062: notification-service with in-app notifications, alert subscriptions, "notify me" for searches, rate limits.
- DN-063: Redemption codes and QR: issue, verify, limits, concurrency-safe, vendor scanner page, customer redemption history.
- DN-064: Flash deals and scheduled activation notifications.

**Phase 7 — Administration and trust**
- DN-065: Offer pre-moderation (Pending Review → Approved/Rejected with reasons) and suspicious-discount flags.
- DN-066: Vendor and user suspension/reinstatement; deletion requests.
- DN-067: Audit log across services and admin audit viewer.
- DN-068: Admin overview and platform analytics; report types from the spec, clarification, business reports.
- DN-069: Reviews and ratings (only redemption-verified labels), campaigns, offer comparison.

**Phase 8 — Support pages and production polish**
- DN-070: Help centre, FAQs, About, How It Works, Contact, legal pages, accessibility statement, footer.
- DN-071: Structured logging, metrics, tracing; caching where measured.
- DN-072: CI/CD deploy to ECS; ECS redeploy and smoke test.

---

## 5. Definition of done for every task
- Server-side validation and authorization, ADR-032 errors, additive API changes.
- Flyway migration for every schema change; existing data migrated safely.
- Unit/integration tests in the owning service; frontend helper tests; Playwright journey once DN-043 lands.
- `scripts/smoke-test.mjs` extended when a journey changes; run against Compose.
- `docs/api/*`, task file, `PROJECT_STATUS.md` updated.
- Deployed to ECS at the end of each phase (with your approval, since it uses lab credit).
