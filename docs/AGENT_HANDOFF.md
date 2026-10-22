# DealNear — Agent Handoff

Context for an AI coding agent continuing work on this repository. Read
`AGENTS.md` first: its rules (one task at a time, run checks before claiming
success, no AWS changes without explicit user authorization, report changed
files and commands) still apply.

Last updated: 2026-10-22.

---

## 1. Current state in one paragraph

The Customer, Vendor, and Admin MVP from `AGENTS.md` is complete (tasks DN-001 to
DN-039 in `tasks/`). All automated tests pass. The full stack runs locally with
Docker Compose and is **deployed live on AWS** (AWS Academy Learner Lab, single
EC2 host) at `https://54-85-39-197.sslip.io`. The end-to-end smoke test passed
both locally and against the live deployment. The next planned task is DN-040
(CI image builds pushed to ECR); see section 9.

---

## 2. Repository map

| Path | What it is |
| --- | --- |
| `services/identity-service` | Java 21 / Spring Boot. Users, BCrypt passwords, HMAC JWT issuing (`exp` claim), saved offers, admin bootstrap. Port 8084. Schema `identity_service`. |
| `services/vendor-service` | Stores, store verification (`PENDING`/`VERIFIED`/`REJECTED`), admin store review, store projection outbox. Port 8081. Uses `public` schema. |
| `services/offer-service` | Offers, lifecycle state machine, categories, public listing, customer reports, admin moderation, offer projection outbox + dispatcher. Port 8082. Schema `offer_service`. |
| `services/discovery-service` | PostGIS read model `offer_projections`; nearby search with category filter. JdbcTemplate SQL. Port 8083. Schema `discovery_service`. |
| `services/api-gateway` | Dependency-free Node 20 HTTP proxy routing `/api/{vendors,offers,discovery,auth}` with a timeout (`GATEWAY_PROXY_TIMEOUT_MS`, 10s in Compose). Port 3000. |
| `frontend` | React 19 + Vite. `src/main.jsx` (customer + vendor portals, App), `src/AdminPortal.jsx`, `src/ui.jsx` (shared components), `src/api.js` (fetch client), `src/lib/*.js` (pure helpers with `node --test` tests). nginx (`frontend/nginx.conf`) serves the SPA and proxies `/api/` to the gateway. |
| `compose.yaml` | Local stack (PostGIS + 4 services + gateway + web on :5173). |
| `compose.prod.yaml` | Production override: secrets from `.env.prod`, no internal ports published, JVM heap caps, Caddy on 80/443. |
| `deploy/Caddyfile` | Caddy reverse proxy to `customer-web:80`; `SITE_ADDRESS` env decides HTTP vs automatic HTTPS. |
| `infra/aws/` | Terraform for the single-host deployment (EC2, EIP, security group, optional IAM role and budget). `user_data.sh.tftpl` bootstraps the instance. |
| `scripts/smoke-test.mjs` | End-to-end journey test (9 checks) through the public web origin. |
| `docs/api/*.md` | Endpoint contracts. Keep them updated when APIs change. |
| `docs/decisions/` | ADRs. ADR-033 covers verification, lifecycle, and moderation. |
| `docs/deploy/AWS_DEPLOYMENT.md` | Human deployment and operations guide (including Learner Lab notes). |
| `docs/status/PROJECT_STATUS.md` | Project status. Update after verified milestones. |
| `tasks/DN-0xx-*.md` | One file per completed task, with changes and verification. |

---

## 3. What was built in the last work session (DN-033 to DN-039)

1. **DN-033 JWT expiry.** identity issues `iat` + `exp` (TTL from `JWT_TTL_SECONDS`,
   default 3600) and returns `expiresAt`. All three JWT filters (identity, vendor,
   offer) reject tokens whose `exp` is missing, non-numeric, or in the past.
   discovery compares projection tokens with `MessageDigest.isEqual`. Frontend
   discards expired tokens and signs out on a 401 or at expiry.
2. **DN-034 Categories.** `OfferCategory` enum, `V5` migration (existing rows become
   `OTHER`). Optional on create and edit. `category` is carried in the outbox
   event and discovery `V3`. Filters: `GET /api/offers/public?category=`,
   `GET /api/discovery/offers?category=`.
