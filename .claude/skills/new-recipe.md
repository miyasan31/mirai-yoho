---
name: new-recipe
description: Panda CSS のレシピ（recipe / slotRecipe）を単体で scaffold する
user_invocable: true
args: "<recipe_name> [slot]"
---

# Panda CSS レシピの作成

Panda CSS のレシピを scaffold してください。

## 引数

- `recipe_name`: レシピ名（例: `card`, `avatar`, `tabs`）
- `slot`（任意）: `slot` を指定すると slotRecipe を作成する

## 作成するファイル

### 1. レシピファイル: `src/theme/recipes/<recipe_name>.ts`

**単一レシピ（`defineRecipe`）:**

```typescript
import { defineRecipe } from "@pandacss/dev";

export const <name> = defineRecipe({
  className: "<name>",
  base: {
    // ベーススタイル
  },
  variants: {
    variant: {
      solid: {
        bg: "colorPalette.solid.bg",
        color: "colorPalette.solid.fg",
        _hover: { bg: "colorPalette.solid.bg.hover" },
      },
      outline: {
        borderWidth: "1px",
        borderColor: "colorPalette.outline.border",
      },
    },
    size: {
      sm: { textStyle: "xs", px: "3", py: "1", gap: "1" },
      md: { textStyle: "sm", px: "4", py: "2", gap: "2" },
      lg: { textStyle: "md", px: "5", py: "3", gap: "2" },
    },
  },
  defaultVariants: {
    variant: "solid",
    size: "md",
  },
});
```

**複合レシピ（`defineSlotRecipe`）:**

```typescript
import { <name>Anatomy } from "@ark-ui/react";
import { defineSlotRecipe } from "@pandacss/dev";

export const <name> = defineSlotRecipe({
  className: "<name>",
  slots: <name>Anatomy.keys(),
  // カスタムスロットを追加する場合:
  // slots: <name>Anatomy.extendWith("header", "body", "footer").keys(),
  base: {
    root: { /* ... */ },
    content: { /* ... */ },
  },
  variants: {
    variant: { /* ... */ },
    size: { /* ... */ },
  },
  defaultVariants: {
    variant: "outline",
    size: "md",
  },
});
```

### 2. バレルエクスポートの更新: `src/theme/recipes/index.ts`

```typescript
import { <name> } from "./<name>";

// recipes オブジェクトに追加（単一レシピの場合）
export const recipes = {
  // ... 既存のレシピ
  <name>,
};

// slotRecipes オブジェクトに追加（複合レシピの場合）
export const slotRecipes = {
  // ... 既存のスロットレシピ
  <name>,
};
```

## デザイントークンの使い方

- カラー: `colorPalette.solid.bg`, `fg.default`, `fg.muted`, `border`
- テキスト: `textStyle: "sm"` / `"md"` / `"lg"` 等（`src/theme/text-styles.ts` 参照）
- シャドウ: `shadow: "sm"` / `"md"` 等
- 角丸: `borderRadius: "l1"` / `"l2"` / `"l3"`
- 間隔: Panda CSS のスペーシングスケール（`1` = 4px）
- Z-Index: `zIndex: "modal"` / `"popover"` 等
- アニメーション: `animationStyle: "scale-fade-in"` 等

## 条件（Conditions）

- `_hover`: `:not(:disabled):hover`
- `_active`: `:not(:disabled):active`
- `_invalid`: `:user-invalid, [data-invalid], [aria-invalid=true]`
- `_checked`: `:checked, [data-checked], [data-state=checked]`
- `_open` / `_closed`: `[data-state=open]` / `[data-state=closed]`

## ルール

- `@pandacss/dev` の `defineRecipe` / `defineSlotRecipe` を使う
- Ark UI コンポーネントと組み合わせる場合は anatomy を確認する
- `colorPalette` パターンを使って色をテーマ対応にする
- CSS 変数（`--<name>-*`）はコンポーネント固有の動的値に使う
- ファイル名は kebab-case
- 必ず `src/theme/recipes/index.ts` のバレルエクスポートを更新する
