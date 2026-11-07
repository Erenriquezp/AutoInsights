#!/usr/bin/env bash
# Static checks for the Terraform code: fmt, validate, tflint, trivy. They run in pinned Docker
# images, get no AWS credentials and make no AWS calls, so they are free and safe to run anywhere.
#
#   bash infra/check.sh        # from the repo root (Git Bash, Linux, macOS, CI)
set -euo pipefail

export MSYS_NO_PATHCONV=1 # Git Bash on Windows would rewrite the container paths below
cd "$(dirname "$0")/.."

STACKS=(bootstrap app)

run() { docker compose --profile infra run --rm "$@"; }

echo "== terraform fmt"
run terraform fmt -check -recursive -diff

for stack in "${STACKS[@]}"; do
  echo "== terraform validate ($stack)"
  run terraform -chdir="$stack" init -backend=false -input=false -lockfile=readonly >/dev/null
  run terraform -chdir="$stack" validate
done

echo "== tflint"
run tflint --init --config=/infra/.tflint.hcl >/dev/null
run tflint --recursive --config=/infra/.tflint.hcl --format=compact

echo "== trivy config"
run trivy config --exit-code 1 --quiet /infra

echo "All infrastructure checks passed."
