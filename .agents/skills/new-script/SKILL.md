---
name: new-script
description: apps/api/scripts/ 配下に seed / migration / 管理スクリプト（Firestore 直接操作）を scaffold する
user_invocable: true
args: "<script_name> [purpose]"
---

# 運用スクリプトの作成

`scripts/` 配下に seed / migration / 一時的な管理スクリプトを scaffold してください。`tsx --env-file=.env.local` で直接実行する Node スクリプトです。

## 引数

- `script_name`: スクリプト名（kebab-case、例: `seed-consultants`, `migrate-bookings-status`, `delete-stale-slots`）
- `purpose`: 任意のひとことメモ（例: `seed`, `migration`, `cleanup`）。スクリプト先頭のコメントに使う

## 作成するファイル

### `apps/api/scripts/<script-name>.ts`

スクリプトは `apps/api/scripts/` 配下に置く（リポジトリルートの `scripts/` はデプロイ用シェルとマニュアル生成ツール専用）。既存スクリプト（`apps/api/scripts/seed-slots.ts`, `delete-slots.ts`, `create-organization.ts`, `seed-initial-policies.ts`, `migrate-accounts.ts`）のパターンに従う。

Firestore admin の初期化方法は **2 パターン**ある:

#### パターン A: 共有 db を使う（推奨）

`src/infrastructure/firestore/firestore-customer.ts` の `db` / `app` を import する。複雑なドメインロジックや `firebase-admin/auth` を併用する場合はこちら。

```typescript
import { Timestamp } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { db } from "../src/infrastructure/firestore/firestore-customer";

async function main() {
  const [organizationId /*, ...args */] = process.argv.slice(2);

  if (!organizationId) {
    console.error(
      "Usage: pnpm dlx tsx --env-file=.env.local scripts/<script-name>.ts <organizationId>",
    );
    process.exit(1);
  }

  // 実処理
  console.log(`✅ done`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
```

#### パターン B: スクリプト内で initializeApp する

スクリプトを独立させたい単発の seed / delete 用途のときだけ使う。

```typescript
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

async function main() {
  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        });
  const db = getFirestore(app);

  // 実処理
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
```

## 書き分けの指針

- **複数ドキュメントを書く** → `db.batch()` で `batch.set` / `batch.delete` を積み、最後に `await batch.commit()`
- **全削除など件数が多い** → `BATCH_SIZE = 400` でループしながら `collection.limit(BATCH_SIZE + 1).get()` → batch.commit を繰り返す（`apps/api/scripts/delete-slots.ts` 参照）
- **既存コレクションの構造変換** → `migrate-drop-organization-prefix.ts` のように LEGACY → NEW で `BATCH_DOC_SIZE = 200` 単位でループ。`--dry-run` / `--delete-source` フラグを持たせ、冪等にする
- **Auth と組み合わせる** → `getAuth(app)` を使い、`auth.getUserByEmail` / `auth.createUser` / `auth.generatePasswordResetLink` を併用（`apps/api/scripts/create-organization.ts` 参照）

## Makefile への登録（任意）

何度も実行する想定なら、ルートの `Makefile` にターゲットを追加する（このリポジトリは `package.json` の `scripts` ではなく Makefile で運用スクリプトを叩く）。`ENV_FILE` と `:dev` / `:prod` サフィックスの流儀は既存ターゲットに合わせる。

```make
# Usage: make delete-slots [ENV=<local|dev|prod>]
delete-slots:
	@test "$(ENV)" = "local" || test "$(ENV)" = "dev" || test "$(ENV)" = "prod" || (echo "Error: ENV must be one of local, dev, prod" && exit 1)
	@test -f "$(ENV_FILE)" || (echo "Error: $(ENV_FILE) not found" && exit 1)
	pnpm dlx tsx --env-file=$(ENV_FILE) apps/api/scripts/delete-slots.ts
```

`.PHONY` への追加（`<name>` と `<name>\:dev` / `<name>\:prod`）も忘れないこと。一度きりの migration スクリプトなら登録不要で、`pnpm dlx tsx --env-file=.env.dev apps/api/scripts/<name>.ts` を README や PR 本文に書けばよい。

## ルール

- ファイル名は kebab-case
- ファイル冒頭に `Usage:` を JSDoc コメントで残す（既存スクリプトに揃える）
- 必須引数が無ければ `Usage:` を `console.error` で出して `process.exit(1)`
- コレクション名は必ず `FIRESTORE_COLLECTIONS` 経由で参照する（直書きしない）
- `Timestamp.now()` / `new Date()` の使い分けはエンティティ側の保存形に合わせる
- 完了ログは `✅` プレフィックスで件数を出す（既存スクリプトに揃える）
- 失敗時は `main().catch` で `console.error("Error:", error)` → `process.exit(1)`
- migration の冪等性（再実行で壊れないか）を冒頭コメントに明記する
- domain 層を import するときは集約のコンストラクタや factory（例: `OrganizationRole.createSystemAdmin`）を経由する。Firestore ドキュメントの形を直書きするのは scaffolding 直後のみ
- ユーザーに「seed / migration / cleanup のどれか」「対象コレクション」「冪等にするか」を確認してから作成する
