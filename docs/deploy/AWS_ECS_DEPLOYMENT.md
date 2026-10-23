# DealNear on AWS ECS Fargate (one service per microservice)

`infra/aws-ecs` deploys each microservice as its own Amazon ECS service on Fargate,
built from its own image in Amazon ECR. The single-host EC2 setup in `infra/aws`
is separate and unaffected.

```
Internet ── HTTP ──▶ Public ALB ── /      ──▶ customer-web (ECS service)
                                 └ /api/* ──▶ api-gateway  (ECS service)
                                                   │
                          Internal ALB (VPC only, one listener per service port)
          :8084 identity-service · :8081 vendor-service · :8082 offer-service · :8083 discovery-service
                                                   │
      4 × Amazon RDS PostgreSQL 16, one per service (discovery with PostGIS), private

Images: Amazon ECR (6 repos) · Logs: CloudWatch (log group per service)
Secrets: AWS Secrets Manager (each task receives only the keys it needs)
```

## AWS services used

| Service | Resources |
| --- | --- |
| Amazon ECS (Fargate) | Cluster `dealnear-ecs`; 6 services and 6 task definitions; 1 task each |
| Amazon ECR | `dealnear/{identity-service,vendor-service,offer-service,discovery-service,api-gateway,customer-web}` with scan on push |
| Elastic Load Balancing | Public ALB (routes `/` and `/api/*`); internal ALB for service-to-service calls; 7 target groups with health checks |
| Amazon RDS | `dealnear-ecs-{identity,vendor,offer,discovery}-db`: one db.t3.micro per microservice, encrypted, private |
| AWS Secrets Manager | One secret with a DB password per service, JWT secret, projection token, admin password |
| Amazon CloudWatch Logs | `/ecs/dealnear-ecs/<service>`, 3-day retention |
| Amazon VPC | Default VPC, 4 security groups (public ALB, internal ALB, tasks, database) |
| AWS IAM | Existing `LabRole` as task execution and task role |

Security groups: only the public ALB accepts internet traffic (port 80). Tasks accept
traffic only from the two load balancers and each other. Each RDS instance accepts 5432 only from its own service's
security group (database per service, ADR-035). Tasks have public IPs solely so they can pull from ECR without a NAT gateway;
inbound access is still blocked by the security group.

## Learner Lab constraints and the workarounds used

| Blocked in Learner Lab | Effect | Workaround |
| --- | --- | --- |
| IAM role creation | No custom task roles | `task_role_name = "LabRole"` |
| Cloud Map (`servicediscovery:*`) | No private DNS discovery or ECS Service Connect | Internal ALB with a listener per service port |
| CloudFront (`CreateDistribution`, `List*Policies`) | No free HTTPS URL | `enable_cloudfront = false`; serve over the ALB's HTTP URL |

On a normal AWS account, set `enable_cloudfront = true` for HTTPS. Cloud Map could
then replace the internal ALB.

## Deploy from scratch (PowerShell, from the repo root)

```powershell
cd infra/aws-ecs
terraform init
terraform apply '-target=aws_ecr_repository.service'   # quote -target in PowerShell
cd ../..
powershell -ExecutionPolicy Bypass -File scripts/push-images.ps1
cd infra/aws-ecs
terraform apply
```

Wait 2–3 minutes for the Java services to become healthy, then open `app_url`.

Verify the deployment end to end:
```bash
BASE_URL=<app_url> ADMIN_EMAIL=admin@dealnear.local ADMIN_PASSWORD=<from secret> PROJECTION_WAIT_MS=60000 node scripts/smoke-test.mjs
```
The admin password is the `ADMIN_BOOTSTRAP_PASSWORD` key; the `admin_password_command` output prints the secret.

## Update one microservice
```powershell
docker build --platform linux/amd64 -t <ecr-repo-url>:latest services/offer-service
docker push <ecr-repo-url>:latest
aws ecs update-service --cluster dealnear-ecs --service offer-service --force-new-deployment
```
Only that service restarts; the others keep running.

## Cost (us-east-1, approximate)
About US$6.5 a day: Fargate 6 tasks (~US$3), two ALBs (~US$1.2), 4 × RDS db.t3.micro
(~US$1.8), task public IPv4 (~US$0.7). `terraform destroy` in `infra/aws-ecs`
removes everything, including the database and images.

## Verified 2026-10-22
All 6 ECS services running and all 7 target groups healthy; `scripts/smoke-test.mjs`
passed 9/9 against the public ALB URL.
