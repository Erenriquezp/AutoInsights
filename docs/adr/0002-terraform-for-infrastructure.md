# 0002. Terraform for infrastructure as code

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

v2 deploys an S3 bucket, a CloudFront distribution, a Lambda function with a Function URL and IAM
roles. These must be reproducible, reviewable in pull requests and fully removable (`destroy`), so
the public demo costs nothing and leaves nothing behind. The project is also evidence of
infrastructure skills for job applications.

## Decision

Use Terraform (open-source CLI, free).

- **State:** S3 backend with S3 native state locking (`use_lockfile = true`, Terraform 1.10+). No
  DynamoDB table.
- **Checks before any cloud call, all local and free:** `terraform fmt -check`, `terraform validate`,
  `tflint`, `trivy config`.
- **Flow:** local checks -> `terraform plan` reviewed -> `apply` only after explicit approval. In CI,
  `plan` runs on pull requests and `apply` sits behind a protected environment with manual approval,
  using GitHub OIDC (no long-lived AWS keys).

## Alternatives considered

| Option | Why not |
|---|---|
| AWS CDK (Python) | Valid, same language as the backend, but AWS-only and its synthesized diff is harder to review in a PR than a `plan` |
| AWS SAM / Serverless Framework | Good for Lambda, weaker for CloudFront, buckets and IAM as a whole |
| HCP Terraform for state | Free tier works, but adds an external account; S3 state stays inside the same AWS account |
| LocalStack to emulate AWS | Now requires an account and auth token; not needed for static checks and `plan` |
| ClickOps in the console | Not reproducible, not reviewable, easy to leave billable resources behind |

## Consequences

- One tool that is common in job postings and works across clouds.
- `plan` output documents every infrastructure change.
- The state bucket is bootstrapped once by hand (or a tiny bootstrap stack).
- There is no local emulation of AWS; confidence comes from static checks, `plan`, and testing the
  application itself locally.
