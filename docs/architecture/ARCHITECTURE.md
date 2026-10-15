# DealNear Architecture

## 1. Product summary

DealNear helps customers discover nearby deals, discounts, and offers while helping local vendors promote stores and offers.

## 2. Suggested logical components

- `web-app`: React customer/vendor/admin interface.
- `api-gateway`: Node.js/NestJS entry point for routing, cross-cutting HTTP concerns, and API composition where justified.
- `identity-service`: Java/Spring Boot authentication and identity domain.
- `vendor-service`: Java/Spring Boot vendor and store management.
- `offer-service`: Java/Spring Boot offer lifecycle and validation.
- `discovery-service`: Java/Spring Boot search, filters, and nearby-offer queries.
- `engagement-service`: JavaScript/Node.js for saved offers and lightweight engagement if it is a useful language-boundary demonstration.
- `notification-service`: JavaScript/Node.js for notification preferences and delivery workflows when implemented.
- PostgreSQL/PostGIS, Redis, Kafka, and object storage only when needed by the current milestone.

These are target boundaries, not a requirement to create all services on day one. Start with the smallest vertical slice. A modular monolith or fewer deployables can be used temporarily if it improves learning and delivery, but document the trade-off and migration boundary.

## 3. Initial domain model

- `User`: identity reference, role, status, timestamps.
- `Vendor`: business account and verification state.
- `Store`: vendor-owned location, address, coordinates, categories, status.
- `Category`: taxonomy for offers and stores.
- `Offer`: store reference, title, description, discount/value, start/end time, status, terms.
- `SavedOffer`: user reference, offer reference, created timestamp.
- `OfferView`: optional aggregate/event for analytics; avoid recording unnecessary personal data.

Use stable IDs and explicit ownership. Add constraints and indexes based on access patterns. For nearby queries, define coordinate system and radius units clearly.

## 4. Key journeys

### Vendor publishes an offer
1. Vendor signs in.
2. Vendor creates or selects a store.
3. Vendor creates an offer.
4. Offer is validated and saved as draft.
5. Vendor publishes it.
6. The offer becomes discoverable only when it is active and eligible.

### Customer discovers an offer
1. Customer supplies a location or selects an area.
2. Discovery applies active status, validity window, category, distance, and other filters.
3. Results are paginated and ordered using a documented strategy.
4. Customer opens offer details and optionally saves it.

## 5. API examples

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/vendors/stores`
- `GET /api/vendors/stores/{storeId}`
- `POST /api/offers`
- `PATCH /api/offers/{offerId}`
- `POST /api/offers/{offerId}/publish`
- `GET /api/discovery/offers`
- `GET /api/discovery/nearby`
- `PUT /api/engagement/saved-offers/{offerId}`
- `DELETE /api/engagement/saved-offers/{offerId}`

Treat these as proposed routes. Finalize request/response schemas in OpenAPI before implementation.

## 6. Data ownership

Each service owns its tables and migrations. In local development, multiple service schemas in one PostgreSQL instance may be acceptable, with separate credentials where practical. Production isolation can evolve with operational needs. Cross-service reads should use APIs, events, or a purpose-built read model, not direct table access.

## 7. Events

Add Kafka only when asynchronous workflows are implemented. Example event: `offer.published.v1`, containing event ID, offer ID, store ID, timestamp, and schema version. Consumers should be idempotent. Define retry, dead-letter, replay, and observability behavior. Consider a transactional outbox for reliable publication.

## 8. Non-functional requirements

- Authentication and authorization at relevant boundaries.
- Request validation and consistent error format.
- Pagination and query limits.
- Timeouts and bounded retries for remote calls.
- Health/readiness endpoints.
- Structured logs with correlation IDs.
- Metrics and traces for important journeys.
- Backups and migration/rollback strategy for persistent data.
- Accessibility, responsive design, and clear empty/error states.
- Rate limiting and abuse controls on sensitive endpoints.

## 9. Architecture decision records

Use `docs/decisions/ADR-TEMPLATE.md` for meaningful choices, including service boundaries, authentication, event delivery, database ownership, and cloud deployment.
