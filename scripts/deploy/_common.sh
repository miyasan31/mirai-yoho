#!/usr/bin/env bash
# ローカルデプロイ用の共通ヘルパ（.github/workflows/deploy-*.yml のローカル代替）

set -euo pipefail

parse_env_arg() {
  local env="${1:-}"
  case "$env" in
    dev|prod) ;;
    *)
      echo "Usage: $0 <dev|prod>" >&2
      exit 2
      ;;
  esac
  printf '%s' "$env"
}

require_repo_root() {
  local root
  root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -z "$root" ]; then
    echo "Error: not inside a git repository" >&2
    exit 1
  fi
  cd "$root"
}

warn_if_dirty() {
  if [ -n "$(git status --porcelain)" ]; then
    echo "!! working tree has uncommitted changes — deploying current tree state" >&2
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: '$cmd' is required but not found in PATH" >&2
    exit 1
  fi
}

load_env_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "Error: $file not found" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  . "$file"
  set +a
}

verify_secrets_have_values() {
  local project="$1"
  shift
  local secrets=("$@")
  local missing=()
  local s
  local enabled
  for s in "${secrets[@]}"; do
    enabled="$(gcloud secrets versions list "$s" \
      --project "$project" \
      --filter='state=ENABLED' \
      --format='value(name)' \
      --limit=1 2>/dev/null || true)"
    if [ -z "$enabled" ]; then
      echo "  NG: $s"
      missing+=("$s")
    else
      echo "  OK: $s"
    fi
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    echo "Error: Secret Manager secrets without an enabled 'latest' version in $project: ${missing[*]}" >&2
    echo "Populate them first, e.g.:" >&2
    echo "  make setup-secrets-from-env:${project##*-} PROJECT=$project" >&2
    echo "  make setup-secret:${project##*-} KEY=<SECRET_NAME>" >&2
    exit 1
  fi
}
