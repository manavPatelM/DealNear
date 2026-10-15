---
name: dealnear-feature-slice
description: Use when implementing a complete DealNear user capability across UI, API, domain logic, persistence, and tests.
---

# DealNear Vertical Feature Slice Skill

## Goal
Deliver one coherent user outcome end to end, rather than implementing disconnected layers in bulk.

## Workflow
1. Identify the user, trigger, expected result, and error cases.
2. Inspect existing UI, endpoints, entities, migrations, and tests.
3. Write acceptance criteria before coding.
4. Confirm the API contract and ownership boundary.
5. Implement the smallest end-to-end path.
6. Add unit and integration tests; add e2e coverage for a critical journey.
7. Update docs and example configuration.
8. Run checks and report evidence.
9. Stop and wait for review.

## Definition of done
- Main flow works.
- Validation and authorization are enforced server-side.
- Error and empty states are handled.
- Tests cover success and important failures.
- No secrets or unrelated files are included.
- Documentation matches the implementation.
- Actual command results are reported honestly.
