# SPA 分割アーキテクチャと移行手順

2026-07 に単一 Next.js アプリを 3 サービス構成へ分割した際のアーキテクチャと、リリースに必要な運用作業のメモ。
さらに同月、コンソール SPA を管理者・オペレーター向け（`apps/console`）と相談員向け（`apps/consultant`）の 2 アプリへ分割し、共有ロジックを `packages/console-core` に切り出した。

## 構成

```
                    ┌──────────────────────────────┐
 user.miraiyohou.com               →  apps/user       （Firebase Hosting / 静的 SPA、組織は URL パス /<organizationId>/... で判別）
 console.miraiyohou.com            →  apps/console    （Firebase Hosting / 静的 SPA）
 consultant.miraiyohou.com         →  apps/consultant （Firebase Hosting / 静的 SPA）
                    │            │ fetch (CORS + Bearer token)
                    ▼            ▼
 api.miraiyohou.com                →  apps/api        （Cloud Run / Hono）
                                 │
                    Firestore / Stripe / Zoom / Resend / LINE WORKS
```

- SPA は Vite + TanStack Router（file-based routing）。データ取得は従来どおり Orval 生成の React Query hooks（`packages/api-client`）。
- API は Hono（`@hono/node-server`）。esbuild で `dist/server.js` に単一バンドルし、Docker イメージとして Cloud Run service `api` にデプロイする。
- 認証は Firebase Auth の ID token を `Authorization: Bearer` で送る方式のまま。SPA 分割後も変更なし。
- CORS は `apps/api/src/server/app.ts` の Hono `cors` ミドルウェアが処理する。許可オリジンは env `CORS_ALLOWED_ORIGINS`（カンマ区切り）。

## 環境変数の変更点

### apps/api（Cloud Run / Secret Manager）

| 旧 | 新 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `API_URL` | Cloud Scheduler の OIDC audience 検証 |
| （新規） | `USER_APP_URL` / `CONSOLE_APP_URL` | 通知・メール内のリンク生成 |
| （新規） | `CORS_ALLOWED_ORIGINS` | CORS 許可オリジン |
| `NEXT_PUBLIC_FIREBASE_*` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 廃止（SPA 側 `VITE_*` へ移動） | - |

> `CONSOLE_APP_URL` の変遷: 単一 Next.js 時代の `CONSOLE_APP_URL`（コンソール共通 URL）→ admin/consultant 分割時に `ADMIN_APP_URL` に一時改名 →（本 admin→console 完全移行で）再度 `CONSOLE_APP_URL` に戻した。`apps/api/env.d.ts` には型定義として `CONSULTANT_APP_URL` も残っているが、Secret Manager（`infra/terraform/gcp/common/api/main.tf` の `api_secret_ids`）にも `env.server.ts` のアクセサにも存在せず、実際には未使用。

### SPA（ビルド時に GitHub Actions の environment vars から注入）

