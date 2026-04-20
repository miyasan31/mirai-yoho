---
name: directory-guide
description: bulletproof-react を参考にしたディレクトリ設計ガイド — ファイルの配置場所を判断する
user_invocable: true
args: "[check]"
---

# ディレクトリ設計ガイド

bulletproof-react を参考にした、このプロジェクトのディレクトリ構成ガイドです。
新しいファイルの配置先を判断する、または既存の配置をレビューするために使ってください。
引数に `check` が指定された場合は、既存のディレクトリ構成の違反を検出・報告する。

---

## ディレクトリ構成

```
src/
├── app/                              # Presentation 層（Next.js App Router）
│   ├── layout.tsx                    # ルートレイアウト
│   ├── providers.tsx                 # クライアントプロバイダー
│   ├── globals.css                   # グローバルスタイル
│   │
│   ├── _hooks/                       # アプリ全体で使う共通フック
│   │   ├── use-booking.ts            # TanStack Query フック
│   │   └── booking-keys.ts           # Query Keys
│   │
│   ├── api/                          # Route Handlers
│   │   └── <resource>/
│   │       ├── route.ts              # GET /api/<resource>
│   │       └── [id]/
│   │           └── route.ts          # GET /api/<resource>/:id
│   │
│   ├── (public)/                     # 公開ページ（Route Group）
│   │   └── booking/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       ├── _components/          # ページ固有コンポーネント
│   │       │   ├── booking-form.tsx
│   │       │   └── booking-calendar.tsx
│   │       └── _hooks/              # ページ固有フック
│   │           └── use-booking-filter.ts
│   │
│   └── (dashboard)/                  # 管理画面（Route Group）
│       ├── layout.tsx                # 管理画面共通レイアウト
│       ├── _components/              # Route Group 内共有コンポーネント
│       │   └── sidebar.tsx
│       ├── bookings/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── _components/
│       │           └── booking-detail.tsx
│       └── settings/
│           └── page.tsx
│
├── components/                       # 共有コンポーネント
│   ├── ui/                           # UI プリミティブ（Ark UI ラッパー）
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── index.ts                  # バレルエクスポート
│   ├── error-boundary.tsx            # 汎用エラーバウンダリ
│   └── empty-state.tsx               # 汎用空状態表示
│
├── domain/                           # Domain 層（ビジネスロジック）
│   ├── shared/                       # 共有基盤
│   │   ├── aggregate-root.ts
│   │   ├── domain-event.ts
│   │   └── domain-error.ts
│   └── <aggregate>/                  # 集約ごとのディレクトリ
│       ├── <aggregate>.ts            # 集約ルートエンティティ
│       ├── <value-object>.ts         # 値オブジェクト
│       ├── <aggregate>-events.ts     # ドメインイベント
│       └── <aggregate>-repository.ts   # Repository Interface
│
├── application/                      # Application 層（ユースケース）
│   ├── shared/                       # 共有サービスインターフェース
│   │   ├── email-service.ts
│   │   ├── stripe-service.ts
│   │   ├── zoom-service.ts
│   │   └── unit-of-work.ts
│   └── <aggregate>/                  # 集約ごとのユースケース
│       └── <action>-<aggregate>-use-case.ts
│
├── infrastructure/                   # Infrastructure 層（外部サービス実装）
│   ├── firestore/                    # サービスごとにディレクトリ
│   │   └── firestore-<aggregate>-repository.ts
│   ├── stripe/
│   │   └── stripe-service.ts
│   ├── resend/
│   │   └── resend-email-service.ts
│   └── zoom/
│       └── zoom-service.ts
│
└── theme/                            # Panda CSS テーマ設定
    ├── recipes/                      # コンポーネントレシピ
    │   ├── button.ts
    │   └── index.ts
    ├── tokens/                       # デザイントークン
    │   ├── colors.ts
    │   └── shadows.ts
    ├── colors/                       # カラーパレット定義
    │   ├── blue.ts
    │   └── slate.ts
    ├── text-styles.ts
    ├── keyframes.ts
    ├── conditions.ts
    └── global-css.ts
```

---

## 配置判断フローチャート

ファイルをどこに置くか迷ったら、以下のフローに従う。

