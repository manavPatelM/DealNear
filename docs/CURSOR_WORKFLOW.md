# Cursor Workflow for DealNear

## Where instructions live
- `AGENTS.md`: project-wide instructions and constraints.
- `.cursor/rules/*.mdc`: persistent, focused Cursor rules with frontmatter and optional file globs.
- `.cursor/skills/*/SKILL.md`: reusable multi-step workflows that Cursor can invoke.
- `.agents/skills/*/SKILL.md`: mirrored skills for tools that support the Agent Skills convention.
- `prompts/`: copy-ready prompts for planning, implementation, review, debugging, security, and release checks.
- `tasks/`: one task file per bounded change.
- `docs/status/PROJECT_STATUS.md`: verified project state and next task.

## One-task approval protocol
1. Plan one task without editing.
2. User approves the exact task and scope.
3. Implement only that task.
4. Run and report verification.
5. User reviews the diff and accepts/rejects.
6. Update status and propose exactly one next task.

A request to plan is not approval to code. A successful test suite is not approval to deploy.

## How to invoke a skill
In Cursor Agent, invoke a relevant skill by its slash name when available, or attach/select the skill from the context picker. Examples:
- `/dealnear-one-task-workflow`
- `/dealnear-feature-slice`
- `/dealnear-microservice`
- `/dealnear-testing`
- `/dealnear-security`
- `/dealnear-infrastructure`
- `/dealnear-code-review`

Availability and invocation labels can vary by Cursor version. If a skill is not surfaced, open its `SKILL.md` and reference it directly.

## Prompt sequence
- First setup: `prompts/00-project-onboarding.md`
- Plan only: `prompts/01-plan-one-task.md`
- Implement after approval: `prompts/02-implement-one-task.md`
- Review: `prompts/03-review-diff.md`
- Debug: `prompts/04-debug-test-failure.md`
- Security review: `prompts/05-security-review.md`
- Release readiness: `prompts/06-release-readiness.md`
- Evaluate service boundary: `prompts/07-add-a-microservice.md`
- Infrastructure planning: `prompts/08-infrastructure-change.md`

## Git checkpoints
- Start from a clean working tree where possible.
- Review `git diff` before and after implementation.
- Commit only after you inspect the diff and relevant checks.
- Never let the AI stage or commit changes unless you explicitly request that action.
