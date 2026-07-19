---
name: new-form
description: React Hook Form + Valibot でフォームコンポーネントとバリデーションスキーマを scaffold する
user_invocable: true
args: "<form_name>"
---

# フォーム実装の作成

React Hook Form + Valibot を使ったフォームコンポーネントを scaffold してください。

## 引数

- `form_name`: フォーム名（例: `bookingForm`, `loginForm`）

## 作成するファイル

### 1. バリデーションスキーマ: `<form_name>Schema.ts`

```typescript
import * as v from "valibot";

export const <formName>Schema = v.object({
  name: v.pipe(v.string(), v.nonEmpty("名前は必須です")),
  email: v.pipe(v.string(), v.nonEmpty("メールアドレスは必須です"), v.email("メールアドレスの形式が正しくありません")),
  // フィールドを追加
});

export type <FormName>Values = v.InferOutput<typeof <formName>Schema>;
```

### 2. フォームコンポーネント: `<formName>.tsx`

```typescript
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { <formName>Schema, type <FormName>Values } from "./<formName>Schema";

type <FormName>Props = {
  onSubmit: (values: <FormName>Values) => void | Promise<void>;
  defaultValues?: Partial<<FormName>Values>;
};

export function <FormName>({ onSubmit, defaultValues }: <FormName>Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<<FormName>Values>({
    resolver: valibotResolver(<formName>Schema),
    defaultValues,
  });

  return (
    <styled.form onSubmit={handleSubmit(onSubmit)} display="flex" flexDir="column" gap="4">
      <Field.Root invalid={!!errors.name}>
        <Field.Label>名前</Field.Label>
        <Input {...register("name")} />
        {errors.name && <Field.ErrorText>{errors.name.message}</Field.ErrorText>}
      </Field.Root>

      <Button type="submit" loading={isSubmitting}>
        送信
      </Button>
    </styled.form>
  );
}
```

## ルール

- バリデーションは Valibot で定義する（Zod ではない）
- リゾルバは `@hookform/resolvers/valibot` の `valibotResolver` を使う
- Next.js ではないため `"use client"` は付けない（Vite + TanStack Router の SPA）
- UI コンポーネントは `@mirai-yoho/ui/components/ui/*`（`field`, `input`, `textarea`, `select`, `button` など）から個別 import する
- スキーマファイルとフォームコンポーネントファイルを分離する
- エラーメッセージは日本語で書く
- `type` でフォーム値の型を export する（`v.InferOutput` を使用）
- ユーザーにフォームのフィールド構成を確認してから作成する
