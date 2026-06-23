# Firebase App Hosting Secret 運用手順

Firebase App Hosting では、Console の Environment variables はプロジェクトメンバー全員に表示され、`apphosting.yaml` の設定より優先されます。  
機密値は必ず Cloud Secret Manager 経由で参照してください。

## 1. apphosting.yaml で secret 参照を定義する

このリポジトリでは `apphosting.yaml` の `env` に `secret:` 形式で定義済みです。  
新規の機密値（例: `OPENAI_API_KEY`）を追加するときは、値ではなく Secret 名を記述します。

```yaml
env:
  - variable: OPENAI_API_KEY
    secret: OPENAI_API_KEY
    availability:
      - RUNTIME
```

## 2. Terraform で Secret と IAM を適用する

Secret のコンテナと App Hosting compute service account の参照権限は Terraform で管理します。新しい Secret を追加した場合は、`apphosting.yaml` と `infra/terraform/firebase.tf` の両方に名前を追加し、対象環境で Terraform を適用してください。

```bash
cd infra/terraform
make apply ENV=dev
```

## 3. Secret の値を登録する

まとめて登録:

```bash
make setup-secrets PROJECT=mirai-yoho-dev
```

単体登録（新規追加時）:

```bash
make setup-secret PROJECT=mirai-yoho-dev KEY=OPENAI_API_KEY
```

## 4. Firebase Console の重複環境変数を排除する

Firebase Console > App Hosting の Environment variables に同名キーがあると、そちらが優先されます。  
`apphosting.yaml` で管理するキーと同名の値は Console 側から削除（または空に）してください。

## 5. 再デプロイして反映する

Secret 追加・更新後は新しいロールアウトを実行して反映します。

## 6. ローテーション

Secret 値を更新したら再ロールアウトしてください。  
固定バージョンが必要な場合は `secret: OPENAI_API_KEY@5` のようにバージョン指定します。

## チェックリスト

- サーバー側で `process.env.<KEY>` が取得できる
- クライアント公開変数に不要な機密値を置いていない（`NEXT_PUBLIC_` を付けない）
- Firebase Console 側に同名キーの重複設定がない

## トラブルシュート: `Error resolving secret version .../versions/latest`

このエラーは、バージョンそのものより「App Hosting backend の Secret アクセス権不足」で起こることが多いです。

1. 対象 secret の状態を確認（存在・バージョン）

```bash
make describe-secret PROJECT=mirai-yoho-dev KEY=NEXT_PUBLIC_FIREBASE_API_KEY
```

2. Terraform plan で Secret と IAM が管理対象であることを確認

```bash
cd infra/terraform
make plan ENV=dev
```

不足があれば `make apply ENV=dev` を実行して IAM を反映します。

3. `latest` 解決を確認

```bash
make access-secret PROJECT=mirai-yoho-dev KEY=NEXT_PUBLIC_FIREBASE_API_KEY
```

4. 値が空でないことを確認（値そのものは表示しない）

```bash
make check-secret-value PROJECT=mirai-yoho-dev KEY=NEXT_PUBLIC_FIREBASE_API_KEY
make check-public-build-secrets PROJECT=mirai-yoho-dev
```

5. 再ロールアウト

Secret の権限変更後は App Hosting を再デプロイしてください。
