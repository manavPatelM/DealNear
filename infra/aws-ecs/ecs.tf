data "aws_iam_role" "task" {
  name = var.task_role_name
}

locals {
  service_names = ["identity-service", "vendor-service", "offer-service", "discovery-service", "api-gateway", "customer-web"]
  internal_url  = "http://${aws_lb.internal.dns_name}"
  db_url        = { for svc, d in local.databases : svc => "jdbc:postgresql://${aws_db_instance.service[svc].address}:5432/${d.db}?sslmode=require" }
  secret        = aws_secretsmanager_secret.app.arn
  java_opts     = "-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"

  # Each microservice is its own image, task definition, and ECS service. Services call
  # each other through the internal ALB (Learner Lab blocks Cloud Map service discovery).
  # internal = true registers the service behind the internal ALB on its own port.
  services = {
    identity-service = {
      port   = 8084, cpu = 512, memory = 1024, public = false, internal = true
      health = "curl -fsS http://localhost:8084/health || exit 1"
      env = {
        DATABASE_URL    = local.db_url["identity-service"], DATABASE_USERNAME = "identity_svc", DATABASE_SCHEMA = "identity_service"
        JWT_TTL_SECONDS = "3600", ADMIN_BOOTSTRAP_EMAIL = var.admin_email, JAVA_TOOL_OPTIONS = local.java_opts
      }
      secrets = ["DATABASE_PASSWORD=IDENTITY_DB_PASSWORD", "JWT_SECRET", "ADMIN_BOOTSTRAP_PASSWORD"]
    }
    vendor-service = {
      port   = 8081, cpu = 512, memory = 1024, public = false, internal = true
      health = "curl -fsS http://localhost:8081/health || exit 1"
      env = {
        DATABASE_URL                        = local.db_url["vendor-service"], DATABASE_USERNAME = "vendor_svc"
        DISCOVERY_SERVICE_URL               = "${local.internal_url}:8083"
        STORE_PROJECTION_DISPATCHER_ENABLED = "true", JAVA_TOOL_OPTIONS = local.java_opts
      }
      secrets = ["DATABASE_PASSWORD=VENDOR_DB_PASSWORD", "JWT_SECRET", "VENDOR_PROJECTION_TOKEN=PROJECTION_TOKEN"]
    }
    offer-service = {
      port   = 8082, cpu = 512, memory = 1024, public = false, internal = true
      health = "curl -fsS http://localhost:8082/health || exit 1"
      env = {
        DATABASE_URL                  = local.db_url["offer-service"], DATABASE_USERNAME = "offer_svc", DATABASE_SCHEMA = "offer_service"
        VENDOR_SERVICE_URL            = "${local.internal_url}:8081"
        DISCOVERY_SERVICE_URL         = "${local.internal_url}:8083"
        PROJECTION_DISPATCHER_ENABLED = "true", JAVA_TOOL_OPTIONS = local.java_opts
      }
      secrets = ["DATABASE_PASSWORD=OFFER_DB_PASSWORD", "JWT_SECRET", "VENDOR_PROJECTION_TOKEN=PROJECTION_TOKEN",
      "DISCOVERY_PROJECTION_TOKEN=PROJECTION_TOKEN"]
    }
    discovery-service = {
      port   = 8083, cpu = 512, memory = 1024, public = false, internal = true
      health = "curl -fsS http://localhost:8083/health || exit 1"
      env = {
        DATABASE_URL      = local.db_url["discovery-service"], DATABASE_USERNAME = "discovery_svc", DATABASE_SCHEMA = "discovery_service"
        JAVA_TOOL_OPTIONS = local.java_opts
      }
      secrets = ["DATABASE_PASSWORD=DISCOVERY_DB_PASSWORD", "DISCOVERY_PROJECTION_TOKEN=PROJECTION_TOKEN"]
    }
    api-gateway = {
      port   = 3000, cpu = 256, memory = 512, public = true, internal = true
      health = "wget -q --spider http://127.0.0.1:3000/health || exit 1"
      env = {
        IDENTITY_SERVICE_URL     = "${local.internal_url}:8084"
        VENDOR_SERVICE_URL       = "${local.internal_url}:8081"
        OFFER_SERVICE_URL        = "${local.internal_url}:8082"
        DISCOVERY_SERVICE_URL    = "${local.internal_url}:8083"
        GATEWAY_PROXY_TIMEOUT_MS = "10000", CORS_ORIGIN = local.public_url
      }
      secrets = []
    }
    customer-web = {
      port   = 80, cpu = 256, memory = 512, public = true, internal = false
      health = "wget -q --spider http://127.0.0.1/ || exit 1"
      env = {
        # The ALB routes /api/* to the gateway directly; this proxy is a fallback.
        API_UPSTREAM = "${local.internal_url}:3000", DNS_RESOLVER = "169.254.169.253"
      }
      secrets = []
    }
  }
}

resource "aws_ecs_cluster" "main" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "disabled" # enable for per-task metrics; it adds CloudWatch cost
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

resource "aws_ecs_task_definition" "service" {
  for_each                 = local.services
  family                   = "${local.name}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = data.aws_iam_role.task.arn
  task_role_arn            = data.aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name         = each.key
    image        = "${aws_ecr_repository.service[each.key].repository_url}:${var.image_tag}"
    essential    = true
    portMappings = [{ containerPort = each.value.port, protocol = "tcp" }]
    environment  = [for k, v in each.value.env : { name = k, value = v }]
    # "NAME=KEY" maps an env var to a differently named key in the shared secret.
    secrets = [for s in each.value.secrets : {
      name      = split("=", s)[0]
      valueFrom = "${local.secret}:${element(split("=", s), length(split("=", s)) - 1)}::"
    }]
    healthCheck = {
      command     = ["CMD-SHELL", each.value.health]
      interval    = 15
      timeout     = 5
      retries     = 4
      startPeriod = 120
    }
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service[each.key].name
        awslogs-region        = var.region
        awslogs-stream-prefix = each.key
      }
    }
  }])
}

resource "aws_ecs_service" "service" {
  for_each               = local.services
  name                   = each.key
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.service[each.key].arn
  desired_count          = 1
  launch_type            = "FARGATE"
  enable_execute_command = false
  # One task per service; the outbox dispatchers assume a single active instance for now.
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.services.id, aws_security_group.task[each.key].id]
    assign_public_ip = true
  }

  dynamic "load_balancer" {
    for_each = each.value.public ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.public[each.key].arn
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  dynamic "load_balancer" {
    for_each = each.value.internal ? [1] : []
    content {
      target_group_arn = aws_lb_target_group.internal[each.key].arn
      container_name   = each.key
      container_port   = each.value.port
    }
  }

  health_check_grace_period_seconds = 180

  depends_on = [aws_lb_listener.http, aws_lb_listener.internal, aws_secretsmanager_secret_version.app]
}
