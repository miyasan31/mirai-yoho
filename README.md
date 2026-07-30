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

そのままデモとしてお客様に見せられる状態の組織を一式投入します。実行のたびに**対象組織のドキュメントを削除してから投入し直す**ので、前回の残骸が混ざることはなく、何度実行しても同じ状態になります（`users` と Zoom 連携情報は組織に紐づかないため消しません）。

件数はすべて固定です。データを増やすことではなく、**各画面が必要とする状態を 1 件ずつ用意すること**を基準に組み立てています（操作マニュアルの素材としてそのまま使えるように、空欄や「-」表示が残らないようにしています）。

| コレクション | 投入内容 |
| --- | --- |
| `organizations` / `settings` | 組織 1 件。営業時間は平日 11:00-22:00 / 土日 10:00-20:00・火曜定休・臨時休業 1 日、ステータスは標準（既定・30%）/ シルバー（25%）/ ゴールド（20%）、料金設定は 5,000 〜 20,000 円、会社情報あり |
| `roles` / `accounts` | 管理者・オペレーター（システムロール）+ カスタムロール「閲覧のみ」。稼働中の管理者（あなた）と招待中のオペレーター |
| `consultants` | 4 人（1 人目 = あなたの UID、残りはダミー。うち 1 人は活動休止）。ステータス・得意分野・担当時間帯をそれぞれ変えている |
| `price-plans` | 占い師ごとに 30 / 60 / 90 分。1 件だけアーカイブ済みにして「状態」列を確認できる |
| `slots` | 稼働中の占い師ごとに、今日から 7 日分。担当時間帯は占い師ごとに違い、定休日・臨時休業日・過ぎた時刻には作らない |
| `users` / `customers` | 会員 4 人（1 人目 = あなたの UID）と、対応する顧客（一部は顧客メモ付き） |
| `bookings` / `payments` | 18 件。今日（次の予約 / メモ未入力）・過去（課金待ち・評価・鑑定書）・未来（24 時間以内の未処理）・先月（精算書の明細）を網羅。決済は課金済み・課金待ち・カード未登録・キャンセルの 4 状態で、課金済みは課金経路（自動 / 手動）まで入る |
| `booking-ratings` | 5 / 4 / 3 / 2 点。未評価の完了予約も 1 件残しているので、apps/user の「未評価」バッジと評価導線を確認できる |
| `appraisal-reports` | 発行済み 2 通 + 下書き 1 通 |
| `coupons` / `user-coupons` | 新規会員登録クーポン（3 枚発行・90 日）、お誕生日クーポン（1 枚発行・30 日）、アーカイブ済みの終了キャンペーン 1 件。手持ちは登録クーポン 3 枚（未使用 2 / 使用済み 1）+ 誕生日 1 枚（期限切れ） |
| `policy-revisions` | 利用者向け 3 種 + 占い師向け 2 種 × 3 版（アーカイブ / 公開中 / 下書き）。改版履歴・差分・公開ダイアログをひととおり確認できる |

| 変数 | 既定値 | 説明 |
| --- | --- | --- |
| `ADMIN` | （必須） | console にログインする Auth ユーザーのメールアドレスまたは UID |
| `CONSULTANT` | `ADMIN` と同じ | consultant にログインする Auth ユーザー |
| `APP_USER` | `ADMIN` と同じ | user アプリにログインする Auth ユーザー（クーポン・予約の持ち主）。`USER` はシェルの環境変数と衝突するためこの名前 |
| `ORGANIZATION_ID` | `miraiyohou` | 組織 ID（各 SPA の URL パスに使う） |
| `ORGANIZATION_NAME` | `みらい予報` | 組織名 |
| `CONSULTANT_NAME` | `桜庭 静香` | あなたの占い師の表示名 |
| `DAYS` | `7` | 空き枠を作る日数（今日から） |

- Auth はエミュレートしないため、`ADMIN` / `CONSULTANT` / `APP_USER` には **dev プロジェクトに実在する** Auth ユーザーを指定します。スクリプトは Auth を読むだけで、ユーザーの作成・変更は一切しません（メールで見つからない場合は UID を直接渡してください）。ダミーの占い師・会員は Auth に存在しない UID なのでログインはできません（一覧や予約の表示確認用）
- 上記の理由で、**メールアドレスだけは Auth から引くため、ダミーの占い師・招待中のアカウントは console 上で空欄（`-`）になります**。マニュアルでメールアドレス欄を写す場合は、あなた自身の Auth ユーザーが入っている行（1 人目の占い師・管理者アカウント）を使ってください
- `FIRESTORE_EMULATOR_HOST` が未設定だと実行を拒否するので、dev / 本番に流れる心配はありません
- 文書（利用規約・キャンセルポリシー・プライバシーポリシー）の本文は `apps/api/scripts/seed-data/policy-*-initial.md` から読みます。各種別につきアーカイブ（`2025-07-01`）・公開中（`2026-01-01`）・下書き（`2026-10-01`）の 3 版を入れるので、文書管理の改版履歴・差分・公開ダイアログを確認できます。アーカイブと下書きは本文の冒頭にその旨の注記が入ります
- アーカイブと公開中の施行日はどちらも過去日です。未来日にすると `findLatestPublished` が空になり、予約フローの規約同意チェックが通りません（`seed-initial-policies.ts` の既定 `2026-08-01` とは別扱い）
- 占い師向けの文書に同意した記録は入れていないので、consultant のホームには「ポリシーの再同意」カードが出た状態になります

## よく使うコマンド

```bash
pnpm build            # 全パッケージのビルド
pnpm tsc              # 全パッケージの型チェック
pnpm test             # 全パッケージのテスト
pnpm lint / lint:fix  # Biome
pnpm generate         # Orval（API クライアント）+ Panda codegen の再生成
```

API エンドポイントを追加・変更したら `packages/api-client/openapi.yaml` を更新して `pnpm generate` を実行してください。
