# SPA 分割アーキテクチャと移行手順

2026-07 に単一 Next.js アプリを 3 サービス構成へ分割した際のアーキテクチャと、リリースに必要な運用作業のメモ。

## 構成

```
                    ┌──────────────────────────────┐
 {hoge}.miraiyohou.com  →  apps/user   （Firebase Hosting / 静的 SPA）
 console.miraiyohou.com →  apps/console（Firebase Hosting / 静的 SPA）
                    │            │ fetch (CORS + Bearer token)
                    ▼            ▼
 api.miraiyohou.com     →  apps/api   （Firebase App Hosting / Next.js Route Handlers）
                                 │
                    Firestore / Stripe / Zoom / Resend / LINE WORKS
```

- SPA は Vite + TanStack Router（file-based routing）。データ取得は従来どおり Orval 生成の React Query hooks（`packages/api-client`）。
- 認証は Firebase Auth の ID token を `Authorization: Bearer` で送る方式のまま。SPA 分割後も変更なし。
- CORS は `apps/api/src/middleware.ts` が処理する。許可オリジンは env `CORS_ALLOWED_ORIGINS`（カンマ区切り）。

## 環境変数の変更点

### apps/api（App Hosting / Secret Manager）

| 旧 | 新 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `API_URL` | Cloud Scheduler の OIDC audience 検証 |
| （新規） | `CONSOLE_APP_URL` | LINE WORKS 通知内の管理画面リンク生成 |
| （新規） | `CORS_ALLOWED_ORIGINS` | CORS 許可オリジン |
| `NEXT_PUBLIC_FIREBASE_*` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 廃止（SPA 側 `VITE_*` へ移動） | - |

### SPA（ビルド時に GitHub Actions の environment vars から注入）

- `apps/user`: `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_CONSOLE_APP_URL`
- `apps/console`: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

## リリース前に必要な運用作業（コード外）

1. **Secret Manager**: `API_URL` / `CONSOLE_APP_URL` / `CORS_ALLOWED_ORIGINS` を dev/prod 両方に作成（`make setup-secrets`）。旧 `NEXT_PUBLIC_*` シークレットはリリース後に削除可。
2. **App Hosting backend の rootDir 変更**: 既存 backend の root directory を `apps/api` に変更する（Firebase コンソール → App Hosting → backend 設定）。
3. **Firebase Hosting サイト作成**（dev/prod 各プロジェクト）:
   ```bash
   firebase hosting:sites:create mirai-yoho-dev-user --project mirai-yoho-dev
   firebase hosting:sites:create mirai-yoho-dev-console --project mirai-yoho-dev
   # prod も同様
   ```
   サイト名は `.firebaserc` の targets と一致させる。
4. **カスタムドメイン**: Hosting 各サイトに `{hoge}.miraiyohou.com` / `console.miraiyohou.com` を、App Hosting backend に `api.miraiyohou.com` を割り当て、DNS を設定。
5. **GitHub Environments（dev / prod）の vars 追加**: `API_URL`, `CONSOLE_APP_URL`, `STRIPE_PUBLISHABLE_KEY`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`（`GCP_PROJECT_NUMBER` は既存）。
6. **github-deployer SA へ Hosting デプロイ権限付与**: `roles/firebasehosting.admin` を dev/prod プロジェクトで付与。
7. **Firebase Auth の Authorized domains** に `console.miraiyohou.com` を追加。
8. **Stripe / Zoom などの Webhook URL** は API ドメイン（api.miraiyohou.com）に変わるため、ドメイン切替時に Stripe ダッシュボードの webhook endpoint を更新。

## デプロイフロー

- `release/dev` / `release/prod` への push で:
  - `.github/workflows/deploy-hosting.yml` … SPA 2 つをビルドして Firebase Hosting にデプロイ
  - `.github/workflows/deploy-batch-worker.yml` … worker イメージビルド + Terraform apply
- API（App Hosting）は従来どおり App Hosting の GitHub 連携（release ブランチ）でデプロイ。

## 開発メモ

- ローカルは `pnpm dev:api`（:3000）+ `pnpm dev:user`（:5173）+ `pnpm dev:console`（:5174）。API 側 `.env.local` の `CORS_ALLOWED_ORIGINS` に両 SPA のオリジンを入れる。
- Panda CSS のテーマは `packages/ui/panda.preset.ts` に集約。各アプリの `panda.config.ts` が preset を読み込み、自アプリ + `packages/ui/src` を include して styled-system を生成する。
- `styled-system` は各パッケージ内で codegen される生成物（gitignore 済み）。`pnpm generate` で再生成。
