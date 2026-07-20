---
name: new-api-endpoint
description: apps/api の Hono ルーター（apps/api/src/presentation/organizations/）に新しいエンドポイントを追加する。auth / 権限チェック / UseCase 呼び出し / error-mapper の流れを揃える
user_invocable: true
args: "<method> <path_segments>"
---

# 組織 API エンドポイントの追加

`apps/api/src/presentation/organizations/` 配下の Hono ルーターに新しいエンドポイントを追加してください。このディレクトリは機能ごとにルーターファイルが分かれており（`public-routes.ts` / `booking-routes.ts` / `console-role-routes.ts` / `batch-routes.ts` 等）、各ファイルは `new Hono()` インスタンスをエクスポートし、`organization-router.ts` の `createOrganizationRoutes()` で `routes.route("/:organizationId", xxxRoutes)` としてまとめてマウントされる。新しい endpoint は、既存の機能ルーターに追記するか、新規リソースなら新しいルーターファイルを作って `organization-router.ts` に登録する。

`new-api` スキルはクライアント側（TanStack Query hook、`packages/api-client`）を作るためのもの。このスキルはサーバ側の Hono ハンドラを足すためのものです。両方必要なときは別々に呼んでください。

## 引数

- `method`: `GET` | `POST` | `PATCH` | `DELETE` のいずれか
- `path_segments`: organizationId 配下の追加パス（例: `console/invoices`, `bookings/<bookingId>/cancel`, `consultants/<consultantId>/avatar`）。動的部分は `<...>` で示す

## エンドポイントの追加先を決める

既存の命名パターンに揃える:

- `console/...` … コンソール（管理者・オペレーター）向け、認証必須 → `console-*-routes.ts`
- `consultant/...` … 相談員向け、認証必須 → `consultant-*-routes.ts`
- 認証不要の顧客向け公開エンドポイント → `public-routes.ts` / `customer-*.ts`
- Cloud Scheduler 兼用のバッチ系 → `batch-routes.ts`

既存ファイルに機能追加するなら、そのファイル内の `xxxRoutes.get(...)` / `.post(...)` 等の末尾に新しいハンドラを追記する。新規リソースで既存ファイルのどれにも当てはまらない場合は新しいファイルを作り、`organization-router.ts` に `routes.route("/:organizationId", newRoutes)` を追加する。

## 標準テンプレート

各ハンドラは `apps/api/src/presentation/organizations/route-handler.ts` の `getRoute` / `postRoute` / `patchRoute` / `deleteRoute` でラップする。これらが try/catch・認可失敗ログ・`mapApiError` へのフォールバックを共通化している。

### 認証ありのエンドポイント（console 系）

```typescript
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { verifyAccountAuth } from "@/infrastructure/auth/verify-auth";
import { createCreateXxxUseCase } from "@/infrastructure/container";
import { getRoute, jsonError, noStoreJson, postRoute } from "./route-handler";

export const xxxRoutes = new Hono();

xxxRoutes.post(
  "/console/<resource>",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.<resource>.write");

    const body = await request.json();
    if (typeof body.foo !== "string" || body.foo.length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "foo is required");
    }

    const result = await createCreateXxxUseCase().execute({
      organizationId,
      foo: body.foo,
    });

    return Response.json(result, { status: 201 }); // 作成系は 201
  }),
);
```

### 公開エンドポイント（顧客フロー / 認証不要）

```typescript
publicRoutes.get(
  "/<resource>",
  getRoute(async ({ organizationId }) => {
    const result = await createXxxUseCase().execute({ organizationId });
    return withNoStore(Response.json(result));
    // ＊キャッシュ可なら withPublicShortCache（"../cache-control"）を使う
  }),
);
```

### Cloud Scheduler 兼用エンドポイント

`POST /console/.../batch-...` のように、Cloud Scheduler からも認証済みユーザーからも叩かれるなら `batch-routes.ts` の `authorizeBatchExecution()` パターンに従う（`verifyCloudSchedulerAuth` で先に判定し、失敗したら `verifyAccountAuth` + `requirePermission` にフォールバック）。

## 認証 / 認可ヘルパ

| 用途 | 関数 | import 元 |
| --- | --- | --- |
| Firebase ID token 検証（account） | `verifyAccountAuth(request)` | `@/infrastructure/auth/verify-auth` |
| 相談員トークン検証 | `verifyConsultantAuth(request)` | `@/infrastructure/auth/verify-auth` |
| account または consultant のどちらか | `verifyEitherAuth(request)` | `@/infrastructure/auth/verify-auth` |
| 組織内パーミッション必須 | `requirePermission(authUser, organizationId, "<key>")` | `@/infrastructure/auth/require-permission` |
| システム管理者ロール必須 | `requireSystemAdminRole(authUser, organizationId)` | `@/infrastructure/auth/require-permission` |
| ロール ID 必須 | `requireRoleId(authUser, roleId)` | `@/infrastructure/auth/require-role` |
| Cloud Scheduler 認証 | `verifyCloudSchedulerAuth(request)` | `@/infrastructure/auth/verify-cloud-scheduler-auth` |