```
作りたいものは何？
│
├─ ビジネスロジック / ルール？
│   ├─ エンティティ / 値オブジェクト → src/domain/<aggregate>/
│   ├─ 複数集約をまたぐ処理 → src/application/<aggregate>/<action>-<aggregate>-use-case.ts
│   └─ 外部サービスの抽象 → src/application/shared/<name>-service.ts
│
├─ 外部サービスの具体実装？
│   └─ src/infrastructure/<service>/
│
├─ UI コンポーネント？
│   ├─ デザインシステムのプリミティブ？（Button, Dialog 等）
│   │   └─ src/components/ui/<name>.tsx
│   ├─ 1 ページでしか使わない？
│   │   └─ src/app/<route>/_components/<name>.tsx
│   ├─ 同じ Route Group 内で共有？
│   │   └─ src/app/<route-group>/_components/<name>.tsx
│   └─ Route Group をまたいで共有？
│       └─ src/components/<name>.tsx
│
├─ カスタムフック？
│   ├─ 1 ページでしか使わない？
│   │   └─ src/app/<route>/_hooks/<name>.ts
│   ├─ TanStack Query（データフェッチ）？
│   │   └─ src/app/_hooks/<name>.ts
│   └─ アプリ全体で使う汎用フック？
│       └─ src/app/_hooks/<name>.ts
│
├─ API エンドポイント？
│   └─ src/app/api/<resource>/route.ts
│
├─ スタイリング（レシピ / トークン）？
│   └─ src/theme/recipes/ or src/theme/tokens/
│
└─ バリデーションスキーマ？
    └─ コンポーネントと同じディレクトリに配置
       src/app/<route>/_components/<form-name>-schema.ts
```

---

## コロケーション原則（bulletproof-react）

### 原則 1: 使う場所の近くに置く

ファイルは、それを使うコードの **最も近い共通の親ディレクトリ** に置く。

```
# 良い例: booking-form は booking ページでしか使わない
src/app/(public)/booking/
  ├── page.tsx                    ← ここで使う
  └── _components/
      ├── booking-form.tsx        ← だからここに置く
      └── booking-form-schema.ts  ← スキーマもセットで

# 悪い例: 1 ページでしか使わないのに components/ に置く
src/components/
  └── booking-form.tsx            ← NG: 遠すぎる
```

### 原則 2: 共有が増えたら引き上げる

引き上げの判断基準：

| 使用箇所 | 配置先 | 例 |
|---|---|---|
| 1 ページのみ | `src/app/<route>/_components/` | 予約フォーム |
| 同じ Route Group 内の複数ページ | `src/app/<route-group>/_components/` | ダッシュボードのサイドバー |
| Route Group をまたぐ | `src/components/` | 空状態表示、エラーバウンダリ |
| デザインシステムの一部 | `src/components/ui/` | Button, Dialog, Table |

```
# 引き上げの流れ
# Step 1: 最初は booking ページ固有
src/app/(public)/booking/_components/status-badge.tsx

# Step 2: consultant ページでも使うことになった → 引き上げ
src/components/status-badge.tsx
```

**引き上げるタイミング:**
- 2 箇所目で使うことになったとき（予防的に引き上げない）
- import パスに `../../../` が 3 つ以上並んだとき

**引き上げないもの:**
- ページ固有のフォーム、フィルター、詳細表示
- ページ固有のフック（SearchParams 管理など）

### 原則 3: `_` プレフィックスでルーティング対象外にする

Next.js App Router では `_` で始まるディレクトリはルーティング対象外になる。

```
src/app/(dashboard)/bookings/
  ├── page.tsx              ← /bookings でアクセス可能
  ├── _components/          ← ルーティング対象外（コンポーネント置き場）
  │   └── booking-table.tsx
  └── _hooks/               ← ルーティング対象外（フック置き場）
      └── use-booking-list.ts
```

### 原則 4: 関心ごとでまとめる（DDD 層）

バックエンドは **集約** を軸にまとめる。同じ集約に関するものは同じディレクトリに入れる。

