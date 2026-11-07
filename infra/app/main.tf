# The public demo: a private S3 bucket and CloudFront for the dashboard, and the API on Lambda
# behind a Function URL that only CloudFront can call (docs/adr/0003-serverless-hosting.md).
#
# Planned modules, each added with its resources and reviewed with `terraform plan`:
#   ../modules/frontend   private bucket, CloudFront distribution, Origin Access Control
#   ../modules/api        Lambda function, Function URL, IAM role, log group, SSM parameter
