---
name: dealnear-code-review
description: Use when reviewing a proposed DealNear change or the AI-generated diff before committing.
---

# DealNear Code Review Skill

Review in this order:
1. Does the change meet the acceptance criteria?
2. Is the domain behavior correct, including edge cases?
3. Are authentication, authorization, and tenant/vendor ownership enforced?
4. Are APIs and event contracts compatible?
5. Are migrations safe and reversible where possible?
6. Are errors, timeouts, retries, and idempotency appropriate?
7. Are tests meaningful and deterministic?
8. Are secrets, personal data, and unsafe configuration handled correctly?
9. Does the change add unnecessary services, dependencies, abstractions, or cloud cost?
10. Are docs and operational instructions accurate?

Return findings grouped as Blocker, High, Medium, Low, then list positive observations and unverified assumptions. Do not approve solely because formatting or tests pass.
