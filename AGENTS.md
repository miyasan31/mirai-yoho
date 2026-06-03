# Arc - 未来予報 開発ルール

## アーキテクチャ
- 軽量DDD。domain / application / infrastructure / app(presentation) の4層
- domain 層は外部依存ゼロ（firebase / stripe 等を import しない）
- 集約をまたぐ処理は application 層の UseCase が責任を持つ

## 命名規則
- ファイル名はすべて kebab-case（例: booking-status.ts）
- Repository Interface / Service Interface にファイル名のプレフィックスは付けない
- URL パスも kebab-case（Google URL 構造ガイドライン準拠）
- export 名は PascalCase（コンポーネント、クラス）/ camelCase（関数、変数）

## 技術スタック
- Next.js App Router / TypeScript / Firestore / Stripe / Zoom / Resend
- フォーム: React Hook Form + Valibot
- UI: ParkUI / カレンダー: react-big-calendar
- テスト: Vitest + React Testing Library
- Lint/Format: Biome
- API クライアント生成: Orval（OpenAPI → React Query hooks）

## API クライアント生成（Orval）
- OpenAPI スペック: `openapi.yaml`（プロジェクトルート）
- 設定: `orval.config.ts`
- 生成先: `src/generated/api/`（hooks）、`src/generated/schemas/`（型）
- カスタム fetch: `src/generated/custom-fetch.ts`
- 生成コマンド: `pnpm generate`
- API エンドポイントを追加・変更したら `openapi.yaml` を更新してから `pnpm generate` を実行する
- `src/generated/api/` と `src/generated/schemas/` は自動生成のため手動編集しない
- `src/generated/custom-fetch.ts` は手動管理ファイル

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
- `src/generated/api/` や `src/generated/schemas/` を手動編集しない（`pnpm generate` で再生成される）
