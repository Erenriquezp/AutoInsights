# The public demo: a private S3 bucket and CloudFront for the dashboard, and the API on Lambda
# behind a Function URL that only CloudFront can call (docs/adr/0003-serverless-hosting.md).
#
#   ../modules/frontend   bucket, CloudFront distribution, origin access, security headers
#   ../modules/api        Lambda function, Function URL, IAM role, log group, SSM parameters
#
# The two modules point at each other (CloudFront needs the Function URL as an origin; the
# function needs the distribution ARN to allow it), which Terraform resolves per resource.

locals {
  name = "${var.project}-${var.environment}"
}

module "api" {
  source = "../modules/api"

  name                 = local.name
  package_path         = var.api_package_path
  distribution_arn     = module.frontend.distribution_arn
  reserved_concurrency = var.api_reserved_concurrency
  environment          = var.api_environment
}

module "frontend" {
  source = "../modules/frontend"

  name              = local.name
  api_origin_domain = module.api.function_url_domain
}
