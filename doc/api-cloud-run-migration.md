# API を Firebase App Hosting から Cloud Run へ移行する

## 背景

Firebase App Hosting のビルドパックが pnpm workspace モノレポの `pnpm install` 時に
`Cannot convert undefined or null to object` でクラッシュし、API がデプロイできなくなった
（[firebase-tools#10435](https://github.com/firebase/firebase-tools/issues/10435) の未解決バグ。
ローカルの `pnpm install` は Node 22/24・frozen/full 問わず全て成功し、リポジトリ側の設定に
問題は無いことを確認済み）。

そこで API サーバーを **Dockerfile ベースの Cloud Run サービス** に
載せ替え、ビルドパックの自動 install を経由しない構成にする。あわせて API フレームワークも
Next.js Route Handlers から **Hono（`@hono/node-server`）** へ移行し、esbuild で単一バンドル
（`dist/server.js`）する構成にした。既存の batch worker（`Dockerfile.worker` + Cloud Build
+ Cloud Run Job）と同じ運用パターンに揃えている。

## 構成

| 項目 | 値 |
| --- | --- |
| イメージビルド | `apps/api/Dockerfile`（esbuild バンドルのマルチステージ）+ `apps/api/cloudbuild.yaml` |
| レジストリ | `asia-northeast1-docker.pkg.dev/<project>/api/api:<git-sha>` |
| 実行環境 | Cloud Run service `api`（`asia-northeast1`） |
| ランタイム SA | `api-server@<project>.iam.gserviceaccount.com`（datastore.user / firebaseauth.admin / logging.logWriter + 各シークレットの secretAccessor） |
| シークレット | App Hosting と同じ Secret Manager シークレットを env として注入（`common/api` の `api_secret_ids`） |
| デプロイ | `.github/workflows/deploy-api.yml`（`release/dev` `release/prod` への push で build → `gcloud run services update`） |
| インフラ | `infra/terraform/gcp/common/api`（Cloud Run service / 公開 invoker / 任意のカスタムドメイン） |

稼働イメージは terraform 管理外（`ignore_changes`）で、リリース時に GitHub Actions が差し替える
（batch worker と同じ流儀）。Cloud Run service は Job と違い作成時に即リビジョンをデプロイするため、
`terraform-apply.yml` は初回作成時に Cloud Run の hello サンプルイメージをブートストラップに使う。

## 初回セットアップ

1. `main` に本 PR をマージ → `terraform-apply.yml`（dev）が Artifact Registry `api` リポジトリ・
   `api-server` SA・IAM・Cloud Run service `api`（hello イメージ）を作成する。
2. `release/dev` に push → `deploy-api.yml` が実イメージをビルドして `api` service を更新する。
3. `terraform output api_service_uri` で run.app URL を確認し、疎通を確認する。

## App Hosting からのカットオーバー（run.app で検証後）

1. **SPA の API URL を切替**: `deploy-hosting.yml` が渡す `VITE_API_URL`（リポジトリ変数 `API_URL`）を
   Cloud Run の URL（またはカスタムドメイン）に更新し、SPA を再ビルド・再デプロイする。
2. **カスタムドメイン**（任意）: `dev/.tfvars` / `prod/.tfvars` の `api_custom_domain` を有効化して apply。
   `terraform output api_custom_domain_dns_records` に出る CNAME を Xserver DNS に登録する。
   併せて App Hosting 側のドメイン（`app_hosting_custom_domain`）を外す。
3. **`API_URL` シークレット更新**: Cloud Scheduler の OIDC audience 検証に使うため、
   Secret Manager の `API_URL` を新 URL に更新する。
4. **App Hosting 撤去**: 疎通確認後、`apphosting.yaml` の削除と `common/firebase` の
   `google_firebase_app_hosting_*` / `google_developer_connect_*` リソース撤去を別 PR で行う
   （`deletion_policy = PREVENT` のため state 操作が必要）。

## メモ

- 公開アクセス: `allUsers` に `roles/run.invoker` を付与している（App Hosting と同じく公開）。
  組織ポリシー `iam.allowedPolicyMemberDomains` で `allUsers` が制限されている場合は、
  外部 HTTP(S) ロードバランサ + IAP なしの構成に切り替える必要がある。
- リージョン: App Hosting は `asia-east1` だったが、Cloud Run は batch worker と同じ
  `asia-northeast1` に統一している。
