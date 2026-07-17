#!/bin/bash
# WorktreeCreate フック: worktree を用意し、pnpm install / pnpm generate を実行する。
# 契約: stdout には worktree の絶対パスのみを出力する(JSON・複数行・メッセージは不可)。
# メッセージは stderr へ、詳細ログは ~/.claude/worktree-setup.log へ出力する。
set -u

input=$(cat)
log="$HOME/.claude/worktree-setup.log"

# stdin のスキーマ差異に対応: worktree_path(実測)/ worktree_details(ドキュメント)の両対応
path=$(jq -r '.worktree_path // empty' <<<"$input")
if [ -z "$path" ]; then
  path=$(jq -r '(.worktree_details // empty) | select(.base_path and .worktree_name) | "\(.base_path)/\(.worktree_name)"' <<<"$input")
fi
if [ -z "$path" ]; then
  echo "WorktreeCreate hook: stdin から worktree パスを特定できませんでした: $input" >&2
  exit 1
fi

repo="${CLAUDE_PROJECT_DIR:-$(jq -r '.cwd // empty' <<<"$input")}"

echo "=== $(date '+%Y-%m-%d %H:%M:%S') $path ===" >"$log"

# ディレクトリが無ければ worktree を作成する(過去の失敗で残った stale 登録は先に prune)
if [ ! -d "$path" ]; then
  git -C "$repo" worktree prune >>"$log" 2>&1
  branch=$(basename "$path")
  if git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$repo" worktree add "$path" "$branch" >>"$log" 2>&1
  else
    git -C "$repo" worktree add -b "$branch" "$path" main >>"$log" 2>&1
  fi
  if [ ! -d "$path" ]; then
    echo "git worktree add に失敗しました: $log を確認してください" >&2
    exit 1
  fi
fi

# 新しい worktree の mise.toml は未信頼のため prepare(husky)が落ちる。先に trust する
if command -v mise >/dev/null 2>&1 && [ -f "$path/mise.toml" ]; then
  mise trust "$path/mise.toml" >>"$log" 2>&1
fi

# セットアップ失敗でも worktree 自体は使えるため、作成は成功扱いのまま stderr で通知する
if ! (cd "$path" && pnpm install && pnpm generate) >>"$log" 2>&1; then
  echo "pnpm install / pnpm generate に失敗しました。$log を確認し、worktree 内で手動実行してください" >&2
fi

echo "$path"
