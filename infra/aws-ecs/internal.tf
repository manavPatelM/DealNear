# Internal (VPC-only) load balancer used for service-to-service calls.
# AWS Academy Learner Lab denies Cloud Map (servicediscovery:*), so ECS Service Connect and
# DNS-based discovery are unavailable; one listener per service port gives each microservice
# a stable private address plus health-checked routing.
resource "aws_security_group" "internal_alb" {
  name        = "${local.name}-internal-alb"
  description = "DealNear internal service load balancer"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Service calls from ECS tasks"
    from_port       = 3000
    to_port         = 8084
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id]
  }

  egress {
    description = "To ECS tasks"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "services_from_internal_alb" {
  type                     = "ingress"
  description              = "Service ports from the internal load balancer"
  security_group_id        = aws_security_group.services.id
  source_security_group_id = aws_security_group.internal_alb.id
  from_port                = 3000
  to_port                  = 8084
  protocol                 = "tcp"
}

resource "aws_lb" "internal" {
  name               = "${local.name}-internal"
  load_balancer_type = "application"
  internal           = true
  security_groups    = [aws_security_group.internal_alb.id]
  subnets            = data.aws_subnets.default.ids
  idle_timeout       = 30
}

locals {
  internal_services = { for k, s in local.services : k => s if s.internal }
}

resource "aws_lb_target_group" "internal" {
  for_each    = local.internal_services
  name        = "${local.name}-i-${replace(each.key, "-service", "")}"
  port        = each.value.port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.default.id

  deregistration_delay = 10

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "internal" {
  for_each          = local.internal_services
  load_balancer_arn = aws_lb.internal.arn
  port              = each.value.port
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.internal[each.key].arn
  }
}
