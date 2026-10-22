resource "aws_lb" "main" {
  name               = local.name
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids
  idle_timeout       = 30
}

resource "aws_lb_target_group" "public" {
  for_each    = { for k, s in local.services : k => s if s.public }
  name        = "${local.name}-${each.key == "api-gateway" ? "gw" : "web"}"
  port        = each.value.port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = data.aws_vpc.default.id

  deregistration_delay = 10

  health_check {
    path                = each.key == "api-gateway" ? "/health" : "/"
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# The web app is the default; /api/* goes straight to the gateway service.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public["customer-web"].arn
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.public["api-gateway"].arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# CloudFront gives a free HTTPS URL (*.cloudfront.net) without a domain or certificate.
# AWS-managed policy IDs are fixed and documented. They are hardcoded because Learner Lab
# denies cloudfront:List*Policies, which the lookup data sources need.
locals {
  cache_policy_caching_disabled = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  origin_request_all_viewer     = "216adef6-5c7f-47e4-b989-5492eafa07d3" # Managed-AllViewer
}

resource "aws_cloudfront_distribution" "main" {
  count           = var.enable_cloudfront ? 1 : 0
  enabled         = true
  comment         = "DealNear ${var.environment}"
  price_class     = "PriceClass_100"
  is_ipv6_enabled = true

  origin {
    origin_id   = "alb"
    domain_name = aws_lb.main.dns_name

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "alb"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_policy_caching_disabled
    origin_request_policy_id = local.origin_request_all_viewer
    compress                 = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

locals {
  public_url = var.enable_cloudfront ? "https://${aws_cloudfront_distribution.main[0].domain_name}" : "http://${aws_lb.main.dns_name}"
}
