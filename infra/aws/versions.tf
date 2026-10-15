terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }

  # Local state is fine for a single-person demo environment. For shared use, move state to
  # an S3 bucket with locking before anyone else runs apply.
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "dealnear"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
