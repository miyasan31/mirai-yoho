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

## 2. Secret を登録する

まとめて登録:

```bash
make setup-secrets PROJECT=mirai-yoho-dev
```

単体登録（新規追加時）:

```bash
make setup-secret PROJECT=mirai-yoho-dev KEY=OPENAI_API_KEY
```

Cloud Secret Manager コンソールで Secret を作成した場合は、App Hosting から読み取れるようアクセス権を付与:

```bash
make grant-secret-access PROJECT=mirai-yoho-dev KEY=OPENAI_API_KEY
```

## 3. Firebase Console の重複環境変数を排除する

Firebase Console > App Hosting の Environment variables に同名キーがあると、そちらが優先されます。  
`apphosting.yaml` で管理するキーと同名の値は Console 側から削除（または空に）してください。

## 4. 再デプロイして反映する

Secret 追加・更新後は新しいロールアウトを実行して反映します。

## 5. ローテーション

Secret 値を更新したら再ロールアウトしてください。  
固定バージョンが必要な場合は `secret: OPENAI_API_KEY@5` のようにバージョン指定します。

## チェックリスト

- サーバー側で `process.env.<KEY>` が取得できる
- クライアント公開変数に不要な機密値を置いていない（`NEXT_PUBLIC_` を付けない）
- Firebase Console 側に同名キーの重複設定がない
