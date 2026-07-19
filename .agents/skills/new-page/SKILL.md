---
name: new-page
description: TanStack Router の file-based routing で新しいページ（ルート）を scaffold する
user_invocable: true
args: "<route_path>"
---

# 新しいページの作成

TanStack Router の file-based routing 規約に従って新しいルートを scaffold してください。
（このリポジトリに Next.js は存在しない。`app/` ディレクトリや `page.tsx` / `layout.tsx` / `loading.tsx` / `error.tsx` という Next.js App Router の規約は適用されない）

## 引数

- `route_path`: ルートパス（例: `mypage/profile`, `$organizationId/booking`, `login`）

## 対象アプリの確認

`apps/user`・`apps/console`・`apps/consultant` のどのアプリに追加するかを最初に確認する。3 アプリとも Vite + `@tanstack/react-router` の SPA で、ルートディレクトリは `apps/<app>/src/routes/` 。

## ルーティング規約（TanStack Router file-based routing）

- ルートツリー（`src/routeTree.gen.ts`）は `vite.config.ts` の `tanstackRouter({ target: "react", autoCodeSplitting: true })`（`@tanstack/router-plugin/vite`）が dev/build 時に自動生成する。手動で再生成したい場合は各アプリの `pnpm generate`（= `panda codegen && tsr generate`）を実行する
- `routeTree.gen.ts` は `.gitignore` 済みの自動生成物。手動編集しない

### ファイル名規約

- `__root.tsx`: ルートレイアウト。`createRootRoute({ component, notFoundComponent })` で定義。各アプリに 1 つだけ存在済み（新規作成しない）
- `index.tsx`: そのディレクトリの `/` ルート（例: `mypage/index.tsx` → `/mypage`）
- `route.tsx`: そのディレクトリの pathless layout route。子ルートを `<Outlet />` でラップする共通レイアウト（例: `mypage/route.tsx`, `$organizationId/route.tsx`）
- `$param.tsx` / `$param/` ディレクトリ: 動的セグメント（例: `$organizationId`, `$id`）
- `-` プレフィックスのファイル・ディレクトリ: ルーティング対象外の co-located ファイル（フォームスキーマ、サブコンポーネントなど）。例: `$organizationId/booking/-booking-auth-gate.tsx`, `-booking-form-schema.ts`
- ディレクトリ区切りの代わりに `.` 区切りのフラットファイル名でネストを表現することもある（例: `apps/consultant/src/routes/$organizationId/bookings/$id.memo.tsx` → `/$organizationId/bookings/$id/memo`）

## 2 つのページ実装パターン

アプリによってページ本体の置き場所の慣習が異なる。既存の慣習に必ず合わせる。

### apps/user: ルートファイルにページ実装を直接書く

`src/pages/` ディレクトリは存在しない。`createFileRoute(...)` の `component` がそのままページ実装。

```typescript
// apps/user/src/routes/mypage/bookings.tsx の実例パターン
import { createFileRoute } from "@tanstack/react-router";
import { styled } from "styled-system/jsx";

export const Route = createFileRoute("/mypage/bookings")({
  component: MypageBookingsPage,
});

function MypageBookingsPage() {
  return <styled.div>{/* ページ内容 */}</styled.div>;
}
```

### apps/console, apps/consultant: ルートとページを分離する

`src/routes/**/*.tsx` は `createFileRoute` の薄いラッパーのみを書く。実装は `src/pages/<name>/page.tsx` に置き、テストや view-model も `src/pages/<name>/` 配下に co-locate する。

```typescript
// apps/console/src/routes/$organizationId/bookings.tsx（実例）
import { createFileRoute } from "@tanstack/react-router";
import ConsoleBookingsPage from "@/pages/bookings/page";

export const Route = createFileRoute("/$organizationId/bookings")({
  component: ConsoleBookingsPage,
});
```

組織スコープの layout route も同じ分離パターンに従う（実例: `apps/console/src/routes/$organizationId/route.tsx` が `@/pages/layout.tsx` の `ConsoleLayout` で `<Outlet />` をラップしている）。

## 作成するファイル

`route_path` と選んだパターンに応じて、以下から必要なものを作成する。

### 1. ルートファイル（必須）

`src/routes/<route_path>.tsx`（または `<route_path>/index.tsx`）

```typescript
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/<route_path>")({
  component: <PageName>,
});

function <PageName>() {
  return (
    // apps/user はここに直接実装 / console・consultant は @/pages/<name>/page から import
  );
}
```

- `createFileRoute` に渡す文字列はファイルパスから決まるルート id と一致させる（プラグインが typegen で検証する）

### 2. ページ実装（console/consultant のみ）

`src/pages/<name>/page.tsx` — apps/console, apps/consultant で分離パターンを使う場合のみ作成する

### 3. layout route（共通ナビ等が必要な場合）

`route.tsx` を対象ディレクトリに作成し、`createFileRoute("/<path>")({ component })` の component 内で `<Outlet />` を描画する。ナビゲーションが必要なら `useRouterState` で現在パスを取得し active 判定する（実例: `apps/user/src/routes/mypage/route.tsx`）

### 4. search params の検証（必要な場合）

nuqs 等は使わない。TanStack Router の `validateSearch` で行う（実例: `apps/user/src/routes/$organizationId/booking/index.tsx`）

```typescript
export const Route = createFileRoute("/$organizationId/booking/")({
  validateSearch: (search: Record<string, unknown>): BookingSearch => ({
    // 型安全にパース
  }),
  component: BookingPage,
});
```

- ページ内では `Route.useSearch()` / `Route.useParams()` で取得する

## ルール

- ページごとに `notFoundComponent` を作らない。404 は各アプリの `__root.tsx` の `notFoundComponent` が一括で処理する
- `loader` / `errorComponent` / `pendingComponent` は TanStack Router の機能として利用可能だが、このリポジトリでは現状どこにも使用例がない。追加が必要な場合は先にユーザーに確認する（既存の慣習を推測で作らない）
- スタイリングは Panda CSS（`styled-system/jsx` の `styled` コンポーネント、または `css()`）
- UI コンポーネントは `@mirai-yoho/ui/components/...` から import する
- console/consultant で組織スコープの機能を作る場合、`@mirai-yoho/console-core` の hooks（例: `useOrganizationRouting`）を活用する
- ファイル作成後は dev サーバー起動（`pnpm dev`）または `pnpm generate` で `routeTree.gen.ts` を再生成させる。生成物は手動編集しない
- ファイル名は kebab-case、動的セグメントは `$paramName`、ルーティング対象外の co-located ファイルは `-` プレフィックス
- ユーザーにどのアプリ・どのファイルが必要か確認してから作成する
