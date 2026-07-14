# Arc - みらい予報

オンライン相談・予約サービス。pnpm workspace によるモノレポ構成です。

## 構成

| パッケージ | 役割 | デプロイ先 |
| --- | --- | --- |
| `apps/user` | 顧客向け予約 SPA（Vite + TanStack Router、認証なし） | Firebase Hosting（user.miraiyohou.com、組織は URL パス /<organizationId>/... で判別） |
| `apps/console` | 管理者・オペレーター向けコンソール SPA（Vite + TanStack Router） | Firebase Hosting（console.miraiyohou.com） |
| `apps/consultant` | 相談員向け SPA（Vite + TanStack Router） | Firebase Hosting（consultant.miraiyohou.com） |
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

pnpm dev              # 全サービスを同時起動
pnpm dev:api          # API サーバー (http://localhost:3000)
pnpm dev:user         # 顧客向け SPA (http://localhost:3010)
pnpm dev:console      # 管理コンソール SPA (http://localhost:3020)
pnpm dev:consultant   # 相談員向け SPA (http://localhost:3030)
```

各アプリの環境変数は `apps/*/.env.example` を参照して `.env.local`（api）/ `.env`（user, console, consultant）を用意してください。
API サーバーの `CORS_ALLOWED_ORIGINS` に SPA のオリジンを含める必要があります。

## よく使うコマンド

```bash
pnpm build            # 全パッケージのビルド
pnpm tsc              # 全パッケージの型チェック
pnpm test             # 全パッケージのテスト
pnpm lint / lint:fix  # Biome
pnpm generate         # Orval（API クライアント）+ Panda codegen の再生成
```

API エンドポイントを追加・変更したら `packages/api-client/openapi.yaml` を更新して `pnpm generate` を実行してください。
