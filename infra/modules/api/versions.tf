terraform {
  required_version = ">= 1.11, < 2.0" # write-only attributes (value_wo)

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
  }
}
