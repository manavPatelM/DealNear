# Deploying DealNear to AWS (single EC2 host)

This puts the whole stack (PostgreSQL/PostGIS, four Spring Boot services, the
gateway, the web app, and Caddy for HTTPS) on one EC2 instance using the same
Compose files used locally. It is the cheapest way to get a live demo. It is
**not** highly available: one instance, with the database on its own disk.

```
Internet ──80/443──▶ Caddy ─▶ customer-web (nginx) ─/api─▶ api-gateway ─▶ services ─▶ PostgreSQL
                     └──────────────── one EC2 instance (t3.medium) ────────────────┘
```

## What it costs (ap-south-1, on-demand, approximate)

| Resource | Monthly |
| --- | --- |
| EC2 t3.medium (24/7) | ~US$33 |
| 30 GB gp3 EBS | ~US$3 |
| Public IPv4 (Elastic IP) | ~US$3.6 |
| Data transfer (light demo traffic) | ~US$0–2 |
| **Total** | **~US$40/month** |

Charges run while the instance exists, even with no visitors. `terraform destroy`
stops them. Set `budget_email` so AWS emails you at 80% of the monthly budget.

## What Terraform creates (`infra/aws`)

- A security group allowing only ports 80 and 443 (no SSH; shell access uses SSM Session Manager).
- An IAM role with only `AmazonSSMManagedInstanceCore`.
- An Amazon Linux 2023 EC2 instance with an encrypted 30 GB gp3 disk, IMDSv2 only.
- An Elastic IP, so the address survives reboots.
- Optional: a monthly AWS Budget with email alerts.

On first boot, `user_data.sh.tftpl` installs Docker, clones the repo, **generates
random secrets** into `/opt/dealnear/.env.prod` (mode 600, never leaves the
instance), and runs
`docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --build`.

## Step-by-step

### 1. One-time AWS setup (console)
1. Create an AWS account, then turn on MFA for the root user.
2. Create a deployment identity with permission to manage EC2, IAM roles,
   and Budgets. The simplest option is IAM Identity Center with the
   `AdministratorAccess` permission set, used only from your machine.
3. Install the tools:
   - AWS CLI v2: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
   - Terraform ≥ 1.6: https://developer.hashicorp.com/terraform/install
4. Sign in from a terminal: `aws configure sso` (Identity Center) or
   `aws configure` (access keys). Check with `aws sts get-caller-identity`.

### 2. Publish the code the server will clone
The instance runs `git clone` on `repo_url`/`repo_branch` (default:
`https://github.com/manavPatelM/DealNear.git`, `main`). Commit and push these changes:

```bash
git add -A
git commit -m "Complete MVP and add AWS deployment"
git push origin main
```

If the repository is private, use a fine-grained read-only GitHub token in the
URL (`https://<token>@github.com/...`) in `terraform.tfvars`. Note that this token
then ends up in the Terraform state and the instance user data.

### 3. Create the infrastructure
```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars   # edit budget_email, region, etc.
terraform init
terraform plan        # review: about 6-7 resources to add
terraform apply       # type "yes"
```

Outputs: `app_url`, `public_ip`, `instance_id`, `admin_password_command`.

### 4. Wait for the first boot (about 10–15 minutes)
Images are built on the instance. To watch progress:
EC2 console → Instances → `dealnear-demo` → **Connect** → **Session Manager** → Connect, then:

```bash
sudo tail -f /var/log/dealnear-bootstrap.log      # ends with "DealNear bootstrap finished"
cd /opt/dealnear && sudo docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod ps
```

### 5. Sign in as admin and verify the deployment
In the same Session Manager shell:
```bash
sudo grep ADMIN_BOOTSTRAP /opt/dealnear/.env.prod
```
Open `app_url`, go to the **Admin** tab, and sign in with that email and password.

Optional: run the end-to-end check from your machine. It creates and then removes test data:
```bash
BASE_URL=http://<public_ip> ADMIN_EMAIL=<email> ADMIN_PASSWORD=<password> node scripts/smoke-test.mjs
```

### 6. Add a domain and HTTPS (strongly recommended before real users)
Until you do this, passwords travel over plain HTTP.
1. In your DNS provider (or Route 53), create an `A` record, e.g.
   `deals.example.com → <public_ip>`.
2. On the instance:
   ```bash
   cd /opt/dealnear
   sudo sed -i 's|^SITE_ADDRESS=.*|SITE_ADDRESS=deals.example.com|; s|^PUBLIC_ORIGIN=.*|PUBLIC_ORIGIN=https://deals.example.com|' .env.prod
   sudo docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d
   ```
   Caddy obtains a Let's Encrypt certificate automatically (port 80 must be reachable).
3. Set `domain_name` in `terraform.tfvars` as well, so the outputs match.

## Day-2 operations

**Deploy a new version** (Session Manager shell):
```bash
cd /opt/dealnear
sudo git pull
sudo COMPOSE_PARALLEL_LIMIT=2 docker compose -f compose.yaml -f compose.prod.yaml --env-file .env.prod up -d --build
```
Flyway applies new migrations on service start. Back up first (below).

**Back up the database:**
```bash
cd /opt/dealnear
sudo docker compose exec -T postgres pg_dump -U dealnear dealnear | gzip > ~/dealnear-$(date +%F).sql.gz
```
Copy dumps off the instance (e.g. to S3), or take an EBS snapshot from the EC2 console.

**Logs:** `sudo docker compose -f compose.yaml -f compose.prod.yaml logs -f --tail=100 <service>`

## Tear down (stops all charges)
```bash
cd infra/aws
terraform destroy
```
This **permanently deletes** the instance, its disk, and therefore the database,
all users, stores, and offers, plus the generated secrets. Take a `pg_dump` first
if you need the data.

## Known limitations of this setup
- Single instance: a reboot or instance failure means downtime; the database shares the instance.
- Images are built on the server, so each deploy takes several minutes and uses CPU credits.
- Secrets live in a root-only file on the instance, not in AWS Secrets Manager.
- Terraform state is local; keep `infra/aws/terraform.tfstate` safe and never commit it.

## Path to the target architecture (later milestones)
1. Build and scan images in GitHub Actions; push to ECR using GitHub OIDC (no long-lived keys).
2. Move PostgreSQL to RDS (PostGIS supported) with automated backups.
3. Move secrets to Secrets Manager/SSM Parameter Store.
4. Run services on ECS Fargate or EKS behind an ALB with ACM certificates; ship logs to CloudWatch.
5. Move Terraform state to S3 with locking.
