---
name: directory-guide
description: bulletproof-react を参考にしたディレクトリ設計ガイド — ファイルの配置場所を判断する
user_invocable: true
args: "[check]"
---

# ディレクトリ設計ガイド

bulletproof-react を参考にした、このプロジェクトのディレクトリ構成ガイドです。
mirai-yoho は pnpm workspace モノレポ（`apps/*` + `packages/*`）で、Next.js ではなく
Hono API（apps/api）と 3 つの Vite + TanStack Router SPA（apps/user / apps/console / apps/consultant）
から構成されます。新しいファイルの配置先を判断する、または既存の配置をレビューするために使ってください。
引数に `check` が指定された場合は、既存のディレクトリ構成の違反を検出・報告する。

---

## ディレクトリ構成

```
mirai-yoho/                             # pnpm workspace モノレポ
├── apps/
│   ├── api/                            # Hono API サーバー + batch worker
│   │   └── src/
│   │       ├── domain/                 # Domain 層（外部依存ゼロ、@mirai-yoho/shared のみ import 可）
│   │       │   ├── shared/             # aggregate-root.ts / domain-event.ts / transaction-scope.ts
│   │       │   └── <aggregate>/        # booking, consultant, payment, user, organization ...
│   │       │       ├── <aggregate>.ts            # 集約ルート
│   │       │       ├── <value-object>.ts         # 値オブジェクト
│   │       │       ├── <aggregate>-events.ts      # ドメインイベント
│   │       │       └── <aggregate>-repository.ts  # Repository Interface
│   │       │
│   │       ├── application/            # Application 層（ユースケース）
│   │       │   ├── shared/             # email-service.ts / stripe-service.ts / zoom-service.ts / unit-of-work.ts 等
│   │       │   └── <aggregate>/
│   │       │       └── <action>-<aggregate>-use-case.ts
│   │       │
│   │       ├── infrastructure/         # Infrastructure 層（外部サービス実装、サービスごとにディレクトリ）
│   │       │   ├── firestore/          # firestore-<aggregate>-repository.ts
│   │       │   ├── stripe/
│   │       │   ├── resend/
│   │       │   ├── zoom/
│   │       │   ├── auth/ crypto/ firebase/ line-works/ token/
│   │       │
│   │       ├── presentation/           # Presentation 層（Hono ルーター）
│   │       │   ├── organizations/      # <resource>-routes.ts（booking-routes.ts 等）+ error-mapper 等
│   │       │   ├── auth/
│   │       │   ├── customer/
│   │       │   └── webhooks/
│   │       │
│   │       ├── worker/                 # batch worker（コマンドハンドラ）
│   │       ├── server/                 # サーバーエントリ
│   │       ├── config/
│   │       └── lib/
│   │
│   ├── user/                           # 顧客向け予約 SPA（Vite + TanStack Router、認証なし）
│   │   └── src/
│   │       ├── routes/                 # file-based routing。ページロジックをルートファイルに直接書く
│   │       │   └── $organizationId/booking/
│   │       │       ├── index.tsx                  # ページ本体（component）
│   │       │       ├── -booking-auth-gate.tsx      # ページ固有コンポーネント（`-` プレフィックスで co-locate）
│   │       │       └── -booking-form-schema.ts     # ページ固有 Valibot スキーマ
│   │       ├── hooks/                  # アプリ内で共有するカスタムフック
│   │       ├── lib/                    # api-client.ts / firebase.ts 等
│   │       ├── components/             # 複数ルートで共有するコンポーネント
│   │       └── config/
│   │
│   ├── console/                        # 管理者・オペレーター向けコンソール SPA（console.miraiyohou.com）
│   │   └── src/
│   │       ├── routes/                 # 薄いラッパー（createFileRoute + pages/ の component を紐付けるだけ）
│   │       │   └── $organizationId/bookings.tsx
│   │       ├── pages/                  # 実ページ実装
│   │       │   └── <name>/
│   │       │       ├── page.tsx                    # ページ本体
│   │       │       ├── __tests__/
│   │       │       ├── <name>-form-schema.ts        # ページ固有スキーマ（ページ直下）
│   │       │       └── _components/                 # 複数タブ等に分割する場合のみ（settings/ 参照）
│   │       ├── hooks/
│   │       └── components/
│   │
│   └── consultant/                     # 相談員向け SPA（consultant.miraiyohou.com、console と同じ構成）
│       └── src/                        # routes/ + pages/(<name>/page.tsx, __tests__/) + hooks/ + components/
│
└── packages/
    ├── api-client/                     # OpenAPI スペック + Orval 生成 React Query hooks
    │   ├── openapi.yaml                # スペック本体（エンドポイント追加時はまずここを更新）
    │   ├── orval.config.ts
    │   └── src/
    │       ├── custom-fetch.ts         # 手動管理。各アプリが configureApiClient() で初期化
    │       └── generated/              # gitignore 済み。`pnpm generate` で再生成、手動編集しない
    │
    ├── console-core/                   # console / consultant のみが使う共有ロジック（panda 非依存）
    │   └── src/
    │       ├── hooks/                  # use-organization-routing.ts 等
    │       ├── lib/                    # api-client.ts / firebase.ts / app-path.ts
    │       └── config/                 # env.client.ts
    │
    ├── ui/                             # Panda CSS preset + Park UI / Ark UI ベースの共有コンポーネント（3 SPA 共通）
    │   ├── panda.preset.ts             # miraiYohoPreset（各アプリの panda.config.ts の presets に渡す）
    │   └── src/
    │       ├── components/
    │       │   ├── ui/                 # デザインシステムのプリミティブ（button.tsx, dialog.tsx, index.ts 等）
    │       │   └── <name>.tsx          # empty-state.tsx 等、プリミティブでない共有コンポーネント
    │       └── theme/
    │           ├── recipes/            # コンポーネントレシピ + index.ts
    │           ├── tokens/
    │           └── colors/
    │
    └── shared/                         # フロントと API の両方で使う純粋ロジック（フレームワーク非依存）
        └── src/
            └── <name>.ts               # ファイル単位（サブディレクトリなし）。domain-error.ts, slot-availability.ts 等
```

