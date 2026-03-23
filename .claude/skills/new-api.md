---
name: new-api
description: TanStack Query のカスタムフック（useQuery / useMutation）と Next.js API Route を scaffold する
user_invocable: true
args: "<resource_name>"
---

# API クライアント + キャッシュの作成

TanStack React Query を使った API クライアントフックと、必要に応じて Next.js Route Handler を scaffold してください。

## 引数

- `resource_name`: リソース名（例: `booking`, `consultant`, `slot`）

## 作成するファイル

### 1. Query Keys: `src/app/_hooks/<resource>Keys.ts`

```typescript
export const <resource>Keys = {
  all: ["<resource>"] as const,
  lists: () => [...<resource>Keys.all, "list"] as const,
  list: (filters: Record<string, unknown>) => [...<resource>Keys.lists(), filters] as const,
  details: () => [...<resource>Keys.all, "detail"] as const,
  detail: (id: string) => [...<resource>Keys.details(), id] as const,
};
```

### 2. Query Hook: `src/app/_hooks/use<Resource>.ts`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { <resource>Keys } from "./<resource>Keys";

async function fetch<Resource>(id: string) {
  const res = await fetch(`/api/<resource>/${id}`);
  if (!res.ok) throw new Error("Failed to fetch <resource>");
  return res.json();
}

export function use<Resource>(id: string) {
  return useQuery({
    queryKey: <resource>Keys.detail(id),
    queryFn: () => fetch<Resource>(id),
  });
}
```

### 3. Mutation Hook: `src/app/_hooks/useCreate<Resource>.ts`

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { <resource>Keys } from "./<resource>Keys";

async function create<Resource>(input: Create<Resource>Input) {
  const res = await fetch("/api/<resource>", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create <resource>");
  return res.json();
}

export function useCreate<Resource>() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: create<Resource>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: <resource>Keys.all });
    },
  });
}
```

### 4. Route Handler（必要な場合）: `src/app/api/<resource>/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // UseCase を呼び出してデータを返す
  return NextResponse.json({ });
}

export async function POST(request: Request) {
  const body = await request.json();
  // UseCase を呼び出して処理する
  return NextResponse.json({ }, { status: 201 });
}
```

## ルール

- Query の staleTime はデフォルト 60 秒（Providers で設定済み）
- Query Keys はファクトリパターンで定義する
- Mutation 成功時は `invalidateQueries` でキャッシュを無効化する
- fetch 関数はフック外に定義して分離する
- Route Handler では application 層の UseCase を呼び出す（infrastructure 層を直接使わない）
- フックは `"use client"` を付ける
- ファイル名は kebab-case（例: `use-booking.ts`, `booking-keys.ts`）
- ユーザーに必要なクエリ・ミューテーションの種類を確認してから作成する
