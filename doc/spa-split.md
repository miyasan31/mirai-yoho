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

> `CONSOLE_APP_URL` の変遷: 単一 Next.js 時代の `CONSOLE_APP_URL`（コンソール共通 URL）→ admin/consultant 分割時に `ADMIN_APP_URL` に一時改名 →（本 admin→console 完全移行で）再度 `CONSOLE_APP_URL` に戻した。`apps/api/env.d.ts` には型定義として `CONSULTANT_APP_URL` も残っているが、Secret Manager（`infra/terraform/gcp/common/firebase/main.tf` の `runtime_secret_ids`。`common/api` はこれを `var.runtime_secret_ids` として受け取る）にも `env.server.ts` のアクセサにも存在せず、実際には未使用。

### SPA（ビルド時に GitHub Actions の environment vars から注入）

- `apps/user`: `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`（顧客の会員化に伴い Firebase Auth を使うようになったため。`DDD_DESIGN.md` §2.1）
- `apps/console`: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`
- `apps/consultant`: `VITE_API_URL`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`

## Terraform が管理するもの（release ブランチ push で自動 apply）

- Cloud Run service `api`（`common/api`。イメージは Terraform 管理外で `deploy-api.yml` が差し替える。`asia-northeast1`）
- Secret Manager の新シークレット `API_URL` / `CONSOLE_APP_URL` / `USER_APP_URL` / `CORS_ALLOWED_ORIGINS`（作成と IAM。**値の投入は手動**: `make setup-secrets`。全キーは `infra/terraform/gcp/common/firebase/main.tf` の `runtime_secret_ids` 参照）
- SPA 用 Firebase Hosting サイト `{project}-user` / `{project}-console` / `{project}-consultant`（`.firebaserc` の targets と一致）
- SPA サイトのカスタムドメイン（`spa_hosting_custom_domains`。user / console / consultant すべてに設定済み。DNS は外部管理のため `wait_dns_verification = false` で apply し、追加すべきレコードは output で提示）
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

> 以下 2 節は **当時の移行手順の記録**。現行のデプロイ対象は `deploy-hosting.yml` の `--only hosting:user,hosting:console,hosting:consultant` で、3 サイトすべてを対象にしている。

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

ドメイン移行に続き、`ADMIN_APP_URL` env / `/admin/*` API パス / `admin.*` 権限文字列などコード側の残った admin 参照を console に統一する際の運用手順。データ変更（Secret Manager と Firestore roles）を伴うため、段階的に実施する。

**設計方針**: `CONSOLE_APP_URL` シークレットは Terraform 管理**外**として作成する（`common/firebase/main.tf` の `externally_managed_secret_ids` に含め、`terraform_managed_secret_ids` からは除外する）。Cloud Run / batch worker 側の IAM と env mount のみ Terraform が管理する。この設計により、Terraform apply の前に operator が secret に値を投入することができ、Cloud Run rollout 時に値なしで失敗するリスクを避ける。旧 `ADMIN_APP_URL` シークレットは `deletion_protection = true` のため Terraform 管理下で残し、完全移行後に手動削除する。

### 事前準備（PR マージ前 / Terraform apply 前）

`{dev,prod}` 各環境で operator が実施:

1. **`CONSOLE_APP_URL` シークレット作成 + 値投入**:
   ```bash
   PROJECT_ID=mirai-yoho-dev  # or mirai-yoho-prod
   VALUE=https://dev.console.miraiyohou.com  # or https://console.miraiyohou.com
   gcloud secrets create CONSOLE_APP_URL --project=$PROJECT_ID --replication-policy=automatic
   printf '%s' "$VALUE" | gcloud secrets versions add CONSOLE_APP_URL --project=$PROJECT_ID --data-file=-
   ```
2. **`.env.dev` / `.env.prod` に `CONSOLE_APP_URL=...` 行を追加**（次回の `make setup-secrets-from-env-fish:{dev,prod}` に備える。`SECRET_KEYS` からは既に `ADMIN_APP_URL` を除外済み）。

### 適用手順

3. **PR マージ → `release/{dev,prod}` push** で以下が自動実行される:
   - `terraform-apply.yml`: `CONSOLE_APP_URL` の IAM 付与（api-server / batch-worker）+ Cloud Run api の env から `ADMIN_APP_URL` → `CONSOLE_APP_URL` へ差し替え + batch worker `late-arrival-alerts` の env も同様に差し替え。事前準備 §1 で secret + version が存在するため、Cloud Run rollout は成功する。
   - `deploy-api.yml` / `deploy-batch-worker.yml`: 新イメージ（`envServer.consoleAppUrl` で `CONSOLE_APP_URL` を読む）をデプロイ。
   - `deploy-hosting.yml`: 新しい `/console/*` API path を叩く console SPA をデプロイ。
