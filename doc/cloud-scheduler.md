# Cloud Scheduler バッチ運用

Cloud Scheduler は Firebase App Hosting と同じ GCP project で実行します。3つのバッチ API は Cloud Scheduler 専用サービスアカウントの OIDC トークン、または Firebase の `admin` / `operator` ID トークンを受け付けます。

| ジョブ | スケジュール | 対象 API |
| --- | --- | --- |
| `batch-charge-<organizationId>` | 毎日 00:00 JST | `batch/charge` |
| `consultation-reminders-<organizationId>` | 15分ごと | `batch/consultation-reminders` |
| `late-arrival-alerts-<organizationId>` | 30分ごと | `batch/late-arrival-alerts` |

## 初期化と適用

GCS state bucket は事前に作成し、Terraform を実行するユーザーにそのバケットの読み書き権限を付与してください。backend は Terraform variables を参照できないため、state bucket は backend 設定ファイルで渡します。

```bash
cd infra/terraform
cp environments/prod.tfvars.example environments/prod.tfvars
cp environments/prod.backend.hcl.example environments/prod.backend.hcl
# prod.tfvars と prod.backend.hcl のプレースホルダーを実環境の値に置き換える
terraform init -backend-config=environments/prod.backend.hcl
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

`prod.tfvars` と `prod.backend.hcl` は環境固有のためコミットしません。組織を追加したら `organization_ids` に追加して apply してください。

## 手動実行と監視

作成済みジョブは次で即時実行できます。

```bash
gcloud scheduler jobs run consultation-reminders-org-1 \
  --location=asia-northeast1 \
  --project=project-prod
```

Cloud Scheduler の最終実行結果と、App Hosting/Cloud Run の `Batch charge completed`、`Batch consultation reminder completed`、`Late arrival alert batch completed` ログを確認します。失敗時は Scheduler の HTTP ステータス、OIDC service account、`NEXT_PUBLIC_APP_URL` と Terraform の `app_base_url` の一致を確認してください。アプリ側では `actorType: "cloud-scheduler"` と service account email がログに残ります。
