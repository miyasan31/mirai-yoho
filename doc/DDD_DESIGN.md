# あなたのみらい予報 — DDD 設計ドキュメント

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
| 予約枠 | Slot | `Slot` | 占い師が開けた時間枠。`Booking` と 1 対 1 |
| 占い師 | Consultant | `Consultant` | ≠ Advisor / Staff。**日本語の呼称は 2026-07（PR #137）に「相談員」から「占い師」へ変更**。英語・コード上の識別子は `Consultant` のまま維持する |
| 顧客 | Customer | `Customer` | 会員登録した利用者（`User` 集約と 1 対 1、§2.1） |
| カード登録（後日課金） | Setup | `Payment`（`status: setup_pending → setup_complete`） | Stripe SetupIntent。`paymentStrategy: 'deferred'` |
| 課金 | Charge | `Payment.charge()` | バッチ or 手動。`status: charged` |
| 鑑定メモ | Consultant memo | `ConsultantMemo` | 顧客非公開の内部メモ。`{ customerName, birthDate, appraisalDate, freeMemo }` の構造化 VO（UI 表記は「鑑定メモ」） |
| キャンセル期限 | Cancel deadline | `CancelDeadline` | 相談開始 24 時間前 |
| 予約確定 | Booking confirmed | `BookingConfirmedEvent` | Zoom Join URL 発行済み（決済とは非同期） |
| バッチ課金 | Batch charge | `chargeMethod: 'batch'` | 深夜 0 時 Cloud Scheduler 実行 |
| 組織 | Organization | `Organization` | マルチテナントの契約単位 |
| アカウント | Account | `Account` | 組織に所属する管理者・オペレーターのログイン主体。占い師は `accounts` に doc を持たない排他モデル（`doc/NAMING_LEDGER.md` §3.5.1） |
| ロール | Role | `Role` | 組織ごとにカスタム定義できる権限セット |
| クーポン | Coupon | `Coupon` | 組織が発行するクーポンのマスタ |
| 保有クーポン | UserCoupon | `UserCoupon` | ユーザーへ配布・予約に適用された `Coupon` のインスタンス |

> §5.1 集約一覧・§3 サブドメイン分類・§4 境界付けられたコンテキストは予約・決済・占い師コンテキストを中心に記載しており、`Organization` / `Account` / `Role` / `Coupon` / `UserCoupon` / `PricePlan` / `ZoomSession` / `PolicyRevision` / `PolicyAgreement` は §7.2 フォルダ構造にのみ反映されている（詳細は各集約のコード・`doc/NAMING_LEDGER.md` を参照）。

### 2.1 `User` と `Customer`（顧客の会員化）

> **重要**: PRD 策定時の「顧客は完全匿名・アカウント登録不要」という前提は**廃止済み**。現在は会員登録と Zoom 連携が予約の必須条件になっている。

| 概念 | 集約 | スコープ | 説明 |
|---|---|---|---|
| ユーザー | `User` | 組織横断（グローバル） | サービス全体で 1 人 1 レコード。`userId`（独自 UUID）と `authUid`（Firebase Auth uid）を分離して持つ。Zoom 連携情報（`UserZoomConnection`）もここ |
| 顧客 | `Customer` | 組織スコープ | ある組織における `User` の顧客レコード。`userId` で `User` を参照し、氏名・連絡先・鑑定メモ用の情報を持つ |

`apps/user` は Firebase Auth の **匿名認証**でサインアップし、任意で Google アカウントを連携できる（`apps/user/src/hooks/use-customer-auth.tsx`）。したがって顧客向け SPA も `VITE_FIREBASE_*` を必要とする。

**予約の前提条件**（`CreateBookingUseCase`）:

| 条件 | 満たさない場合 |
|---|---|
| 会員登録済み（`users` に doc がある） | `401 CUSTOMER_NOT_SIGNED_UP` |
| アクティブ（退会していない） | `404 USER_NOT_FOUND` |
| Zoom 連携済み（ブレイクアウトルーム割り当てに Zoom のメールアドレスが要る） | `409 ZOOM_NOT_CONNECTED` |
| 公開中の利用規約・キャンセルポリシーの `revisionId` を同意済みとして送る | `404 POLICY_REVISION_NOT_FOUND` / `400 POLICY_REVISION_NOT_PUBLISHED`（§2.2） |
| 18 歳未満の場合は親権者同意（`guardianName` / `guardianConsentedAt`） | `400 GUARDIAN_CONSENT_REQUIRED` |

