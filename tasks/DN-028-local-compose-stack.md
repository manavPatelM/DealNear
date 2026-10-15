# DN-028: Containerized local stack

Status: Complete

## Outcome

All current services have local Dockerfiles and are wired through
`compose.yaml`. Compose provides PostgreSQL/PostGIS, service-to-service
environment configuration, startup dependencies, and health checks for local
development.

## Verification

- Compose manifest validation: passed with `docker compose config`.
- Full image build: passed for all five application images.
- Runtime smoke test: passed for gateway health, customer registration, and
  saved-offer save/list through the gateway.
- Java service Dockerfiles use Java 21 multi-stage builds.
- Java builds use a shared BuildKit Maven cache and avoid a redundant
  dependency-prefetch phase.
- Gateway Dockerfile runs as the non-root `node` user.
- No cloud resources or credentials were added.
