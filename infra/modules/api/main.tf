# The API: FastAPI on Lambda (arm64, zip package with the gold tables), a Function URL that only
# accepts requests signed by CloudFront, its logs, its role and the parameters for the LLM keys.

locals {
  # Parameter per hosted-model key. Terraform writes a placeholder once (write-only: never in the
  # state); the owner sets the real value with `aws ssm put-parameter --overwrite`.
  secrets = {
    groq   = "GROQ_API_KEY"
    gemini = "GEMINI_API_KEY"
  }
  placeholder = "not-set" # backend/cloud_secrets.py treats it as "no key"

  environment = merge(
    {
      # No CORS_ORIGINS: behind CloudFront the dashboard is same-origin, and the Origin header
      # is not forwarded to the API, so CORS never applies
      HOME             = "/tmp" # the only writable directory on Lambda
      CLIENT_IP_HEADER = "cloudfront-viewer-address"
      LLM_PROVIDER     = "fallback"
    },
    { for key, env in local.secrets : "${env}_PARAM" => aws_ssm_parameter.key[key].name },
    var.environment,
  )
}

# ---------------------------------------------------------------- secrets

# SecureString with the AWS managed key (aws/ssm): free, unlike a customer-managed KMS key
resource "aws_ssm_parameter" "key" {
  for_each = local.secrets

  name             = "/${var.name}/${each.key}-api-key"
  description      = "API key for ${each.key}, read by the API at cold start. Set with aws ssm put-parameter --overwrite."
  type             = "SecureString"
  tier             = "Standard"
  value_wo         = local.placeholder
  value_wo_version = 1
}

# ---------------------------------------------------------------- logs

# Encryption with a customer-managed KMS key (AWS-0017) costs $1 per month per key; CloudWatch
# already encrypts log data at rest.
#trivy:ignore:AVD-AWS-0017
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = var.log_retention_days
}

# ---------------------------------------------------------------- permissions

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "${var.name}-api"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# Least privilege: write to its own log group and read its own two parameters. Decrypting with
# the AWS managed key is granted by that key's policy for calls made through SSM.
data "aws_iam_policy_document" "api" {
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.api.arn}:*"]
  }

  statement {
    sid       = "ReadOwnKeys"
    actions   = ["ssm:GetParameters"]
    resources = [for parameter in aws_ssm_parameter.key : parameter.arn]
  }
}

resource "aws_iam_role_policy" "api" {
  name   = "api"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}

# ---------------------------------------------------------------- function

# X-Ray tracing (AWS-0066) is not used: the app logs latency per request, and logs are enough
# for a demo.
#trivy:ignore:AVD-AWS-0066
resource "aws_lambda_function" "api" {
  function_name    = var.name
  description      = "AutoInsights API (FastAPI + DuckDB over the bundled gold tables)"
  role             = aws_iam_role.api.arn
  runtime          = "python3.13"
  architectures    = ["arm64"]
  handler          = "lambda_handler.handler"
  filename         = var.package_path
  source_code_hash = filebase64sha256(var.package_path)
  memory_size      = var.memory_mb
  timeout          = var.timeout_seconds

  reserved_concurrent_executions = var.reserved_concurrency

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.api.name
  }

  environment {
    variables = local.environment
  }

  depends_on = [aws_iam_role_policy.api]
}

# AWS_IAM: only signed requests are accepted, and only CloudFront (below) may sign for it
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "AWS_IAM"
  invoke_mode        = "BUFFERED"
}

# CloudFront's origin access control needs both permissions, scoped to the one distribution
resource "aws_lambda_permission" "cloudfront_url" {
  statement_id           = "AllowCloudFrontInvokeFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = var.distribution_arn
  function_url_auth_type = "AWS_IAM"
}

resource "aws_lambda_permission" "cloudfront_invoke" {
  statement_id  = "AllowCloudFrontInvokeFunction"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "cloudfront.amazonaws.com"
  source_arn    = var.distribution_arn
}
