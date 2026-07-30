# あなたのみらい予報

オンライン相談・予約サービス。pnpm workspace によるモノレポ構成です。

## 構成

| パッケージ | 役割 | デプロイ先 |
| --- | --- | --- |
| `apps/user` | 顧客向け予約 SPA（Vite + TanStack Router、Firebase 匿名認証 + Google 連携による会員登録あり） | Firebase Hosting（user.miraiyohou.com、組織は URL パス /<organizationId>/... で判別） |
| `apps/console` | 管理者・オペレーター向けコンソール SPA（Vite + TanStack Router） | Firebase Hosting（console.miraiyohou.com） |
| `apps/consultant` | 占い師向け SPA（Vite + TanStack Router） | Firebase Hosting（consultant.miraiyohou.com） |
| `apps/api` | API サーバー（Hono + DDD 4層） + batch worker | Cloud Run（api.miraiyohou.com）+ Cloud Run Job（batch worker） |
| `packages/api-client` | OpenAPI（openapi.yaml）+ Orval 生成の React Query hooks | - |
| `packages/console-core` | console / consultant 共有の認証・API クライアント・組織ルーティング等のロジック | - |
| `packages/ui` | Panda CSS preset + Park UI / Ark UI ベースの共有 UI | - |
| `packages/shared` | フロントと API で共有する純粋ロジック | - |

## 運用ドキュメント

- [システム環境構築・組織作成ガイド](doc/system-setup-and-organization.md)
- [Secret Manager 運用手順](doc/secret-manager.md)
- [Cloud Scheduler バッチ運用](doc/cloud-scheduler.md)
- [SPA 分割アーキテクチャと移行手順](doc/spa-split.md)
- [API Cloud Run 移行記録](doc/api-cloud-run-migration.md)
- [App Hosting 撤去記録](doc/app-hosting-teardown.md)
- [環境変数一覧](doc/environment-variables.md)

## 設計ドキュメント

- [DDD 設計ドキュメント](doc/DDD_DESIGN.md)
- [命名台帳（NAMING_LEDGER）](doc/NAMING_LEDGER.md)
- [製品要件定義書（PRD、策定時の記録）](doc/PRD.md)
- [開発ロードマップ](doc/ROADMAP.md)
- [業界展開分析](doc/market-analysis.md)

## Getting Started

```bash
pnpm install          # 依存インストール（orval / panda codegen も自動実行）

pnpm dev              # Firestore エミュレーター + 全サービスを同時起動
pnpm dev:apps         # エミュレーター抜きで全サービスを同時起動
pnpm dev:api          # API サーバー (http://localhost:3000)
pnpm dev:user         # 顧客向け SPA (http://localhost:3010)
pnpm dev:console      # 管理コンソール SPA (http://localhost:3020)
pnpm dev:consultant   # 占い師向け SPA (http://localhost:3030)
pnpm emulator         # Firestore エミュレーターのみ (UI: http://127.0.0.1:4000)
```

各アプリの環境変数は `apps/*/.env.example` を参照して `.env.local`（api）/ `.env`（user, console, consultant）を用意してください。
API サーバーの `CORS_ALLOWED_ORIGINS` に SPA のオリジンを含める必要があります。

### Firestore エミュレーター（ローカル開発）

ローカルの API を dev プロジェクトの Firestore ではなくエミュレーターに向けられます。`pnpm dev` はエミュレーターも一緒に起動します（単体で立てたいときは `pnpm emulator`、エミュレーター抜きで立てたいときは `pnpm dev:apps`）。

`apps/api/.env.local` に以下を追加すると API・batch worker・`apps/api/scripts/` の各スクリプトがエミュレーターを使います（`make` 経由でスクリプトを流す場合はリポジトリルートの `.env.local` にも同じ行を追加）。

