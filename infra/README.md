# Infrastructure

Terraform for the public demo on AWS, designed to run on always-free allowances
([ADR 0002](../docs/adr/0002-terraform-for-infrastructure.md),
[ADR 0003](../docs/adr/0003-serverless-hosting.md)).

```
infra/
  bootstrap/   one-time account setup: remote state bucket and a $1 cost budget (local state)
  app/         the demo itself: frontend bucket + CloudFront, API on Lambda (S3 remote state)
  modules/     reusable pieces used by app/ (added with the resources)
  .tflint.hcl  lint rules for every stack
  check.sh     static checks, no AWS credentials needed
```

## Static checks (local, free)

Every check runs in a Docker image pinned by digest, without AWS credentials, so it cannot
create or read anything in an AWS account. CI runs the same script.

```bash
bash infra/check.sh
```

| Check | What it catches |
|---|---|
| `terraform fmt -check` | formatting drift |
| `terraform validate` | syntax, types, provider schema (with `-backend=false`) |
| `tflint` | unused or undocumented declarations, naming, AWS rules such as invalid instance types |
| `trivy config` | security misconfigurations (public buckets, missing encryption, open policies) |

Findings that are accepted on purpose are ignored inline next to the resource, with the reason
(for example: a customer-managed KMS key would cost $1 per month).

Provider versions are locked in `.terraform.lock.hcl` for Linux, macOS and Windows. To upgrade:
change the version constraint, then run `terraform providers lock` with the same platforms.

## Deploying (only after the checks pass and the plan is approved)

Nothing below is automated: each step is run by hand and its `plan` is read before `apply`.

### 1. Account hygiene (console, once)

1. Turn on MFA for the root user, and stop using root.
2. Create a non-root identity: an IAM Identity Center user with a permission set (free), then
   `aws configure sso` and `aws sso login`. No long-lived access keys on disk.
3. Check the account's plan (Free or Paid) and its creation date; the design relies only on
   always-free allowances, never on credits.

### 2. Bootstrap (state bucket and budget)

```bash
cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars    # set budget_email
terraform init
terraform plan -out=bootstrap.tfplan            # read it
terraform apply bootstrap.tfplan
terraform output -raw backend_config > ../app/backend.hcl
```

Confirm the budget alert subscription in the email AWS sends. The state bucket has
`prevent_destroy`: removing it is a deliberate, manual act.

### 3. App

```bash
cd infra/app
terraform init -backend-config=backend.hcl
terraform plan -out=app.tfplan                  # read it
terraform apply app.tfplan
```

`terraform destroy` in `app/` removes the whole demo; the bootstrap stays so the state history
is kept.

## Costs

| Resource | Price | Why it is $0 here |
|---|---|---|
| S3 state bucket | per GB and request | a few KB, a handful of requests per apply |
| State locking | | S3 native lock file, no DynamoDB table |
| AWS Budgets | first two budgets free | one budget |
| Encryption | SSE-S3 is free | no KMS key |