退会時は `WithdrawUserUseCase` が Zoom トークンを revoke → `User.withdraw()` → 所属組織すべての `Customer.mask()`（氏名・メール・電話・生年月日をマスキング）を同一トランザクションで実行し、最後に Firebase Auth ユーザーを無効化する。`User.withdraw()` は `UserWithdrawnEvent` を発火するが現状は消費されていない（§6.1）。

### 2.2 ポリシー（利用規約 / キャンセルポリシー / プライバシーポリシー）

組織ごとに本文をバージョン管理し、顧客・占い師の同意証跡を残す。

| 概念 | 集約 | 説明 |
|---|---|---|
| ポリシー改訂 | `PolicyRevision` | 1 つの本文バージョン。`type` × `version` で一意。`draft → published → archived` と遷移し、`published` は type ごとに最大 1 件 |
| 同意証跡 | `PolicyAgreement` | 誰が・いつ・どの改訂に同意したかの記録。`subjectType`（`customer` / `consultant`）× `subjectId` × `revisionId`。予約起因の同意は `bookingId` を持つ |

`type`（`PolicyType`）は読者区分（`PolicyAudience`）をプレフィックスに持つ。

| 読者区分 | `type` | 同意を求める主体 |
|---|---|---|
| `user` | `user_terms` / `user_cancellation_policy` / `user_privacy_policy` | `subjectType` = `user` / `customer` |
| `consultant` | `consultant_terms` / `consultant_privacy_policy` | `subjectType` = `consultant` |

読者区分をまたぐ同意（占い師が `user_terms` に同意する等）は `PolicyAgreement.create()` が `POLICY_AUDIENCE_MISMATCH` で弾く。`GetPolicyAgreementStatusUseCase` も主体の読者区分に属する type だけを返すため、再同意ゲートに相手側の文書が混ざらない。

同意の取り方はサーバとクライアントで役割が分かれる。

- **サーバ**: `CreateBookingUseCase` は受け取った `agreedTermsRevisionId` / `agreedCancellationPolicyRevisionId` が「その組織の・その type の・公開中の」改訂であることだけを検証し、`PolicyAgreement` を記録する。`Booking` にも `agreedTermsVersion` / `agreedCancellationPolicyVersion` / `agreedAt` をスナップショットとして保持する（§5.2）
- **クライアント**: 予約フォームが `GET /organizations/{organizationId}/policies/{type}/latest` で公開中の改訂を取得し、同意チェックを必須にしたうえでその `revisionId` を送る（未公開なら予約自体を止める）。占い師コンソールは `GET /consultant/policies/status` を見て、未同意なら再同意ゲートを出す

---

## 3. サブドメイン分類

| サブドメイン | 分類 | 理由 |
|---|---|---|
| 予約管理（Booking / Slot） | **コアドメイン** ★ | サービスの競合優位性の源泉。最も手をかける |
| 決済管理（Payment） | 支援サブドメイン | ビジネス固有だが Stripe に委譲できる部分が大きい |
| 占い師管理（Consultant） | 支援サブドメイン | プロフィール・スロット管理はドメイン知識を持つが差別化要素ではない |
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
│   決済コンテキスト      │   │         占い師コンテキスト               │
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
| 予約コンテキスト | 占い師コンテキスト | Customer / Supplier（予約がスロットを参照） |
| 予約 / 決済コンテキスト | 通知コンテキスト | Published Language（ドメインイベント経由） |
| 認証（Firebase Auth） | 占い師 / 管理者 | Conformist（Firebase の UID をそのまま使う） |

---

## 5. 集約設計

### 5.1 集約一覧

