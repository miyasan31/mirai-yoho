---
name: plan-worktree
description: プランモードで実装を始めるときに、必ず main ブランチを基点として git worktree を作成または再利用し、その worktree 上で作業を開始する
user_invocable: true
---

# Plan Worktree

プランモードで実装作業を始める場合は、この手順を最初に実行してください。

## 手順

1. 現在位置を確認する
   - `git branch --show-current`
   - `git status --short`
2. `main` ブランチの存在を確認する
   - `git show-ref --verify --quiet refs/heads/main`
   - ローカルに `main` がない場合は、以後の作業を止めて状況を報告する
3. 作業ブランチ名を決める
   - ユーザー指定があればそれを使う
   - 未指定なら作業内容に沿った kebab-case のブランチ名を提案または採用する
4. worktree の場所を決める
   - 標準パスは `.worktrees/<branch-name>`
5. 既存の worktree を確認する
   - `git worktree list` で対象パスまたは対象ブランチが既にあるか確認する
   - 既にあれば再利用する
6. worktree を作成する
   - 既存ブランチがなければ `main` を基点に `git worktree add .worktrees/<branch-name> -b <branch-name> main`
   - 既存ブランチがあって未作成なら `git worktree add .worktrees/<branch-name> <branch-name>`
7. 依存関係とコード生成をセットアップする
   - 新規 worktree では先に `mise trust <worktree>/mise.toml` を実行する（未信頼のままだと pnpm install 中の prepare = husky が失敗する）
   - worktree ディレクトリで `pnpm install` と `pnpm generate` を実行する
   - 既存 worktree を再利用する場合も同様に実行する（冪等なので安全）
8. 作業ディレクトリを切り替える
   - 以後のファイル確認、編集、テスト、コミットはその worktree を `cwd` として実行する

## ルール

- `main` 以外の現在ブランチを基点に新しい worktree を作らない
- 現在チェックアウト中のディレクトリでそのまま実装を始めない
- ユーザーが明示しない限り、既存 worktree の削除や `git worktree prune` は実行しない
- worktree の作成先は原則 `.worktrees/` 配下に統一する