各パッケージは `package.json` の `exports` でサブパスを個別公開している（例:
`@mirai-yoho/ui/components/ui`, `@mirai-yoho/shared/domain-error`,
`@mirai-yoho/console-core/hooks/*`, `@mirai-yoho/api-client/api/*`）。
新しいファイルを追加したら、他パッケージから import する必要があるものは `exports` にも追記する。

---

## 配置判断フローチャート

ファイルをどこに置くか迷ったら、まず「どのパッケージか」を決め、次にパッケージ内の配置を決める。

```
作りたいものは何？
│
├─ API のビジネスロジック / ルール（Firestore で永続化される集約）？
│   ├─ エンティティ / 値オブジェクト → apps/api/src/domain/<aggregate>/
│   ├─ 複数集約をまたぐ処理 → apps/api/src/application/<aggregate>/<action>-<aggregate>-use-case.ts
│   └─ 外部サービスの抽象（Interface） → apps/api/src/application/shared/<name>-service.ts
│
├─ 外部サービスの具体実装（Firestore / Stripe / Zoom / Resend 等）？
│   └─ apps/api/src/infrastructure/<service>/
│
├─ API のエンドポイント（Hono ルーター）？
│   └─ apps/api/src/presentation/organizations/<resource>-routes.ts
│      （認証系は presentation/auth/、Webhook は presentation/webhooks/）
│
├─ batch worker のコマンドハンドラ？
│   └─ apps/api/src/worker/
│
├─ SPA のページ / UI？ どのアプリか（apps/user / apps/console / apps/consultant）でパターンが違う
│   │
│   ├─ apps/user（ページロジックをルートファイルに直接書く）
│   │   ├─ ページ → src/routes/<path>.tsx（file-based routing）
│   │   └─ そのページでしか使わないコンポーネント / フック / スキーマ
│   │       → 同じディレクトリに `-` プレフィックスで co-locate
│   │         例: src/routes/$organizationId/booking/-booking-form-schema.ts
│   │
│   └─ apps/console, apps/consultant（route.tsx は薄いラッパー、実装は pages/ 配下）
│       ├─ ルート定義（component を pages/<name>/page.tsx に紐付けるだけ） → src/routes/.../<name>.tsx
│       ├─ ページ実装 → src/pages/<name>/page.tsx
│       └─ ページを複数ブロックに分割したい場合のサブコンポーネント → src/pages/<name>/_components/<name>.tsx
│
├─ 3 SPA（user / console / consultant）すべてで共有する UI コンポーネント？
│   ├─ Park UI / Ark UI ベースのデザインシステムプリミティブ → packages/ui/src/components/ui/<name>.tsx
│   └─ それ以外の共有コンポーネント → packages/ui/src/components/<name>.tsx
│
├─ console / consultant の 2 SPA で共有する認証・API クライアント初期化・組織ルーティング等のロジック？
│   └─ packages/console-core/src/{hooks,lib,config}/<name>.ts
│      （apps/user はこのパッケージに依存しない。user 専用の同種ロジックは apps/user/src/{hooks,lib}/ に置く）
│
├─ 1 アプリ内の複数ページで共有するが、他アプリでは使わないコンポーネント / フック？
│   └─ apps/<app>/src/{components,hooks}/<name>.ts(x)
│
├─ フロントエンドと API の両方で使う純粋ロジック（バリデーション、ドメインエラー基底クラス等）？
│   └─ packages/shared/src/<name>.ts（package.json の exports にサブパスを追記）
│
├─ API クライアントの手動管理部分（custom fetch 等）？
│   └─ packages/api-client/src/custom-fetch.ts
│      （src/generated/ は Orval が生成する。openapi.yaml を更新して `pnpm generate` を実行、手動編集しない）
│
├─ スタイリング（レシピ / トークン）？
│   └─ packages/ui/src/theme/recipes/ or packages/ui/src/theme/tokens/
│
└─ バリデーションスキーマ？
    └─ コンポーネントと同じディレクトリに配置
       apps/user:               src/routes/<route>/-<form-name>-schema.ts
       apps/console/consultant: src/pages/<name>/<form-name>-schema.ts
```

