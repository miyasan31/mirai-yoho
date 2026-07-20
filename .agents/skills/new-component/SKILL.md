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

- `apps/console`, `apps/consultant`: ページは `src/pages/<page_path>/page.tsx`。ページ固有のコンポーネントは `src/pages/<page_path>/_components/<component-name>.tsx` に置く（`src/routes/` 配下の TanStack Router のファイルベースルーティングは `pages/` を走査しないため、`_components` は単なる整理用の慣習ディレクトリ）
- `apps/user`: `src/routes/` 配下にページ固有コンポーネントを置く場合はファイル名先頭に `-` を付ける（例: `-booking-auth-gate.tsx`）。TanStack Router は `-` プレフィックスのファイル/ディレクトリをルート生成対象から除外する
- 複数ページで共有するコンポーネント → `src/components/<component-name>.tsx`

## パターン

```typescript
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Link, useNavigate } from "@tanstack/react-router";
import { styled } from "styled-system/jsx";

type <Name>Props = {
  // props
};

export function <Name>({ ... }: <Name>Props) {
  return (
    <styled.div>
      {/* コンテンツ */}
    </styled.div>
  );
}
```

## ルール

- 画面遷移は `@tanstack/react-router` の `Link` / `useNavigate`（`next/navigation` は存在しない。Next.js からは移行済み）
- スタイリングは Panda CSS（`styled-system/jsx` の `styled()` または `styled-system/css` の `css()`）
- UI プリミティブは `packages/ui` の `@mirai-yoho/ui/components/ui/*` から import する
- Props の型は `type` で定義する（`interface` ではなく）
- ファイル名は kebab-case（例: `booking-calendar.tsx`）
- コンポーネント名は PascalCase（例: `BookingCalendar`）
- アイコンは `lucide-react` から import する