| 集約ルート | 内包する Value Object | 主なドメインメソッド | トランザクション境界 |
|---|---|---|---|
| `Booking` | `BookingStatus` `CancelDeadline` `ZoomUrl` `ConsultantMemo` | `confirm()` `cancel()` `complete()` `updateMemo()` `markConsultantJoined()` `markConsultationReminderEmailSent()` `markLateArrivalAlertSent()` | 予約作成・キャンセル・完了・バッチ処理の実行済み記録 |
| `BookingRating` | `RatingScore` `RatingComment` `RatingWindow` | —（記録専用・不変） | 会員による鑑定評価の記録（§5.3） |
| `Slot` | `TimeRange` | `reserve()` `release()` | 予約作成・キャンセル |
| `Payment` | `Money` `PaymentStatus` `PaymentStrategy` | `completeSetup()` `charge()` `refund()` `cancel()` `failCharge()` | 決済操作 |
| `Consultant` | `ConsultantProfile` | `updateProfile()` `changeStatus()` `deactivate()` | プロフィール更新・ステータス変更・論理削除 |
| `Customer` | —（シンプルなデータ保持） | `updateInfo()` `updateNote()` `linkUser()` `mask()` | 顧客情報更新・退会時マスキング |
| `User` | `BirthDate` `UserZoomConnection` `AuthProvider` | `updateProfile()` `connectZoom()` `disconnectZoom()` `withdraw()` | 会員情報更新・Zoom 連携・退会（§2.1） |
| `PolicyRevision` | `PolicyType` | `publish()` `archive()` `updateDraft()` | ポリシー本文の改訂（§2.2） |
| `PolicyAgreement` | `PolicyType` | —（記録専用・不変） | 同意証跡の記録（§2.2） |
| `Settings` | `BusinessHours` `PricePlanRange` `ConsultantStatus` | `updateBusinessHours()` `updateConsultantStatuses()` `updatePricePlanRange()` | 組織設定の更新 |
| `AppraisalReport` | `AppraisalReportContent` | `updateContent()` `publish()` | 占い師による鑑定書の下書き作成・公開（§5.6） |

### 5.2 Booking 集約詳細

