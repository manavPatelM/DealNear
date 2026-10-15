# DealNear Work Partitioning Strategy

Use both horizontal and vertical partitioning, but for different purposes.

## Horizontal partitioning: engineering concerns

Organize long-lived ownership and reusable instructions by concern:
1. Product and requirements
2. Frontend
3. API and service design
4. Data and messaging
5. Testing and quality
6. Security and DevSecOps
7. Containers and local developer experience
8. Terraform and AWS
9. Kubernetes and deployment
10. Observability and operations

This is useful for architecture, documentation, reusable skills, and platform foundations.

## Vertical partitioning: end-to-end capabilities

Implement a thin complete path through UI, API, domain logic, persistence, and tests.

Recommended vertical slices:
1. Repository bootstrapping and health checks.
2. Vendor creates a store.
3. Vendor creates and publishes an offer.
4. Customer browses active offers.
5. Customer filters offers by category and validity.
6. Customer discovers offers within a geographic radius.
7. Customer saves/unsaves an offer.
8. Admin verifies a vendor/store.
9. Notifications and analytics, if still in scope.

Each slice must have:
- A user outcome.
- API/UI/data changes needed.
- Dependencies.
- Acceptance criteria.
- Automated tests.
- Security and failure cases.
- Documentation updated.
- A reviewable diff.

## Recommended delivery order

### Foundation
Repository conventions, architecture decisions, local developer setup, CI baseline, API contract conventions.

### First vertical slice
Choose one path and complete it end to end. A good first candidate is vendor creates a store, then creates an offer, then sees that offer in a basic list. Keep the first slice intentionally small.

### Expand product behavior
Add customer browsing, filters, authentication/authorization, and location discovery incrementally.

### Add distributed-system complexity only when earned
Introduce Kafka/outbox, Redis, multiple replicas, Kubernetes autoscaling, and advanced observability after the relevant feature works and has a concrete reason for the added complexity.

### Platformize
Docker Compose, CI security checks, Terraform modules, local Kubernetes, AWS deployment, staged releases, monitoring, and rollback.

## Task sizing rule

One AI task should usually change one coherent behavior or one bounded platform capability. If the plan contains many unrelated services, files, or milestones, split it. Ask the assistant to stop after completing the task and wait for review.
