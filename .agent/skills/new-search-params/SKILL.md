---
name: new-search-params
description: nuqs を使った型安全な SearchParams 管理フックを scaffold する
user_invocable: true
args: "<params_name>"
---

# SearchParams 管理の作成

nuqs を使って型安全な URL SearchParams 管理を scaffold してください。

## 引数

- `params_name`: パラメータグループ名（例: `bookingFilter`, `consultantSearch`）

## 作成するファイル

### `src/app/_hooks/use<ParamsName>.ts`

```typescript
"use client";

import {
  parseAsString,
  parseAsInteger,
  parseAsStringEnum,
  parseAsArrayOf,
  useQueryStates,
  createSearchParamsCache,
} from "nuqs";

// パーサー定義
const parsers = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  status: parseAsStringEnum(["pending", "confirmed", "cancelled"]),
  sort: parseAsString.withDefault("createdAt"),
};

// Server Component 用キャッシュ
export const <paramsName>Cache = createSearchParamsCache(parsers);

// Client Component 用フック
export function use<ParamsName>() {
  return useQueryStates(parsers, {
    shallow: false, // サーバーへの再フェッチが必要な場合
  });
}
```

### 使い方の例

**Server Component:**

```typescript
import { <paramsName>Cache } from "@/app/_hooks/use<ParamsName>";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>;
}) {
  const { q, page, status } = await <paramsName>Cache.parse(searchParams);
  // サーバーサイドでパラメータを利用
}
```

**Client Component:**

```typescript
"use client";

import { use<ParamsName> } from "@/app/_hooks/use<ParamsName>";

export function FilterBar() {
  const [params, setParams] = use<ParamsName>();

  return (
    <input
      value={params.q}
      onChange={(e) => setParams({ q: e.target.value })}
    />
  );
}
```

## 利用可能なパーサー

- `parseAsString` — 文字列
- `parseAsInteger` — 整数
- `parseAsFloat` — 浮動小数点
- `parseAsBoolean` — 真偽値
- `parseAsStringEnum([...])` — 列挙型
- `parseAsArrayOf(parser)` — 配列
- `parseAsJson<T>()` — JSON
- `parseAsIsoDate` — ISO 日付

## ルール

- パーサーは `parsers` オブジェクトにまとめて定義する
- デフォルト値は `.withDefault()` で設定する
- Server Component 用には `createSearchParamsCache` を export する
- Client Component 用には `useQueryStates` を使ったカスタムフックを export する
- NuqsAdapter は `src/app/providers.tsx` で設定済み
- `shallow: false` はサーバーサイドのデータ再フェッチが必要な場合に使う
- ファイル名は kebab-case（例: `use-booking-filter.ts`）
- ユーザーに必要な SearchParams のフィールドを確認してから作成する
