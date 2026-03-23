---
name: new-ui
description: Park UI / Ark UI ベースの新しい UI コンポーネントを追加する
user_invocable: true
args: "<component_name>"
---

# 新しい UI コンポーネントの追加

Park UI / Ark UI ベースの新しい UI コンポーネントを作成してください。

## 引数

- `component_name`: コンポーネント名（例: `checkbox`, `switch`, `tabs`）

## 作成するファイル

### 1. レシピ: `src/theme/recipes/<component_name>.ts`

コンポーネントの複雑さに応じて `defineRecipe` または `defineSlotRecipe` を使う。

**単純なコンポーネント（単一要素）→ `defineRecipe`:**

```typescript
import { defineRecipe } from "@pandacss/dev";

export const <name> = defineRecipe({
  className: "<name>",
  base: { /* ベーススタイル */ },
  variants: {
    variant: {
      solid: { /* ... */ },
      outline: { /* ... */ },
    },
    size: {
      sm: { /* ... */ },
      md: { /* ... */ },
    },
  },
  defaultVariants: {
    variant: "solid",
    size: "md",
  },
});
```

**複合コンポーネント（複数パーツ）→ `defineSlotRecipe`:**

```typescript
import { <name>Anatomy } from "@ark-ui/react";
import { defineSlotRecipe } from "@pandacss/dev";

export const <name> = defineSlotRecipe({
  className: "<name>",
  slots: <name>Anatomy.keys(),
  // slots を拡張する場合: <name>Anatomy.extendWith("header", "body").keys()
  base: {
    root: { /* ... */ },
    content: { /* ... */ },
  },
  variants: { /* ... */ },
  defaultVariants: { /* ... */ },
});
```

### 2. コンポーネント: `src/components/ui/<component_name>.tsx`

コンポーネントの複雑さに応じて3つのパターンがある。

**パターン A: シンプル styled（Input, Badge, Text など単一要素）**

```typescript
import { Field } from "@ark-ui/react/field"; // or ark
import type { ComponentProps } from "react";
import { styled } from "styled-system/jsx";
import { <name> } from "styled-system/recipes";

export type <Name>Props = ComponentProps<typeof <Name>>;
export const <Name> = styled(Field.Input, <name>); // or styled(ark.div, <name>)
```

**パターン B: SlotRecipe + createStyleContext（Dialog, Select, Field など複合コンポーネント）**

```typescript
"use client";
import { <Name> } from "@ark-ui/react/<name>";
import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { createStyleContext } from "styled-system/jsx";
import { <name> } from "styled-system/recipes";

const { withProvider, withContext } = createStyleContext(<name>);
// Root レベルは withRootProvider（Dialog 等 controlled の場合）または withProvider を使う

export type RootProps = ComponentProps<typeof Root>;
export const Root = withProvider(<Name>.Root, "root");
export const Content = withContext(<Name>.Content, "content");
export const Trigger = withContext(<Name>.Trigger, "trigger");
// 拡張スロットは ark.div を使う:
export const Body = withContext(ark.div, "body");
```

**パターン C: forwardRef + カスタムロジック（Button, Tooltip などロジック付き）**

```typescript
"use client";
import { ark } from "@ark-ui/react/factory";
import { type ComponentProps, forwardRef } from "react";
import { styled } from "styled-system/jsx";
import { <name> } from "styled-system/recipes";

const Base<Name> = styled(ark.button, <name>);

export interface <Name>Props extends ComponentProps<typeof Base<Name>> {
  // 追加 props
}

export const <Name> = forwardRef<HTMLButtonElement, <Name>Props>(
  function <Name>(props, ref) {
    const { ...rest } = props;
    return <Base<Name> ref={ref} {...rest} />;
  },
);
```

### 3. バレルエクスポートの更新

**`src/theme/recipes/index.ts`:**
- `import { <name> } from "./<name>";`
- `recipes` オブジェクト（単一）または `slotRecipes` オブジェクト（複合）に追加

**`src/components/ui/index.ts`:**
- 単一コンポーネント: `export { <Name>, type <Name>Props } from "./<name>";`
- 複合コンポーネント: `export * as <Name> from "./<name>";`

## 手順

1. まず既存の類似コンポーネントのレシピとコンポーネントを読み、パターンを把握する
2. Ark UI の該当コンポーネントの anatomy と API を確認する
3. レシピを作成する（単一 or 複合を判断）
4. コンポーネントを作成する（パターン A/B/C を判断）
5. バレルエクスポートを更新する（recipes/index.ts と ui/index.ts）

## ルール

- Ark UI (`@ark-ui/react`) のプリミティブを使用すること
- スタイリングは Panda CSS の recipe / slotRecipe で定義する
- プロジェクトのカラートークン（`colorPalette` パターン）やセマンティックトークンに従う
- `"use client"` は `createStyleContext` や `forwardRef` を使う場合に付ける
- アイコンは `lucide-react` から import する
- ファイル名は kebab-case
- コンポーネントの型は必ず export する