---

## コロケーション原則（bulletproof-react）

### 原則 1: 使う場所の近くに置く

ファイルは、それを使うコードの **最も近い共通の親ディレクトリ** に置く。

```
# 良い例（apps/user）: booking ページでしか使わないフォームは同じディレクトリに co-locate
apps/user/src/routes/$organizationId/booking/
  ├── index.tsx                    ← ここで使う
  ├── -booking-auth-gate.tsx       ← だからここに置く（`-` プレフィックスでルーティング対象外）
  └── -booking-form-schema.ts      ← スキーマもセットで

# 良い例（apps/console）: settings ページ内の複数タブは _components/ に分割
apps/console/src/pages/settings/
  ├── page.tsx
  └── _components/
      ├── booking-settings-tab.tsx
      └── business-hours-settings-tab.tsx

# 悪い例: 1 ページでしか使わないのにアプリ共通 components/ に置く
apps/user/src/components/
  └── booking-form.tsx             ← NG: 遠すぎる
```

### 原則 2: 共有が増えたら引き上げる

引き上げの判断基準：

| 使用箇所 | 配置先 | 例 |
|---|---|---|
| 1 ページのみ | apps/user: `src/routes/<route>/-<name>.tsx`<br>console/consultant: `src/pages/<name>/_components/` | 予約フォーム |
| 同じアプリ内の複数ページ | `apps/<app>/src/components/`, `apps/<app>/src/hooks/` | 戻るボタン等の共通コンポーネント |
| console / consultant の 2 アプリで共有 | `packages/console-core/src/{hooks,lib}/` | 組織ルーティング、認証フック |
| 3 SPA すべて（デザインシステム）で共有 | `packages/ui/src/components/` | 空状態表示、ステータスバッジ |
| デザインシステムのプリミティブ | `packages/ui/src/components/ui/` | Button, Dialog, Table |

