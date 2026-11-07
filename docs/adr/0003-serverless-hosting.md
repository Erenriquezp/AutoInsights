# 0003. Serverless hosting on AWS within always-free limits

- **Status:** Proposed
- **Date:** 2026-11-07

## Context

The live demo will see little and irregular traffic (recruiters, reviewers). It must stay online for
months at **$0**, with no servers to patch. AWS changed its free tier for accounts created after
July 2025: a Free plan with up to $200 in credits for 6 months, after which the account must move to
the Paid plan to stay open. Always-free allowances (for example Lambda's 1M requests and 400,000
GB-seconds per month) continue on both plans. The design therefore has to rely on always-free
allowances, not on credits.

## Decision

- **Frontend:** static Vite build in a private S3 bucket, served by CloudFront with Origin Access Control.
- **API:** FastAPI on AWS Lambda (via Mangum), exposed through a **Lambda Function URL** that only
  CloudFront can call (OAC), routed on `/api/*`. No API Gateway.
- **Data:** the gold Parquet tables (a few MB) are bundled in the Lambda package. Refreshing data
  means a redeploy, which is fine for a static dataset.
- **Abuse limits:** reserved concurrency on the Lambda, per-IP and daily limits in the app, a cap on
  LLM tokens per request.
- **Observability:** CloudWatch logs with 7-day retention. An AWS Budgets alarm at $1.
- **Secrets:** the LLM API key in SSM Parameter Store (standard tier, free).

## Alternatives considered

| Option | Why not |
|---|---|
| API Gateway HTTP API | Its free allowance is time-limited; a Function URL behind CloudFront covers the need at $0 |
| ECS Fargate / App Runner | Billed per hour even with zero traffic; needs a load balancer |
| EC2 / Lightsail | A server to patch and keep running; free only during a limited period |
| Gold data in S3, read at runtime | Works, but adds S3 requests and IAM for data that fits in the package |
| Vercel/Netlify + a PaaS backend | Free, but does not show AWS and IaC skills |

## Consequences

- Cost is near zero when idle and stays within always-free allowances at demo traffic.
- Cold starts of a second or more on the first request; acceptable for a demo, mitigated by a small package.
- DuckDB plus dependencies must fit the Lambda zip limit (250 MB unzipped); a container image is the fallback.
- A full `terraform destroy` removes everything, so the demo can be taken down at any time.

## Open questions

- Account plan: an existing account, or a new one that moves to the Paid plan before the 6 months end.
- AWS region.
- Whether the account's concurrency quota allows reserved concurrency (new accounts can start with a low limit).
- Zip package or container image for the Lambda.
- Confirm current always-free figures for CloudFront and S3 on the official AWS pricing pages before deploying.
