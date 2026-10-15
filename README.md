# DealNear

DealNear is a hyperlocal platform where customers discover nearby offers and local
vendors create and manage offers.

The repository is being built incrementally from an empty baseline. The current
checkpoint contains the project instructions, architecture documentation, task
backlog, and development workflow; application services are added one approved
task at a time.

## Current status

- The backend services and dependency-free Node.js `api-gateway` can run
  together through Docker Compose.
- Their health contracts and local startup steps are documented in
  `docs/LOCAL_DEVELOPMENT.md`.
- No cloud resources are required for local development.

## Start here
1. Open the DealNear repository as the workspace in Cursor.
2. Read `AGENTS.md`, `.cursor/rules/`, and `docs/architecture/ARCHITECTURE.md`.
3. Start the local stack with `docker compose up --build`.
4. Check `http://localhost:3000/health`.
5. Use `npm test` from `services/api-gateway` for the focused gateway tests.
6. Plan one task with `prompts/01-plan-one-task.md`.
7. Approve the exact task before implementation.
8. Inspect the diff and verification evidence before accepting the task.
9. Update `docs/status/PROJECT_STATUS.md` only with verified facts.

## Instruction layout
- `AGENTS.md`: global project instructions.
- `.cursor/rules/*.mdc`: Cursor project rules, including one always-on core rule and focused rules for JS/React, Java/Spring, APIs, tests, and infrastructure.
- `.cursor/skills/*/SKILL.md`: Cursor-recognized task workflows.
- `.agents/skills/*/SKILL.md`: compatibility mirror for tools supporting the Agent Skills convention.
- `prompts/`: copy-ready task prompts.
- `tasks/`: bounded backlog tasks.
- `docs/`: architecture, roadmap, decisions, partitioning, and workflow guides.

## Working agreement
Plan -> wait for approval -> implement one task -> verify -> report -> stop. No automatic task chaining. No cloud provisioning, deployment, Terraform apply/destroy, or destructive commands without separate explicit approval.

## Note
Cursor features and labels can vary by version. If a skill does not appear in the Agent UI, open its `SKILL.md` and reference it directly. See `docs/CURSOR_WORKFLOW.md`.

## Planned delivery order

1. Repository bootstrap and local developer workflow.
2. First backend health endpoint.
3. Vendor/store creation vertical slice.
4. Offer lifecycle.
5. Customer discovery and saved offers.
6. Containerized local development, CI security checks, and infrastructure.

Kafka, Redis, AWS resources, and Kubernetes deployment are deliberately deferred
until a concrete feature requires them.