```
# 引き上げの流れ
# Step 1: 最初は console の booking ページ固有
apps/console/src/pages/bookings/_components/status-badge.tsx

# Step 2: consultant でも使うことになった → packages/ui へ引き上げ
packages/ui/src/components/status-badge.tsx
```

**引き上げるタイミング:**
- 2 箇所目で使うことになったとき（予防的に引き上げない）
- import パスに `../../../` が 3 つ以上並んだとき

**引き上げないもの:**
- ページ固有のフォーム、フィルター、詳細表示
- ページ固有のフック（SearchParams 管理など）

### 原則 3: `-` プレフィックスでルーティング対象外にする（apps/user）

TanStack Router の file-based routing では、`-` で始まるファイル / ディレクトリはルート生成の対象外になる
（Next.js の `_` プレフィックスとは異なるので注意）。ページロジックを `src/routes/` に直接書く apps/user で使う。

```
apps/user/src/routes/$organizationId/booking/
  ├── index.tsx              ← /$organizationId/booking でアクセス可能
  ├── -booking-auth-gate.tsx ← ルーティング対象外（コンポーネント置き場）
  └── -booking-form-schema.ts ← ルーティング対象外（スキーマ置き場）
```

apps/console / apps/consultant はページ実装を `src/pages/` に置き、`src/routes/` にはルート定義の薄いラッパー
（`createFileRoute` + component の紐付け）しか置かないため、`src/routes/` 配下で `-` プレフィックスの
co-located ファイルは基本的に発生しない。ページ内の分割は `src/pages/<name>/_components/` を使う。

### 原則 4: 関心ごとでまとめる（DDD 層、apps/api のみ）

apps/api のドメインロジックは **集約** を軸にまとめる。同じ集約に関するものは同じディレクトリに入れる。

```
# 「予約」に関するものは全て booking/ にまとまる
apps/api/src/domain/booking/
  ├── booking.ts               # 集約ルート
  ├── booking-status.ts        # 値オブジェクト
  ├── booking-events.ts        # ドメインイベント
  ├── cancel-deadline.ts       # 値オブジェクト
  └── booking-repository.ts    # Repository Interface

apps/api/src/application/booking/
  ├── create-booking-use-case.ts
  └── cancel-booking-use-case.ts
```

infrastructure 層は **サービス** を軸にまとめる。

```
apps/api/src/infrastructure/firestore/
  ├── firestore-booking-repository.ts
  ├── firestore-consultant-repository.ts
  └── ...
```

---

## 配置リファレンス表

### apps/api（DDD 4 層）

| 作りたいもの | 配置先 |
|---|---|
| 集約ルート | `apps/api/src/domain/<aggregate>/<aggregate>.ts` |
| 値オブジェクト | `apps/api/src/domain/<aggregate>/<value-object>.ts` |
| ドメインイベント | `apps/api/src/domain/<aggregate>/<aggregate>-events.ts` |
| Repository Interface | `apps/api/src/domain/<aggregate>/<aggregate>-repository.ts` |
| UseCase | `apps/api/src/application/<aggregate>/<action>-<aggregate>-use-case.ts` |
| サービス Interface | `apps/api/src/application/shared/<name>-service.ts` |
| Firestore 実装 | `apps/api/src/infrastructure/firestore/firestore-<name>-repository.ts` |
| 外部サービス実装 | `apps/api/src/infrastructure/<service>/<name>-service.ts` |
| Hono ルート | `apps/api/src/presentation/organizations/<resource>-routes.ts` |
| batch ハンドラ | `apps/api/src/worker/` |

