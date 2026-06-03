---
name: new-component
description: ページ固有の機能コンポーネントを作成する（UI プリミティブではなくフィーチャーコンポーネント）
user_invocable: true
args: "<component_name> [page_path]"
---

# フィーチャーコンポーネントの作成

ページ固有のフィーチャーコンポーネントを作成してください。

## 引数

- `component_name`: コンポーネント名（例: `BookingCalendar`, `ConsultantCard`）
- `page_path`（任意）: 配置先のページパス（例: `booking`, `consultant/[id]`）

## 配置ルール

- ページ固有のコンポーネント → `src/app/<page_path>/_components/<componentName>.tsx`
- 複数ページで共有するコンポーネント → `src/components/<componentName>.tsx`

`_components` ディレクトリはルーティング対象外にするための Next.js 規約。

## パターン

### Server Component（デフォルト）

```typescript
import { css } from "styled-system/css";
import { Button, Text } from "@/components/ui";

type <Name>Props = {
  // props
};

export function <Name>({ ... }: <Name>Props) {
  return (
    <div className={css({ })}>
      {/* コンテンツ */}
    </div>
  );
}
```

### Client Component（インタラクションが必要な場合のみ）

```typescript
"use client";

import { type ComponentProps, forwardRef } from "react";
import { css } from "styled-system/css";
import { Button, Text } from "@/components/ui";

type <Name>Props = {
  // props
};

export function <Name>({ ... }: <Name>Props) {
  return (
    <div className={css({ })}>
      {/* コンテンツ */}
    </div>
  );
}
```

## ルール

- `"use client"` は本当に必要な場合（イベントハンドラ、hooks、ブラウザ API）だけ付ける
- スタイリングは Panda CSS（`css()` / `styled()` / `styled-system/jsx`）
- UI プリミティブは `@/components/ui` から import する
- Props の型は `type` で定義する（`interface` ではなく）
- ファイル名は kebab-case（例: `booking-calendar.tsx`）
- コンポーネント名は PascalCase（例: `BookingCalendar`）
- アイコンは `lucide-react` から import する