3. **DN-035 Lifecycle.** `Offer.Status` = `DRAFT, PUBLISHED, PAUSED, EXPIRED, REMOVED`.
   Endpoints `/publish /pause /resume /unpublish /expire`. Invalid transitions →
   `409 INVALID_OFFER_TRANSITION`. Going offline records
   `offer.projection.removed.v1`; going live records `offer.projection.updated.v1`.
4. **DN-036 Customer details.** Public listing filters `storeId` and `ids` (max 50),
   using JPA Specifications in `PublicOfferSpecifications`. Offers whose store
   has no public summary are filtered out instead of failing the page. UI adds
   an offer-detail modal, browse-all, and saved offers resolved to titles.
5. **DN-037 Admin and verification.** `ADMIN` role; `AdminBootstrap` creates the
   first admin from `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`
   (password of 12+ characters, created only if the email is unused). vendor `V4`
   adds `verification_status`; pre-existing stores are grandfathered as
   `VERIFIED`. Admin endpoints live under `/api/vendors/admin/stores`. Publish
   and resume require a `VERIFIED` store (`409 STORE_NOT_VERIFIED`, checked
   through vendor-service with the vendor's own token). Public store summaries
   return only verified stores. discovery `V4` adds `store_active`, which both
   offer and store projection events carry.
6. **DN-038 Reports and moderation.** offer `V6`: `offer_reports` (unique per
   offer + reporter) and `offers.moderation_note`. `POST /api/offers/{id}/reports`
   (CUSTOMER; 201 when new, 200 when repeated). ADMIN endpoints under
   `/api/offers/admin/...` list reports, dismiss, and remove an offer (sets it
   `REMOVED`, emits the removal event, and closes open reports as `ACTIONED`).
7. **DN-039 UI.** Admin portal, vendor verification badges and lifecycle buttons,
   shared UI split into `ui.jsx`, frontend tests running in CI.

Infrastructure fixes from the same session:
- `STORE_PROJECTION_DISPATCHER_ENABLED` was on the wrong Compose service; it now
  sits on vendor-service.
- `VITE_API_URL` was being passed at runtime, where Vite ignores it. The web
  build now uses an empty value and nginx proxies `/api`.
- nginx must listen on IPv6 too (`listen [::]:80`), otherwise the
  `wget localhost` health check fails.
- The gateway timeout was raised from 3s to 10s because each JVM endpoint's
  first request after startup can exceed 3s.

Role enforcement is applied **twice**: URL rules in each `SecurityConfig` plus
`@PreAuthorize` on the controllers. Keep both when adding endpoints.

---

## 4. Build and test commands (Windows machine)

Maven is not on PATH; use the cached wrapper distribution with JDK 21. JDK 25 is
the default `java` and will not work for these builds.

```bash
# Git Bash
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-21.0.10.7-hotspot"
MVN=~/.m2/wrapper/dists/apache-maven-3.9.9-bin/33b4b2b4/apache-maven-3.9.9/bin/mvn
cd services/offer-service && $MVN -q -B -o test   # -o works now that deps are cached
grep -h "Tests run" target/surefire-reports/*.txt
```

Expected counts: identity 16, vendor 20, offer 40 (39 + 1 metrics test),
discovery 5 (4 + 1).

```bash
cd services/api-gateway && npm test     # 4 tests
cd frontend && npm test && npm run build   # 7 tests (src/lib/*.test.js)
```

Test notes:
- Java tests use H2 in PostgreSQL mode with `ddl-auto=create-drop`. **Flyway
  migrations are not exercised by unit tests**, so verify migrations with the
  Compose stack.
- discovery's SQL is PostGIS-specific and has no database tests; only
  `DiscoveryCategoriesTest` (pure logic) runs. Verify discovery changes with the
  smoke test.
- Test JWTs are built with the `token(subject, role, expEpochSeconds)` helper in
  `StoreControllerTest` and `OfferControllerTest`, signed with `test-secret`.
- offer tests mock `StoreOwnershipVerifier` (`ownedStoreVerificationStatus` →
  `"VERIFIED"` by default) and `StoreSummaryClient`.

---

## 5. Local stack and end-to-end test

```bash
docker compose up -d --build --wait        # Docker Desktop must be running
node scripts/smoke-test.mjs                # defaults: http://localhost:5173, admin@dealnear.local / local-admin-password
docker compose down                        # data persists in volume dealnear-postgres-data
```

- If a build fails with `frontend grpc server closed unexpectedly` or a Docker
  Hub TLS timeout, it is transient. Rerun with `COMPOSE_PARALLEL_LIMIT=2`.
- The first smoke-test run right after startup can hit cold-JVM latency; a rerun passes.
- The local admin credentials exist only in `compose.yaml` (local development).

---

## 6. Live AWS deployment (current)

| Item | Value |
| --- | --- |
| Account type | AWS Academy **Learner Lab** (temporary credentials, `voclabs` role) |
| Region | `us-east-1` (Learner Lab allows only us-east-1 / us-west-2) |
| EC2 instance | `i-0f2a91720272ca31a`, `t3.medium`, AZ `us-east-1f`, Name `dealnear-demo` |
| Elastic IP | `54.85.39.197` |
| URL | `https://54-85-39-197.sslip.io` (sslip.io wildcard DNS; Caddy has a Let's Encrypt certificate) |
| App directory | `/opt/dealnear` (git clone of `https://github.com/manavPatelM/DealNear.git`, `main`, public repo) |
| Secrets | `/opt/dealnear/.env.prod` (mode 600, generated on first boot; holds the DB password, JWT secret, projection token, and admin email + password). **Never print or commit these values.** |
| Bootstrap log | `/var/log/dealnear-bootstrap.log` (ends with `DealNear bootstrap finished`) |
| Terraform state | `infra/aws/terraform.tfstate` on the user's PC (git-ignored, **do not delete**) |
| tfvars | `infra/aws/terraform.tfvars` (git-ignored): `region="us-east-1"`, `existing_instance_profile="LabInstanceProfile"`, `budget_email=""` |

Learner Lab constraints already handled in Terraform:
- **No IAM role creation.** `existing_instance_profile` skips `aws_iam_role` and
  uses `LabInstanceProfile`.
- **Not every AZ offers t3.** `aws_ec2_instance_type_offerings` restricts subnet choice.
- **Budgets are likely blocked.** Leave `budget_email` empty.
- **Credentials expire each lab session.** The user pastes the "AWS CLI"
  block into `%USERPROFILE%\.aws\credentials`. `%USERPROFILE%\.aws\config` sets
  `region = us-east-1`.
- **The instance stops when the lab session ends** and restarts with the next
  session. Docker is enabled at boot and containers use `restart: unless-stopped`.
  A full stop/start cycle has **not yet been verified**.

Tools on the PC (installed with winget): AWS CLI 2.38.1 and Terraform 1.16.5.
In PowerShell, refresh PATH first:
`$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`

### Running commands on the server (no SSH)
Use SSM Run Command with a **JSON parameters file**. Inline `--parameters` quoting
breaks in PowerShell. Also set UTF-8, or the CLI crashes on non-ASCII output.

```powershell
$env:PYTHONUTF8 = '1'; [Console]::OutputEncoding = [Text.Encoding]::UTF8
# cmd.json: {"commands": ["cd /opt/dealnear", "docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod ps"]}
$id = aws ssm send-command --instance-ids i-0f2a91720272ca31a --document-name AWS-RunShellScript --parameters file://C:/path/cmd.json --query 'Command.CommandId' --output text
aws ssm get-command-invocation --command-id $id --instance-id i-0f2a91720272ca31a --query 'StandardOutputContent' --output text
```

To smoke-test the live site without exposing the admin password, run the test
on the server, reading credentials from `.env.prod` inside the command:

```
ADMIN_EMAIL=$(grep '^ADMIN_BOOTSTRAP_EMAIL=' .env.prod | cut -d= -f2-); ADMIN_PASSWORD=$(grep '^ADMIN_BOOTSTRAP_PASSWORD=' .env.prod | cut -d= -f2-)
docker run --rm -v /opt/dealnear/scripts:/s:ro -e BASE_URL=https://54-85-39-197.sslip.io -e ADMIN_EMAIL=$ADMIN_EMAIL -e ADMIN_PASSWORD=$ADMIN_PASSWORD node:20-alpine node /s/smoke-test.mjs
```

### Deploying a code change
Push to `main`, then on the server:
```
cd /opt/dealnear && git pull && COMPOSE_PARALLEL_LIMIT=2 docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --build
```
Take a `pg_dump` first if the change includes migrations (command in
`docs/deploy/AWS_DEPLOYMENT.md`).

### Network pitfalls on the user's machine
- The user's campus network **blocks or intercepts traffic to the EC2 IP** on both
  80 and 443. The site works from other networks, so test through SSM on the
  server, not with curl from the PC.
- DNS lookups to AWS endpoints fail intermittently (`no such host`, connect
  timeouts). Retry Terraform and AWS CLI commands before diagnosing further.

---

## 6b. ECS Fargate deployment (also live)

A second, per-microservice deployment runs on ECS Fargate (`infra/aws-ecs`, own
Terraform state). See `docs/deploy/AWS_ECS_DEPLOYMENT.md`.

- URL: `http://dealnear-ecs-1949389295.us-east-1.elb.amazonaws.com` (reachable from the user's network).
- Cluster `dealnear-ecs`: 6 ECS services, 6 ECR repos `dealnear/<service>`, RDS
  `dealnear-ecs-postgres`, Secrets Manager secret `dealnear-ecs-app-*`.
- Services call each other through the **internal ALB** (one listener per port),
  because Learner Lab denies Cloud Map. CloudFront is also denied, so there's no HTTPS.
- In PowerShell, quote Terraform targets (`'-target=aws_ecr_repository.service'`).
  ECR login must not be piped through PowerShell 5 (use `cmd /c` or Bash).
- The web image now uses `frontend/nginx.conf.template` (`API_UPSTREAM`, `DNS_RESOLVER` env).

## 7. Conventions to follow

- Error envelope `{ "error": { "code", "message" } }` (ADR-032), with stable
  UPPER_SNAKE codes. Add a handler in that service's `ApiExceptionHandler`.
- API changes are additive. Breaking changes need `/api/v2`. Event names keep
  the `.v1` suffix; add only optional fields, and consumers must default missing
  ones (see `storeActiveOrDefault`, `DiscoveryCategories.projected`).
- Services never read each other's tables. Cross-service data flows over HTTP
  with timeouts or through outbox events.
- Each schema change gets a new Flyway file `V<n>__*.sql`. Never edit an applied
  migration.
- Pagination: `page >= 0`, `1 <= size <= 50`.
- Every new task adds a `tasks/DN-0xx-*.md` file, updates `docs/api/*` and
  `docs/status/PROJECT_STATUS.md`, and reports the commands actually run.

---

## 8. Known limitations

- Single EC2 host: no high availability, and the database shares the instance.
  Images are built on the server.
- No refresh tokens; no browser (Playwright) UI tests; no central logging or metrics dashboards.
- Public listing `totalElements` can count offers whose store was revoked after
  publishing (they are filtered from the page body).
- Store details expose only name and city (ADR-014). Showing the address needs
  an ADR amendment the user must approve.
- No "restore" for removed offers and no "reopen" for resolved reports.

---

## 9. Suggested next tasks (ask the user before starting each)

1. **DN-040:** GitHub Actions builds and scans images and pushes them to ECR;
   the server pulls instead of building. Check whether Learner Lab allows ECR and
   GitHub OIDC; it may need the lab's temporary keys as repository secrets.
2. **Verify** a lab stop/start cycle brings the stack back with no manual steps.
3. **DN-041:** Playwright E2E tests for the three portals, run in CI.
4. **DN-042:** CloudWatch logs and metrics, with alarms.
5. **Later:** RDS for PostgreSQL/PostGIS, Secrets Manager, ECS Fargate or EKS,
   and Terraform state in S3.

Any AWS change costs Learner Lab credit and requires explicit user approval
(`AGENTS.md` cloud-cost rules). `terraform destroy` deletes the instance and
**all its data**.
