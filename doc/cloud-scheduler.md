# Cloud Scheduler バッチ運用

Cloud Scheduler は Firebase App Hosting と同じ GCP project で実行しますが、実行先は App Hosting ではありません。Scheduler は OAuth で共有 Cloud Run Job を起動し、組織 ID を execution override として渡します。このため Scheduler 専用サービスアカウントには、override 付き Job 実行だけを許可するカスタム IAM ロールを付与します。Web API の `batch/*` は Firebase の `admin` / `operator` によるオンデマンド実行専用です。

| ジョブ | スケジュール | 対象 API |
| --- | --- | --- |
| `batch-charge-<organizationId>` | 毎日 00:00 JST | `batch-charge` Cloud Run Job |
| `consultation-reminders-<organizationId>` | 15分ごと | `batch-consultation-reminders` Cloud Run Job |
| `late-arrival-alerts-<organizationId>` | 30分ごと | `batch-late-arrival-alerts` Cloud Run Job |

## 初期化と適用

GCS state bucket は事前に作成し、Terraform を実行するユーザーにそのバケットの読み書き権限を付与してください。backend は Terraform variables を参照できないため、state bucket は backend 設定ファイルで渡します。

```bash
cd infra/terraform
cp environments/prod.tfvars.example environments/prod.tfvars
cp environments/prod.backend.hcl.example environments/prod.backend.hcl
# prod.tfvars と prod.backend.hcl のプレースホルダーを実環境の値に置き換える
terraform init -backend-config=environments/prod.backend.hcl
export TF_VAR_worker_image=asia-northeast1-docker.pkg.dev/project-prod/batch-worker/worker:<git-sha>
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

`prod.tfvars` と `prod.backend.hcl` は環境固有のためコミットしません。組織を追加したら `organization_ids` に追加して apply してください。

## 初回ブートストラップと CD

Cloud Run Job のイメージ、Artifact Registry、Workload Identity Federation は相互に依存するため、最初の1回だけ管理者が次の順に適用します。

1. `google_artifact_registry_repository.batch_worker` を含む Terraform リソースを target apply し、Artifact Registry を作成する。
2. `cloudbuild.worker.yaml` を使って Worker イメージを push する。
3. `TF_VAR_worker_image` に push 済みイメージを設定して通常の Terraform apply を行う。
4. GitHub Environment の `dev` / `prod` ごとに `GCP_PROJECT_NUMBER` variable を設定する。
5. Terraform state bucket に `github-deployer` サービスアカウントの読み書き権限を付与する。

以降は `release/dev` または `release/prod` への push（マージを含む）で GitHub Actions が Workload Identity Federation を使い、対応する環境へ Git SHA タグの Worker イメージを build・push して Terraform を apply します。認証は `miyasan31/mirai-yoho` のこれら2ブランチに限定されます。

Artifact Registry は最新10世代の Worker イメージを保持し、それ以外を自動削除します。cleanup policy はバックグラウンドで実行されるため、削除は設定変更からおおむね1日以内に反映されます。

## 手動実行と監視

Cloud Run Job は次で即時実行できます。`--wait` を付けると完了ステータスを待機します。

```bash
gcloud run jobs execute batch-consultation-reminders \
  --location=asia-northeast1 \
  --project=project-prod \
  --args=consultation-reminders,--organization-id,org-1 \
  --wait
```

管理者・operator が Web API をオンデマンド実行する運用は従来どおりです。Scheduler はこの API を呼びません。

監視では Cloud Scheduler の最終実行結果に加え、Cloud Run Job の Execution 一覧と `Batch worker completed` / `Batch worker failed` ログを確認します。失敗した場合は同じ Job を `gcloud run jobs execute` で再実行します。Scheduler の実行先を切り替える Terraform apply 中は、旧 App Hosting API を手動で実行しないでください。二重実行を避けるため、apply 後に Scheduler URI が `run.googleapis.com` になっていることを確認します。