### SPA（apps/user / apps/console / apps/consultant）

| 作りたいもの | 配置先 |
|---|---|
| ページ（apps/user） | `apps/user/src/routes/<path>.tsx` |
| ページ実装（console/consultant） | `apps/<app>/src/pages/<name>/page.tsx` |
| ルート定義（console/consultant） | `apps/<app>/src/routes/.../<name>.tsx`（page.tsx を紐付ける薄いラッパー） |
| ページ固有コンポーネント（user） | `apps/user/src/routes/<route>/-<name>.tsx` |
| ページ固有コンポーネント（console/consultant） | `apps/<app>/src/pages/<name>/_components/<name>.tsx` |
| ページ固有スキーマ（user） | `apps/user/src/routes/<route>/-<form-name>-schema.ts` |
| ページ固有スキーマ（console/consultant） | `apps/<app>/src/pages/<name>/<form-name>-schema.ts` |
| アプリ内共有コンポーネント / フック | `apps/<app>/src/{components,hooks}/<name>.ts(x)` |

### packages（共有）

| 作りたいもの | 配置先 |
|---|---|
| 共有 UI プリミティブ（3 SPA） | `packages/ui/src/components/ui/<name>.tsx` |
| 共有コンポーネント（3 SPA） | `packages/ui/src/components/<name>.tsx` |
| レシピ | `packages/ui/src/theme/recipes/<name>.ts` |
| デザイントークン | `packages/ui/src/theme/tokens/<name>.ts` |
| console/consultant 共有ロジック | `packages/console-core/src/{hooks,lib,config}/<name>.ts` |
| フロント/API 共有の純粋ロジック | `packages/shared/src/<name>.ts` |
| API クライアント手動管理部分 | `packages/api-client/src/custom-fetch.ts` |
| OpenAPI スペック | `packages/api-client/openapi.yaml` |

---

## 命名規則

### ファイル名: kebab-case

| 対象 | ファイル名 | 例 |
|---|---|---|
| コンポーネント | kebab-case | `booking-calendar.tsx` |
| フック | use-kebab-case | `use-booking.ts` |
| UseCase | kebab-case | `create-booking-use-case.ts` |
| Repository Interface | kebab-case | `booking-repository.ts` |
| ドメインイベント | kebab-case | `booking-events.ts` |
| 値オブジェクト | kebab-case | `booking-status.ts` |
| フォームスキーマ | kebab-case | `booking-form-schema.ts` |
| レシピ | kebab-case | `button.ts` |
| co-located ファイル（apps/user のルート配下） | `-` プレフィックス + kebab-case | `-booking-form-schema.ts` |

### export 名: PascalCase / camelCase

| 対象 | 規則 | 例 |
|---|---|---|
| コンポーネント | PascalCase | `BookingCalendar` |
| フック | usePascalCase | `useBooking` |
| UseCase クラス | PascalCase | `CreateBookingUseCase` |
| Repository Interface | IPascalCase | `IBookingRepository` |
| イベントクラス | PascalCase | `BookingConfirmedEvent` |
| 値オブジェクトクラス | PascalCase | `BookingStatus` |

### URL パス: kebab-case、動的セグメントは `$paramName`

```
/booking
/$organizationId/booking
/$organizationId/consultants/$id
/mypage/password-reset
```

Google の URL 構造ガイドラインに従い、URL には kebab-case を使う。
TanStack Router の file-based routing ではファイル名がそのまま URL パスになり、
動的セグメントは `$paramName`（例: `$organizationId`, `$id`）で表す。Next.js の `[param]` 表記ではない点に注意。

---

## 依存方向

### apps/api の DDD 4 層

```
presentation → application → domain ← infrastructure
```

