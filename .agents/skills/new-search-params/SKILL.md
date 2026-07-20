---
name: new-search-params
description: TanStack Router の validateSearch を使った型安全な SearchParams 管理を scaffold する
user_invocable: true
args: "<route_path>"
---

# SearchParams 管理の作成

TanStack Router（file-based routing）の `validateSearch` を使って、対象ルートに型安全な URL SearchParams 管理を scaffold してください。

このプロジェクトは nuqs も Next.js App Router も使いません。SPA（apps/user, apps/console, apps/consultant）はすべて Vite + TanStack Router で、search params はルートファイル自身の `validateSearch` オプションで管理します（`AGENTS.md` 参照）。

## 引数

- `route_path`: 対象ルートファイルのパス（例: `apps/user/src/routes/$organizationId/booking/index.tsx`）

## 編集するファイル

対象ルートファイル（新規ルートなら `new-page` 等で作成済みのファイル）に `validateSearch` を追加する。専用の hook ファイルは作らない。

```typescript
import { createFileRoute } from "@tanstack/react-router";

interface <RouteName>Search {
  consultantId?: string;
  startsAt?: string;
  durationMinutes?: number;
}

export const Route = createFileRoute("/$organizationId/booking/")({
  validateSearch: (search: Record<string, unknown>): <RouteName>Search => {
    const durationRaw = search.durationMinutes;
    const duration =
      typeof durationRaw === "number"
        ? durationRaw
        : typeof durationRaw === "string"
          ? Number(durationRaw)
          : undefined;
    return {
      consultantId:
        typeof search.consultantId === "string"
          ? search.consultantId
          : undefined,
      startsAt:
        typeof search.startsAt === "string" ? search.startsAt : undefined,
      durationMinutes:
        typeof duration === "number" && Number.isFinite(duration)
          ? duration
          : undefined,
    };
  },
  component: <RouteName>Page,
});
```

（実例: `apps/user/src/routes/$organizationId/booking/index.tsx`）

### コンポーネント内での読み取り

```typescript
function <RouteName>Page() {
  const { consultantId, startsAt } = Route.useSearch();
  // ...
}
```

### 遷移時に search params を渡す

```typescript
navigate({
  to: "/$organizationId/booking/payment",
  params: { organizationId },
  search: {
    bookingId: responseData.bookingId,
    bookingActionToken: responseData.bookingActionToken,
  },
});
```

`<Link>` の場合も同様に `search={{ ... }}` prop を渡す。他の search params を保持したくない遷移では `search: {}` を明示する（実例: `apps/user/src/routes/register.tsx`）。

## ルール

- `validateSearch` は `(search: Record<string, unknown>) => <Type>` という関数として書く。すべてのフィールドは `typeof` チェックで安全に取り出し、無効な値は `undefined` にフォールバックする（信頼できない入力として扱う）
- 型は `interface <RouteName>Search { ... }` としてルートファイル内に定義する（フィールドは基本 optional）。フォームの値検証（React Hook Form + Valibot）とは別物であり、search params の検証に Valibot は使わない
- 数値を受け取るフィールドは `string`（クエリ文字列由来）と `number`（クライアント内遷移由来）の両方を考慮し、`Number()` 変換 + `Number.isFinite` チェックを行う
- 読み取りは常に `Route.useSearch()` を使う（`useSearchParams` や自作フックは作らない）
- 専用の hook ファイル（`use<Something>.ts`）は作らない。search params の型とロジックはルートファイルに閉じ込める
- nuqs・zod・URLSearchParams の手動パースは使わない
- ユーザーに必要な search params のフィールド（キー名・型・必須/任意）を確認してから編集する
