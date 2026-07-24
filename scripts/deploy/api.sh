#!/usr/bin/env bash
# ローカルから Cloud Run（api service）へ API サーバーを配信する。
# .github/workflows/deploy-api.yml のローカル代替。
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
SERVICE="api"
IMAGE_TAG="$(git rev-parse HEAD)"
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/api/api:$IMAGE_TAG"

# terraform の api_secret_ids（infra/terraform/gcp/common/api/main.tf）と一致させる。
REQUIRED_SECRETS=(
  API_URL USER_APP_URL CONSOLE_APP_URL CANCEL_TOKEN_SECRET
  CORS_ALLOWED_ORIGINS FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY FIREBASE_PROJECT_ID
  FIREBASE_STORAGE_BUCKET INVOICE_REGISTRATION_NUMBER LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL
  RESEND_API_KEY RESEND_FROM_EMAIL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET
  ZOOM_ACCOUNT_ID ZOOM_CLIENT_ID ZOOM_CLIENT_SECRET ZOOM_HOST_USER_ID
  ZOOM_USER_OAUTH_CLIENT_ID ZOOM_USER_OAUTH_CLIENT_SECRET ZOOM_OAUTH_STATE_SECRET
  ZOOM_CREDENTIAL_ENCRYPTION_KEY
)

warn_if_dirty

echo "==> Verifying Secret Manager secrets in $PROJECT_ID"
verify_secrets_have_values "$PROJECT_ID" "${REQUIRED_SECRETS[@]}"

echo "==> Building API image via Cloud Build ($IMAGE)"
gcloud builds submit \
  --project="$PROJECT_ID" \
  --config=apps/api/cloudbuild.yaml \
  --substitutions=_IMAGE="$IMAGE" \
  .

echo "==> Rolling Cloud Run service '$SERVICE' to new image"
gcloud run services update "$SERVICE" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE"

echo "==> Done: API deployed to $PROJECT_ID ($IMAGE_TAG)"
