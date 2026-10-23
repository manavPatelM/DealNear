# ADR-035: Separate database server per microservice

- Status: Accepted (supersedes the shared-instance setup in the ECS and Compose stacks)
- Date: 2026-10-23
- Decision owners: DealNear project (approved by the project owner)

## Context
Services already owned separate schemas and never touched each other's tables, but they
shared one PostgreSQL server and one login. That relied on discipline: any service
could technically connect to another service's tables, and one server's outage or load
affected every service.

## Decision
Each microservice gets its own PostgreSQL server, database, user and password:

| Service | Database | User | Server |
| --- | --- | --- | --- |
| identity-service | `identity` | `identity_svc` | PostgreSQL 16 |
| vendor-service | `vendor` | `vendor_svc` | PostgreSQL 16 |
| offer-service | `offer` | `offer_svc` | PostgreSQL 16 |
| discovery-service | `discovery` | `discovery_svc` | PostgreSQL 16 + PostGIS |

- **Local (Compose):** four database containers (`identity-db`, `vendor-db`, `offer-db`,
  `discovery-db`) with separate volumes. Ports are not published to the host.
- **AWS (ECS):** four RDS instances (db.t3.micro, encrypted, private). Each password is a
  separate key in Secrets Manager, and each task receives only its own.
- **Network isolation on AWS:** every service has its own security group, and each
  database's security group admits PostgreSQL only from that one service.
- **EC2 option:** same four containers, with four generated passwords in `.env.prod`.

No application code changed: services already read `DATABASE_URL`,
`DATABASE_USERNAME` and `DATABASE_PASSWORD` from configuration.

## Consequences
- Isolation is now enforced by credentials and by the network, not only by convention.
- A database outage or migration affects only its own service.
- Cost on AWS: four db.t3.micro instances (about US$1.8/day instead of US$0.45).
- Data was not migrated (decision: start fresh). Demo data is recreated with `scripts/seed-demo.mjs`.
- Cross-service queries remain impossible by design; data still flows through APIs and outbox events.
