# Arc - 未来予報 開発ルール

## リポジトリ構成（pnpm workspace モノレポ）
- `apps/user` … 顧客向け予約 SPA（Vite + TanStack Router、認証なし）
- `apps/console` … 管理者・相談員向けコンソール SPA（Vite + TanStack Router）
- `apps/api` … API サーバー（Next.js Route Handlers）+ batch worker。domain / application / infrastructure 層はここに置く
- `packages/api-client` … OpenAPI スペックと Orval 生成の React Query hooks
- `packages/ui` … Panda CSS preset（panda.preset.ts）と Park UI / Ark UI ベースの共有 UI コンポーネント
- `packages/shared` … フロントと API で共有する純粋ロジック

## アーキテクチャ
- 軽量DDD。domain / application / infrastructure / presentation の4層（apps/api 内）
- domain 層は外部依存ゼロ（firebase / stripe 等を import しない）。純粋ロジックの `@mirai-yoho/shared` のみ import 可
- 集約をまたぐ処理は application 層の UseCase が責任を持つ
- SPA → API は必ず `packages/api-client` の生成 hooks 経由で呼ぶ

## 命名規則
- ファイル名はすべて kebab-case（例: booking-status.ts）
- Repository Interface / Service Interface にファイル名のプレフィックスは付けない
- URL パスも kebab-case（Google URL 構造ガイドライン準拠）
- export 名は PascalCase（コンポーネント、クラス）/ camelCase（関数、変数）

## 技術スタック
- API: Next.js Route Handlers / TypeScript / Firestore / Stripe / Zoom / Resend
- SPA: Vite / TanStack Router（file-based routing, search params も Router で管理）
- フォーム: React Hook Form + Valibot
- UI: ParkUI（packages/ui）/ カレンダー: react-big-calendar
- テスト: Vitest + React Testing Library
- Lint/Format: Biome
- API クライアント生成: Orval（OpenAPI → React Query hooks）

## API クライアント生成（Orval）
- OpenAPI スペック: `packages/api-client/openapi.yaml`
- 設定: `packages/api-client/orval.config.ts`
- 生成先: `packages/api-client/src/generated/`（gitignore 済み、`pnpm generate` で再生成）
- カスタム fetch: `packages/api-client/src/custom-fetch.ts`（手動管理。各アプリが `configureApiClient()` で初期化する）
- API エンドポイントを追加・変更したら `openapi.yaml` を更新してから `pnpm generate` を実行する
- `packages/api-client/src/generated/` は自動生成のため手動編集しない

## コミットメッセージ規約
- Conventional Commits 形式を使用する（例: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`）
- commitlint + husky で自動検証される
- pre-commit フックで lint-staged（Biome）が実行される

## Worktree Rule
- プランモードで実装作業を始める場合は、必ず `main` ブランチを基点に `git worktree` を作成してから作業する
- 作業先は `.worktrees/<branch-name>` を標準とする
- 対象の worktree が既に存在する場合は再利用する
- 現在チェックアウト中の作業ブランチ上で直接実装を始めない
- 新しい作業ブランチは `main` から作成し、worktree 作成後はそのディレクトリを作業 `cwd` とする

## やってはいけないこと
- domain 層に firebase-admin や stripe を import しない
- 集約の外から集約メンバーを直接変更しない
- any 型を使わない
- `packages/api-client/src/generated/` や各パッケージの `styled-system/` を手動編集しない（`pnpm generate` で再生成される）
- SPA（apps/user, apps/console）から firebase-admin / stripe（サーバー SDK）/ domain 層を import しない