```
Booking（集約ルート）
├── organizationId: string          外部参照（マルチテナント境界）
├── bookingId: string               ID（Firestore 自動生成）
├── customerId: CustomerId          外部参照（別集約）
├── consultantId: ConsultantId      外部参照（別集約）
├── usageSlotIds: string[]          外部参照（別集約）。durationMinutes 分の 15分スロットを連続予約
├── bufferSlotIds: string[]         外部参照（別集約）。予約後 15分の準備時間スロット（空き枠から自動除外）
├── startsAt / endsAt: Date         slots から複製（非正規化）
├── durationMinutes: SupportedDurationMinutes  30|60|90|120（PricePlan.durationMinutes と一致）
├── status: BookingStatus           pending|confirmed|completed|cancelled
├── cancelDeadlineAt: CancelDeadline  startsAt - 24h
├── joinUrl?: ZoomUrl               confirm() 後にセット（Zoom Session の Join URL）
├── consultantMemo: ConsultantMemo  管理者・占い師のみ閲覧可（鑑定メモ）
├── consultationContent?: string    顧客入力（任意）
├── pricePlanId / pricePlanName / pricePlanTotalJPY?  予約確定時点の料金プランを非正規化
├── appliedUserCouponId / couponDiscountJPY / discountedTotalJPY?  適用クーポンと割引後金額（任意）
├── consultantJoinedAt / consultationReminderEmailSentAt / lateArrivalAlertSentAt?: Date  バッチ処理の実行済みフラグ
├── agreedTermsVersion / agreedCancellationPolicyVersion / agreedAt?  予約時に同意したポリシーの版名と日時（§2.2）
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

### 5.3 BookingRating 集約詳細

```
BookingRating（集約ルート）
├── organizationId: string          外部参照（マルチテナント境界）
├── bookingId: string               外部参照（別集約）。Firestore の Doc ID でもある = 1予約1評価
├── consultantId: string            外部参照（別集約）。一意キーは (organizationId, consultantId)
├── customerId: string              外部参照（別集約）
├── score: RatingScore              1〜5 の整数
├── comment: RatingComment          任意・最大1000文字。空文字はコメントなし
├── consultedAt: Date               booking.startsAt を非正規化（console 表示のため）
└── ratedAt: Date
```

**状態を変更するメソッドを 1 つも持たない**。これが「提出後は編集・削除不可」という仕様の表現であり、
`IBookingRatingRepository` も `save()` / `delete()` を定義せず `create()` のみを公開する。
永続化側は `DocumentReference.create()` を使い、二重送信のレースでも既存の評価が上書きされない。

評価可能期間を表す `RatingWindow`（`endsAt` から30日）は集約に永続化しない。`CancelDeadline` と違い
予約時点のポリシーを固定する必要がなく、`booking.endsAt` から常に導出できるため。
可否判定そのものは Booking と BookingRating の 2 集約にまたがるので
`application/booking-rating/rating-eligibility.ts` に置く（`charge-eligibility.ts` と同じ方針）。

評価は運営（console）のみが閲覧でき、占い師には公開しない。この非露出は
認証段階（console のルートで `verifyEitherAuth` を使わない）・`firestore.rules`・OpenAPI スキーマの 3 層で担保する。

### 5.4 Payment 集約詳細

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

### 5.5 集約をまたぐ操作の原則

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

### 5.6 AppraisalReport 集約詳細

```
AppraisalReport（集約ルート）
├── organizationId: string          外部参照（マルチテナント境界）
├── reportId: string                ID（Firestore 自動生成）
├── bookingId: string               外部参照（別集約）。一意キーは (organizationId, bookingId)
├── consultantId: string            外部参照（別集約）。担当占い師のみ作成・編集可
├── customerId: string              外部参照（別集約）
├── content: AppraisalReportContent  タイトル / 顧客名 / 生年月日 / 鑑定日 / テーマ / 現状 / 鑑定結果 / 開運行動 / まとめ
├── status: AppraisalReportStatus   draft|published
├── publishedAt?: Date
├── createdAt: Date
└── updatedAt: Date
```

鑑定終了（`booking.endsAt` を過ぎている）かつキャンセルされていない予約に対してのみ、担当占い師が下書きを作成できる
（`assertBookingReportable`）。`booking.status: completed` は「課金完了」を意味し鑑定終了とは無関係なため、
鑑定書の可否判定には使わない。`publish()` は下書き状態かつ `content.result`（鑑定結果）が空でない場合のみ許可し、
公開後は `updateContent()` が `APPRAISAL_REPORT_NOT_DRAFT` で拒否される（編集不可）。公開済みの鑑定書のみ、
顧客のマイページ（`findPublishedByCustomerIds`）に一覧表示される。

---

## 6. ドメインイベント

### 6.1 イベント一覧

| イベント名 | 発火元 | 発火タイミング | ハンドラ（通知） |
|---|---|---|---|
| `BookingConfirmedEvent` | `Booking.confirm()` | Zoom Join URL セット後 | （集約に追加はされるが `CreateBookingUseCase` は現状未使用。確認メールは UseCase が直接送信） |
| `BookingCancelledEvent` | `Booking.cancel()` | キャンセル確定後 | `CancelBookingUseCase` が `pullDomainEvents()` で取り出し、ペイロードの `customerId` / `consultantId` から宛先を解決して顧客キャンセル確認メールを送信（§8.2） |
| `PaymentChargedEvent` | `Payment.charge()` | 課金確定後 | `ChargePaymentUseCase` が `pullDomainEvents()` で取り出し、顧客領収書メールを送信 |
| `UserWithdrawnEvent` | `User.withdraw()` | 退会確定後 | **未消費**。`WithdrawUserUseCase` は `pullDomainEvents()` を呼ばず、所属組織すべての `Customer.mask()` を同一トランザクションで直接実行している（`BookingConfirmedEvent` と同じくイベント未活用箇所） |

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

### 6.3 メール通知一覧

`IEmailService`（`application/shared/email-service.ts`）が定義するポート。実装は Resend（`infrastructure/resend/`）。`EMAIL_DELIVERY_MODE=log` でローカルは標準出力に切り替わる。

| メソッド | トリガー | 宛先 | 内容 |
|---|---|---|---|
| `sendBookingConfirmation` | 予約確定（§8.1） | 顧客 | 日時・占い師・Zoom URL・署名付きキャンセルリンク |
| `sendConsultantBookingNotice` | 予約確定（§8.1） | 担当占い師 | 日時・顧客名・Zoom URL |
| `sendBookingCancellation` | キャンセル（§8.2） | 顧客 | キャンセル実行者・占い師・予約 ID |
| `sendConsultantCancellationNotice` | キャンセル（§8.2） | 担当占い師 | キャンセル実行者・日時・顧客名 |
| `sendPaymentReceipt` | 課金確定（§8.3） | 顧客 | インボイス対応領収書（登録番号・税率・税額） |
| `sendBatchChargeReport` | 課金バッチ完了 | 組織の管理者（`roleId: admin` かつ `active`） | 実行日時・課金/完了/エラー件数・エラー詳細 |
| `sendConsultationReminder` | 相談開始 15 分前バッチ | 顧客 | 開始時刻・Zoom URL |
| `sendInvitation` | アカウント / 占い師招待 | 招待対象 | パスワード設定リンク |
| `sendPasswordReset` | パスワードリセット | 対象アカウント | 再設定リンク |

> 占い師・管理者の宛先は `IUserContactService`（Firebase Auth からメールアドレスを引く）で解決する。`consultants` / `accounts` コレクションはメールアドレスを持たない。
>
> 通知系（占い師宛・管理者宛）の送信失敗は **ログに残して握り潰す**。予約・キャンセル・課金は既に永続化済みで、通知の失敗で呼び出し元を失敗させないため。顧客宛の予約確認メールだけは例外で、失敗時に `502 EMAIL_DELIVERY_ERROR` を返す。

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
│   ├── consultant/ · price-plan/
│   ├── customer/ · user/ · user-coupon/
│   ├── settings/ · authorization/ · account/ · organization/ · coupon/
│   ├── policy/                       ← PolicyRevision / PolicyAgreement（§2.2）
│   ├── booking-rating/               ← BookingRating（§5.3）
│   ├── appraisal-report/             ← AppraisalReport（§5.6）
│   ├── settlement/                   ← 精算書の読み取りモデル（§8.5）
│   └── zoom-session/
│                                     ↑ domain 直下は全ディレクトリを列挙している
│
├── application/                      ← 以下は代表例。実際は集約とほぼ 1 対 1 で
│   ├── booking/                        appraisal-report / authorization / booking-rating /
│   │   ├── create-booking-use-case.ts   consultant / coupon / dashboard / payment / policy /
│   │   ├── cancel-booking-use-case.ts   price-plan / settings / settlement / slot / user /
│   │   ├── charge-payment-use-case.ts   user-coupon が並ぶ（zoom-session は domain のみで
│   │   └── setup-payment-use-case.ts  ← カード登録 / PayPay 即時決済（§8.4）　application 層は持たない）
│   └── shared/                      ← UseCase から使うポート（Interface）
│       ├── stripe-service.ts · zoom-service.ts · email-service.ts
│       ├── cancel-token-service.ts  ← キャンセルリンクの HMAC 署名
│       └── unit-of-work.ts          ← トランザクション境界
│
├── infrastructure/                  ← 上記ポートの実装（Firestore / Stripe / Zoom / Resend）
│   └── container.ts                 ← UseCase の組み立て（DI コンテナ）
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
入力: organizationId / userId / consultantId / startsAt / durationMinutes（30|60|90|120） /
       customerName / customerEmail / customerPhone / customerBirthDate /
       consultationContent? / selectionId（料金プラン選択） / selectedUserCouponId? /
       agreedTermsRevisionId / agreedCancellationPolicyRevisionId / agreedAt /
       guardianName? / guardianConsentedAt?（18歳未満のとき必須）

1. resolvePublishedRevision() × 2          ← user_terms / user_cancellation_policy の revisionId が
   その組織の公開中の改訂かを検証（§2.2）
2. BirthDate.isMinor(customerBirthDate) なら guardianName / guardianConsentedAt を必須化
   ← 欠けていれば 400 GUARDIAN_CONSENT_REQUIRED
3. UserRepository.findById(userId)         ← アクティブ・Zoom 連携済みチェック
4. resolveContinuousAndPricePlan()         ← selectionId → PricePlan、durationMinutes 分の
   15分スロットが startsAt から連続空きか + 直後 1 コマ（15分）の準備時間スロットの空き
5. usageSlot.reserve(newBookingId) / bufferSlot.reserve(newBookingId)（各コマ）
   ← 二重予約・過去日時チェック（DomainError）。準備時間は以後の空き枠検索から除外される
6. resolveAppliedCoupon()                  ← selectedUserCouponId があれば UserCoupon を検証し割引額算出
7. CustomerRepository.findByUserIdAndOrganizationId() → 既存なければ Customer.create({...})、
   既存なら customer.updateInfo()          ← 親権者情報もここで更新
8. user.updateProfile()                    ← 予約フォームの入力で User 側のプロフィールも更新
9. Booking.create({...})                   ← status: pending。usageSlotIds/bufferSlotIds・
   料金プラン・適用クーポン・同意した版名（agreed*Version / agreedAt）を非正規化して保持
10. ZoomSessionRepository.findByDate() → 当日セッションが無ければ ZoomService.createDailyMeeting()、
    あれば ZoomService.updateBreakoutRooms()  ← 予約単位のブレイクアウトルームを割り当て
    ← 失敗時は 502 ZOOM_INTEGRATION_ERROR
11. booking.confirm(joinUrl)               ← BookingConfirmedEvent 発火（現状 UseCase は未使用）
12. appliedCoupon.redeem(bookingId)        ← クーポンを使用済みにする
13. EmailService.sendBookingConfirmation() ← 入力値から直接送信（イベント経由ではない）。
    本文には CancelTokenService.generateToken() で発行した署名付きキャンセル URL
    （`{USER_APP_URL}/{organizationId}/booking/cancel?token=...`）を含める。
    トークンの有効期限は cancelDeadlineAt（相談開始 24h 前）。失敗時は 502 EMAIL_DELIVERY_ERROR
14. UnitOfWork.runInTransaction(customer, user, usageSlots, bufferSlots, booking,
    zoomSession, appliedCoupon)            ← Firestore トランザクション
15. notifyConsultant()                     ← 担当占い師へ予約確定を通知。宛先は
    UserContactService（Firebase Auth）から解決。失敗はログのみ（予約は確定済み）
16. recordAgreements()                     ← PolicyAgreement を bookingId 付きで記録（§2.2）

出力: { bookingId, joinUrl }
```

