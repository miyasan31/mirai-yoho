---
name: new-api
description: OpenAPI スペックにエンドポイントを追加し、Orval で生成される TanStack Query フック（useQuery / useMutation）を SPA から使えるようにする
user_invocable: true
args: "<resource_name>"
---

# API クライアント + キャッシュの作成

`packages/api-client/openapi.yaml` にエンドポイントを追加し、`pnpm generate` で Orval に React Query hooks を生成させ、SPA（apps/user, apps/console, apps/consultant）側にアプリ固有のラッパーフックを scaffold してください。

## 引数

- `resource_name`: リソース名（例: `booking`, `consultant`, `slot`）

## 手順

### 1. OpenAPI スペックにエンドポイントを追加: `packages/api-client/openapi.yaml`

`paths` に operationId・tags・security・requestBody・responses を定義する。`tags` が生成時のファイル分割単位になる（例: `tags: [booking]` → `src/generated/api/booking/booking.ts`）。

```yaml
paths:
  /organizations/{organizationId}/<resource>:
    get:
      operationId: getConsole<Resource>
      summary: <resource> 一覧取得
      tags: [console]
      security:
        - bearerAuth: []
      parameters:
        - name: organizationId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/<Resource>List"
```

必要なスキーマは `components/schemas` に追加する。

### 2. 生成コマンドを実行

```sh
pnpm generate
```

ルートの `generate` は `pnpm -r --if-present run generate` で全パッケージに伝播し、`packages/api-client` では `orval`（設定: `orval.config.ts`）が `src/generated/api/` と `src/generated/schemas/` を再生成する。このディレクトリは gitignore 済みで手動編集しない。

生成される主なもの:
- `use<OperationId 先頭を Get/Create/Update/... に正規化したもの>`（例: `useGetConsoleCoupons`, `useCreateConsoleCoupon`）
- クエリキーヘルパー（例: `getGetConsoleCouponsQueryKey`）
- リクエスト/レスポンス型（`src/generated/schemas/index.ts` 経由でエクスポート）

mutator は `src/custom-fetch.ts` の `customFetch`（`orval.config.ts` の `override.mutator` で指定）。認証トークン付与・エラーハンドリング（401/403/404/その他）はここに集約されているので、生成フック側やアプリ側で個別に fetch ロジックを書かない。

### 3. アプリ側のラッパーフック: `apps/<app>/src/hooks/use-<resource>.ts`

生成された低レベルフックを直接コンポーネントで使わず、`enabled` 条件・`staleTime`・`organizationId` 解決・権限チェックを付けたラッパーフックを作る。

```typescript
import { useGetConsole<Resource> } from "@mirai-yoho/api-client/api/console/console";
import type { GetConsole<Resource>Params } from "@mirai-yoho/api-client/schemas";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

export function useConsole<Resource>(params?: GetConsole<Resource>Params) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsole<Resource>(organizationId ?? "", params, {
    query: {
      enabled:
        !!token && !!organizationId && hasPermission("console.<resource>.read"),
      staleTime: QUERY_STALE_TIME.short,
    },
  });
}
```

mutation フックは生成されたものをそのまま re-export するか、`apps/user/src/hooks/use-price-plans.ts` のように薄くラップする。キャッシュ無効化は呼び出し側コンポーネントで `queryClient.invalidateQueries({ queryKey: getGet<Resource>QueryKey(organizationId) })` のように生成済みのクエリキーヘルパーを使う（`apps/console/src/pages/coupons/page.tsx` 参照）。

### 4. コンポーネントでの利用

```typescript
import { useConsole<Resource> } from "@/hooks/use-console-<resource>";

const { data, isLoading } = useConsole<Resource>();
```

`configureApiClient()`（`@mirai-yoho/api-client/custom-fetch`）は各アプリの起動時に一度だけ呼ぶ。apps/user では `apps/user/src/lib/api-client.ts` の `setupApiClient()`、apps/console・apps/consultant では共有の `@mirai-yoho/console-core/lib/api-client.ts` の `setupApiClient()` を、それぞれ `main.tsx` から呼び出している。新しいリソースを追加するだけであれば、この初期化コードを変更する必要はない。

## ルール

- `packages/api-client/src/generated/` は手動編集しない。エンドポイント変更は必ず `openapi.yaml` → `pnpm generate` の順で行う
- Query の `staleTime` はアプリごとの `query-cache-policy.ts`（`QUERY_STALE_TIME.short` / `normal` など）から選ぶ
- 生成された低レベルフックをコンポーネントで直接呼ばず、`enabled` や権限チェックを付けたアプリ側ラッパーフックを介す
- Mutation 成功時は生成済みのクエリキーヘルパー（`getGet<Resource>QueryKey` 等）で `invalidateQueries` する
- SPA から `@mirai-yoho/api-client` の生成 hooks 以外の手段（生の `fetch` など）で API を呼ばない
- ファイル名は kebab-case（例: `use-console-coupons.ts`）
- ユーザーに必要なクエリ・ミューテーションの種類を確認してから作成する