- domain 層は他のどの層にも依存しない。外部ライブラリは import 禁止で、
  純粋ロジックの `@mirai-yoho/shared` のみ import 可
- infrastructure 層は domain 層のインターフェース（Repository Interface 等）を実装する
- application 層は domain 層のエンティティとインターフェースに依存する
- presentation 層（Hono ルーター）は application 層の UseCase を呼び出す

### モノレポ全体（apps ⇄ packages）

```
apps/user, apps/console, apps/consultant
  → packages/api-client（API 呼び出しは必ず生成 hooks 経由）
  → packages/ui（共有 UI コンポーネント / Panda preset）
  → packages/shared（共有ロジック）

apps/console, apps/consultant のみ
  → packages/console-core（認証 / API クライアント初期化 / 組織ルーティング）
```

- packages/ui は他の `@mirai-yoho/*` パッケージに依存しない（Ark UI 等の外部ライブラリのみ）
- SPA から `firebase-admin` / `stripe`（サーバー SDK）/ apps/api の domain・application・infrastructure 層を import しない
- apps/api → apps/user 等、apps/api から SPA 側への依存もない

---

## 具体例: 「予約機能」を追加するときの全体像

「クライアントが予約を作成できる」機能を一から作る場合、以下のファイルを作成する。

```
apps/api/src/
├── domain/booking/                          # Step 1: ドメインモデル
│   ├── booking.ts                           # 集約ルート
│   ├── booking-status.ts                    # 値オブジェクト
│   ├── cancel-deadline.ts                   # 値オブジェクト
│   ├── booking-events.ts                    # BookingConfirmedEvent
│   └── booking-repository.ts                # Repository Interface
│
├── application/booking/                     # Step 2: ユースケース
│   └── create-booking-use-case.ts           # 予約作成の業務フロー
│
├── infrastructure/firestore/                # Step 3: 永続化
│   └── firestore-booking-repository.ts      # Firestore 実装
│
└── presentation/organizations/              # Step 4: API エンドポイント
    └── booking-routes.ts                    # POST /organizations/:organizationId/bookings

packages/api-client/
└── openapi.yaml                             # Step 5: スペック更新 → `pnpm generate` で hooks 生成

apps/user/src/routes/$organizationId/booking/ # Step 6: 画面（apps/user はページロジックを直接ルートに書く）
├── index.tsx                                # ページ本体（生成された useCreateBooking 等を呼ぶ）
├── -booking-auth-gate.tsx                   # ページ固有コンポーネント
└── -booking-form-schema.ts                  # Valibot スキーマ

packages/ui/src/theme/recipes/               # Step 7（必要なら）: 新しい UI
└── calendar.ts                              # カレンダー用レシピ
```

**作成順序:** domain → application → infrastructure → presentation（API）→ openapi.yaml + generate → SPA 画面 → theme

---

## アンチパターン集

### 1. 「なんでもアプリ共通 components/ に置く」

```
# NG: 1 ページでしか使わないのにアプリ共通コンポーネントにしている
apps/console/src/components/
  ├── booking-list-filter.tsx  ← bookings ページでしか使わない
  └── settings-panel.tsx       ← settings ページでしか使わない

# OK: ページの近くに置く
apps/console/src/pages/bookings/_components/booking-list-filter.tsx
apps/console/src/pages/settings/_components/settings-panel.tsx
```

### 2. 「utils / helpers ディレクトリを作る」

```
# NG: 雑多な関数を utils/ に集める
apps/api/src/utils/
  ├── format-date.ts
  ├── calculate-price.ts     ← domain 層のロジックでは？
  └── send-email.ts          ← infrastructure 層のロジックでは？

# OK: 適切なレイヤーに置く
apps/api/src/domain/payment/money.ts     ← 価格計算はドメインロジック
apps/api/src/infrastructure/resend/...   ← メール送信は infrastructure
```

### 3. 「domain 層に外部ライブラリを import する」

