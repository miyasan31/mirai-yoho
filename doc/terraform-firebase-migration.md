# Firebase Terraform 移行手順

Firebase のサービス構成は `infra/terraform` で管理する。Firestore rules / index の配布に `firebase deploy` は使用しない。

## 環境設定

`infra/terraform/<env>/.tfvars.example` を `.tfvars` にコピーし、既存リソースの値を確認して設定する。値は構成 ID のみで、Secret の値は入れない。

App Hosting の Secret は Terraform がコンテナと App Hosting compute service account の参照権限を管理する。各値・version の投入とローテーションは既存の `make setup-secret` または Firebase CLI で実施する。

`FIREBASE_STORAGE_BUCKET` と `LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL` は `apphosting.yaml` と Terraform の両方で必須の Secret として管理する。

## 既存資産の import

各環境で `make init ENV=<env>` を実行した後、以下の順に import する。すべてのコマンドを実行する前に、App Hosting と Developer Connect の resource ID を `.tfvars` と照合する。

```bash
cd infra/terraform
ENV=dev
PROJECT_ID=mirai-yoho-dev

terraform import -var-file="$ENV/.tfvars" google_firestore_database.default \
  "projects/$PROJECT_ID/databases/(default)"
terraform import -var-file="$ENV/.tfvars" google_storage_bucket.firebase_default \
  "$PROJECT_ID.firebasestorage.app"
terraform import -var-file="$ENV/.tfvars" google_identity_platform_config.default \
  "projects/$PROJECT_ID/config"
terraform import -var-file="$ENV/.tfvars" google_firebase_web_app.app_hosting \
  "$PROJECT_ID projects/$PROJECT_ID/webApps/<firebase-web-app-id>"
terraform import -var-file="$ENV/.tfvars" google_service_account.app_hosting_compute \
  "projects/$PROJECT_ID/serviceAccounts/firebase-app-hosting-compute@$PROJECT_ID.iam.gserviceaccount.com"
terraform import -var-file="$ENV/.tfvars" google_developer_connect_connection.github \
  "projects/$PROJECT_ID/locations/<app-hosting-location>/connections/<connection-id>"
terraform import -var-file="$ENV/.tfvars" google_developer_connect_git_repository_link.app \
  "projects/$PROJECT_ID/locations/<app-hosting-location>/connections/<connection-id>/gitRepositoryLinks/<repository-link-id>"
terraform import -var-file="$ENV/.tfvars" google_firebase_app_hosting_backend.app \
  "projects/$PROJECT_ID/locations/<app-hosting-location>/backends/<backend-id>"
terraform import -var-file="$ENV/.tfvars" google_firebase_app_hosting_traffic.app \
  "projects/$PROJECT_ID/locations/<app-hosting-location>/backends/<backend-id>/traffic"

for secret in $(terraform console -var-file="$ENV/.tfvars" <<< 'join(" ", tolist(local.app_hosting_secret_ids))'); do
  terraform import -var-file="$ENV/.tfvars" "google_secret_manager_secret.app_hosting[\"$secret\"]" \
    "projects/$PROJECT_ID/secrets/$secret"
done
```

Firestore composite index の server-generated ID は `gcloud firestore indexes composite list --project="$PROJECT_ID"` で確認して import する。`INDEX_ID` は説明用のプレースホルダーなので、そのまま実行しない。index は `google_firestore_index.composite[\"<key>\"]` に対応させる。App Hosting compute account の既存 IAM member も、最初の plan が create 以外を示す場合に import する。

Ruleset は更新ごとに新規作成されるため import しない。最初の apply で `firestore.rules` と `storage.rules` を release へ反映する。

## 適用前の確認

```bash
make plan ENV=dev
make plan ENV=prod
```

最初の plan で既存の database、bucket、web app、backend の置換・削除がないことを確認する。両環境の主要リソースには API 側の削除保護と Terraform の `prevent_destroy` を設定している。
