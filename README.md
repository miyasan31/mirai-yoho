# Arc - 未来予報

オンライン相談・予約サービス。pnpm workspace によるモノレポ構成です。

## 構成

| パッケージ | 役割 | デプロイ先 |
| --- | --- | --- |
| `apps/user` | 顧客向け予約 SPA（Vite + TanStack Router、認証なし） | Firebase Hosting（{hoge}.miraiyohou.com） |
| `apps/console` | 管理者・相談員向けコンソール SPA（Vite + TanStack Router） | Firebase Hosting（console.miraiyohou.com） |
| `apps/api` | API サーバー（Next.js Route Handlers + DDD 4層） + batch worker | Firebase App Hosting（api.miraiyohou.com）+ Cloud Run Job |
| `packages/api-client` | OpenAPI（openapi.yaml）+ Orval 生成の React Query hooks | - |
| `packages/ui` | Panda CSS preset + Park UI / Ark UI ベースの共有 UI | - |
| `packages/shared` | フロントと API で共有する純粋ロジック | - |

## 運用ドキュメント

- [システム環境構築・組織作成ガイド](doc/system-setup-and-organization.md)
- [Firebase App Hosting Secret 運用手順](doc/firebase-app-hosting-secrets.md)
- [Cloud Scheduler バッチ運用](doc/cloud-scheduler.md)
- [SPA 分割アーキテクチャと移行手順](doc/spa-split.md)

## Getting Started

```bash
pnpm install          # 依存インストール（orval / panda codegen も自動実行）

pnpm dev:api          # API サーバー (http://localhost:3000)
pnpm dev:user         # 顧客向け SPA (http://localhost:5173)
pnpm dev:console      # コンソール SPA (http://localhost:5174)
```

各アプリの環境変数は `apps/*/.env.example` を参照して `.env.local`（api）/ `.env`（user, console）を用意してください。
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
