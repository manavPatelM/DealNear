# A static list (not local.services) so repositories can be created before anything else.
resource "aws_ecr_repository" "service" {
  for_each             = toset(local.service_names)
  name                 = "dealnear/${each.key}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # demo environment: destroy removes images too

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Database per service: each microservice gets its own RDS instance, database, user and
# password. Only discovery uses PostGIS (enabled by its own Flyway migration).
locals {
  databases = {
    identity-service  = { db = "identity", user = "identity_svc", secret_key = "IDENTITY_DB_PASSWORD" }
    vendor-service    = { db = "vendor", user = "vendor_svc", secret_key = "VENDOR_DB_PASSWORD" }
    offer-service     = { db = "offer", user = "offer_svc", secret_key = "OFFER_DB_PASSWORD" }
    discovery-service = { db = "discovery", user = "discovery_svc", secret_key = "DISCOVERY_DB_PASSWORD" }
  }
}

resource "random_password" "db" {
  for_each = local.databases
  length   = 32
  special  = false
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "random_password" "projection" {
  length  = 32
  special = false
}

resource "random_password" "admin" {
  length  = 20
  special = false
}

# One secret holding all generated credentials; each task gets only the keys it needs.
resource "aws_secretsmanager_secret" "app" {
  name_prefix             = "${local.name}-app-"
  description             = "DealNear generated credentials"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode(merge(
    { for svc, d in local.databases : d.secret_key => random_password.db[svc].result },
    {
      JWT_SECRET               = random_password.jwt.result
      PROJECTION_TOKEN         = random_password.projection.result
      ADMIN_BOOTSTRAP_PASSWORD = random_password.admin.result
    }
  ))
}

resource "aws_db_subnet_group" "db" {
  name       = "${local.name}-db"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "service" {
  for_each                = local.databases
  identifier              = "${local.name}-${each.value.db}-db"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  storage_type            = "gp3"
  storage_encrypted       = true
  db_name                 = each.value.db
  username                = each.value.user
  password                = random_password.db[each.key].result
  db_subnet_group_name    = aws_db_subnet_group.db.name
  vpc_security_group_ids  = [aws_security_group.db[each.key].id]
  publicly_accessible     = false
  multi_az                = false
  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true
  tags                    = { Service = each.key }
}

resource "aws_cloudwatch_log_group" "service" {
  for_each          = local.services
  name              = "/ecs/${local.name}/${each.key}"
  retention_in_days = var.log_retention_days
}
