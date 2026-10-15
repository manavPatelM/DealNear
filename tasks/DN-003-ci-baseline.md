# DN-003: Establish minimal CI baseline

Status: Proposed

## Outcome
Run existing repository checks automatically on pull requests.

## Scope
- Inspect actual languages, package/build tools, and test commands first.
- Add only the relevant GitHub Actions checks.
- Add secret scanning if it can be configured without leaking credentials.

## Acceptance criteria
- [ ] Workflow runs on pull requests and pushes to the agreed branch.
- [ ] Checks reflect actual project commands.
- [ ] No secrets are stored in workflow files.
- [ ] Workflow behavior is documented.