4. **Firestore 権限マイグレーション**（アプリ切替直後、旧 SPA キャッシュが消える前）:
   - `pnpm dlx tsx --env-file=.env.dev apps/api/scripts/migrate-role-permissions-admin-to-console.ts --dry-run` で差分確認
   - 問題なければ `--dry-run` を外して実行
   - すべての `roles/{roleId}.permissions[]` の `admin.*` が `console.*` に書き換わる（`permissions` フィールドを直接上書き）
5. **確認**:
   - Cloud Run API の env に `CONSOLE_APP_URL` が入り、`ADMIN_APP_URL` は env として消えている（secret 自体は残存）
   - 遅延通知（LINE Works）の URL が `.../{organizationId}/bookings`（旧 `.../admin/bookings` ではない）になっている
   - Firestore roles の permissions が `console.*` 前置になっている
   - console SPA の各ページが 200、権限で保護されたページも roleId=admin ユーザーで開ける

### クリーンアップ（動作確認後、別 PR で実施） → ✅ 完了済み

6. **旧 `ADMIN_APP_URL` Secret 削除** — 上記手順 §3–§5 の動作確認が完了し、Cloud Run api / batch worker が `CONSOLE_APP_URL` を使って正常稼働していることを確認してから実施する。
   - Terraform 側の変更（`runtime_secret_ids` / `worker_secret_names_by_command.late-arrival-alerts` から `ADMIN_APP_URL` を削除）は完了済み。`ADMIN_APP_URL` は Secret Manager エントリ・Terraform 管理対象のいずれからも削除されている（`infra/terraform/gcp/common/firebase/main.tf` に「過去には `ADMIN_APP_URL` もこの扱いだった」という履歴コメントのみ残存）。
   - 手順は以下の通り実施済み:
     ```bash
     # dev
     cd infra/terraform/gcp/dev
     terraform state rm 'module.firebase.google_secret_manager_secret.app_hosting["ADMIN_APP_URL"]'
     gcloud secrets delete ADMIN_APP_URL --project=mirai-yoho-dev

     # prod
     cd ../prod
     terraform state rm 'module.firebase.google_secret_manager_secret.app_hosting["ADMIN_APP_URL"]'
     gcloud secrets delete ADMIN_APP_URL --project=mirai-yoho-prod
     ```
   - Cloud Run api / batch worker の env spec からも `ADMIN_APP_URL` は既に消えている。

## デプロイフロー

- `release/dev` / `release/prod` への push で:
  - `.github/workflows/deploy-hosting.yml` … SPA 3 つ（user / console / consultant）をビルドして Firebase Hosting にデプロイ
  - `.github/workflows/deploy-batch-worker.yml` … worker イメージビルド + Cloud Run Job 更新（`gcloud run jobs update`）。Terraform apply は別ワークフロー `.github/workflows/terraform-apply.yml`（`main` push 時）が担当
  - `.github/workflows/deploy-api.yml` … API イメージ（`apps/api/Dockerfile`）をビルドして Cloud Run service `api` を更新

## 開発メモ

- ローカルは `pnpm dev`（全サービス同時起動）または `pnpm dev:api`（:3000）/ `pnpm dev:user`（:3010）/ `pnpm dev:console`（:3020）/ `pnpm dev:consultant`（:3030）。API 側 `.env.local` の `CORS_ALLOWED_ORIGINS` に各 SPA のオリジンを入れる。
- `apps/console` と `apps/consultant` の共有ロジック（認証 `use-auth`、API クライアント初期化、組織ルーティング、共有クエリ hooks 等）は `packages/console-core` に集約。UI（`sidebar-layout` / `not-found` 等）は各アプリが所有し、将来のモバイル/PWA 対応で相談員側が乖離できるようにしている。
- Panda CSS のテーマは `packages/ui/panda.preset.ts` に集約。各アプリの `panda.config.ts` が preset を読み込み、自アプリ + `packages/ui/src` を include して styled-system を生成する。
- `styled-system` は各パッケージ内で codegen される生成物（gitignore 済み）。`pnpm generate` で再生成。
