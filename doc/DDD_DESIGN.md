# Arc - 未来予報 — DDD 設計ドキュメント

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
| フレームワーク | Next.js App Router。API Routes が Presentation 層を担う |
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
| 仮決済 | Authorization | `Payment`（`status: authorized`） | Stripe `capture_method: manual` |
| 本決済 | Capture | `Payment.capture()` | バッチ or 手動 |
| 相談メモ | Consultant memo | `ConsultantMemo` | 顧客非公開の内部メモ |
| キャンセル期限 | Cancel deadline | `CancelDeadline` | 相談開始 24 時間前 |
| 予約確定 | Booking confirmed | `BookingConfirmedEvent` | 仮決済完了・Zoom URL 発行済み |
| バッチ本決済 | Batch capture | `captureMethod: 'batch'` | 深夜 0 時 Cloud Scheduler 実行 |

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
│   PaymentCaptured ↓  │   └──────────────────────────────────────┘
└──────────────────────┘
               │ 決済完了イベント
               ▼
┌──────────────────────────────────────────────────────────────────┐
│   通知コンテキスト（汎用）                                           │
│   EmailNotificationHandler（Resend 呼び出し）                     │
│   イベント受信: BookingConfirmed / PaymentCaptured / Cancelled    │
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
| `Payment` | `Money` `PaymentStatus` `CaptureMethod` | `capture()` `cancel()` | 決済操作 |
| `Consultant` | `ConsultantProfile` `ZoomRoomId[]` | `updateProfile()` `assignZoomRooms()` `deactivate()` | プロフィール更新・論理削除 |
| `Customer` | —（シンプルなデータ保持） | `updateInfo()` `updateMemo()` | 顧客情報更新 |

### 5.2 Booking 集約詳細

```
Booking（集約ルート）
├── bookingId: string               ID（Firestore 自動生成）
├── customerId: CustomerId          外部参照（別集約）
├── consultantId: ConsultantId      外部参照（別集約）
├── slotId: SlotId                  外部参照（別集約）
├── startDatetime: Date             slots から複製（非正規化）
├── status: BookingStatus           pending|confirmed|completed|cancelled
├── cancelDeadline: CancelDeadline  startDatetime - 24h
├── zoomUrl?: ZoomUrl               confirm() 後にセット
├── consultantMemo: ConsultantMemo  管理者・相談員のみ閲覧可
├── consultantContent?: string      顧客入力（任意）
├── stripePaymentIntentId?: string  confirm() 後にセット
└── _domainEvents: DomainEvent[]    pullDomainEvents() で取り出す
```

#### BookingStatus 遷移

```
pending ─── confirm(zoomUrl) ──────► confirmed ─── complete() ──► completed
   │                                     │
   │                                     └── cancel('client' | 'admin') ──► cancelled
   │
   └── cancel('admin') ──────────────────────────────────────────► cancelled
```

### 5.3 Payment 集約詳細

```
Payment（集約ルート）
├── paymentId: string
├── bookingId: string               外部参照
├── clientId: string                集計用に非正規化
├── stripePaymentIntentId: string
├── money: Money                    amountJPY / taxAmountJPY / taxRate
├── status: PaymentStatus           authorized|captured|cancelled|failed
└── captureMethod?: CaptureMethod   batch|manual（本決済後にセット）
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
| `BookingConfirmedEvent` | `Booking.confirm()` | 仮決済完了・Zoom URL セット後 | 顧客確認メール・相談員予約通知メール |
| `BookingCancelledEvent` | `Booking.cancel()` | キャンセル確定後 | 顧客キャンセル確認メール・相談員キャンセル通知メール |
| `PaymentCapturedEvent` | `Payment.capture()` | 本決済確定後 | 顧客領収書メール・管理者バッチ完了通知（バッチ時） |

### 6.2 イベントの流れ

```
Booking.confirm()
  └─ BookingConfirmedEvent を _domainEvents に追加

CreateBookingUseCase
  └─ booking.pullDomainEvents() でイベントを取り出す
       └─ onBookingConfirmed(event) を呼ぶ
            └─ ResendEmailService.sendBookingConfirmation(...)
                  ├─ 顧客へ確認メール（Zoom URL・キャンセルリンク含む）
                  └─ 相談員へ予約通知メール
