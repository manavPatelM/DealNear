terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Local state for a single-person demo. Move to S3 with locking before sharing.
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "dealnear"
      Environment = var.environment
      Stack       = "ecs"
      ManagedBy   = "terraform"
    }
  }
}
