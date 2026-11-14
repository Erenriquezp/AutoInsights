# Offline tests of the app stack: the AWS provider is mocked, so no credentials, no API calls and
# no cost. `apply` runs here only build an in-memory state from mocked values.
#
#   bash infra/check.sh        (runs `terraform -chdir=app test` among the other checks)

mock_provider "aws" {
  # Mocked values are random strings, but the provider still validates arguments that take a
  # policy or an ARN, so those get realistic values
  mock_resource "aws_iam_role" {
    defaults = {
      arn = "arn:aws:iam::123456789012:role/mock"
    }
  }

  mock_resource "aws_cloudfront_function" {
    defaults = {
      arn = "arn:aws:cloudfront::123456789012:function/mock"
    }
  }

  mock_resource "aws_cloudfront_distribution" {
    defaults = {
      arn         = "arn:aws:cloudfront::123456789012:distribution/MOCK"
      domain_name = "d111111abcdef8.cloudfront.net"
    }
  }

  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
}

variables {
  name             = "autoinsights-test"
  package_path     = "tests/fixtures/api.zip"
  distribution_arn = "arn:aws:cloudfront::123456789012:distribution/EXAMPLE"
}

# ---------------------------------------------------------------- API module

run "api_only_answers_the_distribution" {
  command = apply

  module {
    source = "../modules/api"
  }

  override_resource {
    target = aws_lambda_function_url.api
    values = {
      function_url = "https://abc123.lambda-url.us-east-1.on.aws/"
    }
  }

  assert {
    condition     = aws_lambda_function_url.api.authorization_type == "AWS_IAM"
    error_message = "The Function URL must reject unsigned requests."
  }

  assert {
    condition = (
      aws_lambda_permission.cloudfront_url.action == "lambda:InvokeFunctionUrl" &&
      aws_lambda_permission.cloudfront_invoke.action == "lambda:InvokeFunction"
    )
    error_message = "CloudFront's origin access control needs both invoke permissions."
  }

  assert {
    condition = alltrue([
      for permission in [aws_lambda_permission.cloudfront_url, aws_lambda_permission.cloudfront_invoke] :
      permission.principal == "cloudfront.amazonaws.com" && permission.source_arn == var.distribution_arn
    ])
    error_message = "Only the one CloudFront distribution may invoke the function."
  }

  assert {
    condition     = output.function_url_domain == "abc123.lambda-url.us-east-1.on.aws"
    error_message = "The CloudFront origin must be the bare Function URL host name."
  }
}

run "api_runtime_settings" {
  command = plan

  module {
    source = "../modules/api"
  }

  assert {
    condition = (
      aws_lambda_function.api.runtime == "python3.13" &&
      aws_lambda_function.api.architectures == tolist(["arm64"]) &&
      aws_lambda_function.api.handler == "lambda_handler.handler" &&
      aws_lambda_function.api.timeout == 15 &&
      aws_lambda_function.api.reserved_concurrent_executions == -1
    )
    error_message = "Runtime, architecture, handler, timeout or concurrency differ from the design."
  }

  assert {
    condition     = aws_cloudwatch_log_group.api.retention_in_days == 7
    error_message = "Logs are kept for 7 days."
  }

  assert {
    condition = (
      aws_lambda_function.api.environment[0].variables["CLIENT_IP_HEADER"] == "cloudfront-viewer-address" &&
      aws_lambda_function.api.environment[0].variables["GROQ_API_KEY_PARAM"] == "/autoinsights-test/groq-api-key" &&
      aws_lambda_function.api.environment[0].variables["GEMINI_API_KEY_PARAM"] == "/autoinsights-test/gemini-api-key"
    )
    error_message = "The function must read the visitor address from CloudFront and its keys from SSM."
  }

  assert {
    condition     = alltrue([for value in values(aws_lambda_function.api.environment[0].variables) : value != ""])
    error_message = "Leave a setting out instead of setting it empty (Lambda may reject empty values)."
  }

  assert {
    condition = alltrue([
      for name in keys(aws_lambda_function.api.environment[0].variables) : !endswith(name, "_API_KEY")
    ])
    error_message = "API keys never go in the Lambda environment."
  }

  assert {
    condition     = alltrue([for parameter in aws_ssm_parameter.key : parameter.type == "SecureString"])
    error_message = "Keys are stored encrypted."
  }

  assert {
    condition = (
      toset(data.aws_iam_policy_document.api.statement[0].actions) == toset(["logs:CreateLogStream", "logs:PutLogEvents"]) &&
      toset(data.aws_iam_policy_document.api.statement[1].actions) == toset(["ssm:GetParameters"]) &&
      length(data.aws_iam_policy_document.api.statement) == 2
    )
    error_message = "The role may only write its logs and read its parameters."
  }
}

run "api_rejects_keys_in_the_environment" {
  command = plan

  module {
    source = "../modules/api"
  }

  variables {
    environment = { GROQ_API_KEY = "gsk_example" }
  }

  expect_failures = [var.environment]
}

