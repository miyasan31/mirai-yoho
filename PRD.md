# オンライン相談予約管理システム — 製品要件定義書（PRD）

> Version 0.4 | 2026-03-22 | Draft（未決事項 0 件）

---

## 目次

1. [概要](#1-概要)
2. [ユーザーエンティティ](#2-ユーザーエンティティ)
3. [機能要件](#3-機能要件)
4. [非機能要件](#4-非機能要件)
5. [技術スタック](#5-技術スタック全確定)
6. [環境設計](#6-環境設計)
7. [データモデル詳細](#7-データモデル詳細firestore)
8. [API 設計詳細](#8-api-設計詳細)
9. [画面要件](#9-画面要件全-12-画面)
10. [CI パイプライン](#10-ci-パイプライン)
11. [変更履歴](#11-変更履歴)

---

## 1. 概要

本システムは Next.js をベースとしたオンライン相談予約管理プラットフォームである。被相談者はアカウント登録不要（完全匿名）で空き枠を選択・仮決済し、Zoom URL をメールで受け取ることができる。相談終了後は管理者が CRM から本決済を手動で実行する。Zoom のブレイクアウトルーム機能で複数被相談者の並行サポートを実現する。

### 1.1 目的

- 被相談者が 24 時間・アカウント不要でオンライン相談枠を予約できる環境を提供する
- 仮決済 → Zoom URL 発行 → 相談 → 本決済 の一貫したフローをシステム化する
- 管理者が CRM 画面で被相談者・相談員・予約・決済を一元管理できる

### 1.2 スコープ外

- 相談員向けログイン画面（管理者が代理操作）
- E2E テスト
- 相談員の Zoom ルーム移動通知（手動オペのみ）

---

## 2. ユーザーエンティティ

| エンティティ | 概要 | 認証 | 主な権限 |
|---|---|---|---|
| 被相談者 | 相談を予約・受ける一般ユーザー | なし（完全匿名・メアドのみ） | 予約・仮決済・Zoom URL 受信 |
| 管理者 | システム全体を管理する内部ユーザー | Firebase Auth（認可必須） | CRM 全機能・本決済実行・相談員管理 |
| 相談員 | 相談を担当するスタッフ | なし（管理者が代理操作） | Zoom ブレイクアウトルーム参加 |

---

## 3. 機能要件

### 3.1 被相談者向け画面

#### 3.1.1 予約フロー

- 空き枠カレンダー表示（react-big-calendar、月 / 週ビュー）
- 予約枠選択 → 個人情報入力フォーム（RHF + Valibot）
- 入力項目：氏名・メールアドレス・電話番号・相談内容（任意）
- Stripe 仮決済（PaymentIntent、`capture_method: manual`、JPY 固定・税込み表示）
- 仮決済完了後、Resend 経由で Zoom URL をメール送付（`noreply@ドメイン`）

#### 3.1.2 予約完了後

- 予約確認・Zoom URL 記載のサンクスページを表示
- 確認メールを Resend で送信（予約番号・日時・料金・Zoom URL・キャンセルリンク含む）

#### 3.1.3 キャンセル

- 確認メール内のキャンセルリンクから被相談者自身がキャンセル可能
- 管理者も CRM から手動でキャンセル可能
- キャンセル可能期限：**相談開始 24 時間前まで**
- 返金：**全額返金**（Stripe PaymentIntent のキャンセル）
- キャンセル確認メールを Resend で送信

### 3.2 管理者向け CRM 画面

Firebase Auth による認証・認可が必須。全操作に管理者ログインが必要。

#### 3.2.1 ダッシュボード

- KPI サマリー：本日の予約数・今週の予約数・本決済待ち件数
- 直近の予約一覧（被相談者名・相談員・日時・ステータス）

#### 3.2.2 被相談者管理

- 被相談者一覧：検索・ページネーション付き（1 ページ 20 件）
- 被相談者詳細：基本情報・予約履歴・決済履歴
- 被相談者情報の編集・削除

#### 3.2.3 相談員管理

- 相談員の登録・編集・削除（論理削除）
- 相談員ごとの担当可能日時（スロット）設定
- Zoom ブレイクアウトルームとの紐づけ管理
- ルーム状況パネル（Room ごとの担当相談員一覧）
- 相談員は複数部屋に紐づけ可。移動は手動オペ・通知なし

#### 3.2.4 予約管理

- 予約カレンダービュー（react-big-calendar、月 / 週、相談員フィルタ）
- 予約詳細・ステータス管理
- 本決済の手動実行（Stripe PaymentIntent capture）
- 予約の手動キャンセル（相談 24 時間前まで、全額返金）

#### 3.2.5 決済管理

- 当月の決済サマリー（本決済合計・仮決済中・キャンセル金額）
- 決済一覧（ステータスフィルタ・月フィルタ・検索）
- Stripe Webhook 受信によるステータス自動更新
- 全金額 JPY・税込み表示
- インボイス対応：適格請求書に必要な情報（登録番号・税率・税額）を領収書メールに記載

### 3.3 Zoom ブレイクアウトルーム

| 項目 | 仕様 |
|---|---|
| Zoom プラン | Pro 以上（ブレイクアウトルーム機能が必要） |
| API 認証 | Server-to-Server OAuth（クライアント ID / シークレット / アカウント ID） |
| アカウント構成 | システム用 1 ホストアカウントで全ルームを管理 |
| 部屋割り | 被相談者 1 名につき 1 ブレイクアウトルームを自動割り当て |
| 相談員の紐づけ | 1 人の相談員が複数部屋に紐づけ可（DB で管理） |
| 相談員の移動 | 手動オペレーション（Zoom クライアントから直接移動・通知なし） |
| URL 発行タイミング | Stripe 仮決済完了後に即時生成・Resend でメール送付 |

### 3.4 2 段階決済フロー

| ステップ | タイミング | 処理 | Stripe API |
|---|---|---|---|
| ① 仮決済 | 予約確定時 | 与信確保（実際の引き落としなし） | `PaymentIntent` `capture_method: manual` |
| ② Zoom URL 発行 | 仮決済完了後 | ブレイクアウトルーム作成 & Resend でメール送付 | Zoom API + Resend |
| ③ 本決済 | 相談終了後（管理者が手動実行） | 引き落とし処理（JPY・税込み）/ 領収書メール（インボイス対応） | `PaymentIntent capture` |
| ④ Webhook 受信 | 決済状態変化時 | Firestore のステータスを自動更新 | Stripe Webhook（署名検証必須） |

> **料金設定：** 全ユーザー一律固定価格。JPY・税込み表示。金額は Stripe の設定値で管理する。

### 3.5 キャンセルポリシー

| 項目 | 内容 |
|---|---|
| キャンセル可能期限 | 相談開始 24 時間前まで |
| 返金方針 | 全額返金（Stripe PaymentIntent キャンセル） |
| キャンセル実行者 | 被相談者（確認メール内リンク）または管理者（CRM 手動操作） |
| 期限超過後 | キャンセル不可（システム的にも 24 時間前チェックを実装） |
| Stripe 仮決済との関係 | 仮決済有効期限は最大 7 日。24 時間前ポリシーとは独立して管理 |

### 3.6 メール通知一覧

| トリガー | 送信先 | 送信元 | 内容 |
|---|---|---|---|
| 予約確定（仮決済完了） | 被相談者 | `noreply@ドメイン` | 予約番号・日時・Zoom URL・キャンセルリンク（24 時間前まで有効） |
| 本決済完了 | 被相談者 | `noreply@ドメイン` | 決済完了・インボイス対応領収書（登録番号・税率・税額） |
| 予約キャンセル | 被相談者 | `noreply@ドメイン` | キャンセル確認・全額返金の旨 |

---

## 4. 非機能要件

### 4.1 セキュリティ

- 管理者画面は Firebase Auth の ID トークン検証でアクセス制御
- Stripe Webhook は `stripe-signature` ヘッダーによる署名検証を必須とする
- Zoom Server-to-Server OAuth の認証情報はサーバーサイドの環境変数のみで管理し、クライアントに露出させない
- 被相談者の個人情報は Firestore Security Rules で管理者のみ読み取り可

### 4.2 パフォーマンス

- 予約フォーム送信から仮決済完了まで 5 秒以内を目標
- カレンダー初期表示は 2 秒以内
- Stripe Webhook のレスポンスは 10 秒以内（Stripe 要件）

### 4.3 可用性

- GCP Cloud Run によるオートスケール構成
- Firestore マルチリージョンレプリケーションで高可用性を確保

---

## 5. 技術スタック（全確定）

| カテゴリ | 技術 / サービス | 備考 |
|---|---|---|
| フロントエンド FW | Next.js（App Router） | |
| 認証 | Firebase Authentication | 管理者のみ。被相談者は完全匿名 |
| データベース | Firestore（GCP） | Firebase 統一でコスト最適化 |
| 決済 | Stripe | PaymentIntent manual capture / JPY 固定・税込み / インボイス対応 |
| ビデオ | Zoom Breakout Rooms API | Pro プラン以上 / Server-to-Server OAuth / 1 ホストアカウント |
| メール送信 | Resend | 無料枠 3,000 通 / 月 / 送信元: `noreply@独自ドメイン` |
| フォーム | React Hook Form + Valibot | |
| UI コンポーネント | ParkUI | デザインシステム |
| カレンダー | react-big-calendar（MIT） | 月 / 週ビュー。被相談者向け & CRM 共通 |
| Lint / Format | Biome | |
| テスト | Vitest + React Testing Library | unit / component テスト（E2E は除外） |
| デプロイ | GCP Cloud Run | dev / prod 2 環境 |
| CI/CD | GitHub Actions | Lint・Format・Unit・Component テスト |

---

## 6. 環境設計

| 項目 | dev | prod |
|---|---|---|
| GCP プロジェクト | `project-dev` | `project-prod` |
| Firebase プロジェクト | 独立したプロジェクト（dev 用） | 独立したプロジェクト（prod 用） |
| Firestore | dev 専用 DB | prod 専用 DB |
| Firebase Auth | dev 専用（テストアカウント可） | prod 専用 |
| Stripe | テストモード（`sk_test_...`） | 本番モード（`sk_live_...`） |
| Zoom API | 同一アカウント可（テストミーティング） | 本番ホストアカウント |
| Resend | デフォルトドメイン可（`onboarding@resend.dev`） | 独自ドメイン（`noreply@ドメイン`） |
| Cloud Run URL | 自動割り当て URL | 独自ドメイン + HTTPS |
| 環境変数 | `.env.local`（ローカル）/ Secret Manager（GCP） | Secret Manager（GCP） |

> **Resend 独自ドメイン設定：** DNS への SPF / DKIM / DMARC レコード追加 → Resend ダッシュボードで検証。本番リリース前に必須。

---

## 7. データモデル詳細（Firestore）

### 7.1 `clients`（被相談者）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `name` | `string` | ○ | 氏名 |
| `email` | `string` | ○ | メールアドレス |
| `phone` | `string` | ○ | 電話番号 |
| `memo` | `string` | — | 管理者メモ（任意） |
| `createdAt` | `timestamp` | ○ | 登録日時 |
| `updatedAt` | `timestamp` | ○ | 最終更新日時 |

> **Security Rules:** Firebase Auth カスタムクレーム `admin: true` を持つユーザーのみ read / write 可。

### 7.2 `consultants`（相談員）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `name` | `string` | ○ | 相談員氏名 |
| `zoomRoomIds` | `string[]` | ○ | 担当する Zoom ブレイクアウトルーム ID の配列 |
| `isActive` | `boolean` | ○ | 有効 / 無効フラグ（論理削除） |
| `createdAt` | `timestamp` | ○ | 登録日時 |
| `updatedAt` | `timestamp` | ○ | 最終更新日時 |

### 7.3 `slots`（予約枠）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `consultantId` | `string` | ○ | 担当相談員の ID（`consultants` への参照） |
| `startDatetime` | `timestamp` | ○ | 枠の開始日時 |
| `endDatetime` | `timestamp` | ○ | 枠の終了日時 |
| `isBooked` | `boolean` | ○ | 予約済みフラグ（`false` = 空き） |
| `bookingId` | `string \| null` | — | 予約時に紐づく `bookings` の ID |

### 7.4 `bookings`（予約）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `clientId` | `string` | ○ | 被相談者 ID |
| `consultantId` | `string` | ○ | 相談員 ID |
| `slotId` | `string` | ○ | 予約枠 ID |
| `startDatetime` | `timestamp` | ○ | 相談開始日時（`slots` から複製） |
| `status` | `string` | ○ | `pending` / `confirmed` / `completed` / `cancelled` |
| `zoomUrl` | `string` | — | 仮決済完了後に設定される Zoom URL |
| `zoomRoomId` | `string` | — | 割り当てられたブレイクアウトルーム ID |
| `stripePaymentIntentId` | `string` | — | Stripe PaymentIntent ID |
| `consultantContent` | `string` | — | 被相談者が入力した相談内容（任意） |
| `cancelDeadline` | `timestamp` | ○ | キャンセル可能期限（`startDatetime - 24h`） |
| `createdAt` | `timestamp` | ○ | 予約日時 |
| `updatedAt` | `timestamp` | ○ | 最終更新日時 |

#### `status` の遷移

```
pending ──── Stripe 仮決済成功 & Zoom URL 発行 ────► confirmed
                                                         │
                                    ┌────────────────────┤
                                    ▼                    ▼
                               cancelled            completed
                          （cancelDeadline 以前）   （管理者が本決済実行）

pending ──── 仮決済失敗 or タイムアウト ──────────► cancelled
```

### 7.5 `payments`（決済）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `bookingId` | `string` | ○ | 予約 ID |
| `clientId` | `string` | ○ | 被相談者 ID（集計用に非正規化） |
| `stripePaymentIntentId` | `string` | ○ | Stripe PaymentIntent ID |
| `status` | `string` | ○ | `authorized` / `captured` / `cancelled` / `failed` |
| `amountJPY` | `number` | ○ | 金額（JPY・税込み） |
| `taxAmountJPY` | `number` | ○ | 消費税額（インボイス対応用） |
| `taxRate` | `number` | ○ | 税率（例: `0.10`） |
| `authorizedAt` | `timestamp` | — | 仮決済完了日時 |
| `capturedAt` | `timestamp` | — | 本決済完了日時 |
| `cancelledAt` | `timestamp` | — | キャンセル日時 |
| `createdAt` | `timestamp` | ○ | レコード作成日時 |

---

## 8. API 設計詳細

### 8.1 認可共通ルール

- **管理者専用：** `Authorization: Bearer <Firebase ID Token>` を必須。Firebase Admin SDK で検証
- **被相談者向け：** 認証不要。rate limiting を適用（IP ベース）
- **Webhook：** `stripe-signature` ヘッダーによる署名検証のみ

### 8.2 エンドポイント一覧

#### `GET /api/slots`

| 項目 | 内容 |
|---|---|
| 認証 | 不要 |
| クエリパラメータ | `from`: ISO8601 日付（必須）/ `to`: ISO8601 日付（必須）/ `consultantId`: 任意 |
| レスポンス | `{ slots: [{ id, consultantId, startDatetime, endDatetime, isBooked }] }` |

#### `POST /api/bookings`

| 項目 | 内容 |
|---|---|
| 認証 | 不要 |
| リクエスト Body | `{ slotId, clientName, clientEmail, clientPhone, consultantContent? }` |
| 処理フロー | ① `clients` 作成<br>② `slots.isBooked` を `true` に更新（Firestore トランザクション）<br>③ `cancelDeadline` を算出（`startDatetime - 24h`）<br>④ Stripe PaymentIntent 作成（`capture_method: manual`）<br>⑤ `bookings` 作成（`status: pending`）<br>⑥ `payments` 作成（`status: authorized`）<br>⑦ Zoom ブレイクアウトルーム URL 生成<br>⑧ `bookings` を `status: confirmed`・`zoomUrl` 更新<br>⑨ Resend で確認メール送信（Zoom URL・キャンセルリンク含む） |
| レスポンス 201 | `{ bookingId, clientSecret, zoomUrl }` |
| レスポンス 409 | スロット競合（二重予約） |
| レスポンス 402 | Stripe 決済エラー |

#### `POST /api/bookings/[id]/capture`

| 項目 | 内容 |
|---|---|
| 認証 | 管理者のみ |
| 処理フロー | ① Stripe PaymentIntent を capture<br>② `payments` を `status: captured`・`capturedAt` 更新<br>③ `bookings` を `status: completed` に更新<br>④ Resend でインボイス対応領収書メール送信 |
| レスポンス 200 | `{ bookingId, capturedAt }` |
| レスポンス 400 | 既に capture 済み or キャンセル済み |

#### `POST /api/bookings/[id]/cancel`

| 項目 | 内容 |
|---|---|
| 認証 | 管理者（CRM）または被相談者（メールリンクのトークン検証） |
| キャンセル期限チェック | `cancelDeadline` を超過している場合は `403` を返す |
| 処理フロー | ① `cancelDeadline` チェック<br>② Stripe PaymentIntent をキャンセル（全額返金）<br>③ `payments` を `status: cancelled`・`cancelledAt` 更新<br>④ `bookings` を `status: cancelled` に更新<br>⑤ `slots.isBooked` を `false` に戻す<br>⑥ Resend でキャンセル確認メール送信 |
| レスポンス 200 | `{ bookingId, cancelledAt }` |
| レスポンス 403 | キャンセル期限超過 |

#### `POST /api/webhooks/stripe`

| 項目 | 内容 |
|---|---|
| 認証 | `stripe-signature` ヘッダー署名検証 |
| 処理イベント | `payment_intent.succeeded` → `captured` に更新<br>`payment_intent.payment_failed` → `failed` に更新<br>`payment_intent.canceled` → `cancelled` に更新 |
| レスポンス | `200` を即時返却（処理は非同期） |
| タイムアウト | 10 秒以内に `200` を返す（Stripe 要件） |

#### 管理者向け CRUD API（共通：Firebase Auth 認証必須）

| エンドポイント | メソッド | 概要 |
|---|---|---|
| `/api/admin/clients` | `GET` | 一覧取得（`q`・`page`・`limit`・`sort` パラメータ対応） |
| `/api/admin/clients/[id]` | `GET` | 詳細取得（予約履歴・決済履歴含む） |
| `/api/admin/clients/[id]` | `PATCH` | 部分更新（`name` / `email` / `phone` / `memo`） |
| `/api/admin/clients/[id]` | `DELETE` | 削除 |
| `/api/admin/consultants` | `GET` | 一覧取得 |
| `/api/admin/consultants` | `POST` | 新規作成 |
| `/api/admin/consultants/[id]` | `PATCH` | 部分更新（`name` / `zoomRoomIds` / `isActive`） |
| `/api/admin/consultants/[id]` | `DELETE` | 論理削除（`isActive: false`） |
| `/api/admin/payments` | `GET` | 一覧取得（`month` / `status` / `q` パラメータ対応） |
| `/api/admin/bookings` | `GET` | 一覧取得（`from` / `to` / `consultantId` パラメータ対応） |

---

## 9. 画面要件（全 12 画面）

### 9.1 被相談者向け

| # | 画面名 | URL | 主要要件 |
|---|---|---|---|
| 1 | 空き枠選択 | `/booking` | react-big-calendar 月/週ビュー。空き（青）/ 済（グレー）/ 選択中（濃青）。過去日時は選択不可 |
| 2 | 個人情報入力 | `/booking/info` | RHF + Valibot。氏名・メール・電話（必須）・相談内容（任意）。選択済み日時・¥10,000 税込サマリー表示 |
| 3 | 決済 | `/booking/payment` | Stripe Payment Element 埋め込み。¥10,000 JPY 税込。「与信確保のみ」の注意文言。失敗時は同ページ内にエラー表示 |
| 4 | 予約完了 | `/booking/complete` | 予約番号・日時・料金・Zoom URL メール送付済み案内。キャンセルリンク案内 |

### 9.2 管理者向け CRM

| # | 画面名 | URL | 主要要件 |
|---|---|---|---|
| 5 | ログイン | `/admin/login` | Firebase Auth。メール/PW + Google SSO。管理者ロール検証。成功後 `/admin/dashboard` へ |
| 6 | ダッシュボード | `/admin/dashboard` | KPI（本日の予約数・今週・本決済待ち）。直近 10 件の予約一覧 |
| 7 | 予約一覧 | `/admin/bookings` | react-big-calendar 週/月ビュー。相談員フィルタ。色分け：仮決済済（青）/ 完了（緑）/ キャンセル（グレー） |
| 8 | 予約詳細 | `/admin/bookings/[id]` | 全情報表示。本決済ボタン（緑、確認ダイアログあり）。キャンセルボタン（赤、24 時間前チェック） |
| 9 | 被相談者一覧 | `/admin/clients` | 検索・ソート・ページネーション（20 件）。行クリックで詳細へ |
| 10 | 被相談者詳細 | `/admin/clients/[id]` | 基本情報・予約履歴・決済履歴。編集・削除（確認ダイアログ） |
| 11 | 相談員管理 | `/admin/consultants` | 相談員一覧 + Zoom ルーム状況パネル。追加・編集・削除 |
| 12 | 決済一覧 | `/admin/payments` | 当月サマリー（本決済合計・仮決済中・キャンセル）。フィルタ・検索。Webhook リアルタイム更新 |

---

## 10. CI パイプライン

| ステップ | ツール | 内容 |
|---|---|---|
| Lint チェック | Biome | コード品質・スタイル違反の検出 |
| フォーマット検証 | Biome | コードフォーマットの一貫性確認 |
| Unit テスト | Vitest | ユーティリティ・フック・ロジックのテスト |
| Component テスト | Vitest + RTL | UI コンポーネントの動作検証 |
| ビルドチェック | Next.js | ビルドエラーの早期検知 |

> E2E テストは今回のスコープ外。

---

## 11. 変更履歴

| Ver. | 日付 | 変更内容 |
|---|---|---|
| 0.1 | 2026-03-22 | 初版作成 |
| 0.2 | 2026-03-22 | メール: Resend / 被相談者: 完全匿名 / カレンダー: react-big-calendar / 決済: JPY 税込 / Zoom 移動通知: なし を確定 |
| 0.3 | 2026-03-22 | 全 12 画面ワイヤーフレーム・画面要件追記。データモデル詳細化。API 設計詳細化 |
| 0.4 | 2026-03-22 | キャンセルポリシー / Resend ドメイン / Zoom 構成 / GCP 2 環境設計 / インボイス対応 を確定。未決事項 0 件 |