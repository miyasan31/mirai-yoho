---
name: new-api-endpoint
description: 既存の組織 API（src/app/api/organizations/[organizationId]/[[...slug]]/route.ts）に新しいエンドポイントを追加する。auth / 権限チェック / UseCase 呼び出し / error-mapper の流れを揃える
user_invocable: true
args: "<method> <path_segments>"
---

# 組織 API エンドポイントの追加

`src/app/api/organizations/[organizationId]/[[...slug]]/route.ts` に新しいエンドポイントを追加してください。このファイルは catch-all ルートで、複数のリソースを slug 分岐で扱う「メガルート」です。新しい endpoint は基本的にここに足します。

`new-api` スキルはクライアント側（TanStack Query hook）を作るためのもの。このスキルはサーバ側のハンドラを足すためのものです。両方必要なときは別々に呼んでください。

## 引数

- `method`: `GET` | `POST` | `PATCH` | `DELETE` のいずれか
- `path_segments`: organizationId 配下の追加パス（例: `admin/invoices`, `bookings/<bookingId>/cancel`, `consultants/<consultantId>/avatar`）。動的部分は `<...>` で示す

## エンドポイントの分岐

メガルートでは `parseSlug(slug)` で配列にして条件分岐する。例:

```typescript
if (segments.length === 2 && segments[0] === "admin" && segments[1] === "invoices") {
  // /api/organizations/:organizationId/admin/invoices
}

if (segments.length === 3 && segments[0] === "bookings" && segments[2] === "cancel") {
  // /api/organizations/:organizationId/bookings/:bookingId/cancel
  const bookingId = segments[1];
}
```

新しい分岐は、対応する HTTP メソッドの関数（`GET` / `POST` / `PATCH` / `DELETE`）の `try` ブロック内、既存分岐の末尾 + `return jsonError(404, ...)` の直前に追加する。

## 標準テンプレート

### 認証ありのエンドポイント（admin 系）

```typescript
if (segments.length === 2 && segments[0] === "admin" && segments[1] === "<resource>") {
  const authUser = await verifyAuth(request);
  requireOrganizationPermission(authUser, organizationId, "<permission.key>");

  const body = await request.json(); // POST / PATCH のみ
  // バリデーション。失敗なら jsonError(400, "VALIDATION_ERROR", "...")
  if (typeof body.foo !== "string" || body.foo.length === 0) {
    return jsonError(400, "VALIDATION_ERROR", "foo is required");
  }

  const result = await createXxxUseCase().execute({
    organizationId,
    foo: body.foo,
  });

  return NextResponse.json(result, { status: 201 }); // 作成系は 201
}
```

### 公開エンドポイント（顧客フロー / 認証不要）

```typescript
if (segments.length === 1 && segments[0] === "<resource>") {
  // 認証なし、または token 検証のみ
  const result = await createXxxUseCase().execute({ organizationId });
  return withNoStore(NextResponse.json(result));
  // ＊キャッシュ可なら withPublicShortCache を使う
}
```

### Cloud Scheduler 兼用エンドポイント

`POST /admin/.../batch-...` のように、Cloud Scheduler からも user からも叩かれるなら `authorizeBatchExecution` を使う（既存の `batch-charge` を参照）。

## 認証 / 認可ヘルパ

| 用途 | 関数 | import 元 |
| --- | --- | --- |
| Firebase ID token 検証 | `verifyAuth(request)` | `@/infrastructure/auth/verify-auth` |
| 組織内パーミッション必須 | `requireOrganizationPermission(authUser, orgId, "<key>")` | `@/infrastructure/auth/require-organization-permission` |
| 組織内ロール必須 | `requireOrganizationRole(authUser, orgId, "admin" \| "consultant")` | `@/infrastructure/auth/require-organization-role` |
| システム管理者必須 | `requireSystemAdminRole(authUser, orgId)` | `@/infrastructure/auth/require-organization-permission` |
| Cloud Scheduler 認証 | `verifyCloudSchedulerAuth(request)` | `@/infrastructure/auth/verify-cloud-scheduler-auth` |

