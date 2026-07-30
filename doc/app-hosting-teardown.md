# Firebase App Hosting 撤去手順（Cloud Run 移行後のクリーンアップ）

> **✅ 完了済み**: 本書に記載の手順・チェックリストは dev / prod ともに実施済み（`common/firebase/removed.tf` は
> forget 完了後に削除済み、`firebase-app-hosting-compute` SA も削除済み）。本書は実施記録として残す。

API は Firebase App Hosting から Cloud Run へ移行済み（[api-cloud-run-migration.md](./api-cloud-run-migration.md)）。
本 PR で App Hosting 由来の設定・Terraform リソースをコードから撤去した。**GCP 上の実リソースを消すには
Terraform state 操作と apply が必要**なため、その手順を以下にまとめる。

> 実行は terraform / gcloud / firebase CLI が使え、対象 GCP プロジェクトに認証済みの環境で行うこと。

## 本 PR でコードから撤去したもの

- `apphosting.yaml`（移行前 Next.js のビルド定義のまま陳腐化していた）
- Terraform（`common/firebase`）: `google_firebase_web_app.app_hosting` / `google_developer_connect_connection.github` /
  `google_developer_connect_git_repository_link.app` / `google_firebase_app_hosting_backend.app` /
  `google_firebase_app_hosting_traffic.app` / `google_firebase_app_hosting_domain.custom` /
  App Hosting compute・build SA 向けシークレット IAM（`app_hosting_can_read_secrets` /
  `app_hosting_build_can_read_secrets` / `app_hosting_can_view_secret_versions`）と関連 locals・出力・変数
- Terraform（`common/service-accounts`）: `google_service_account.app_hosting_compute` + 出力
- Terraform（`common/iam`）: `github_can_act_as_app_hosting_compute` / `app_hosting_compute_roles`、
  および github-deployer から `roles/developerconnect.admin` / `roles/firebaseapphosting.admin` を除去
- Terraform（`common/project-services`）: `developerconnect.googleapis.com` /
  `firebaseapphosting.googleapis.com` の有効化を除去
- `dev` / `prod` の変数・`.tfvars`・module 配線・出力・`moved.tf` から App Hosting 関連を除去
- Makefile: `firebase apphosting:*` 依存を排除（`gcloud secrets` へ置換）、`list-apphosting-backends` /
  `check-public-build-secrets` を削除、`APPHOSTING_SECRET_KEYS` → `SECRET_KEYS`（その後 `runtime_secret_ids`
  一元化に伴い現在の名称）、`setup-apphosting-secrets-from-env*` → `setup-secrets-from-env*` にリネーム
- スクリプト: `setup-apphosting-secrets-from-env.fish` → `setup-api-secrets-from-env.fish`

## 撤去しなかったもの（"app_hosting" の名前だが現役）

| 対象 | 理由 |
| --- | --- |
| `module.firebase.google_secret_manager_secret.app_hosting` | シークレット実体。Cloud Run `api`（`common/api`）と batch worker（`common/batch`）が参照する。**削除不可** |
| `local.app_hosting_secret_ids` / `moved` ブロック（同シークレット） | 上記の定義・state 互換のため保持 |
| `firebase.json`（`hosting`） | SPA（user/console/consultant）の静的ホスティング。`deploy-hosting.yml --only hosting` で現役 |

## GCP 上の実リソースを消す手順（dev → prod の順）

App Hosting のバックエンド系は state 上で `deletion_policy = "PREVENT"` / `prevent_destroy` が付いており、
単純な削除では `terraform apply` が destroy に失敗する。そこで本 PR では `common/firebase/removed.tf` に
`removed { ... lifecycle { destroy = false } }` を置き、**apply 時にこれらを Terraform 管理から外す（state から
忘れるだけ・GCP 実体は残す）**ようにした。SA / IAM など `PREVENT` の無いリソースは通常どおり destroy される。
このため `terraform state rm` を手で叩く必要はない。

### 1. apply（state から App Hosting を forget）

```bash
cd infra/terraform/gcp
make plan ENV=dev   # App Hosting backend 系が「will no longer be managed（forget）」、
                    # app_hosting compute SA / IAM が destroy、
                    # google_secret_manager_secret.app_hosting と api/batch の IAM は残ることを確認
make apply ENV=dev
```

state にも GCP にも App Hosting が存在しない環境（ビルド失敗で未作成のケース）では `removed` は no-op。

### 2. GCP 側の実リソースを手動削除

`removed`（destroy = false）で state からのみ外れ、GCP 上には残っている App Hosting バックエンド・
Web App・Developer Connect 接続を削除する。

```bash
firebase apphosting:backends:list --project mirai-yoho-dev
firebase apphosting:backends:delete mirai-yoho --project mirai-yoho-dev
# Web App / Developer Connect connection / git repository link は
# Firebase Console / gcloud developer-connect で削除する
```

### 3. prod でも 1〜2 を繰り返す

`mirai-yoho` について同様に実施する。

### 4. 後片付け

両環境で forget + 手動削除が完了したら、`common/firebase/removed.tf` を削除する PR を出す
（残しておいても no-op だが、不要な `removed` ブロックは整理する）。→ ✅ 完了済み（`removed.tf` は削除済み）。

## チェックリスト

- [x] `google_secret_manager_secret.app_hosting` と全 version が保持されている（Cloud Run / batch のシークレット）
- [x] `terraform plan` に App Hosting リソースの削除が出ない（state から除去済み）
- [x] dev → prod の順で apply し、両環境で API（Cloud Run）疎通に影響がない
- [x] `firebase apphosting:backends:list` が空
- [x] `firebase-app-hosting-compute` SA を削除済み
