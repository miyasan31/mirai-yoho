# Cloud Scheduler バッチ運用

Cloud Scheduler は API（Cloud Run service `api`）と同じ GCP project で実行しますが、実行先は API ではありません。Scheduler は OAuth で共有 Cloud Run Job を起動し、組織 ID を execution override として渡します。このため Scheduler 専用サービスアカウントには、override 付き Job 実行だけを許可するカスタム IAM ロールを付与します。

Web API の `batch/*` は Scheduler からは呼ばれず、Firebase の `admin` / `operator` によるオンデマンド実行が主用途です。ただし実装（`apps/api/src/presentation/organizations/batch-routes.ts` の `authorizeBatchExecution`）は Cloud Scheduler の OIDC トークンも引き続き受け付けます（Cloud Run Job へ移行する前の経路が残っているため）。

> Scheduler は **dev / prod 両方**に作られます。`common/batch` は環境で分岐せず `organization_ids` を素直に for_each するため、`.tfvars` に組織 ID がある環境にはジョブが並びます。`doc/ROADMAP.md` / `doc/PRD.md` の「Cloud Scheduler は prod のみ有効」という記述は策定当時のもので、現行とは異なります。

| ジョブ | スケジュール | 対象 API |
| --- | --- | --- |
| `batch-charge-<organizationId>` | 毎日 00:00 JST | `batch-charge` Cloud Run Job |
| `consultation-reminders-<organizationId>` | 15分ごと | `batch-consultation-reminders` Cloud Run Job |
| `late-arrival-alerts-<organizationId>` | 30分ごと | `batch-late-arrival-alerts` Cloud Run Job |

## 初回セットアップ（空の GCP プロジェクト）

GCS state bucket は Terraform の管理外です。最初に作成し、Terraform を実行するユーザーに読み書き権限を付与してください。backend は Terraform variables を参照できないため、state bucket は backend 設定ファイルで渡します。

以下は開発環境の例です。本番環境では `ENV=prod`、`mirai-yoho-prod` に読み替えてください。

```bash
cd infra/terraform/gcp
# dev/.tfvars と dev/.backend.hcl が対象環境の値になっていることを確認する
make create-state-bucket ENV=dev
make auth-adc ENV=dev
make init ENV=dev
```

`dev/.tfvars` と `dev/.backend.hcl` は共有する環境設定としてコミットしています。組織を追加したら `organization_ids` に追加して apply してください。Secret の値そのものは Terraform 変数には含めません。

### Worker イメージを用意して通常 apply する

`worker_image`（Cloud Run Job のイメージ）と `api_image`（Cloud Run service のイメージ）は Terraform の必須変数で、`.tfvars` には含めません。**`make plan` / `make apply` は HEAD のコミット SHA から両方を自動導出して export する**ため、通常運用では手で渡す必要はありません（`infra/terraform/gcp/Makefile`）。

```bash
cd infra/terraform/gcp
make plan ENV=dev
make apply ENV=dev
```

別の SHA のイメージを指定したい場合は `SHA=` を渡すか、`TF_VAR_api_image` / `TF_VAR_worker_image` を事前に export します（Makefile は `?=` なので export した値が優先されます）。

```bash
make apply ENV=dev SHA=<git-sha>
```

`make` を経由せず `terraform` を直接叩く場合は、`TF_VAR_api_image` と `TF_VAR_worker_image` の**両方**を export しないと `No value for required variable` になります。URI は `make print-api-image ENV=dev` / `make print-worker-image ENV=dev` で確認できます。

### 初回ブートストラップ

Cloud Run Job のイメージと Artifact Registry は相互に依存するため、空のプロジェクトでは次の順に実行します。最初の target apply 用の `bootstrap` タグは Terraform の変数検証を通すためだけの値であり、この時点では存在しなくても構いません。

```bash
# 1. Artifact Registry だけを作成する
#    make を経由しないため、必須変数を両方 export する（この時点では実在しなくてよい）
cd infra/terraform/gcp
export TF_VAR_worker_image="asia-northeast1-docker.pkg.dev/mirai-yoho-dev/batch-worker/worker:bootstrap"
export TF_VAR_api_image="asia-northeast1-docker.pkg.dev/mirai-yoho-dev/api/api:bootstrap"
terraform -chdir=dev apply -var-file=".tfvars" \
  -target=module.artifact_registry.google_artifact_registry_repository.batch_worker

# 2. Worker イメージを build・push する
cd ../../..
export IMAGE_TAG="$(git rev-parse HEAD)"
gcloud builds submit \
  --project="mirai-yoho-dev" \
  --config=apps/api/cloudbuild.worker.yaml \
  --substitutions="_IMAGE=asia-northeast1-docker.pkg.dev/mirai-yoho-dev/batch-worker/worker:$IMAGE_TAG"

# 3. 全リソースを適用する（make が HEAD の SHA からイメージ URI を導出する）
cd infra/terraform/gcp
make plan ENV=dev
make apply ENV=dev
```

続けて GitHub Environment の `dev` / `prod` ごとに `GCP_PROJECT_NUMBER` variable を設定し、Terraform state bucket に `github-deployer` サービスアカウントの読み書き権限を付与してください。あわせて、PR 時の `terraform-plan.yml` は Environment を使わずリポジトリ変数 `GCP_PROJECT_NUMBER_DEV` / `GCP_PROJECT_NUMBER_PROD` を別途参照するため、こちらも設定してください（Environment を指定すると plan まで承認待ちになるため）。

以降は `release/dev` または `release/prod` への push（マージを含む）で `deploy-batch-worker.yml` が Workload Identity Federation を使い、対応する環境へ Git SHA タグの Worker イメージを build・push して Cloud Run Job（`gcloud run jobs update`）を更新します。認証は `miyasan31/mirai-yoho` のこれら2ブランチに限定されます。Terraform apply は別ワークフロー `terraform-apply.yml` が `main` への push（`infra/terraform/**` 変更時）で実行し、現状 `dev` のみ有効です（`prod` は WIF 未整備のため無効化中）。

Artifact Registry は最新10世代の Worker イメージを保持し、それ以外を自動削除します。cleanup policy はバックグラウンドで実行されるため、削除は設定変更からおおむね1日以内に反映されます。

## 手動実行と監視

Cloud Run Job は次で即時実行できます。`--wait` を付けると完了ステータスを待機します。

```bash
gcloud run jobs execute batch-consultation-reminders \
  --location=asia-northeast1 \
  --project=mirai-yoho-prod \
  --args=consultation-reminders,--organization-id,org-1 \
  --wait
```

管理者・operator が Web API をオンデマンド実行する運用は従来どおりです。Scheduler はこの API を呼びません。

監視では Cloud Scheduler の最終実行結果に加え、Cloud Run Job の Execution 一覧と `Batch worker completed` / `Batch worker failed` ログを確認します。失敗した場合は同じ Job を `gcloud run jobs execute` で再実行します。apply 後に Scheduler URI が `run.googleapis.com` になっていることを確認してください。