permission key は `src/domain/authorization/authorization-permission.ts` で定義されているものを使う（新規追加が必要なら先に domain 側を更新）。

## レスポンス規約

| ステータス | 用途 | 関数 |
| --- | --- | --- |
| 200 | 取得・更新の成功 | `NextResponse.json(payload)` |
| 201 | 新規作成の成功 | `NextResponse.json(payload, { status: 201 })` |
| 204 | 削除の成功（ボディなし） | `new NextResponse(null, { status: 204 })` |
| 400 | バリデーション失敗 | `jsonError(400, "VALIDATION_ERROR", "...")` |
| 403 | 公開フローの拒否 | `publicForbidden("...")` |
| 404 | 該当エンドポイントなし | 既存の末尾 `jsonError(404, "NOT_FOUND", ...)` に任せる |

キャッシュ可否は `withNoStore` / `withPublicShortCache`（`../../../cache-control` から import 済み）で明示する。GET でユーザー固有データなら `withNoStore`。

## エラー処理

各メソッド関数の `try` を貫通させる。`catch` は既にメガルート末尾で:

```typescript
} catch (error) {
  // ...
  const mappedError = mapApiError(error);
  return jsonError(mappedError.status, mappedError.code, mappedError.message);
}
```

の形になっている。`mapApiError` は以下を自動でハンドルするので、ハンドラ内で個別に try/catch しない:

- `AuthError` → そのまま status / code を返す
- `DomainError` → 400 + domain code
- `AppError` → status / code を返す
- それ以外 → 500 INTERNAL_ERROR

UseCase 内で投げる失敗は `AppError` / `DomainError` を使うこと（domain / application 層で既に揃っている）。ハンドラ内で `throw new Error("...")` しない。

## 新規エンドポイント追加チェックリスト

1. メガルート内 `GET` / `POST` / `PATCH` / `DELETE` のうち対応する関数を探す
2. 該当 segments の `if` ブロックを既存末尾の手前に挿入する
3. 認証が必要なら `verifyAuth` + `requireOrganizationPermission` / `requireOrganizationRole`
4. リクエストボディは `await request.json()` → 必須フィールドの型チェック → 失敗なら `jsonError(400, "VALIDATION_ERROR", ...)`
5. 必要な UseCase ファクトリを `@/infrastructure/container` から import（無ければ `/new-usecase` を先に走らせて作る）
6. UseCase の戻り値をそのまま `NextResponse.json` に渡す
7. permission key が新規なら `src/domain/authorization/authorization-permission.ts` に追加し、`SYSTEM_ADMIN_ONLY_PERMISSION_SET` か通常権限かを判断する
8. 副作用が大きい endpoint なら `console.info` で `category: "security-audit"` ログを残す（既存の batch endpoint 参照）

## 別ファイルに切り出すべきとき

メガルートに足すべきでないのは以下:

- **Webhook**（外部からの callback）: `src/app/api/webhooks/<service>/route.ts` に独立した route.ts を作る（既存 `webhooks/stripe/route.ts` 参照）
- **Auth 系の専用フロー**（セッション cookie 操作など）: `src/app/api/auth/<endpoint>/route.ts` を作る（既存 `auth/me/route.ts` 参照）
- **特定 organizationId に紐づかない API**: メガルートの外に作る

判断に迷ったら必ずユーザーに確認する。

## ルール

- `src/generated/api/`、`src/generated/schemas/` は触らない。OpenAPI のスキーマ変更が必要なときは `openapi.yaml` を更新して `pnpm generate` する
- ハンドラ内で `firebase-admin` を直接 import しない。Repository / Service 経由（container ファクトリ）に通す
- バリデーションスキーマ（Valibot）はクライアント側のものを再利用したい誘惑があるが、サーバ側は手書きの型ガードで OK（既存パターンに揃える）
- ユーザーに「permission key は何を使うか」「公開エンドポイントか admin か」を必ず確認してから追加する