- `apps/user`: `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`
- `apps/console`: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`
- `apps/consultant`: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

## Terraform が管理するもの（release ブランチ push で自動 apply）

- Cloud Run service `api`（`common/api`。イメージは Terraform 管理外で `deploy-api.yml` が差し替える。`asia-northeast1`）
- Secret Manager の新シークレット `API_URL` / `CONSOLE_APP_URL` / `USER_APP_URL` / `CORS_ALLOWED_ORIGINS`（作成と IAM。**値の投入は手動**: `make setup-secrets`。全キーは `infra/terraform/gcp/common/api/main.tf` の `api_secret_ids` 参照）
- SPA 用 Firebase Hosting サイト `{project}-user` / `{project}-console` / `{project}-consultant`（`.firebaserc` の targets と一致）
- SPA サイトのカスタムドメイン（`spa_hosting_custom_domains`。現状 console / consultant。DNS は外部管理のため `wait_dns_verification = false` で apply し、追加すべきレコードは output で提示）
- Firestore / Storage のセキュリティルール（`firestore.rules` / `storage.rules` を `google_firebaserules_ruleset/release` が読み込む。CLI では配信しない）
- batch worker の `CONSOLE_APP_URL` シークレット参照
- github-deployer の Hosting / Cloud Run デプロイ権限（既存の `roles/firebase.admin` + `roles/run.admin` でカバー）

## リリース前に必要な運用作業（コード外）

1. **Secret Manager へ値を投入**: Terraform apply 後、`make setup-secrets`（または `make setup-secrets-from-env-fish:{dev,prod}`）で `API_URL` / `CONSOLE_APP_URL` / `USER_APP_URL` / `CORS_ALLOWED_ORIGINS` を含む全キー（`Makefile` の `SECRET_KEYS`）に値を設定してから Cloud Run（`deploy-api.yml`）を再デプロイする。
2. **GitHub Environments（dev / prod）の vars 追加**: `API_URL`, `STRIPE_PUBLISHABLE_KEY`, `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`（`GCP_PROJECT_NUMBER` は既存）。`deploy-hosting.yml` の SPA ビルドが参照する（`CONSOLE_APP_URL` は SPA ビルド時の vars ではなく、API 側 Secret Manager の値としてのみ使用）。旧 `CONSOLE_APP_URL` var は廃止。
3. **カスタムドメイン**: user / console / consultant の Hosting サイト（prod: `user.miraiyohou.com` / `console.miraiyohou.com` / `consultant.miraiyohou.com`、dev: `dev.user…` / `dev.console…` / `dev.consultant…`）と Cloud Run service `api`（`api.miraiyohou.com`）のドメイン割り当ては Terraform 管理（`.tfvars` の `spa_hosting_custom_domains` / `api_custom_domain`）。terraform apply 後、`spa_hosting_custom_domain_dns_records_to_add` / `api_custom_domain_dns_records` output に出る DNS レコードを Xserver 側に登録する（`wait_dns_verification = false` のため apply は検証を待たない）。
4. **Firebase Auth の Authorized domains** に `console.miraiyohou.com` / `consultant.miraiyohou.com`（dev はそれぞれ `dev.console…` / `dev.consultant…`）を追加（`.tfvars` の `authorized_domains` で管理）。
5. **Stripe / Zoom などの Webhook URL** は API ドメイン（api.miraiyohou.com）に変わるため、ドメイン切替時に Stripe ダッシュボードの webhook endpoint を更新。
6. **移行完了後のクリーンアップ**: 旧 `NEXT_PUBLIC_*` シークレットを `terraform state rm` + 手動削除（deletion_protection のため Terraform では消せない）。

## ドメイン移行手順（2026-07: `admin.console` / `consultant.console` → `console` / `consultant`）

`apps/console`（旧 `apps/admin`）を `admin.console.miraiyohou.com` → `console.miraiyohou.com`、`apps/consultant` を `consultant.console.miraiyohou.com` → `consultant.miraiyohou.com` へ移行する際の手順。同時に Firebase Hosting site `${project}-admin` を廃止し `${project}-console` を新規作成する。apps ディレクトリも `apps/admin` → `apps/console` にリネームされる。

1. **Terraform apply**（dev → prod の順）で以下がまとめて実行される:
   - 旧 hosting site `${project}-admin` を destroy（`google_firebase_hosting_site.admin_spa` を config から削除済み）
   - 新 hosting site `${project}-console` を create（`google_firebase_hosting_site.console_spa`）
   - `spa["admin"]` custom domain（`*.admin.console.miraiyohou.com`）を destroy
   - `spa["console"]` custom domain（`console.miraiyohou.com` / `dev.console.miraiyohou.com`）を create
   - `spa["consultant"]` custom domain の `custom_domain` 変更 → 実質 destroy + create（`*.consultant.miraiyohou.com`）
   - `google_identity_platform_config.default.authorized_domains` と `google_storage_bucket.firebase_default.cors` の更新
2. **DNS 切替（Xserver）**: apply 後の output `spa_hosting_custom_domain_dns_records_to_add` に新ドメインの A/TXT レコードが出るので Xserver に登録。同 output `spa_hosting_custom_domain_dns_records_to_remove` に出た旧レコード（`*.admin.console…` / `*.consultant.console…`）は Xserver 側で削除。
3. **旧 hosting site の削除**: Terraform destroy 直後は Firebase Hosting 側に `${project}-admin` サイトが残っている可能性があるため、Firebase Console もしくは `firebase hosting:sites:delete ${project}-admin --project ${project}` で削除。
4. **`CONSOLE_APP_URL` / `CONSULTANT_APP_URL` シークレット更新**: `make setup-secrets-from-env-fish:{dev,prod}` を再実行して Secret Manager の値を新ドメインへ差し替え、その後 `deploy-api.yml` を再実行して Cloud Run を再デプロイ（バッチ Worker も同時に更新される）。
5. **`release/dev` / `release/prod` push**: `deploy-hosting.yml` が `--only hosting:console` で新サイトへデプロイ（旧 `hosting:admin` target 名は既に置換済み）。
6. **旧 domain の Firebase Auth authorized domain 削除**: Terraform apply で `authorized_domains` から自動で消えるため手動作業不要（Identity Platform 上でも消える）。
7. **確認**: `curl -I https://console.miraiyohou.com` / `https://consultant.miraiyohou.com` で 200、Firebase Auth でログインが通ることを確認。

