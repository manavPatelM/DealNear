# DealNear Architecture

DealNear is a hyperlocal offer discovery platform. Customers find offers from nearby
shops, vendors publish and manage offers for their stores, and admins verify businesses
and moderate content. It is built as **microservices**: each one owns its own domain and
data and is deployed independently.

This document describes what is **implemented today**. The longer-term target design is
in [ARCHITECTURE.md](ARCHITECTURE.md), and the feature roadmap is in
[../plan/SPEC_IMPLEMENTATION_PLAN.md](../plan/SPEC_IMPLEMENTATION_PLAN.md).

---

## 1. System overview

```
                         ┌──────────────────────────────┐
  Browser ──HTTP(S)────▶ │ customer-web (React + nginx) │  serves the single-page app
                         └──────────────┬───────────────┘
                                        │ /api/*
                         ┌──────────────▼───────────────┐
                         │   api-gateway (Node.js)      │  routing, timeouts, uniform errors
                         └──┬──────────┬──────────┬─────┘
            /api/auth/*     │          │          │   /api/discovery/*
         ┌──────────────────▼┐ ┌───────▼────────┐ ┌▼──────────────────┐
         │ identity-service  │ │ vendor-service │ │ discovery-service │
         │ users, login, JWT │ │ stores,        │ │ nearby search     │
         │ saved offers      │ │ verification   │ │ (PostGIS)         │
         └────────┬──────────┘ └──▲─────┬───────┘ └───────▲───────────┘
                  │               │     │ outbox events     │ outbox events
                  │   /api/offers │     └──────────────────▶│
                  │   /api/categories                       │
                  │        ┌──────┴───────────────┐         │
                  │        │    offer-service     │─────────┘
                  │        │ offers, lifecycle,   │
                  │        │ categories, reports  │
                  │        └──────────┬───────────┘
          ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌───────▼──────────┐
          │ identity DB  │ │ vendor DB  │ │  offer DB  │ │ discovery DB     │
          │ PostgreSQL   │ │ PostgreSQL │ │ PostgreSQL │ │ PostgreSQL+PostGIS│
          └──────────────┘ └────────────┘ └────────────┘ └──────────────────┘
            one database server, user and password per service (ADR-035)
```

**Core rule:** a service never reads or writes another service's tables. Cross-service
data moves only through REST APIs or through outbox events.

---

## 2. Services

| Service | Tech | Port | Database | Owns |
| --- | --- | --- | --- | --- |
| **customer-web** | React 19, React Router, Vite, nginx | 80 (5173 locally) | — | All website pages for customers, vendors and admins |
| **api-gateway** | Node.js 20, no framework | 3000 | — | Single entry point for `/api/*`; routes by path prefix; upstream timeout; standard error shape for upstream failures |
| **identity-service** | Java 21, Spring Boot 3.4 | 8084 | own server: `identity` DB | User accounts (CUSTOMER, VENDOR, ADMIN), BCrypt passwords, JWT issuing (1-hour expiry), saved offers, bootstrap admin |
| **vendor-service** | Java 21, Spring Boot 3.4 | 8081 | own server: `vendor` DB | Stores (name, address, city, coordinates), admin verification (PENDING / VERIFIED / REJECTED), public store summaries |
| **offer-service** | Java 21, Spring Boot 3.4 | 8082 | own server: `offer` DB | Offers and their lifecycle, admin-managed category taxonomy, customer reports, admin moderation |
| **discovery-service** | Java 21, Spring Boot 3.4, JdbcTemplate | 8083 | own server: `discovery` DB (PostGIS) | PostGIS **read model** of live offers; radius search sorted by distance; category filters |

Gateway routing:

| Path prefix | Service |
| --- | --- |
| `/api/auth/*` | identity-service |
| `/api/vendors/*` | vendor-service |
| `/api/offers*`, `/api/categories*` | offer-service |
| `/api/discovery/*` | discovery-service |

---

## 3. How the services communicate

There is **no message broker**. All communication is REST over HTTP, in two styles.

### 3.1 Synchronous REST: the caller waits

| From → To | Purpose | Safeguards |
| --- | --- | --- |
| Gateway → any service | Forward each `/api/*` request | 10 s timeout; 502 `UPSTREAM_TIMEOUT` / `UPSTREAM_UNAVAILABLE` |
| offer-service → vendor-service | Confirm the vendor owns the store; check it is verified before publishing | Uses the vendor's own token; 2 s connect and 3 s request timeouts |
| offer-service → vendor-service | Store name and city for public offer listings (one batch call per page) | Only verified stores are returned |

### 3.2 Asynchronous updates: transactional outbox

When search data must change (an offer is published, edited, paused or removed, or a
store is edited, verified or revoked), the service writes the change **and** an event
row in the **same database transaction**. A scheduled dispatcher sends pending events to
discovery-service over REST.

