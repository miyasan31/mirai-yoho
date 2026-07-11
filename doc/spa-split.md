# SPA 分割アーキテクチャと移行手順

2026-07 に単一 Next.js アプリを 3 サービス構成へ分割した際のアーキテクチャと、リリースに必要な運用作業のメモ。
さらに同月、コンソール SPA（`apps/console`）を管理者向け（`apps/admin`）と相談員向け（`apps/consultant`）の 2 アプリへ分割し、共有ロジックを `packages/console-core` に切り出した。

## 構成

```
                    ┌──────────────────────────────┐
 {hoge}.miraiyohou.com             →  apps/user       （Firebase Hosting / 静的 SPA）
 admin.console.miraiyohou.com      →  apps/admin      （Firebase Hosting / 静的 SPA）
 consultant.console.miraiyohou.com →  apps/consultant （Firebase Hosting / 静的 SPA）
                    │            │ fetch (CORS + Bearer token)
                    ▼            ▼
 api.miraiyohou.com                →  apps/api        （Firebase App Hosting / Next.js Route Handlers）
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

- `apps/user`: `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`
- `apps/admin`: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`
- `apps/consultant`: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

## Terraform が管理するもの（release ブランチ push で自動 apply）

- App Hosting backend の `root_directory = "/"`（pnpm workspace のパッケージマネージャ検出のためルートを指定。ビルド対象は `apphosting.yaml` の `buildCommand` / `runCommand` で指定）
- Secret Manager の新シークレット `API_URL` / `CONSOLE_APP_URL` / `CORS_ALLOWED_ORIGINS`（作成と IAM。**値の投入は手動**: `make setup-secrets`）
- SPA 用 Firebase Hosting サイト `{project}-user` / `{project}-admin` / `{project}-consultant`（`.firebaserc` の targets と一致）
- SPA サイトのカスタムドメイン（`spa_hosting_custom_domains`。現状 admin / consultant。DNS は外部管理のため `wait_dns_verification = false` で apply し、追加すべきレコードは output で提示）
- Firestore / Storage のセキュリティルール（`firestore.rules` / `storage.rules` を `google_firebaserules_ruleset/release` が読み込む。CLI では配信しない）
- batch worker の `CONSOLE_APP_URL` シークレット参照
- github-deployer の Hosting デプロイ権限（既存の `roles/firebase.admin` でカバー）

## リリース前に必要な運用作業（コード外）

1. **Secret Manager へ値を投入**: Terraform apply 後、`make setup-secrets`（または `make setup-apphosting-secrets-from-env-fish:{dev,prod}`）で `API_URL` / `CONSOLE_APP_URL` / `CORS_ALLOWED_ORIGINS` を含む全キーに値を設定してから App Hosting のロールアウトを実行する。
2. **GitHub Environments（dev / prod）の vars 追加**: `API_URL`, `ADMIN_APP_URL`, `CONSULTANT_APP_URL`, `STRIPE_PUBLISHABLE_KEY`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`（`GCP_PROJECT_NUMBER` は既存）。deploy-hosting.yml のビルドが参照する。旧 `CONSOLE_APP_URL` var は `ADMIN_APP_URL` / `CONSULTANT_APP_URL` に置き換え。
3. **カスタムドメイン**: user / admin / consultant の Hosting サイト（prod: `user.miraiyohou.com` / `admin.console.miraiyohou.com` / `consultant.console.miraiyohou.com`、dev: `dev.user…` / `dev.admin.console…` / `dev.consultant.console…`）と App Hosting backend（`api.miraiyohou.com`）のドメイン割り当ては Terraform 管理（`.tfvars` の `spa_hosting_custom_domains` / `app_hosting_custom_domain`）。terraform apply 後、`spa_hosting_custom_domain_dns_records_to_add` / `app_hosting_custom_domain_dns_records_to_add` output に出る DNS レコードを Xserver 側に登録する（`wait_dns_verification = false` のため apply は検証を待たない）。
4. **Firebase Auth の Authorized domains** に `admin.console.miraiyohou.com` / `consultant.console.miraiyohou.com`（dev はそれぞれ `dev.admin.console…` / `dev.consultant.console…`）を追加（`.tfvars` の `authorized_domains` で管理）。
5. **Stripe / Zoom などの Webhook URL** は API ドメイン（api.miraiyohou.com）に変わるため、ドメイン切替時に Stripe ダッシュボードの webhook endpoint を更新。
6. **移行完了後のクリーンアップ**: 旧 `NEXT_PUBLIC_*` シークレットを `terraform state rm` + 手動削除（deletion_protection のため Terraform では消せない）。

## デプロイフロー

- `release/dev` / `release/prod` への push で:
  - `.github/workflows/deploy-hosting.yml` … SPA 3 つ（user / admin / consultant）をビルドして Firebase Hosting にデプロイ
  - `.github/workflows/deploy-batch-worker.yml` … worker イメージビルド + Terraform apply
- API（App Hosting）は従来どおり App Hosting の GitHub 連携（release ブランチ）でデプロイ。

## 開発メモ

- ローカルは `pnpm dev`（全サービス同時起動）または `pnpm dev:api`（:3000）/ `pnpm dev:user`（:3010）/ `pnpm dev:admin`（:3020）/ `pnpm dev:consultant`（:3030）。API 側 `.env.local` の `CORS_ALLOWED_ORIGINS` に各 SPA のオリジンを入れる。
- `apps/admin` と `apps/consultant` の共有ロジック（認証 `use-auth`、API クライアント初期化、組織ルーティング、共有クエリ hooks 等）は `packages/console-core` に集約。UI（`sidebar-layout` / `not-found` 等）は各アプリが所有し、将来のモバイル/PWA 対応で相談員側が乖離できるようにしている。
- Panda CSS のテーマは `packages/ui/panda.preset.ts` に集約。各アプリの `panda.config.ts` が preset を読み込み、自アプリ + `packages/ui/src` を include して styled-system を生成する。
- `styled-system` は各パッケージ内で codegen される生成物（gitignore 済み）。`pnpm generate` で再生成。