> 決済（カード登録 / PayPay 即時決済）はこのフローに含まれない。予約確定後に §8.4 `SetupPaymentUseCase` が決済手段を登録し、カードの課金は §8.3 `ChargePaymentUseCase` がバッチ/手動で別途行う。

### 8.2 キャンセル（`CancelBookingUseCase`）

```
入力: organizationId / bookingId / cancelledBy: 'customer' | 'admin'

1. BookingRepository.findById(organizationId, bookingId)
2. booking.cancel(cancelledBy)              ← 期限チェック（customer のみ）
3. PaymentRepository.findByBookingId()
4. payment があれば戦略・状態で分岐：
     immediate かつ charged → StripeService.refundPaymentIntent() → payment.refund()
     deferred かつ setup_pending|setup_complete → payment.cancel()（Stripe 側は未課金なので返金不要）
5. booking.getAllOccupiedSlotIds()（usageSlotIds + bufferSlotIds）を SlotRepository.findById() で取得
   → 各 slot.release()
6. ZoomSessionRepository.findByDate() → session.removeBooking(bookingId) で該当ルームを外し
   ZoomService.updateBreakoutRooms() を呼ぶ
7. 適用中クーポンがあれば restoredCoupon.restore()  ← 未使用状態に戻す
8. 各 Repository.save()（並列）
9. booking.pullDomainEvents() → BookingCancelledEvent を判定し、イベントの
   customerId / consultantId から Customer・Consultant・占い師の連絡先を引いて
   EmailService.sendBookingCancellation()（顧客宛）と
   EmailService.sendConsultantCancellationNotice()（占い師宛）を送信
   ← 集約は ID 参照のみ（§5.5）なのでイベントに宛先は載せず、UseCase 側で解決する。
     退会済み顧客（mask() でメール空）は顧客宛をスキップし、送信失敗は
     ログに残して握り潰す（キャンセル自体は永続化済みのため）
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
    ← 適格請求書（インボイス）の記載事項を含む: 発行者・登録番号
      （INVOICE_REGISTRATION_NUMBER）/ 取引年月日 / 取引内容 / 税抜金額 /
      税率と税率ごとの消費税額 / 税込合計

失敗時: catch 節で payment.failCharge() → save し、エラーを re-throw
```