permission key は `packages/shared/src/authorization-permission.ts` で定義されているものを使う（新規追加が必要なら先に `packages/shared` 側を更新してから `pnpm generate` は不要だが、domain 層のロール初期データも合わせて確認する）。

## レスポンス規約

| ステータス | 用途 | 関数 |
| --- | --- | --- |
| 200 | 取得・更新の成功 | `Response.json(payload)` / `noStoreJson(payload)`（キャッシュ無効化したい GET） |
| 201 | 新規作成の成功 | `Response.json(payload, { status: 201 })` |
| 204 | 削除の成功（ボディなし） | `new Response(null, { status: 204 })` |
| 400 | バリデーション失敗 | `jsonError(400, "VALIDATION_ERROR", "...")` |
| 404 | 該当リソースなし | `jsonError(404, "NOT_FOUND", "...")` |

キャッシュ可否は `withNoStore` / `withPublicShortCache`（`apps/api/src/presentation/cache-control.ts`、各ルーターからは相対 import）で明示する。GET でユーザー固有データなら `withNoStore`。

## エラー処理

`getRoute` / `postRoute` / `patchRoute` / `deleteRoute`（`route-handler.ts`）が共通の try/catch を持つ。ハンドラ内で個別に try/catch しない:

- `AuthError`（`@/infrastructure/auth/verify-auth` export）→ そのまま status / code を返す（403 は `security` カテゴリでログ）
- Firestore の `FAILED_PRECONDITION`（インデックス未作成）→ 500 `FIRESTORE_INDEX_MISSING`
- それ以外は `apps/api/src/presentation/organizations/api-error-mapper.ts` の `mapApiError()` に委譲
  - `DomainError` → 400 + domain code
  - `AppError` → status / code をそのまま返す
  - それ以外 → 500 `INTERNAL_ERROR`

UseCase 内で投げる失敗は `AppError` / `DomainError` を使うこと（domain / application 層で既に揃っている）。ハンドラ内で `throw new Error("...")` しない。

## 新規エンドポイント追加チェックリスト

1. 追加先のルーターファイルを決める（既存ファイルに足すか、新規ファイル + `organization-router.ts` への登録か）
2. `getRoute` / `postRoute` / `patchRoute` / `deleteRoute` でハンドラをラップし、Hono の `.get()` / `.post()` 等に渡す
3. 認証が必要なら `verifyAccountAuth` / `verifyConsultantAuth` + `requirePermission` / `requireSystemAdminRole`
4. リクエストボディは `await request.json()` → 必須フィールドの型チェック → 失敗なら `jsonError(400, "VALIDATION_ERROR", ...)`
5. 必要な UseCase ファクトリを `@/infrastructure/container` から import（無ければ `/new-usecase` を先に走らせて作る）
6. UseCase の戻り値をそのまま `Response.json` に渡す
7. permission key が新規なら `packages/shared/src/authorization-permission.ts` に追加する
8. `packages/api-client/openapi.yaml` にエンドポイントを追記し `pnpm generate` を実行する（クライアント側 hook が必要な場合。生成先の `packages/api-client/src/generated/` は手動編集しない）

## 別ファイルに切り出すべきとき

`apps/api/src/presentation/organizations/` に足すべきでないのは以下:

- **Webhook**（外部からの callback）: `apps/api/src/presentation/webhooks/<service>/` に独立したルーターを作る（既存 `webhooks/stripe` 参照）
- **Auth 系の専用フロー**（Zoom OAuth コールバックなど）: `apps/api/src/presentation/auth/` を参照
- **特定 organizationId に紐づかない API**: `apps/api/src/presentation/` 直下の別ルーターにする

判断に迷ったら必ずユーザーに確認する。

## ルール

- `packages/api-client/src/generated/` は触らない。OpenAPI のスキーマ変更が必要なときは `openapi.yaml` を更新して `pnpm generate` する
- ハンドラ内で `firebase-admin` を直接 import しない。Repository / Service 経由（`@/infrastructure/container` のファクトリ）に通す
- バリデーションは手書きの型ガードで OK（既存パターンに揃える）。クライアント側の Valibot スキーマを流用しない
- ユーザーに「permission key は何を使うか」「公開エンドポイントか console/consultant か」を必ず確認してから追加する
