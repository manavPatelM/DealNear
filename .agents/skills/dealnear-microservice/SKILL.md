---
name: dealnear-microservice
description: Use when creating or modifying a DealNear Java/Spring Boot or JavaScript/Node.js service.
---

# DealNear Microservice Skill

## Required steps
1. Identify the service's single domain responsibility and owner.
2. Inspect repository conventions and adjacent service contracts.
3. Define endpoint schemas and consistent error responses.
4. Define configuration through environment variables with safe defaults.
5. Implement validation, authorization, logging, health checks, and timeouts.
6. Add unit tests and relevant integration/contract tests.
7. Add a Dockerfile only if containerization is in scope.
8. Document how to run and test the service locally.

## Java/Spring Boot
- Use the existing project version and conventions.
- Keep controllers thin; put business rules in domain/service layers.
- Use database migrations rather than relying on automatic production schema generation.
- Avoid leaking persistence entities as public API models.

## JavaScript/Node.js
- Follow the existing module system and framework.
- Validate request bodies and query parameters.
- Handle async failures explicitly.
- Avoid unhandled promise rejections and unsafe dynamic evaluation.

## Service boundaries
- One service owns its data and migrations.
- Use APIs/events for cross-service communication.
- Add correlation IDs and timeouts for remote calls.
- Use idempotency for retried write operations where appropriate.
