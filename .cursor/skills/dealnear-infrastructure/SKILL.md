---
name: dealnear-infrastructure
description: Use for Docker, Docker Compose, Terraform, AWS, Kubernetes, and deployment changes in DealNear.
---

# DealNear Infrastructure Skill

## Default progression
1. Make the service run locally.
2. Containerize it.
3. Compose local dependencies.
4. Validate manifests locally.
5. Add Terraform for required AWS resources.
6. Deploy to a non-production environment.
7. Add production controls only when their prerequisites are understood.

## Terraform/AWS safeguards
- Run `terraform fmt` and `terraform validate`.
- Review `terraform plan` before apply.
- Never run `apply` or destroy resources without explicit user authorization.
- Do not put credentials in Terraform files or state outputs.
- Use remote state and locking for shared environments.
- Prefer OIDC for GitHub Actions AWS access.
- Explain resources that incur ongoing costs and how to tear them down.

## Kubernetes safeguards
- Add readiness/liveness probes when appropriate.
- Set resource requests/limits based on a reasoned baseline.
- Use configuration and secret mechanisms appropriately.
- Validate manifests and test rollout/rollback.
- Avoid exposing internal services publicly without a requirement.
- Do not claim deployment success without observed deployment and health evidence.
