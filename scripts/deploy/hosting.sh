#!/usr/bin/env bash
# ローカルから Firebase Hosting（user / console / consultant）へ 3 SPA を配信する。
# .github/workflows/deploy-hosting.yml のローカル代替。

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./_common.sh
. "$HERE/_common.sh"

ENV="$(parse_env_arg "${1:-}")"
require_repo_root
require_cmd pnpm
require_cmd gcloud

PROJECT_ID="mirai-yoho-$ENV"
ENV_FILE=".env.$ENV"

echo "==> Loading VITE_* from $ENV_FILE"
load_env_prefix_from_file "$ENV_FILE" "VITE_"

REQUIRED_VITE_VARS=(
  VITE_API_URL
  VITE_STRIPE_PUBLISHABLE_KEY
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
)
missing=()
for k in "${REQUIRED_VITE_VARS[@]}"; do
  if [ -z "${!k:-}" ]; then missing+=("$k"); fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "Error: missing keys in $ENV_FILE: ${missing[*]}" >&2
  exit 1
fi

warn_if_dirty

# 生成物（styled-system / packages/api-client/src/generated）が無いとビルドが失敗するため、
# CI と同じく install + generate を先に走らせる（up-to-date なら実質高速）。
echo "==> pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile
echo "==> pnpm generate"
pnpm generate

echo "==> Building user SPA"
pnpm --filter @mirai-yoho/user run build
echo "==> Building console SPA"
pnpm --filter @mirai-yoho/console run build
echo "==> Building consultant SPA"
pnpm --filter @mirai-yoho/consultant run build

echo "==> Deploying to Firebase Hosting ($PROJECT_ID)"
pnpm dlx firebase-tools deploy \
  --only hosting:user,hosting:console,hosting:consultant \
  --project "$PROJECT_ID" \
  --non-interactive

echo "==> Done: hosting deployed to $PROJECT_ID"