### 8.4 決済登録（`SetupPaymentUseCase`）

予約作成（§8.1）と決済は分離されており、予約確定後に顧客が決済手段を選ぶ。カードと PayPay で `PaymentStrategy` が分かれる。

```
入力: organizationId / bookingId / paymentMethodType: 'card' | 'paypay'

1. BookingRepository.findById()                ← 無ければ 404 BOOKING_NOT_FOUND
2. PaymentRepository.findByBookingId()         ← 既にあれば 409 PAYMENT_ALREADY_EXISTS
3. booking.getEffectiveTotalJPY()              ← クーポン適用後の金額。未設定は 400
4. Money.fromTaxIncluded(effectiveTotalJPY, 0.1)

  card の場合:
    5a. StripeService.createSetupIntent()      ← カード登録のみ（引き落としなし）
    6a. Payment.createDeferred()               ← status: setup_pending
    出力: { clientSecret, mode: 'setup' }

  paypay の場合:
    5b. StripeService.createPaymentIntent()    ← payment_method_types: ['paypay']
    6b. Payment.createImmediate()              ← status: setup_pending → 決済完了で charged
    出力: { clientSecret, mode: 'payment' }
```

> `clientSecret` は Stripe の `client_secret` をそのまま返す。SPA は `mode` に応じて Stripe Payment Element を setup / payment モードで初期化する（`apps/user/src/routes/$organizationId/booking/payment/index.tsx`）。

