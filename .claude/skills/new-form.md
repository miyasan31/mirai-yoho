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
"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { useForm } from "react-hook-form";
import { css } from "styled-system/css";
import { Button, Input, Field } from "@/components/ui";
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <Field.Root invalid={!!errors.name}>
        <Field.Label>名前</Field.Label>
        <Input {...register("name")} />
        {errors.name && <Field.ErrorText>{errors.name.message}</Field.ErrorText>}
      </Field.Root>

      <Button type="submit" loading={isSubmitting}>
        送信
      </Button>
    </form>
  );
}
```

## ルール

- バリデーションは Valibot で定義する（Zod ではない）
- リゾルバは `@hookform/resolvers/valibot` の `valibotResolver` を使う
- フォームコンポーネントは `"use client"` を付ける
- UI コンポーネントは `@/components/ui` の `Field`, `Input`, `Textarea`, `Select`, `Button` を使う
- スキーマファイルとフォームコンポーネントファイルを分離する
- エラーメッセージは日本語で書く
- `type` でフォーム値の型を export する（`v.InferOutput` を使用）
- ユーザーにフォームのフィールド構成を確認してから作成する