```
# 「予約」に関するものは全て booking/ にまとまる
src/domain/booking/
  ├── booking.ts               # 集約ルート
  ├── booking-status.ts        # 値オブジェクト
  ├── booking-events.ts        # ドメインイベント
  ├── cancel-deadline.ts       # 値オブジェクト
  └── booking-repository.ts     # Repository Interface

src/application/booking/
  ├── create-booking-use-case.ts
  └── cancel-booking-use-case.ts
```

infrastructure 層は **サービス** を軸にまとめる。

```
src/infrastructure/firestore/
  ├── firestore-booking-repository.ts
  ├── firestore-client-repository.ts
  └── firestore-unit-of-work.ts
```

---

## 配置リファレンス表

| 作りたいもの | 配置先 |
|---|---|
| ページ | `src/app/<route>/page.tsx` |
| レイアウト | `src/app/<route>/layout.tsx` |
| ローディング | `src/app/<route>/loading.tsx` |
| エラー | `src/app/<route>/error.tsx` |
| ページ固有コンポーネント | `src/app/<route>/_components/<name>.tsx` |
| ページ固有フック | `src/app/<route>/_hooks/<name>.ts` |
| ページ固有スキーマ | `src/app/<route>/_components/<name>-schema.ts` |
| Route Group 内共有コンポーネント | `src/app/<route-group>/_components/<name>.tsx` |
| 共有 UI プリミティブ | `src/components/ui/<name>.tsx` |
| 共有コンポーネント | `src/components/<name>.tsx` |
| アプリ共通フック | `src/app/_hooks/<name>.ts` |
| Query Keys | `src/app/_hooks/<resource>-keys.ts` |
| API エンドポイント | `src/app/api/<resource>/route.ts` |
| 集約ルート | `src/domain/<aggregate>/<aggregate>.ts` |
| 値オブジェクト | `src/domain/<aggregate>/<value-object>.ts` |
| ドメインイベント | `src/domain/<aggregate>/<aggregate>-events.ts` |
| Repository Interface | `src/domain/<aggregate>/<aggregate>-repository.ts` |
| UseCase | `src/application/<aggregate>/<action>-<aggregate>-use-case.ts` |
| サービス Interface | `src/application/shared/<name>-service.ts` |
| Firestore 実装 | `src/infrastructure/firestore/firestore-<name>-repository.ts` |
| 外部サービス実装 | `src/infrastructure/<service>/<name>-service.ts` |
| レシピ | `src/theme/recipes/<name>.ts` |
| デザイントークン | `src/theme/tokens/<name>.ts` |

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
| Query Keys | kebab-case | `booking-keys.ts` |
| スキーマ | kebab-case | `booking-form-schema.ts` |
| レシピ | kebab-case | `button.ts` |

### export 名: PascalCase / camelCase

| 対象 | 規則 | 例 |
|---|---|---|
| コンポーネント | PascalCase | `BookingCalendar` |
| フック | usePascalCase | `useBooking` |
| UseCase クラス | PascalCase | `CreateBookingUseCase` |
| Repository Interface | IPascalCase | `IBookingRepository` |
| イベントクラス | PascalCase | `BookingConfirmedEvent` |
| 値オブジェクトクラス | PascalCase | `BookingStatus` |
| Query Keys | camelCase | `bookingKeys` |

### URL パス: kebab-case

```
/booking
/booking/[id]
/consultant-profile
/payment-history
```

Google の URL 構造ガイドラインに従い、URL には kebab-case を使う。
Next.js のフォルダ名がそのまま URL パスになるため、ルートディレクトリ名も kebab-case にする。

---

## 依存方向

```
app (presentation) → application → domain ← infrastructure
```

- domain 層は他のどの層にも依存しない
- infrastructure 層は domain 層のインターフェースを実装する
- application 層は domain 層のエンティティとインターフェースに依存する
- app 層は application 層の UseCase を呼び出す

---

## 具体例: 「予約機能」を追加するときの全体像

「クライアントが予約を作成できる」機能を一から作る場合、以下のファイルを作成する。

