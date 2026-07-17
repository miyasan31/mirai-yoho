#!/bin/bash
# WorktreeCreate フック: worktree を作成し、pnpm install / pnpm generate を実行する。
# 契約: stdin は {"name": "<branch>"} 、stdout は worktree の絶対パスのみ。他の出力は stderr へ。
set -eu

name=$(jq -r '.name' <<<"$(cat)")
path="$CLAUDE_PROJECT_DIR/.worktrees/$name"

if [ ! -d "$path" ]; then
  git -C "$CLAUDE_PROJECT_DIR" worktree add -b "$name" "$path" main 1>&2
fi

# 未信頼の mise.toml があると pnpm install 中の prepare(husky)が落ちる
mise trust "$path/mise.toml" 1>&2 || true

# セットアップ失敗でも worktree は使えるため、作成は成功扱いにする
(cd "$path" && pnpm install && pnpm generate) 1>&2 ||
  echo "pnpm install / pnpm generate に失敗しました。worktree 内で手動実行してください" >&2

echo "$path"
