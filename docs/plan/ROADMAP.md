# DealNear AI-Assisted Development Roadmap

## Phase 0: Define the project
- Confirm MVP roles and journeys.
- Define out-of-scope items.
- Agree on architecture and service boundaries.
- Record decisions in ADRs.
- Create acceptance criteria for the first vertical slice.

**Exit gate:** requirements and initial architecture are reviewed.

## Phase 1: Repository and developer workflow
- Create the repository structure.
- Add root instructions and formatting conventions.
- Add local run instructions.
- Add basic CI for lint/build/test.
- Add secret scanning early.
- Establish pull request and commit conventions.

**Exit gate:** a clean checkout can run the documented local checks.

## Phase 2: First vertical slice
- Implement a small API health endpoint.
- Implement vendor/store creation with validation and persistence.
- Add minimal UI or API client flow.
- Add unit and integration tests.
- Document API contract and data model.

**Exit gate:** one end-to-end path works locally and is tested.

## Phase 3: Offer lifecycle
- Create/edit offer drafts.
- Publish/pause/expire offers.
- Enforce vendor/store ownership.
- Validate start/end dates and offer status.
- Add tests for invalid transitions.

**Exit gate:** a vendor can manage offers securely.

## Phase 4: Customer discovery
- Browse active offers.
- Filter by category and validity.
- Add pagination and deterministic ordering.
- Add PostGIS nearby search only after basic discovery works.
- Add saved offers.

**Exit gate:** core customer journey works with realistic test data.

## Phase 5: Service boundaries and asynchronous work
- Split or formalize services where justified.
- Define OpenAPI and event schemas.
- Introduce Kafka for a real asynchronous workflow.
- Add idempotent consumers, retries, dead-letter handling, and observability.
- Consider an outbox for reliable event publication.

**Exit gate:** failure and replay behavior is tested.

## Phase 6: Containerized local development
- Dockerize app components.
- Add Docker Compose for local dependencies.
- Use health checks and non-root containers where practical.
- Document clean startup, reset, and teardown.

**Exit gate:** documented local stack starts predictably.

## Phase 7: Security and quality automation
- Dependency scanning for Java and JavaScript.
- Secret scanning.
- Container image scanning.
- IaC and Kubernetes manifest scanning.
- Tests, linting, code analysis, and coverage thresholds where justified.
- Threat model key flows.

**Exit gate:** CI blocks critical failures according to documented policy.

## Phase 8: Terraform and AWS foundations
- Define account/environment strategy.
- Set budgets and alerts before creating costly resources.
- Build networking, IAM, container registry, database, and secrets configuration incrementally.
- Use remote Terraform state and locking for shared environments.
- Use GitHub OIDC instead of long-lived AWS access keys where supported.
- Review plans before apply.

**Exit gate:** infrastructure can be recreated and destroyed from reviewed IaC.

## Phase 9: Kubernetes
- Start with kind or Minikube.
- Add Deployments, Services, configuration, secrets integration, probes, resource requests/limits, and network policies where suitable.
- Add autoscaling only with appropriate metrics and load expectations.
- Deploy to EKS only after local manifests are understood.

**Exit gate:** app health, rollout, rollback, and failure behavior are demonstrated.

## Phase 10: CI/CD and operations
- Build/test/scan/publish images.
- Deploy to staging.
- Run smoke tests.
- Require approval for production-like deployment.
- Document rollback and database migration strategy.
- Add logs, metrics, traces, dashboards, and alerts.

**Exit gate:** repeatable delivery and observable operation.

## Phase 11: Final verification
- Run end-to-end and load tests.
- Test failure cases.
- Check accessibility and responsive behavior.
- Review security findings.
- Document architecture, setup, deployment, costs, and limitations.
- Capture a demo script and known issues.

**Exit gate:** project can be explained, run, tested, deployed, and torn down by another developer.
