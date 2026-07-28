---
name: update-roadmap
description: doc/ROADMAP.md のチェックボックスを現在の実装状態に合わせて更新する
user_invocable: true
---

`doc/ROADMAP.md` を、プロジェクトの現在の状態に基づいて更新してください。

## 前提となる構成

このリポジトリは pnpm workspace モノレポで、**Next.js は使っていません**。判定するときは以下の実体を見ます。

| 領域 | 実体 |
|---|---|
| API | `apps/api`（Hono + DDD 4 層）。ルートは `apps/api/src/presentation/organizations/*-routes.ts` |
| API スキーマ | `packages/api-client/openapi.yaml`（生成物 `src/generated/` は gitignore） |
| SPA | `apps/user` / `apps/console` / `apps/consultant`（Vite + TanStack Router、`src/routes/` が file-based routing） |
| 共有ロジック | `packages/shared`（純粋ロジック）/ `packages/console-core` / `packages/ui` |
| インフラ | `infra/terraform/gcp/{common,dev,prod}` / `.github/workflows/` / `Makefile` |
| バッチ | `apps/api/src/worker/batch-worker.ts`（Cloud Run Job） |

## 手順

1. `doc/ROADMAP.md` を読む
2. 各タスクについて、下表の方法で完了しているか判定する
3. 完了しているタスクは `[x]`、未完了は `[ ]` に更新する
4. **Phase 6 以降**: `git log --oneline` で最終行の PR より後にマージされた機能を洗い出し、行を追加する。ドメインルールを含むものは `doc/DDD_DESIGN.md` にも反映が必要なので、その旨を出力で指摘する
5. 変更があった場合のみファイルを編集する
6. 変更内容のサマリーを出力する

## 判定基準

| ロードマップの記述 | 判定方法 |
|---|---|
| API エンドポイント（`POST /api/...`） | `packages/api-client/openapi.yaml` にパスがあり、`apps/api/src/presentation/` に対応するハンドラがあるか |
| UseCase | `apps/api/src/application/<集約>/<name>-use-case.ts` が存在し、`apps/api/src/infrastructure/container.ts` から組み立てられているか |
| ドメイン集約・VO | `apps/api/src/domain/<集約>/` にファイルがあるか |
| Firestore コレクション | `apps/api/src/infrastructure/firestore/firestore-collections.ts` にキーがあるか |
| 画面 | 対応する `apps/*/src/routes/**.tsx`（と `apps/*/src/pages/`）が存在するか |
| Security Rules | `firestore.rules` / `storage.rules`（Terraform 管理。`infra/terraform/gcp/common/firebase-rules`） |
| 環境変数の設定 | `apps/api/.env.example` にキーがあり、かつ **`apps/api/src/config/env.server.ts` にアクセサがある**（Terraform / Makefile にあるだけでは未使用のことがある） |
| Terraform リソース | `infra/terraform/gcp/common/**/*.tf` に定義があるか。dev / prod で差がある場合は `.tfvars` と `.github/workflows/terraform-apply.yml` の matrix も見る |
| CI パイプライン | `.github/workflows/ci.yml` の job（現状 `tsc` / `test` / `lint-format` / `build` / `worker-docker-build`） |
| デプロイ | `.github/workflows/deploy-{api,hosting,batch-worker}.yml` と `Makefile` の `deploy-*` ターゲット |
| Lint / テスト設定 | `biome.json` / 各パッケージの `vitest.config.ts` |
| 型エラー解消 | `pnpm tsc` がエラー 0 で終了するか |

## 注意

- **「インフラに配線されている」と「コードから使われている」は別**。`INVOICE_REGISTRATION_NUMBER` のように Secret Manager・Makefile・デプロイスクリプトまで揃っていてもアプリが読んでいない例がある。環境変数系のタスクは `env.server.ts` まで確認する
- Phase 1〜5 の本文は当時の表記（Next.js / 相談員 / Arc - みらい予報）のまま残す方針。過去の記録を書き換えず、現行と異なる点は注記で補う
- 実装が存在しないのに `[x]` になっている項目を見つけたら、勝手に `[ ]` へ戻さず**出力で報告する**（仕様から外す判断が必要なことがあるため）
