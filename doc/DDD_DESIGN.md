# Arc - みらい予報 — DDD 設計ドキュメント

> Version 1.0 | 2026-03-22 | PRD v0.5 に対応

---

## 目次

1. [DDD 適用方針](#1-ddd-適用方針)
2. [ユビキタス言語](#2-ユビキタス言語)
3. [サブドメイン分類](#3-サブドメイン分類)
4. [境界付けられたコンテキスト](#4-境界付けられたコンテキスト)
5. [集約設計](#5-集約設計)
6. [ドメインイベント](#6-ドメインイベント)
7. [レイヤー構成とフォルダ構造](#7-レイヤー構成とフォルダ構造)
8. [集約をまたぐユースケース設計](#8-集約をまたぐユースケース設計)
9. [実装ルール](#9-実装ルール)

---

## 1. DDD 適用方針

本プロジェクトでは **軽量 DDD（ドメイン層集中）** を採用する。

| 項目 | 方針 |
|---|---|
| 適用範囲 | ドメイン層（集約・Value Object・ドメインイベント）に集中 |
| アーキテクチャ | レイヤードアーキテクチャ（Presentation / Application / Domain / Infrastructure） |
| フレームワーク | Hono（`@hono/node-server` 上で実行）。Hono のルートハンドラが Presentation 層を担う |
| イベントバス | 採用しない。Application Service（UseCase）内でイベントハンドラを直接呼ぶ |
| CQRS | 採用しない（将来の拡張として検討） |

---

## 2. ユビキタス言語

コード・PRD・会話・テストで以下の用語を統一して使う。**和英どちらの文脈でも同じ概念を指す語を使うこと。**

| ドメイン用語（日本語） | ユビキタス言語（英語） | コード上の名前 | 補足 |
|---|---|---|---|
| 予約 | Booking | `Booking` | キャンセルも含むライフサイクル全体 |
| 予約枠 | Slot | `Slot` | 相談員が開けた時間枠。`Booking` と 1 対 1 |
| 相談員 | Consultant | `Consultant` | ≠ Advisor / Staff |
| 顧客 | Customer | `Customer` | 匿名ユーザー |
| カード登録（後日課金） | Setup | `Payment`（`status: setup_pending → setup_complete`） | Stripe SetupIntent。`paymentStrategy: 'deferred'` |
| 課金 | Charge | `Payment.charge()` | バッチ or 手動。`status: charged` |
| 相談メモ | Consultant memo | `ConsultantMemo` | 顧客非公開の内部メモ |
| キャンセル期限 | Cancel deadline | `CancelDeadline` | 相談開始 24 時間前 |
| 予約確定 | Booking confirmed | `BookingConfirmedEvent` | Zoom Join URL 発行済み（決済とは非同期） |
| バッチ課金 | Batch charge | `chargeMethod: 'batch'` | 深夜 0 時 Cloud Scheduler 実行 |

---

## 3. サブドメイン分類

| サブドメイン | 分類 | 理由 |
|---|---|---|
| 予約管理（Booking / Slot） | **コアドメイン** ★ | サービスの競合優位性の源泉。最も手をかける |
| 決済管理（Payment） | 支援サブドメイン | ビジネス固有だが Stripe に委譲できる部分が大きい |
| 相談員管理（Consultant） | 支援サブドメイン | プロフィール・スロット管理はドメイン知識を持つが差別化要素ではない |
| 顧客管理（Customer） | 支援サブドメイン | 将来のリピート予約・履歴活用を見越して独立集約として設計 |
| メール通知 | 汎用サブドメイン | Resend に完全委譲。ドメインイベントを受け取るハンドラのみ実装 |
| 認証 | 汎用サブドメイン | Firebase Auth に完全委譲 |

---

## 4. 境界付けられたコンテキスト

```
┌─────────────────────────────────────────────────────────────────┐
│                      予約コンテキスト（コア）                        │
│   Booking 集約  ←→  Slot 集約                                   │
│   ドメインイベント: BookingConfirmed / BookingCancelled            │
└──────────────┬───────────────────────┬──────────────────────────┘
               │ 仮決済要求              │ スロット確認
               ▼                       ▼
┌──────────────────────┐   ┌──────────────────────────────────────┐
│   決済コンテキスト      │   │         相談員コンテキスト               │
│   Payment 集約        │   │   Consultant 集約                     │
│   PaymentCharged ↓   │   └──────────────────────────────────────┘
└──────────────────────┘
               │ 課金完了イベント
               ▼
┌──────────────────────────────────────────────────────────────────┐
│   通知コンテキスト（汎用）                                           │
│   EmailNotificationHandler（Resend 呼び出し）                     │
│   イベント受信: BookingConfirmed / PaymentCharged / Cancelled     │
└──────────────────────────────────────────────────────────────────┘
```

### コンテキスト間の関係

| 上流 | 下流 | 関係パターン |
|---|---|---|
| 予約コンテキスト | 決済コンテキスト | Customer / Supplier（予約が決済を呼び出す） |
| 予約コンテキスト | 相談員コンテキスト | Customer / Supplier（予約がスロットを参照） |
| 予約 / 決済コンテキスト | 通知コンテキスト | Published Language（ドメインイベント経由） |
| 認証（Firebase Auth） | 相談員 / 管理者 | Conformist（Firebase の UID をそのまま使う） |

---

## 5. 集約設計

### 5.1 集約一覧

| 集約ルート | 内包する Value Object | 主なドメインメソッド | トランザクション境界 |
|---|---|---|---|
| `Booking` | `BookingStatus` `CancelDeadline` `ZoomUrl` `ConsultantMemo` | `confirm()` `cancel()` `complete()` `updateMemo()` | 予約作成・キャンセル・完了 |
| `Slot` | `TimeRange` | `reserve()` `release()` | 予約作成・キャンセル |
| `Payment` | `Money` `PaymentStatus` `PaymentStrategy` | `completeSetup()` `charge()` `refund()` `cancel()` `failCharge()` | 決済操作 |
| `Consultant` | `ConsultantProfile` | `updateProfile()` `deactivate()` | プロフィール更新・論理削除 |
| `Customer` | —（シンプルなデータ保持） | `updateInfo()` `updateNote()` `linkUser()` `mask()` | 顧客情報更新・退会時マスキング |

### 5.2 Booking 集約詳細

```
Booking（集約ルート）
├── organizationId: string          外部参照（マルチテナント境界）
├── bookingId: string               ID（Firestore 自動生成）
├── customerId: CustomerId          外部参照（別集約）
├── consultantId: ConsultantId      外部参照（別集約）
├── slotId: SlotId                  外部参照（別集約）
├── startsAt: Date                  slots から複製（非正規化）
├── status: BookingStatus           pending|confirmed|completed|cancelled
├── cancelDeadlineAt: CancelDeadline  startsAt - 24h
├── joinUrl?: ZoomUrl               confirm() 後にセット（Zoom Daily Session の Join URL）
├── consultantMemo: ConsultantMemo  管理者・相談員のみ閲覧可
├── consultationContent?: string    顧客入力（任意）
├── pricePlanId / pricePlanName / pricePlanTotalJPY?  予約確定時点の料金プランを非正規化
├── consultantJoinedAt / consultationReminderEmailSentAt / lateArrivalAlertSentAt?: Date  バッチ処理の実行済みフラグ
└── _domainEvents: DomainEvent[]    pullDomainEvents() で取り出す
```

> 決済（Stripe）は予約作成と非同期。`Payment` 集約は別途 `chargeMethod: 'batch' | 'manual'` で後日課金される（§8.1 参照）。

#### BookingStatus 遷移

```
pending ─── confirm(joinUrl) ──────► confirmed ─── complete() ──► completed
   │                                     │
   │                                     └── cancel('customer' | 'admin') ──► cancelled
   │
   └── cancel('admin') ──────────────────────────────────────────► cancelled
```

### 5.3 Payment 集約詳細

```
Payment（集約ルート）
├── organizationId: string          外部参照（マルチテナント境界）
├── paymentId: string
├── bookingId: string               外部参照
├── customerId: string              集計用に非正規化
├── money: Money                    amountJPY / taxAmountJPY / taxRate
├── status: PaymentStatus           setup_pending|setup_complete|charged|refunded|cancelled|failed
├── paymentStrategy: PaymentStrategy  deferred（先にカード登録のみ）|immediate（即時決済）
├── stripeSetupIntentId? / stripePaymentIntentId? / stripePaymentMethodId?: string
└── chargeMethod?: ChargeMethod     batch|manual（charge() 後にセット）
```

### 5.4 集約をまたぐ操作の原則

> 集約は ID で参照する。集約をまたぐ整合性は Application Service（UseCase）が責任を持ち、Firestore トランザクションで実現する。

```typescript
// ✅ 正しい：集約は ID 参照のみ
class Booking {
  customerId: string      // Customer オブジェクトを直接持たない
  consultantId: string    // Consultant オブジェクトを直接持たない
}

// ❌ 誤り：集約内に別集約を持つ
class Booking {
  customer: Customer      // 集約の境界を壊す
  consultant: Consultant  // 同上
}
```

---

## 6. ドメインイベント

### 6.1 イベント一覧

| イベント名 | 発火元 | 発火タイミング | ハンドラ（通知） |
|---|---|---|---|
| `BookingConfirmedEvent` | `Booking.confirm()` | Zoom Join URL セット後 | （集約に追加はされるが `CreateBookingUseCase` は現状未使用。確認メールは UseCase が直接送信） |
| `BookingCancelledEvent` | `Booking.cancel()` | キャンセル確定後 | `CancelBookingUseCase` が `pullDomainEvents()` で取り出し、顧客キャンセル確認メールを送信 |
| `PaymentChargedEvent` | `Payment.charge()` | 課金確定後 | `ChargePaymentUseCase` が `pullDomainEvents()` で取り出し、顧客領収書メールを送信 |

### 6.2 イベントの流れ

イベントは `pullDomainEvents()` で取り出した UseCase 側が明示的にハンドリングする（イベントバスは介さない）。`BookingConfirmedEvent` は `Booking.confirm()` 時に `_domainEvents` へ追加されるが、`CreateBookingUseCase` は取り出すだけで中身を使わず、確認メールは同ユースケース内で入力値から直接送信している（実装上のイベント未活用箇所）。課金・キャンセルは以下の通りイベントを実際に使う。

```
Payment.charge(paymentIntentId, method)
  └─ PaymentChargedEvent を _domainEvents に追加

ChargePaymentUseCase
  └─ payment.pullDomainEvents() でイベントを取り出す
       └─ event.eventName === "PaymentCharged" を判定
            └─ EmailService.sendPaymentReceipt(...) で顧客へ領収書メール
```

---

## 7. レイヤー構成とフォルダ構造

### 7.1 レイヤー責務

| レイヤー | 責務 | 外部依存 |
|---|---|---|
| **Domain** | ビジネスルール・整合性保証 | なし（純粋な TypeScript） |
| **Application** | ユースケース調整・トランザクション管理 | Domain のみ（Infrastructure は Interface 経由） |
| **Infrastructure** | 外部サービス実装（Firestore / Stripe / Zoom / Resend） | 全て可 |
| **Presentation** | HTTP 入出力（Hono ルートハンドラ） | Application のみ |

### 7.2 フォルダ構造

全ファイル **kebab-case**。Repository Interface にプレフィックスは付けない（`booking-repository.ts`）。

```
apps/api/src/
├── config/                           ← env の読み込み・検証（env.server 等）
├── lib/                              ← 横断ユーティリティ
├── domain/
│   ├── shared/
│   │   ├── aggregate-root.ts
│   │   └── domain-event.ts
│   ├── booking/
│   │   ├── booking.ts               ← 集約ルート
│   │   ├── booking-status.ts        ← VO
│   │   ├── cancel-deadline.ts       ← VO（24h チェック）
│   │   ├── zoom-url.ts              ← VO
│   │   ├── consultant-memo.ts       ← VO
│   │   ├── booking-events.ts        ← ドメインイベント定義
│   │   └── booking-repository.ts    ← Repository Interface（プレフィックスなし）
│   ├── slot/
│   │   ├── slot.ts
│   │   ├── time-range.ts            ← VO（過去日時チェック）
│   │   └── slot-repository.ts
│   ├── payment/
│   │   ├── payment.ts
│   │   ├── money.ts                 ← VO（税込み計算）
│   │   ├── payment-status.ts        ← VO
│   │   ├── payment-strategy.ts
│   │   └── payment-repository.ts
│   ├── consultant/ · consultant-price-plan/
│   ├── customer/ · user/ · user-coupon/
│   ├── organization-settings/ · authorization/
│   └── zoom-session/
│
├── application/
│   ├── booking/
│   │   ├── create-booking-use-case.ts   ← 集約横断トランザクション
│   │   ├── cancel-booking-use-case.ts
│   │   └── charge-payment-use-case.ts
│   └── shared/                      ← UseCase から使うポート（Interface）
│       ├── stripe-service.ts · zoom-service.ts · email-service.ts
│       └── unit-of-work.ts          ← トランザクション境界
│
├── infrastructure/                  ← 上記ポートの実装（Firestore / Stripe / Zoom / Resend）
│
├── presentation/                    ← Hono ルートハンドラ（Application のみ依存）
│   ├── auth/                        ← /api/auth/*
│   ├── customer/                    ← /api/customer/*
│   ├── organizations/               ← /api/organizations/*（Hono サブルーター）
│   └── webhooks/                    ← /api/webhooks/stripe など
│
├── server/
│   ├── app.ts                       ← Hono アプリ組み立て（CORS・ルート登録）
│   └── index.ts                     ← @hono/node-server で起動
└── worker/                          ← batch worker（Cloud Run Job）
```

---

## 8. 集約をまたぐユースケース設計

### 8.1 予約作成（`CreateBookingUseCase`）

```
入力: organizationId / userId / slotId（or startsAt+endsAt） / customerName / customerEmail /
       customerPhone / customerBirthDate / consultationContent? / selectionId（料金プラン選択）

1. UserRepository.findById(userId)         ← アクティブ・Zoom 連携済みチェック
2. 料金プラン・スロットを解決（selectionId → ConsultantPricePlan、slotId or 空き枠検索）
3. slot.reserve(newBookingId)              ← 二重予約・過去日時チェック（DomainError）
4. CustomerRepository.findByUserIdAndOrganizationId() → 既存なければ Customer.create({...})
5. Booking.create({...})                   ← status: pending。料金プランを非正規化して保持
6. ZoomDailySessionRepository.findByDate() → 当日セッションが無ければ ZoomService.createDailyMeeting()、
   あれば ZoomService.updateBreakoutRooms()  ← 参加者をブレイクアウトルームへ割り当て
7. booking.confirm(joinUrl)                ← BookingConfirmedEvent 発火（現状 UseCase は未使用）
8. EmailService.sendBookingConfirmation()  ← 入力値から直接送信（イベント経由ではない）
9. UnitOfWork.runInTransaction(customer, slot, booking, zoomDailySession)  ← Firestore トランザクション

出力: { bookingId, joinUrl }
```

> 決済（Stripe SetupIntent でのカード登録・課金）はこのフローに含まれない。カード登録は別ユースケース、課金は §8.3 `ChargePaymentUseCase` がバッチ/手動で別途行う。

### 8.2 キャンセル（`CancelBookingUseCase`）

```
入力: organizationId / bookingId / cancelledBy: 'customer' | 'admin'

1. BookingRepository.findById(organizationId, bookingId)
2. booking.cancel(cancelledBy)              ← 期限チェック（customer のみ）
3. PaymentRepository.findByBookingId()
4. payment があれば戦略・状態で分岐：
     immediate かつ charged → StripeService.refundPaymentIntent() → payment.refund()
     deferred かつ setup_pending|setup_complete → payment.cancel()（Stripe 側は未課金なので返金不要）
5. SlotRepository.findById(booking.slotId) → slot.release()
6. ZoomDailySessionRepository.findByDate() → 参加者を Breakout Room から除外し
   ZoomService.updateBreakoutRooms() を呼ぶ
7. 各 Repository.save()（並列）
8. booking.pullDomainEvents() → BookingCancelledEvent を判定し
   EmailService.sendBookingCancellation() でキャンセル確認メールを送信
```

### 8.3 課金（`ChargePaymentUseCase`）

```
入力: organizationId / bookingId / method: 'batch' | 'manual'

1. BookingRepository.findById(organizationId, bookingId)
2. PaymentRepository.findByBookingId()
3. CustomerRepository.findById(booking.customerId)
4. evaluateChargeEligibility({ booking, payment })  ← 課金可否判定（見つからない/対象外は AppError）
5. payment.getStripePaymentMethodId() が未登録なら 400 PAYMENT_SETUP_INCOMPLETE
6. StripeService.createOffSessionPaymentIntent({ amountJPY, paymentMethodId })
7. payment.charge(paymentIntentId, method)   ← PaymentChargedEvent 発火
8. booking.complete()
9. 各 Repository.save()（並列）
10. payment.pullDomainEvents() → event.eventName === "PaymentCharged" を判定し
    EmailService.sendPaymentReceipt() で領収書メール

失敗時: catch 節で payment.failCharge() → save し、エラーを re-throw
```

---

## 9. 実装ルール

### 9.1 Domain 層の禁則事項

```typescript
// ❌ Domain 層に外部サービス import を書かない
import { Firestore } from 'firebase-admin/firestore'  // 禁止
import Stripe from 'stripe'                            // 禁止

// ✅ Interface（ポート）に依存させる
import type { IBookingRepository } from './booking-repository'
```

### 9.2 Value Object の原則

- イミュータブル（プロパティは `private readonly`）
- `create()` でバリデーション、`reconstruct()` で DB 復元（バリデーションなし）
- `equals()` は属性値で比較

### 9.3 集約の原則

- 集約外の集約は ID（string）でのみ参照する
- 集約ルートを経由しないメンバーの変更は禁止
- `_domainEvents` は `pullDomainEvents()` で取り出し後にクリア

### 9.4 ファイル命名規則

- 全ファイル **kebab-case**
- 集約ルート: `booking.ts` / `slot.ts` / `payment.ts`
- Value Object: `booking-status.ts` / `cancel-deadline.ts`
- Repository Interface: `booking-repository.ts`（**プレフィックスは付けない**）
- UseCase: `create-booking-use-case.ts`
- ドメインイベント: `booking-events.ts`（複数イベントを 1 ファイルに集約）

### 9.5 Vitest テスト指針

Domain 層はインフラ依存がゼロなので、単体テストが容易。以下を必ずテストする。

| テスト対象 | テスト内容 |
|---|---|
| `CancelDeadline` | 期限前・期限後で正しく判定できるか |
| `Booking.cancel()` | 顧客が期限超過でキャンセルすると `DomainError` を投げるか |
| `Slot.reserve()` | 二重予約で `DomainError` を投げるか |
| `Money.fromTaxIncluded()` | 税額計算が正しいか |
| `Booking.confirm()` | `BookingConfirmedEvent` が発火されるか |