```
src/
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
├── app/
│   ├── api/booking/                         # Step 4: API
│   │   └── route.ts                         # POST /api/booking
│   │
│   ├── _hooks/                              # Step 5: データフェッチ
│   │   ├── booking-keys.ts                  # Query Keys
│   │   └── use-create-booking.ts            # useMutation フック
│   │
│   └── (public)/booking/                    # Step 6: 画面
│       ├── page.tsx                          # 予約ページ（Server Component）
│       ├── loading.tsx                       # ローディング
│       └── _components/                      # ページ固有コンポーネント
│           ├── booking-form.tsx              # フォーム（Client Component）
│           └── booking-form-schema.ts        # Valibot スキーマ
│
└── theme/recipes/                           # Step 7（必要なら）: 新しい UI
    └── calendar.ts                          # カレンダー用レシピ
```

**作成順序:** domain → application → infrastructure → api → hooks → page → theme

---

## アンチパターン集

### 1. 「なんでも components/ に置く」

```
# NG: 1 ページでしか使わないのに共有コンポーネントにしている
src/components/
  ├── booking-form.tsx        ← booking ページでしか使わない
  ├── consultant-profile.tsx  ← consultant ページでしか使わない
  └── settings-panel.tsx      ← settings ページでしか使わない

# OK: ページの近くに置く
src/app/(public)/booking/_components/booking-form.tsx
src/app/(public)/consultant/_components/consultant-profile.tsx
src/app/(dashboard)/settings/_components/settings-panel.tsx
```

### 2. 「utils / helpers ディレクトリを作る」

```
# NG: 雑多な関数を utils/ に集める
src/utils/
  ├── format-date.ts
  ├── calculate-price.ts     ← domain 層のロジックでは？
  └── send-email.ts           ← infrastructure 層のロジックでは？

# OK: 適切なレイヤーに置く
src/domain/payment/money.ts          ← 価格計算はドメインロジック
src/infrastructure/resend/...        ← メール送信は infrastructure
```

### 3. 「domain 層に外部ライブラリを import する」

```
# NG
src/domain/booking/booking.ts
  import { doc, getDoc } from "firebase-admin/firestore";  ← 禁止！
  import Stripe from "stripe";                              ← 禁止！

# OK: domain 層は純粋な TypeScript のみ
src/domain/booking/booking.ts
  import { AggregateRoot } from "@/domain/shared/aggregate-root";
  import { DomainError } from "@/domain/shared/domain-error";
```

### 4. 「集約をまたいで直接操作する」

```
# NG: booking の UseCase で payment を直接操作
src/application/booking/create-booking-use-case.ts
  payment.status = "captured";  ← 集約の外からメンバーを直接変更

# OK: Payment 集約のメソッドを呼ぶ
  payment.capture();
```

### 5. 「ページコンポーネントを巨大にする」

```
# NG: page.tsx に全部詰め込む
src/app/(public)/booking/page.tsx
  ← フォーム、バリデーション、API 呼び出し、全部ここに...

# OK: 責務を分離する
src/app/(public)/booking/
  ├── page.tsx                      ← Server Component、データ取得 + レイアウトのみ
  └── _components/
      ├── booking-form.tsx          ← Client Component、フォームロジック
      └── booking-form-schema.ts    ← バリデーション定義
```

### 6. 「barrel export を乱用する」

```
# NG: 全ディレクトリに index.ts を作って re-export
src/domain/booking/index.ts          ← 不要
src/application/booking/index.ts     ← 不要

# OK: barrel export は UI コンポーネントとレシピだけ
src/components/ui/index.ts           ← OK: import を簡潔にする価値がある
src/theme/recipes/index.ts           ← OK: panda.config.ts で一括読み込み
```

### 7. 「相対パスで遠くのファイルを import する」

```
# NG
import { Button } from "../../../../components/ui/button";

# OK: パスエイリアスを使う
import { Button } from "@/components/ui";
```

---

## check モード

引数に `check` が指定された場合:

1. `src/` 配下のディレクトリ構成をスキャンする
2. 以下の違反を検出する:
   - コロケーション違反（1 ページでしか使わないのに `src/components/` に置かれている）
   - `utils/` や `helpers/` のような曖昧なディレクトリが存在する
   - domain 層に外部ライブラリの import がある
   - 命名規則違反（kebab-case でないファイル名）
   - `../../../` が 3 つ以上並ぶ相対 import
   - barrel export の乱用（`ui/index.ts` と `recipes/index.ts` 以外の不要な `index.ts`）
   - URL パスが kebab-case でないルートディレクトリ
3. 違反箇所と正しい配置先を報告する