## admin → console 完全移行手順（2026-07 続編: env / API / permission）

ドメイン移行に続き、`ADMIN_APP_URL` env / `/admin/*` API パス / `admin.*` 権限文字列などコード側の残った admin 参照を console に統一する際の運用手順。データ変更を伴うため段階的に実施する。

1. **Terraform apply**（dev → prod の順） — Secret Manager に `CONSOLE_APP_URL` が新規作成される。
   - 旧 `ADMIN_APP_URL` シークレットは `deletion_protection = true` のため Terraform だけでは消えない。**保持したまま**次のステップに進む（Cloud Run の env 参照は新シークレットへ切替）。
2. **`CONSOLE_APP_URL` の値を投入**: `make setup-secrets-from-env-fish:{dev,prod}` を実行（`SECRET_KEYS` は既に `CONSOLE_APP_URL` を含む）。値は `.env.dev` / `.env.prod` の `CONSOLE_APP_URL=https://[dev.]console.miraiyohou.com`。
3. **`deploy-api.yml` / `deploy-batch-worker.yml` を再実行** — Cloud Run API と batch worker が新シークレット `CONSOLE_APP_URL` を env として取り込む。
4. **`release/{dev,prod}` push** — `deploy-hosting.yml` が新しい `/console/*` API path を叩く console SPA をデプロイ。
5. **Firestore 権限マイグレーション**（アプリ切替直後、旧 SPA キャッシュが消える前）:
   - `pnpm dlx tsx --env-file=.env.dev apps/api/scripts/migrate-role-permissions-admin-to-console.ts --dry-run` で差分確認
   - 問題なければ `--dry-run` を外して実行
   - すべての `roles/{roleId}.permissions[]` の `admin.*` が `console.*` に書き換わる（`permissions` フィールドを直接上書き）
6. **旧 `ADMIN_APP_URL` Secret 削除**（クリーンアップ）: `terraform state rm module.firebase.google_secret_manager_secret.app_hosting[\"ADMIN_APP_URL\"]` してから gcloud で手動削除（deletion_protection のため）。
7. **確認**:
   - Cloud Run API の env に `CONSOLE_APP_URL` が入っていて `ADMIN_APP_URL` は消えている
   - 遅延通知（LINE Works）の URL が `.../{organizationId}/bookings`（旧 `.../admin/bookings` ではない）になっている
   - Firestore roles の permissions が `console.*` 前置になっている
   - console SPA の各ページが 200、権限で保護されたページも roleId=admin ユーザーで開ける

## デプロイフロー

- `release/dev` / `release/prod` への push で:
  - `.github/workflows/deploy-hosting.yml` … SPA 3 つ（user / console / consultant）をビルドして Firebase Hosting にデプロイ
  - `.github/workflows/deploy-batch-worker.yml` … worker イメージビルド + Terraform apply
  - `.github/workflows/deploy-api.yml` … API イメージ（`apps/api/Dockerfile`）をビルドして Cloud Run service `api` を更新

## 開発メモ

- ローカルは `pnpm dev`（全サービス同時起動）または `pnpm dev:api`（:3000）/ `pnpm dev:user`（:3010）/ `pnpm dev:console`（:3020）/ `pnpm dev:consultant`（:3030）。API 側 `.env.local` の `CORS_ALLOWED_ORIGINS` に各 SPA のオリジンを入れる。
- `apps/console` と `apps/consultant` の共有ロジック（認証 `use-auth`、API クライアント初期化、組織ルーティング、共有クエリ hooks 等）は `packages/console-core` に集約。UI（`sidebar-layout` / `not-found` 等）は各アプリが所有し、将来のモバイル/PWA 対応で相談員側が乖離できるようにしている。
- Panda CSS のテーマは `packages/ui/panda.preset.ts` に集約。各アプリの `panda.config.ts` が preset を読み込み、自アプリ + `packages/ui/src` を include して styled-system を生成する。
- `styled-system` は各パッケージ内で codegen される生成物（gitignore 済み）。`pnpm generate` で再生成。