run "api_timeout_fits_the_cloudfront_origin_timeout" {
  command = plan

  module {
    source = "../modules/api"
  }

  variables {
    timeout_seconds = 60
  }

  expect_failures = [var.timeout_seconds]
}

# ---------------------------------------------------------------- frontend module

run "frontend_routes_and_access" {
  command = apply

  module {
    source = "../modules/frontend"
  }

  variables {
    api_origin_domain = "abc123.lambda-url.us-east-1.on.aws"
  }

  assert {
    condition = alltrue([
      aws_s3_bucket_public_access_block.site.block_public_acls,
      aws_s3_bucket_public_access_block.site.block_public_policy,
      aws_s3_bucket_public_access_block.site.ignore_public_acls,
      aws_s3_bucket_public_access_block.site.restrict_public_buckets,
    ])
    error_message = "The dashboard bucket is private; only CloudFront reads it."
  }

  assert {
    condition = (
      toset(one([for s in data.aws_iam_policy_document.site.statement : s if s.sid == "AllowCloudFrontRead"]).actions) == toset(["s3:GetObject"]) &&
      toset(one(one([for s in data.aws_iam_policy_document.site.statement : s if s.sid == "AllowCloudFrontRead"]).condition).values) == toset([aws_cloudfront_distribution.site.arn])
    )
    error_message = "The bucket policy must allow reads only to this distribution."
  }

  assert {
    condition = (
      one([for o in aws_cloudfront_distribution.site.origin : o if o.origin_id == "api"]).domain_name == var.api_origin_domain &&
      one([for o in aws_cloudfront_distribution.site.origin : o if o.origin_id == "api"]).origin_access_control_id == aws_cloudfront_origin_access_control.api.id &&
      aws_cloudfront_origin_access_control.api.origin_access_control_origin_type == "lambda" &&
      aws_cloudfront_origin_access_control.site.origin_access_control_origin_type == "s3"
    )
    error_message = "Each origin must be reached through its own origin access control."
  }

  assert {
    condition = (
      aws_cloudfront_distribution.site.ordered_cache_behavior[0].path_pattern == "/api/*" &&
      aws_cloudfront_distribution.site.ordered_cache_behavior[0].target_origin_id == "api" &&
      aws_cloudfront_distribution.site.ordered_cache_behavior[0].cache_policy_id == data.aws_cloudfront_cache_policy.disabled.id &&
      contains(aws_cloudfront_distribution.site.ordered_cache_behavior[0].allowed_methods, "POST")
    )
    error_message = "/api/* must go to the Function URL, uncached, with POST allowed."
  }

  # API errors (404 for an unknown model, 429 for the rate limit) must reach the browser as
  # JSON: no SPA rewrite on /api/* and no distribution-wide custom error pages
  assert {
    condition = (
      length(aws_cloudfront_distribution.site.ordered_cache_behavior[0].function_association) == 0 &&
      length(aws_cloudfront_distribution.site.custom_error_response) == 0 &&
      one(aws_cloudfront_distribution.site.default_cache_behavior[0].function_association).function_arn == aws_cloudfront_function.spa_rewrite.arn
    )
    error_message = "Only the dashboard's routes are rewritten to index.html."
  }

  assert {
    condition = alltrue([
      aws_cloudfront_distribution.site.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https",
      aws_cloudfront_distribution.site.ordered_cache_behavior[0].viewer_protocol_policy == "redirect-to-https",
    ])
    error_message = "Plain HTTP is redirected to HTTPS."
  }

  assert {
    condition = (
      contains(aws_cloudfront_origin_request_policy.api.headers_config[0].headers[0].items, "CloudFront-Viewer-Address") &&
      contains(aws_cloudfront_origin_request_policy.api.headers_config[0].headers[0].items, "x-amz-content-sha256") &&
      !contains([for h in aws_cloudfront_origin_request_policy.api.headers_config[0].headers[0].items : lower(h)], "host") &&
      aws_cloudfront_origin_request_policy.api.cookies_config[0].cookie_behavior == "none"
    )
    error_message = "The API gets the viewer address and body hash, never Host or cookies."
  }

  assert {
    condition     = startswith(aws_cloudfront_response_headers_policy.security.security_headers_config[0].content_security_policy[0].content_security_policy, "default-src 'self'")
    error_message = "The dashboard is served with a same-origin content security policy."
  }
}

# ---------------------------------------------------------------- the whole stack

run "app_stack_plans" {
  command = plan

  module {
    source = "./"
  }

  variables {
    api_package_path = "tests/fixtures/api.zip"
  }

  assert {
    condition     = output.ssm_parameters == { groq = "/autoinsights-prod/groq-api-key", gemini = "/autoinsights-prod/gemini-api-key" }
    error_message = "Resources are named <project>-<environment>."
  }
}
