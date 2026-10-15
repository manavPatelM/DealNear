---
name: dealnear-testing
description: Use when planning or writing tests, debugging failures, or verifying a DealNear change.
---

# DealNear Testing Skill

## Test selection
- Unit tests: business rules, transformations, validation.
- Integration tests: database repositories, migrations, broker interactions, HTTP boundaries.
- Contract tests: OpenAPI schemas and event compatibility.
- End-to-end tests: high-value user journeys.
- Load tests: only after defining a workload and target.
- Security tests: authorization, input validation, secrets, dependency and image findings.

## Rules
- Tests must assert behavior, not merely that code executes.
- Include invalid input and authorization failure cases.
- Use deterministic fixtures and isolate test data.
- Avoid tests that require cloud resources by default.
- Do not weaken a test simply to make it pass; diagnose the failure.
- If unable to execute a test, label it unrun.

## Completion report
List each command run, its exit/result, tests omitted, and any uncertainty.
