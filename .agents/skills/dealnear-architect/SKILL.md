---
name: dealnear-architect
description: Use when changing DealNear service boundaries, APIs, domain models, event contracts, or cross-service interactions.
---

# DealNear Architect Skill

## Before changing architecture
1. Read root `AGENTS.md` and `docs/architecture/ARCHITECTURE.md`.
2. Inspect current code and contracts.
3. Identify the owning service and its data ownership.
4. Prefer the smallest architecture that meets the current requirement.
5. Record consequential decisions using the ADR template.

## Required design output
For a non-trivial change, state:
- Problem and user journey.
- Components/services involved.
- API/event contract changes.
- Data ownership and migration impact.
- Failure, timeout, retry, and idempotency behavior.
- Security and privacy implications.
- Tests and rollout/rollback plan.

## Guardrails
- Do not split a service solely to increase microservice count.
- Do not let one service directly access another service's tables.
- Do not add Kafka/Redis without a concrete use case and operational explanation.
- Keep API and event contracts versioned and reviewable.
- Never implement a broad rewrite when a bounded change will work.