```

---

## 7. レイヤー構成とフォルダ構造

### 7.1 レイヤー責務

| レイヤー | 責務 | 外部依存 |
|---|---|---|
| **Domain** | ビジネスルール・整合性保証 | なし（純粋な TypeScript） |
| **Application** | ユースケース調整・トランザクション管理 | Domain のみ（Infrastructure は Interface 経由） |
| **Infrastructure** | 外部サービス実装（Firestore / Stripe / Zoom / Resend） | 全て可 |
| **Presentation** | HTTP 入出力（Next.js API Routes） | Application のみ |

### 7.2 フォルダ構造

```
src/
├── domain/
│   ├── shared/
│   │   ├── domainError.ts
│   │   └── domainEvent.ts
│   ├── booking/
│   │   ├── booking.ts               ← 集約ルート
│   │   ├── bookingStatus.ts         ← VO
│   │   ├── cancelDeadline.ts        ← VO（24h チェック）
│   │   ├── zoomUrl.ts               ← VO
│   │   ├── consultantMemo.ts        ← VO
│   │   ├── bookingEvents.ts         ← ドメインイベント定義
│   │   └── iBookingRepository.ts   ← Repository Interface
│   ├── slot/
│   │   ├── slot.ts
│   │   ├── timeRange.ts             ← VO（過去日時チェック）
│   │   └── iSlotRepository.ts
│   ├── payment/
│   │   ├── payment.ts
│   │   ├── money.ts                 ← VO（税込み計算）
│   │   ├── paymentStatus.ts         ← VO
│   │   └── iPaymentRepository.ts
│   ├── consultant/
│   │   ├── consultant.ts
│   │   ├── consultantProfile.ts     ← VO
│   │   └── iConsultantRepository.ts
│   └── client/
│       ├── client.ts
│       └── iCustomerRepository.ts
│
├── application/
│   └── booking/
│       ├── createBookingUseCase.ts   ← 3集約トランザクション
│       ├── cancelBookingUseCase.ts
│       └── capturePaymentUseCase.ts
│
├── infrastructure/
│   ├── firestore/
│   │   ├── firestoreBookingRepository.ts
│   │   ├── firestoreSlotRepository.ts
│   │   ├── firestorePaymentRepository.ts
│   │   ├── firestoreCustomerRepository.ts
│   │   ├── firestoreConsultantRepository.ts
│   │   └── firestoreUnitOfWork.ts    ← トランザクション実装
│   ├── stripe/
│   │   └── stripeService.ts
│   ├── zoom/
│   │   └── zoomService.ts
│   └── resend/
│       └── resendEmailService.ts
│
└── app/
    └── api/
        ├── bookings/
        │   └── route.ts              ← CreateBookingUseCase を呼ぶだけ
        ├── bookings/[id]/
        │   ├── cancel/route.ts
        │   └── capture/route.ts
        ├── batch/capture/route.ts
        └── webhooks/stripe/route.ts
```

---

## 8. 集約をまたぐユースケース設計

### 8.1 予約作成（`CreateBookingUseCase`）

```
入力: slotId / clientName / clientEmail / clientPhone / amountJPY / taxRate

1. SlotRepository.findById(slotId)
2. slot.reserve(newBookingId)          ← 二重予約・過去日時チェック（DomainError）
3. Customer.create({...})
4. Booking.create({...})               ← status: pending
5. StripeService.createPaymentIntent() ← 仮決済
6. ZoomService.createMeetingUrl()      ← Zoom URL 生成
7. booking.confirm(zoomUrl, paymentIntentId)  ← BookingConfirmedEvent 発火
8. Payment.create({...})               ← status: authorized
9. UnitOfWork.runInTransaction(client, slot, booking, payment)  ← Firestore トランザクション
10. booking.pullDomainEvents() → onBookingConfirmed(event)     ← メール通知

出力: { bookingId, clientSecret, zoomUrl }
```

### 8.2 キャンセル（`CancelBookingUseCase`）

```
入力: bookingId / cancelledBy: 'client' | 'admin'

1. BookingRepository.findById(bookingId)
2. booking.cancel(cancelledBy)          ← 期限チェック（client のみ）
3. PaymentRepository.findByBookingId()
4. StripeService.cancelPaymentIntent()  ← 全額返金
5. payment.cancel()
6. SlotRepository.findById(booking.slotId)
7. slot.release()
8. 各 Repository.save()（並列）
9. booking.pullDomainEvents() → onBookingCancelled(event)     ← メール通知
```

### 8.3 本決済（`CapturePaymentUseCase`）

```
入力: bookingId / method: 'batch' | 'manual'

1. BookingRepository.findById(bookingId)
2. PaymentRepository.findByBookingId()
3. StripeService.capturePaymentIntent()
4. payment.capture(method)              ← PaymentCapturedEvent 発火
5. booking.complete()
6. 各 Repository.save()（並列）
7. payment.pullDomainEvents() → onPaymentCaptured(event)      ← 領収書メール
```

---

## 9. 実装ルール

### 9.1 Domain 層の禁則事項

```typescript
// ❌ Domain 層に外部サービス import を書かない
import { Firestore } from 'firebase-admin/firestore'  // 禁止
import Stripe from 'stripe'                            // 禁止

// ✅ Interface（ポート）に依存させる
import type { IBookingRepository } from './iBookingRepository'
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

- 全ファイル **camelCase**
- 集約ルート: `booking.ts` / `slot.ts` / `payment.ts`
- Value Object: `bookingStatus.ts` / `cancelDeadline.ts`
- Repository Interface: `iBookingRepository.ts`（先頭 `i` + camelCase）
- UseCase: `createBookingUseCase.ts`
- ドメインイベント: `bookingEvents.ts`（複数イベントを 1 ファイルに集約）

### 9.5 Vitest テスト指針

Domain 層はインフラ依存がゼロなので、単体テストが容易。以下を必ずテストする。

| テスト対象 | テスト内容 |
|---|---|
| `CancelDeadline` | 期限前・期限後で正しく判定できるか |
| `Booking.cancel()` | 顧客が期限超過でキャンセルすると `DomainError` を投げるか |
| `Slot.reserve()` | 二重予約で `DomainError` を投げるか |
| `Money.fromTaxIncluded()` | 税額計算が正しいか |
| `Booking.confirm()` | `BookingConfirmedEvent` が発火されるか |
