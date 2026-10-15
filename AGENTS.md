# DealNear: Repository-Wide AI Instructions

## Mission

Build DealNear, a hyperlocal platform where customers discover nearby offers and local vendors create and manage offers. Treat this as a learning-focused, production-minded cloud-native project. Prefer understandable, testable, secure code over premature complexity.

## Product boundaries

### Customer MVP
- Register/sign in and manage a basic profile.
- Browse and filter active offers.
- Discover offers by location and radius.
- View offer and store details.
- Save/unsave offers.

### Vendor MVP
- Register a vendor account and create/manage a store.
- Create, edit, publish, pause, and expire offers.
- View basic offer activity where implemented.

### Admin MVP
- Review/verify vendor and store submissions.
- Moderate reported or invalid offers.

Do not silently expand the MVP. Record new requirements before implementing them.

## Technology constraints

- Application languages: JavaScript and Java.
- Frontend: React with JavaScript.
- Gateway and selected lightweight/event-driven services: Node.js, preferably NestJS if the team accepts the framework.
- Core domain services: Java with Spring Boot.
- Data: PostgreSQL; use PostGIS for geographic queries when location discovery is implemented.
- Cache: Redis only where measured or clearly justified.
- Messaging: Kafka only after a synchronous vertical slice works and event-driven behavior is needed.
- Containers: Docker; Docker Compose for local multi-service development.
- Infrastructure as code: Terraform.
- Orchestration: Kubernetes, starting locally before AWS EKS.
- Cloud: AWS.
- CI/CD: GitHub Actions.
- Observability: structured logs first, then metrics/traces and dashboards.
- Security: secret scanning, dependency scanning, container scanning, IaC/Kubernetes manifest scanning, least privilege, and secure defaults.

Do not add a technology just to make the stack look impressive. Explain the purpose and operational cost before introducing it.

## Architecture rules

- Each service owns its domain and data access.
- A service must not read or write another service's database tables directly.
- Define HTTP APIs with OpenAPI and events with versioned schemas.
- Validate requests at system boundaries.
- Use explicit timeouts, bounded retries, and idempotency where appropriate.
- Do not introduce distributed transactions by default.
- For reliable event publication, evaluate a transactional outbox before claiming database changes and event publishing are atomic.
- Never log passwords, access tokens, secrets, or sensitive personal data.
- Store secrets outside source control.
- Keep local development possible without AWS credentials.

## AI working protocol

For every task:
1. Read this file and the relevant architecture/skill documents.
2. Inspect the existing repository before proposing edits.
3. State the task scope and assumptions briefly.
4. Make the smallest coherent change that satisfies acceptance criteria.
5. Add or update tests and documentation.
6. Run available checks. Never claim a command passed unless it was actually run and its result observed.
7. Report changed files, commands run, outcomes, remaining risks, and the next suggested task.
8. Stop after the requested task. Do not continue into the next milestone without approval.

## Coding rules

- Match existing conventions before introducing new patterns.
- Prefer small, cohesive modules and clear names.
- Avoid unnecessary abstractions, generated boilerplate, and duplicated configuration.
- Use environment variables/configuration for environment-specific values.
- Include useful error handling without exposing internals to clients.
- Add comments for non-obvious reasoning, not line-by-line narration.
- Never leave fake implementations, TODO-only paths, hardcoded credentials, or unmentioned placeholders in work claimed as complete.
- If a dependency, requirement, or API contract is ambiguous, ask one focused question or document a safe assumption.

## Testing rules

Choose tests based on the change:
- Unit tests for domain logic.
- Integration tests for database, broker, and service boundaries.
- Contract tests for APIs/events.
- End-to-end tests for critical customer/vendor journeys.
- Security and configuration checks for infrastructure changes.

If tests cannot be run, state why and give the exact command the user should run.

## Cloud-cost rules

- Build locally first.
- Warn before introducing resources that can incur ongoing charges.
- Do not create AWS resources or run destructive commands without explicit authorization.
- Prefer budgets, tagging, least privilege, and disposable environments.
- Explain how to tear down temporary resources and what state/data would be lost.