```
vendor/offer change ─▶ [ business table + outbox row ] (one transaction)
                                   │
                        dispatcher (every ~5 s)
                                   │  REST POST/DELETE + projection token
                                   ▼
                      discovery-service read model (PostGIS)
```

| Event | Producer | Effect in discovery |
| --- | --- | --- |
| `offer.projection.updated.v1` | offer-service | Insert/update the offer, with store name, city and location fetched from vendor-service |
| `offer.projection.removed.v1` | offer-service | Remove the offer (paused, expired, unpublished, deleted, removed by admin) |
| store projection update | vendor-service | Update store name, city and location; `storeActive` hides offers of unverified stores |

Guarantees:
- **No lost updates:** the event commits with the change, and delivery retries with capped backoff.
- **No stale overwrites:** every event carries a version timestamp, and discovery ignores older versions.
- **Loose coupling:** publishing still works if discovery is down; search catches up afterwards.

A broker (Kafka locally; Amazon MSK or SNS/SQS on AWS) is planned for Phase 6, when
notifications and analytics also need these events. The outbox remains and publishes to it.

---

## 4. Key flows

### Vendor publishes an offer
1. Vendor registers (identity), creates a store (vendor-service, status **PENDING**).
2. Admin verifies the store (vendor-service); a store projection event is recorded.
3. Vendor creates a draft (offer-service checks store ownership with vendor-service).
4. Vendor publishes. offer-service confirms the store is **VERIFIED**, sets the offer to
   PUBLISHED, and records `offer.projection.updated.v1` in the same transaction.
5. The dispatcher delivers the event, and the offer appears in nearby search within seconds.

### Customer finds offers nearby
1. The browser sends `GET /api/discovery/offers?latitude&longitude&radiusKm&category`.
2. discovery-service runs a PostGIS `ST_DWithin` query on its read model. It keeps only
   offers inside their validity window from active stores, and orders them by distance,
   then newest.
3. Customers save offers (identity-service stores only the offer ID) and open offer and
   store pages (offer-service + vendor-service public endpoints).

### Offer lifecycle (offer-service)
```
DRAFT ──publish──▶ PUBLISHED ◀──resume── PAUSED
  │                   │   └──pause──────────▲
  │                   └──unpublish──▶ DRAFT
  └──expire / (from PUBLISHED or PAUSED)──▶ EXPIRED   (terminal)
any non-removed state ──admin remove──▶ REMOVED       (terminal for the vendor)
```
Publishing and resuming require a verified store. Invalid transitions return
`409 INVALID_OFFER_TRANSITION`. Offers past their `endAt` are hidden at query time,
even before any status change.

---

## 5. Data ownership: database per service

Each microservice has its **own PostgreSQL server, database, user and password**
([ADR-035](../decisions/ADR-035-database-per-service.md)). A service can't connect to
another service's database at all.

| Service | Database (user) | Main tables |
| --- | --- | --- |
| identity-service | `identity` (`identity_svc`) | `users`, `saved_offers` |
| vendor-service | `vendor` (`vendor_svc`) | `stores`, `store_projection_outbox` |
| offer-service | `offer` (`offer_svc`) | `offers`, `categories`, `offer_reports`, `offer_outbox` |
| discovery-service | `discovery` (`discovery_svc`), PostGIS | `offer_projections` (`geography` column, GiST index) |

- Each service runs its own **Flyway** migrations against its own database.
- References across services are plain IDs (for example, `saved_offers.offer_id`), never
  foreign keys; data moves only through APIs and outbox events.
- Locally these are four Compose containers. On AWS they are four RDS instances, each
  reachable only from its own service's security group.

## 6. Security

| Concern | Implementation |
| --- | --- |
| Passwords | BCrypt hashes; never returned or logged |
| Authentication | HMAC-SHA256 JWT with `sub`, `role`, `iat`, `exp` (1 h); every service verifies signature and expiry |
| Authorization | Checked in each service twice: URL rules in `SecurityConfig` and `@PreAuthorize` on endpoints. Roles: CUSTOMER, VENDOR, ADMIN |
| Admin accounts | No self-registration; created at startup from bootstrap configuration (secret) |
| Service-to-service | Projection endpoints require a shared projection token, compared in constant time |
| Validation | Bean Validation on every request; consistent errors `{ "error": { "code", "message" } }` (ADR-032) |
| Privacy | Public APIs omit vendor IDs, moderation notes and reporter identity; only verified stores are public |
| Network (AWS) | Only the public load balancer accepts internet traffic; services accept traffic only from the load balancers and each other; the database only from services |
| Secrets | Generated by Terraform into AWS Secrets Manager (ECS) or a root-only file (EC2); never in git |
| CI | Build/test for every service, Docker image builds, gitleaks secret scanning, Playwright browser tests |

