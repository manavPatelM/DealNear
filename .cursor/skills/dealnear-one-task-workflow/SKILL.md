---
name: dealnear-one-task-workflow
description: Use for every DealNear coding task when following the approval-gated, one-task-at-a-time workflow.
---

# DealNear One-Task-at-a-Time Workflow

## Required operating mode
The user is the decision-maker. Plan first, implement only after approval, verify, report, and stop.

## Stage A: Plan
1. Read `AGENTS.md`, the relevant Cursor rules, current task, and related source/tests/docs.
2. Inspect `git status` and existing changes; do not overwrite user work.
3. Restate the requested outcome and scope.
4. List likely files, dependencies, acceptance criteria, tests, security considerations, and rollback concerns.
5. If the task is too large, split it and recommend only the first subtask.
6. Do not edit files in the planning stage.

## Stage B: Wait
Present the plan and ask for explicit approval. Do not interpret silence or a vague request for planning as approval to implement.

## Stage C: Implement after approval
1. Implement only the approved scope.
2. Keep changes small and avoid unrelated refactors.
3. Add/update tests and documentation.
4. Do not run destructive commands, cloud provisioning, deployment, or Terraform apply/destroy without separate explicit authorization.

## Stage D: Verify
1. Inspect the final diff.
2. Run the focused test first, then applicable lint/build/integration/security checks.
3. Confirm acceptance criteria against actual evidence.
4. Distinguish passed, failed, skipped, and not-run checks.
5. Never state that an unrun command passed.

## Stage E: Report and stop
Report summary, changed files, commands and results, acceptance criteria, risks, and next suggested task. Do not start the next task. Wait for user approval.
