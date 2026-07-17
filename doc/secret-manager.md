# Secret Manager 運用手順（Cloud Run / batch worker）

API サーバー（Cloud Run service `api`）と batch worker（Cloud Run Job）の機密値は、
すべて **Cloud Secret Manager** で管理し、実行時に env として注入します。値はリポジトリ・
Issue・チャットに貼り付けないでください。

> 以前は API を Firebase App Hosting でホストし `apphosting.yaml` の `secret:` 参照で
> 注入していましたが、現在は Cloud Run に移行済みです（[API を Cloud Run へ移行する](api-cloud-run-migration.md) 参照）。
> Secret Manager による管理・登録フロー自体は変わりません。ブラウザに公開する SPA の値
> （`VITE_*`）は Secret ではなく GitHub Environment の variables で管理します。

## 1. Terraform で Secret 参照を定義する

Secret のコンテナと、実行サービスアカウントの参照権限（`roles/secretmanager.secretAccessor`）は
Terraform で管理します。新しい Secret を追加するときは、値ではなく Secret 名を参照リストに追加します。

- API サーバーが参照する Secret: `infra/terraform/gcp/common/api`（`runtime_secret_ids`。実体は `common/firebase` の `runtime_secret_ids` local/output を受け取る）
- batch worker が参照する Secret: `infra/terraform/gcp/common/batch`

参照リストと env ファイルの両方に名前を追加してから、対象環境で Terraform を適用してください。

```bash
cd infra/terraform/gcp
make apply ENV=dev
```

## 2. Secret の値を登録する

Secret コンテナだけでは不十分で、`versions/latest` が解決できるように少なくとも 1 つの
version が必要です。

まとめて登録:

```bash
make setup-secrets:dev
```

環境別 env ファイル（`.env.dev` / `.env.prod`）から全シークレットを一括投入:

```bash
make setup-secrets-from-env:dev
# fish
make setup-secrets-from-env-fish:dev
```

API サーバーと batch worker が参照するシークレットはすべて同じ Secret Manager の共有リソースです。
batch worker が参照するキーは API サーバーの参照集合の部分集合なので、上記コマンド 1 本で両方まかなえます
（アクセス権限のスコープは terraform 側で個別に設定されます）。

単体登録（新規追加時）:

```bash
make setup-secret:dev KEY=STRIPE_WEBHOOK_SECRET
```

## 3. 反映（再デプロイ）する

Secret を追加・更新したら Cloud Run を再デプロイして反映します。

- API: `release/dev` / `release/prod` への push（`deploy-api.yml`）、または
  `gcloud run services update api --region asia-northeast1 --project <project>`
- batch worker: 次回の Job 実行で最新 version が解決されます

固定バージョンが必要な場合は、Terraform の参照側で `SECRET_NAME:5` のようにバージョンを
指定します。

## チェックリスト

- サーバー側で `process.env.<KEY>` が取得できる
- ブラウザ公開変数（`VITE_*`）に不要な機密値を置いていない（secret key / private key は API 側のみ）
- Cloud Run の稼働リビジョンが最新イメージ・最新 Secret version を参照している

## トラブルシュート: `Error resolving secret version .../versions/latest`

このエラーは、バージョンそのものより「実行サービスアカウントの Secret アクセス権不足」で
起こることが多いです。

1. 対象 secret の状態を確認（存在・バージョン）

```bash
make describe-secret:dev KEY=STRIPE_WEBHOOK_SECRET
```

2. Terraform plan で Secret と IAM が管理対象であることを確認

```bash
cd infra/terraform/gcp
make plan ENV=dev
```

不足があれば `make apply ENV=dev` を実行して IAM を反映します。

3. `latest` 解決を確認

```bash
make access-secret:dev KEY=STRIPE_WEBHOOK_SECRET
```

4. 値が空でないことを確認（値そのものは表示しない）

```bash
make check-secret-value:dev KEY=STRIPE_WEBHOOK_SECRET
```

5. Secret の権限変更後は Cloud Run を再デプロイしてください。