```
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

- エミュレートするのは **Firestore だけ**。Firebase Auth は `FIREBASE_PROJECT_ID`（dev プロジェクト）の本物を使い続けるため、ログインと ID トークン検証はこれまでどおり動きます。エミュレーターの project id も同じ値に揃える必要があるため、起動スクリプトは `FIREBASE_PROJECT_ID`（既定 `mirai-yoho-dev`）を使います
- データは Ctrl-C で終了したときに `.emulator-data/`（gitignore 済み）へ書き出し、次回起動時に読み込みます。まっさらに戻したいときはこのディレクトリを削除してください
- 初回はコレクションが空なので、シードを流します（下記）
- `firestore.rules` はエミュレーターに読み込ませていません（rules は Terraform 管理で、`firebase.json` に `firestore` 設定を置くと `firebase deploy --only firestore` が可能になってしまうため）。API は admin SDK 経由で rules をバイパスし、SPA から Firestore を直接触っていないので影響ありません
- 実行には Java（JDK 11+）が必要です（Firestore エミュレーターの動作要件。`mise install` で入ります）

#### シードデータの投入

```bash
make seed-local ADMIN=you@example.com
```

一通りの画面が埋まる状態をまとめて投入します。同じ引数なら何度実行しても同じドキュメントを上書きするだけです（冪等）。

| コレクション | 投入内容 |
| --- | --- |
| `organizations` / `settings` | 組織 1 件。営業時間は毎日 05:00-04:00 + 例外日（実行日の 3 日後を休業）、ステータスは Hight / Middle / Low（既定）、料金設定は 5,000 〜 20,000 円 |
| `roles` / `accounts` | admin・operator ロール、管理者（あなた）と招待中のオペレーター |
| `consultants` | 4 人（1 人目 = あなたの UID、残りはダミー。うち 1 人は非稼働） |
| `price-plans` | 占い師ごとに 30 / 60 / 90 分の 3 プラン（占い師ごとに金額をずらす） |
| `slots` | 稼働中の占い師ごとに、翌日から 7 日分・10:00-17:00 の 15 分枠 |
| `users` / `customers` | 会員 4 人（1 人目 = あなたの UID）と、対応する顧客 |
| `bookings` / `payments` | 確定・完了・キャンセル・仮予約の 4 状態。過去分は鑑定メモ付き |
| `coupons` / `user-coupons` | 初回登録特典クーポン（3 枚発行・有効期限 90 日）と誕生日クーポン（1 枚発行・有効期限 30 日）。手持ちは初回登録特典 3 枚（未使用 2 / 使用済み 1）+ 誕生日 1 枚（期限切れ） |
| `policy-revisions` | 利用者向け 3 種 + 占い師向け 2 種 × 2 版（旧版 = 非公開 / 現行 = 公開）。文書管理の改版履歴が確認できる |

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `ADMIN` | （必須） | console にログインする Auth ユーザーのメールアドレスまたは UID |
| `CONSULTANT` | `ADMIN` と同じ | consultant にログインする Auth ユーザー |
| `APP_USER` | `ADMIN` と同じ | user アプリにログインする Auth ユーザー（クーポン・予約の持ち主）。`USER` はシェルの環境変数と衝突するためこの名前 |
| `ORGANIZATION_ID` | `miraiyohou` | 組織 ID（各 SPA の URL パスに使う） |
| `ORGANIZATION_NAME` | `ローカル組織` | 組織名 |
| `CONSULTANT_NAME` | `ローカル占い師` | あなたの占い師の表示名 |
| `DAYS` | `7` | 空き枠を作る日数 |
| `CONSULTANTS` | `4` | 占い師の人数（1 人目はあなた。4 人目が非稼働） |
| `CUSTOMERS` | `4` | 会員・顧客の人数（1 人目はあなた） |

- Auth はエミュレートしないため、`ADMIN` / `CONSULTANT` / `APP_USER` には **dev プロジェクトに実在する** Auth ユーザーを指定します。スクリプトは Auth を読むだけで、ユーザーの作成・変更は一切しません（メールで見つからない場合は UID を直接渡してください）。ダミーの占い師・会員は Auth に存在しない UID なのでログインはできません（一覧や予約の表示確認用）
- `FIRESTORE_EMULATOR_HOST` が未設定だと実行を拒否するので、dev / 本番に流れる心配はありません
- 文書（利用規約・キャンセルポリシー・プライバシーポリシー）の本文は `apps/api/scripts/seed-data/policy-*-initial.md` から読みます。各種別につき旧版（`2025-07-01`・非公開）と現行（`2026-01-01`・公開）の 2 版を入れるので、文書管理の改版履歴と差分を確認できます。旧版は本文の冒頭に旧版である旨の注記が入ります
- 施行日はどちらも過去日です。未来日にすると `findLatestPublished` が空になり、予約フローの規約同意チェックが通りません（`seed-initial-policies.ts` の既定 `2026-08-01` とは別扱い）

## よく使うコマンド

```bash
pnpm build            # 全パッケージのビルド
pnpm tsc              # 全パッケージの型チェック
pnpm test             # 全パッケージのテスト
pnpm lint / lint:fix  # Biome
pnpm generate         # Orval（API クライアント）+ Panda codegen の再生成
```

API エンドポイントを追加・変更したら `packages/api-client/openapi.yaml` を更新して `pnpm generate` を実行してください。