#### 決済戦略の違い

| | `deferred`（card） | `immediate`（paypay） |
|---|---|---|
| 予約直後 | カード登録のみ。引き落としなし | その場で決済完了 |
| 課金 | 鑑定後に §8.3 `ChargePaymentUseCase` がバッチ / 手動で実行 | なし（登録時点で完了） |
| キャンセル時 | `payment.cancel()`（Stripe 側は未課金なので返金不要） | `StripeService.refundPaymentIntent()` → `payment.refund()` |

#### Stripe Webhook（`POST /api/webhooks/stripe`）

`stripe-signature` の署名検証後、以下を処理する。

| イベント | 処理 |
|---|---|
| `setup_intent.succeeded` | `CompleteSetupUseCase` → `payment.completeSetup(paymentMethodId)`（`status: setup_complete`）。以後 §8.3 の off-session 課金が可能になる |
| `setup_intent.setup_failed` | `CancelPaymentUseCase` → `payment.cancel()` |
| `payment_intent.payment_failed` | `FailPaymentUseCase` → `payment.failCharge()` |

### 8.5 精算書発行（`GetConsultantSettlementStatementUseCase`）

占い師向けの精算書を月単位で都度算出する。永続化される集約ではなく、`Booking` / `Payment` / `Consultant` /
`Settings` / `Customer` を横断して読み取り専用で組み立てる集計ユースケース（`domain/settlement/` は
Firestore への参照を持たない純粋な計算関数のみで構成）。

```
入力: organizationId / consultantId / month（YYYY-MM）/ usesOfficeAddress

1. resolveSettlementPeriod(month)                     ← JST 月初〜翌月初の絶対時刻レンジに変換
2. BookingRepository.findByConsultantId()             ← 対象月内・非キャンセルの予約を抽出
3. PaymentRepository.findByBookingIds()               ← status: charged の決済のみ借受金に計上
4. calculateSettlement({ grossJPY, systemFeeRatePercent, usesOfficeAddress })
   借受金 − システム利用料（外税10%） − 事務所利用料（利用時 ¥500） = 精算料（端数切り捨て）
出力: 明細（予約ごとの日時・顧客名・料金プラン・金額）+ 各種金額の内訳
```

> `systemFeeRatePercent` は `ConsultantStatus.settlementRatePercent`（占い師ステータスごとに設定）から解決する。
> PDF 化は `apps/consultant/src/pages/settlement-statement/` が担当し、UseCase 自体は帳票データのみ返す。

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
