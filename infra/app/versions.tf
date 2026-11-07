terraform {
  required_version = ">= 1.10, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.72"
    }
  }

  # Remote state in the bucket created by ../bootstrap. Bucket and region come from backend.hcl
  # (terraform init -backend-config=backend.hcl). Locking uses S3 itself: no DynamoDB table.
  backend "s3" {
    key          = "app/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}