```
# NG
apps/api/src/domain/booking/booking.ts
  import { doc, getDoc } from "firebase-admin/firestore";  ← 禁止！
  import Stripe from "stripe";                              ← 禁止！

# OK: domain 層は純粋な TypeScript + @mirai-yoho/shared のみ
apps/api/src/domain/booking/booking.ts
  import { AggregateRoot } from "@/domain/shared/aggregate-root";
  import { DomainError } from "@mirai-yoho/shared/domain-error";
```

### 4. 「集約をまたいで直接操作する」

```
# NG: booking の UseCase で payment を直接操作
apps/api/src/application/booking/create-booking-use-case.ts
  payment.status = "captured";  ← 集約の外からメンバーを直接変更

# OK: Payment 集約のメソッドを呼ぶ
  payment.capture();
```

### 5. 「ページコンポーネントを巨大にする」

```
# NG（console/consultant）: page.tsx に全部詰め込む
apps/console/src/pages/bookings/page.tsx
  ← テーブル、フィルター、モーダル、全部ここに...

# OK: 責務を分離する
apps/console/src/pages/bookings/
  ├── page.tsx                      ← データ取得 + レイアウトのみ
  └── _components/
      ├── booking-filter.tsx        ← フィルター UI
      └── booking-detail-modal.tsx  ← 詳細モーダル
```

### 6. 「barrel export を乱用する」

```
# NG: 全ディレクトリに index.ts を作って re-export
apps/api/src/domain/booking/index.ts          ← 不要
apps/api/src/application/booking/index.ts     ← 不要

# OK: barrel export は共有 UI コンポーネントとレシピだけ
packages/ui/src/components/ui/index.ts        ← OK: import を簡潔にする価値がある
packages/ui/src/theme/recipes/index.ts        ← OK: panda.config.ts で一括読み込み
```

### 7. 「相対パスで遠くのファイルを import する」

```
# NG
import { Button } from "../../../../../packages/ui/src/components/ui/button";

# OK: パッケージ経由 + パスエイリアスを使う
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { useBooking } from "@/hooks/use-booking";  # 各アプリの tsconfig.json の @/* エイリアス
```

### 8. 「`packages/api-client/src/generated/` や `styled-system/` を手動編集する」

```
# NG
packages/api-client/src/generated/api/booking/booking.ts  ← Orval が生成するため手動編集禁止
apps/console/styled-system/                                 ← Panda CSS が生成するため手動編集禁止

# OK: 元になるファイルを更新して再生成する
packages/api-client/openapi.yaml   → `pnpm generate`
packages/ui/panda.preset.ts 等     → 各アプリで Panda CSS のビルドが再生成
```

---

## check モード

引数に `check` が指定された場合:

1. `apps/*/src` と `packages/*/src` 配下のディレクトリ構成をスキャンする
2. 以下の違反を検出する:
   - コロケーション違反（1 ページでしか使わないのにアプリ共通 `components/` や `packages/ui` に置かれている）
   - `utils/` や `helpers/` のような曖昧なディレクトリが存在する
   - apps/api の domain 層に `firebase-admin` / `stripe` 等の外部ライブラリの import がある
   - 命名規則違反（kebab-case でないファイル名、apps/user のルート直下で `-` ではなく `_` プレフィックスを使っている等）
   - `../../../` が 3 つ以上並ぶ相対 import
   - barrel export の乱用（`packages/ui/src/components/ui/index.ts` と `packages/ui/src/theme/recipes/index.ts` 以外の不要な `index.ts`）
   - URL パスが kebab-case でない、または動的セグメントが `$paramName` 形式でない
   - `packages/api-client/src/generated/` や各パッケージの `styled-system/` への手動編集
   - apps/console / apps/consultant で `route.tsx` にページ実装ロジックを直接書いている（`pages/<name>/page.tsx` に分離すべき）
3. 違反箇所と正しい配置先を報告する
