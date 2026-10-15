# Prompt 07: Evaluate and Add a Service

Evaluate whether this proposed service is justified: <SERVICE/RESPONSIBILITY>.

First explain whether the capability should be a separate deployable service now or remain within an existing service. Consider domain ownership, independent scaling/release, team complexity, data boundaries, latency, observability, and cloud cost.

If justified and approved, implement one bounded step only:
- service skeleton and health endpoint, OR
- one API contract and endpoint, OR
- one data migration/repository, OR
- one integration with an existing service.

Do not create a full service with many endpoints in one task. Follow `.agents/skills/dealnear-microservice/SKILL.md`.
