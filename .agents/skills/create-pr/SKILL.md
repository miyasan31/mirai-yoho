---
name: create-pr
description: ローカルの変更内容を確認し、Conventional Commits 形式でコミットして GitHub に push し、PR を作成する。Use when the user asks to create a PR, open a pull request, publish current changes, or run the repository's PR creation workflow.
---

# Create PR

ローカル変更から GitHub Pull Request を作成してください。変更の把握、検証、コミット、push、PR 本文作成までを一貫して扱います。

## 手順

1. 状態を確認する:
   - `git status --short`
   - `git branch --show-current`
   - `git diff --stat`
   - 必要に応じて `git diff` と `git diff --cached`
2. 変更の所有権を分ける:
   - ユーザーが作った可能性がある無関係な変更は巻き込まない
   - 自分が今回触ったファイルだけを stage 対象にする
   - 既に stage 済みの変更がある場合は内容を確認し、タスクと無関係なら触らない
3. 検証する:
   - 変更規模に応じて `pnpm lint`、`pnpm test`、`pnpm build`、または対象ファイルに近いテストを選ぶ
   - API エンドポイントを追加・変更した場合は `openapi.yaml` を更新して `pnpm generate` を実行する
   - `src/generated/api/` と `src/generated/schemas/` は手動編集しない
4. コミットする:
   - `git add <files>` で対象ファイルだけ stage する
   - コミットメッセージは Conventional Commits 形式にする
   - 例: `feat: add booking calendar view`、`fix: handle empty forecast result`
5. push する:
   - 現在のブランチに upstream がなければ `git push -u origin <branch>`
   - 既に upstream があれば `git push`
6. PR 本文を作成する:
   - `.github/PULL_REQUEST_TEMPLATE.md` を必ず読む
   - テンプレートの見出しとチェックリストを維持して、変更内容に合わせて本文を埋める
   - 該当しない項目は削除せず、理由が必要なら短く補足する
7. PR を作成する:
   - 既存 PR がないか `gh pr view` で確認する
   - PR タイトルは `type(scope): 日本語の要約` 形式にする
   - 新規作成はテンプレートから作った本文を使って `gh pr create --draft --title "<title>" --body-file <body-file>`
   - ユーザーが draft 以外を明示した場合だけ ready PR にする

## PR タイトル

PR タイトルは Conventional Commits に合わせた `type(scope): 日本語の要約` 形式にしてください。

- `type`: `feat`、`fix`、`refactor`、`docs`、`test`、`chore` など
- `scope`: 変更対象の機能領域を英小文字の kebab-case または既存の短い領域名で書く
- 要約: 日本語で、ユーザーに見える変更または技術的な変更内容を簡潔に書く

例:

- `feat(admin): 管理画面に〇〇機能を追加`
- `fix(consultant): 相談員のアバター登録機能を修正`
- `refactor(search): 検索機能をリファクタリング`

## PR 本文

本文は `.github/PULL_REQUEST_TEMPLATE.md` を正とします。PR 作成前に必ず読み、テンプレートを埋めた本文を一時ファイルなどに保存して `--body-file` で渡してください。

## 注意点

- domain 層に Firebase、Stripe などの外部 SDK import を入れない
- `any` 型を使わない
- ファイル名と URL パスは kebab-case を守る
- 作業中に見つけた無関係な差分は revert しない
- 破壊的な git 操作は、ユーザーが明示した場合を除いて実行しない
