---
name: new-page
description: Next.js App Router の新しいページ（layout, page, loading, error）を scaffold する
user_invocable: true
args: "<route_path>"
---

# 新しいページの作成

Next.js App Router のルーティング規約に従って新しいページを scaffold してください。

## 引数

- `route_path`: ルートパス（例: `booking`, `consultant/[id]`, `(dashboard)/settings`）

## 作成するファイル

`src/app/<route_path>/` 配下に以下を作成する（必要に応じて取捨選択）:

### 1. `page.tsx`（必須）

```typescript
// Server Component（デフォルト）
// データフェッチが必要なら async にする
// スタイリングは css() または styled-system/jsx を使用

import { css } from "styled-system/css";

export default function <PageName>Page() {
  return (
    <div className={css({ })}>
      {/* ページコンテンツ */}
    </div>
  );
}
```

- Server Component がデフォルト。クライアント操作が必要な部分だけ別コンポーネントに切り出して `"use client"` を付ける
- metadata は `export const metadata` または `export async function generateMetadata()` で定義

### 2. `layout.tsx`（共通レイアウトが必要な場合）

```typescript
import type { ReactNode } from "react";

export default function <Name>Layout({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
```

- Server Component として定義する
- `Providers` のようなクライアントラッパーが必要なら別ファイルに切り出す

### 3. `loading.tsx`（任意）

```typescript
import { Spinner } from "@/components/ui";

export default function Loading() {
  return <Spinner />;
}
```

### 4. `error.tsx`（任意）

```typescript
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>エラーが発生しました</h2>
      <button type="button" onClick={reset}>再試行</button>
    </div>
  );
}
```

- `"use client"` が必須

## ルール

- Server Component をデフォルトにする。`"use client"` は最小限のコンポーネントにだけ付ける
- スタイリングは Panda CSS（`css()` 関数 or `styled-system/jsx` の `styled` / `Box` 等）
- UI コンポーネントは `@/components/ui` から import する
- データフェッチは Server Component 内で直接行うか、TanStack Query を使う
- 動的ルートは `[param]` フォルダ規約に従う
- Route Group は `(group)` フォルダ規約に従う
- ユーザーにどのファイルが必要か確認してから作成する
