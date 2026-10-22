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

resource "random_password" "db" {
  length  = 32
  special = false
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
  secret_string = jsonencode({
    DATABASE_PASSWORD        = random_password.db.result
    JWT_SECRET               = random_password.jwt.result
    PROJECTION_TOKEN         = random_password.projection.result
    ADMIN_BOOTSTRAP_PASSWORD = random_password.admin.result
  })
}

resource "aws_db_subnet_group" "db" {
  name       = "${local.name}-db"
  subnet_ids = data.aws_subnets.default.ids
}

# One PostgreSQL instance; each service owns its own schema and Flyway history and never
# touches another service's tables. discovery-service enables PostGIS through its migration.
resource "aws_db_instance" "postgres" {
  identifier              = "${local.name}-postgres"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  storage_type            = "gp3"
  storage_encrypted       = true
  db_name                 = "dealnear"
  username                = "dealnear"
  password                = random_password.db.result
  db_subnet_group_name    = aws_db_subnet_group.db.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  publicly_accessible     = false
  multi_az                = false
  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true
}

resource "aws_cloudwatch_log_group" "service" {
  for_each          = local.services
  name              = "/ecs/${local.name}/${each.key}"
  retention_in_days = var.log_retention_days
}
