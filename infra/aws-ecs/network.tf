locals {
  name = "dealnear-${var.environment}"
}

data "aws_vpc" "default" {
  default = true
}

# Fargate in us-east-1 supports every default subnet; RDS and the ALB need at least two AZs.
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# Public entry point. Only the load balancer accepts traffic from the internet.
resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "DealNear public load balancer"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP from the internet and CloudFront"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "To ECS tasks"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# All microservice tasks. They accept traffic only from the ALB and from each other.
resource "aws_security_group" "services" {
  name        = "${local.name}-services"
  description = "DealNear ECS tasks"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Web and gateway from the load balancer"
    from_port       = 80
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "Service-to-service calls inside the cluster"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # Tasks run in public subnets with public IPs to reach ECR and CloudWatch without a
  # NAT gateway (which would cost more than the whole demo). Inbound is still blocked
  # except from the ALB and other tasks.
  egress {
    description = "ECR, CloudWatch, Secrets Manager, RDS"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Identity-only security group per service, so a database can admit exactly one service.
resource "aws_security_group" "task" {
  for_each    = toset(local.service_names)
  name        = "${local.name}-${each.key}"
  description = "Identifies ${each.key} tasks (no rules of its own)"
  vpc_id      = data.aws_vpc.default.id
}

# One database security group per service: PostgreSQL only from that service's tasks.
resource "aws_security_group" "db" {
  for_each    = local.databases
  name        = "${local.name}-${each.value.db}-db"
  description = "${each.value.db} database: reachable only from ${each.key}"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "PostgreSQL from ${each.key} only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.task[each.key].id]
  }
}
