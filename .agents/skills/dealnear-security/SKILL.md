---
name: dealnear-security
description: Use when reviewing authentication, authorization, secrets, APIs, dependencies, containers, Terraform, or Kubernetes configuration.
---

# DealNear Security and DevSecOps Skill

## Review checklist
- Authentication and authorization are distinct and correctly enforced.
- Vendor users can only manage stores/offers they own.
- Admin privileges are explicit and audited where appropriate.
- Inputs are validated and outputs avoid leaking internals.
- Passwords and tokens are never logged.
- Secrets are not committed or baked into images.
- Dependencies are pinned/managed and scanned.
- Containers run with least privilege where practical.
- Terraform IAM policies are least-privilege and state is protected.
- Kubernetes workloads use appropriate service accounts, resources, probes, and secret handling.
- Public endpoints have suitable rate limits and abuse controls.
- Personal data collection is minimized and retention is considered.

## Response to findings
Classify findings by severity and exploitability. Explain impact, concrete fix, tests, and any residual risk. Never claim a system is secure merely because a scanner passed.
