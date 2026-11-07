terraform {
  # 1.10+ for S3 native state locking (use_lockfile), used by the app stack
  required_version = ">= 1.10, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.72"
    }
  }

  # The bootstrap stack creates the remote state bucket, so its own state stays local
  # (terraform.tfstate in this folder, git-ignored). Everything it creates can be re-imported.
}