---

## 7. Deployment

### Local (Docker Compose)
`docker compose up -d --build` starts PostgreSQL/PostGIS, the six application containers
and health checks. The website is at http://localhost:5173.

### AWS: ECS Fargate, one service per microservice ([guide](../deploy/AWS_ECS_DEPLOYMENT.md))
```
Internet ─▶ Public ALB ── /      ─▶ customer-web   (ECS service)
                       └─ /api/* ─▶ api-gateway    (ECS service)
                                        │
             Internal ALB (VPC only; one listener per service port)
   identity :8084 · vendor :8081 · offer :8082 · discovery :8083
                                        │
        4 × Amazon RDS PostgreSQL (identity, vendor, offer, discovery+PostGIS)
        each private and reachable only from its own service
```

| AWS service | Used for |
| --- | --- |
| ECS Fargate | 6 independent services, one task each |
| ECR | One image repository per microservice |
| Elastic Load Balancing | Public ALB (routing `/` and `/api/*`); internal ALB for service-to-service calls |
| RDS | 4 PostgreSQL instances, one per microservice (discovery with PostGIS), encrypted, private |
| Secrets Manager | One database password per service, JWT secret, projection token, admin password |
| CloudWatch Logs | One log group per service |
| VPC, security groups, IAM (`LabRole`) | Networking and permissions |

Infrastructure is defined in Terraform (`infra/aws-ecs`). The internal ALB replaces
Cloud Map, and HTTP replaces CloudFront HTTPS, because AWS Academy Learner Lab blocks
both of those services.

### AWS: single EC2 host ([guide](../deploy/AWS_DEPLOYMENT.md))
The same Compose stack on one EC2 instance, with Caddy for HTTPS (`infra/aws`). It's a
lower-cost alternative and isn't highly available.

---

## 8. Testing

| Level | Where |
| --- | --- |
| Unit and API tests | JUnit + MockMvc in each Java service (H2 in PostgreSQL mode); `node --test` for the gateway and frontend helpers |
| End-to-end API | `scripts/smoke-test.mjs`: 9 checks covering registration, verification, publishing, discovery, pause/resume, save, report, moderation |
| Browser | Playwright (`frontend/e2e`): customer, vendor and admin journeys; desktop and mobile navigation |
| CI | `.github/workflows/ci.yml` (build and test), `docker-build.yml`, `secret-scan.yml`, `e2e.yml` (full Compose stack plus browser tests) |

---

## 9. Repository layout

```
services/
  api-gateway/         Node.js gateway
  identity-service/    Spring Boot: users, auth, saved offers
  vendor-service/      Spring Boot: stores, verification
  offer-service/       Spring Boot: offers, categories, reports, moderation
  discovery-service/   Spring Boot: PostGIS read model and search
frontend/              React app (src/pages, src/components, src/lib), Playwright tests (e2e/)
infra/aws/             Terraform: single EC2 host
infra/aws-ecs/         Terraform: ECS Fargate per-service deployment
scripts/               smoke-test.mjs, seed-demo.mjs, push-images.ps1
docs/                  api/, decisions/ (ADRs), deploy/, plan/, status/
tasks/                 One file per completed task (DN-001 … DN-043)
compose.yaml           Local stack; compose.prod.yaml for the EC2 host
```

---

## 10. Architecture decisions

| ADR | Decision |
| --- | --- |
| [ADR-014](../decisions/ADR-014-public-store-summary.md) | Privacy-safe public store summaries |
| [ADR-016](../decisions/ADR-016-discovery-read-model.md) | Separate discovery read model |
| [ADR-017](../decisions/ADR-017-offer-projection-outbox.md) | Transactional outbox for projections |
| [ADR-032](../decisions/ADR-032-api-error-format-and-versioning.md) | Uniform error format and additive API versioning |
| [ADR-033](../decisions/ADR-033-store-verification-and-offer-moderation.md) | Store verification, offer lifecycle, moderation ownership |
| [ADR-034](../decisions/ADR-034-public-store-address.md) | Publish address of verified stores (amends ADR-014) |
| [ADR-035](../decisions/ADR-035-database-per-service.md) | Separate database server per microservice |

---

## 11. Known limitations and next steps

- One task per service and single-AZ RDS instances: fine for a demo, not highly available.
- No message broker yet (planned for Phase 6), no caching, no central metrics or tracing dashboards.
- HTTP only on the ECS deployment (Learner Lab blocks CloudFront).
- Not built yet: images, prices, terms, search text, maps, notifications, redemption and
  analytics. These are scheduled in Phases 2–8 of the implementation plan.
