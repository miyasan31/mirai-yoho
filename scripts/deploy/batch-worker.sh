#!/usr/bin/env bash
# ローカルから Cloud Run Jobs（batch worker）へ 3 ジョブを配信する。
# .github/workflows/deploy-batch-worker.yml のローカル代替。
# ビルドは Cloud Build 上で走るのでローカルに Docker は不要。

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./_common.sh
. "$HERE/_common.sh"

ENV="$(parse_env_arg "${1:-}")"
require_repo_root
require_cmd gcloud
require_cmd git

PROJECT_ID="mirai-yoho-$ENV"
REGION="asia-northeast1"
IMAGE_TAG="$(git rev-parse HEAD)"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/batch-worker/worker:$IMAGE_TAG"

# terraform の worker_secret_names（infra/terraform/gcp/common/batch/main.tf）の
# 全コマンド和集合と一致させる。
REQUIRED_SECRETS=(
  FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY FIREBASE_PROJECT_ID
  RESEND_API_KEY RESEND_FROM_EMAIL STRIPE_SECRET_KEY
  LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL CONSOLE_APP_URL
)

JOBS=(
  batch-charge
  batch-consultation-reminders
  batch-late-arrival-alerts
)

warn_if_dirty

echo "==> Verifying Secret Manager secrets in $PROJECT_ID"
verify_secrets_have_values "$PROJECT_ID" "${REQUIRED_SECRETS[@]}"

echo "==> Building worker image via Cloud Build ($IMAGE)"
gcloud builds submit \
  --project="$PROJECT_ID" \
  --config=apps/api/cloudbuild.worker.yaml \
  --substitutions=_IMAGE="$IMAGE" \
  .

for job in "${JOBS[@]}"; do
  echo "==> Rolling Cloud Run job '$job' to new image"
  gcloud run jobs update "$job" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --image "$IMAGE"
done

echo "==> Done: batch worker deployed to $PROJECT_ID ($IMAGE_TAG)"
