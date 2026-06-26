# Arc - 未来予報 — 製品要件定義書（PRD）

> Version 0.5 | 2026-03-22 | Draft（未決事項 0 件）

---

## 目次

1. [概要](#1-概要)
2. [アカウントエンティティ](#2-アカウントエンティティ)
3. [機能要件](#3-機能要件)
4. [非機能要件](#4-非機能要件)
5. [技術スタック](#5-技術スタック全確定)
6. [環境設計](#6-環境設計)
7. [データモデル詳細](#7-データモデル詳細firestore)
8. [API 設計詳細](#8-api-設計詳細)
9. [画面要件](#9-画面要件全-22-画面)
10. [CI パイプライン](#10-ci-パイプライン)
11. [変更履歴](#11-変更履歴)

---

## 1. 概要

本システムは Next.js をベースとしたオンライン相談予約管理プラットフォーム **Arc - 未来予報** である。顧客はアカウント登録不要（完全匿名）で相談員を選択・空き枠を予約・仮決済し、Zoom URL をメールで受け取ることができる。相談終了後は深夜 0 時のバッチ処理により前日分の本決済が自動実行される。Zoom のブレイクアウトルーム機能で複数顧客の並行サポートを実現する。

### 1.1 目的

- 顧客が 24 時間・アカウント不要で相談員を選択しオンライン相談枠を予約できる環境を提供する
- 仮決済 → Zoom URL 発行 → 相談 → 深夜バッチ本決済 の一貫したフローをシステム化する
- 管理者が CRM 画面で顧客・相談員・予約・決済を一元管理できる

### 1.2 スコープ外

- E2E テスト
- 相談員の Zoom ルーム移動通知（手動オペのみ）
- 管理者操作の監査ログ

---

## 2. アカウントエンティティ

| エンティティ | 概要 | 認証 | 主な権限 |
|---|---|---|---|
| 顧客 | 相談を予約・受ける一般利用者 | なし（完全匿名・メアドのみ） | 予約・仮決済・Zoom URL 受信 |
| スーパー管理者 | システム全体を管理する内部アカウント | Firebase Auth（`super_admin` クレーム） | CRM 全機能・管理者アカウント管理・権限変更・削除系全操作 |
| オペレーター | 日常的な運用を担当する内部アカウント | Firebase Auth（`operator` クレーム） | 予約・決済・顧客情報の閲覧・操作（削除・権限変更不可） |
| 相談員 | 相談を担当するスタッフ | Firebase Auth（`consultant` クレーム） | 自分の担当予約・スロット確認・相談メモ入力・プロフィール編集 |

### ロール権限マトリクス

| 操作 | スーパー管理者 | オペレーター | 相談員 |
|---|---|---|---|
| 管理者アカウント作成・削除 | ✅ | ❌ | ❌ |
| 権限ロール変更 | ✅ | ❌ | ❌ |
| 顧客・相談員の削除 | ✅ | ❌ | ❌ |
| 予約・決済操作（本決済・キャンセル） | ✅ | ✅ | ❌ |
| 顧客情報編集 | ✅ | ✅ | ❌ |
| 閲覧系全般（CRM） | ✅ | ✅ | ❌ |
| 自分の担当予約・スロット確認 | ❌ | ❌ | ✅ |
| 相談メモ入力 | ✅ | ✅ | ✅ |
| プロフィール編集 | ❌ | ❌ | ✅ |

---

## 3. 機能要件

### 3.1 顧客向け画面

#### 3.1.1 予約フロー

- 相談員一覧表示（カード形式：名前・写真・自己紹介・専門分野。空き状況は非表示）
- 相談員選択 → その相談員の空き枠カレンダー（react-big-calendar、月 / 週ビュー）
- 予約枠選択 → 個人情報入力フォーム（RHF + Valibot）
- 入力項目：氏名・メールアドレス・電話番号・相談内容（任意）
- Stripe 仮決済（PaymentIntent、`capture_method: manual`、JPY 固定・税込み表示）
- 仮決済完了後、Resend 経由で Zoom URL をメール送付（`noreply@ドメイン`）

#### 3.1.2 予約完了後

- 予約確認・Zoom URL 記載のサンクスページを表示
- 確認メールを Resend で送信（予約番号・日時・料金・Zoom URL・相談員名・相談員写真・キャンセルリンク含む）

#### 3.1.3 キャンセル

- 確認メール内のキャンセルリンクから顧客自身がキャンセル可能
- 管理者も CRM から手動でキャンセル可能
- キャンセル可能期限：**相談開始 24 時間前まで**
- 返金：**全額返金**（Stripe PaymentIntent のキャンセル）
- キャンセル確認メールを Resend で送信

### 3.2 相談員向け画面

Firebase Auth（`consultant` クレーム）による認証が必須。

#### 3.2.1 担当予約一覧

- 自分の担当予約一覧（当日・今後）をカレンダーまたはリスト形式で表示
- 予約詳細・Zoom URL の確認

#### 3.2.2 予約詳細・相談メモ

- 予約の全情報表示（顧客名・日時・Zoom URL）
- 相談メモの入力・編集（管理者・相談員のみ閲覧可。顧客には非公開）

#### 3.2.3 プロフィール編集

- 名前・プロフィール写真・自己紹介・専門分野の編集
- 写真は Firebase Storage にアップロード

### 3.3 管理者向け CRM 画面

Firebase Auth（`super_admin` または `operator` クレーム）による認証・認可が必須。

#### 3.3.1 ダッシュボード

- KPI サマリー：本日の予約数・今週の予約数・本決済待ち件数
- 直近の予約一覧（顧客名・相談員・日時・ステータス）

#### 3.3.2 顧客管理

- 顧客一覧：検索・ページネーション付き（1 ページ 20 件）
- 顧客詳細：基本情報・予約履歴・決済履歴
- 顧客情報の編集・削除（削除はスーパー管理者のみ）

#### 3.3.3 相談員管理

- 相談員の登録・編集・削除（論理削除。削除はスーパー管理者のみ）
- 相談員ごとの担当可能日時（スロット）設定
- Zoom ブレイクアウトルームとの紐づけ管理
- ルーム状況パネル（Room ごとの担当相談員一覧）
- 相談員は複数部屋に紐づけ可。移動は手動オペ・通知なし

#### 3.3.4 予約管理

- 予約カレンダービュー（react-big-calendar、月 / 週、相談員フィルタ）
- 予約詳細・ステータス管理・相談メモ閲覧
- 本決済の手動実行（Stripe PaymentIntent capture）※例外対応用
- 予約の手動キャンセル（相談開始 24 時間前まで、または当日深夜バッチ実行前まで）

#### 3.3.5 決済管理

- 当月の決済サマリー（本決済合計・仮決済中・キャンセル金額）
- 決済一覧（ステータスフィルタ・月フィルタ・検索）
- Stripe Webhook 受信によるステータス自動更新
- バッチ実行ログ（実行日時・対象件数・エラー件数）
- 全金額 JPY・税込み表示
- インボイス対応：適格請求書に必要な情報（登録番号・税率・税額）を領収書メールに記載

#### 3.3.6 権限管理（スーパー管理者のみ）

- 管理者アカウントの作成・削除
- ロール（`super_admin` / `operator`）の変更

### 3.4 Zoom ブレイクアウトルーム

| 項目 | 仕様 |
|---|---|
| Zoom プラン | Pro 以上（ブレイクアウトルーム機能が必要） |
| API 認証 | Server-to-Server OAuth（クライアント ID / シークレット / アカウント ID） |
| アカウント構成 | システム用 1 ホストアカウントで全ルームを管理 |
| 顧客への URL | メインミーティング URL を発行（ブレイクアウトルーム URL ではない） |
| 部屋割り | 当日オペレーターが手動でブレイクアウトルームに顧客を移動 |
| 相談員の紐づけ | 1 人の相談員が複数部屋に紐づけ可（DB で管理） |
| 相談員の移動 | 手動オペレーション（Zoom クライアントから直接移動・通知なし） |
| URL 発行タイミング | Stripe 仮決済完了後に即時生成・Resend でメール送付 |

### 3.5 2 段階決済フロー

| ステップ | タイミング | 処理 | Stripe API |
|---|---|---|---|
| ① 仮決済 | 予約確定時 | 与信確保（実際の引き落としなし） | `PaymentIntent` `capture_method: manual` |
| ② Zoom URL 発行 | 仮決済完了後 | メインミーティング URL 生成 & Resend でメール送付 | Zoom API + Resend |
| ③ 本決済（自動） | 深夜 0 時バッチ（前日分を自動実行） | 引き落とし処理（JPY・税込み）/ 領収書メール（インボイス対応） | `PaymentIntent capture` |
| ③' 本決済（手動） | 管理者が任意のタイミングで実行（例外対応用） | 同上 | `PaymentIntent capture` |
| ④ Webhook 受信 | 決済状態変化時 | Firestore のステータスを自動更新 | Stripe Webhook（署名検証必須） |

> **料金設定：** 全利用者一律固定価格。JPY・税込み表示。金額は Stripe の設定値で管理する。

### 3.6 キャンセルポリシー

| 項目 | 内容 |
|---|---|
| 顧客のキャンセル期限 | 相談開始 24 時間前まで |
| 管理者のキャンセル期限 | 相談開始 24 時間前まで、または当日深夜バッチ実行前（no-show 対応） |
| 返金方針 | 全額返金（Stripe PaymentIntent キャンセル） |
| キャンセル実行者 | 顧客（確認メール内リンク）または管理者（CRM 手動操作） |
| 期限超過後 | キャンセル不可（システム的にも期限チェックを実装） |
| no-show 対応 | バッチ実行前であれば管理者が手動キャンセル可能。それ以外はオペレーションでカバー |
| Stripe 仮決済との関係 | 仮決済有効期限は最大 7 日。キャンセルポリシーとは独立して管理 |

### 3.7 メール通知一覧

| トリガー | 送信先 | 送信元 | 内容 |
|---|---|---|---|
| 予約確定（仮決済完了） | 顧客 | `noreply@ドメイン` | 予約番号・日時・Zoom URL・相談員名・相談員写真・キャンセルリンク |
| 予約確定（仮決済完了） | 相談員 | `noreply@ドメイン` | 担当予約の日時・顧客名・Zoom URL |
| 本決済完了（バッチ or 手動） | 顧客 | `noreply@ドメイン` | 決済完了・インボイス対応領収書（登録番号・税率・税額） |
| バッチ実行完了 | 管理者 | `noreply@ドメイン` | 実行日時・対象件数・エラー件数 |
| 予約キャンセル | 顧客 | `noreply@ドメイン` | キャンセル確認・全額返金の旨 |
| 予約キャンセル | 相談員 | `noreply@ドメイン` | キャンセル発生・対象予約の日時 |
| 相談員アカウント登録 | 相談員 | `noreply@ドメイン` | ログイン情報・初回パスワード設定リンク |

---

## 4. 非機能要件

### 4.1 セキュリティ

- Firebase Auth カスタムクレームで 3 ロール管理（`super_admin` / `operator` / `consultant`）
- 管理者・相談員画面は Firebase Auth の ID トークン検証でアクセス制御
- Stripe Webhook は `stripe-signature` ヘッダーによる署名検証を必須とする
- Zoom Server-to-Server OAuth の認証情報はサーバーサイドの環境変数のみで管理し、顧客に露出させない
- 顧客の個人情報は Firestore Security Rules で管理者のみ読み取り可
- 相談員は Firestore Security Rules で自分の担当予約・スロットのみ読み取り可
- 相談メモ（`consultantMemo`）は管理者・相談員のみ読み取り可（顧客非公開）

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
| 認証 | Firebase Authentication | 管理者・相談員。顧客は完全匿名 |
| データベース | Firestore（GCP） | Firebase 統一でコスト最適化 |
| ファイルストレージ | Firebase Storage | 相談員プロフィール写真 |
| 決済 | Stripe | PaymentIntent manual capture / JPY 固定・税込み / インボイス対応 |
| ビデオ | Zoom Breakout Rooms API | Pro プラン以上 / Server-to-Server OAuth / 1 ホストアカウント |
| メール送信 | Resend | 無料枠 3,000 通 / 月 / 送信元: `noreply@独自ドメイン` |
| バッチ処理 | Cloud Scheduler（GCP） | 深夜 0 時の自動本決済 |
| フォーム | React Hook Form + Valibot | |
| UI コンポーネント | ParkUI | デザインシステム |
| カレンダー | react-big-calendar（MIT） | 月 / 週ビュー。顧客向け & CRM 共通 |
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
| Firebase Storage | dev 専用バケット | prod 専用バケット |
| Stripe | テストモード（`sk_test_...`） | 本番モード（`sk_live_...`） |
| Zoom API | 同一アカウント可（テストミーティング） | 本番ホストアカウント |
| Resend | デフォルトドメイン可（`onboarding@resend.dev`） | 独自ドメイン（`noreply@ドメイン`） |
| Cloud Scheduler | 無効（手動トリガーでテスト） | 有効（深夜 0 時バッチ） |
| Cloud Run URL | 自動割り当て URL | 独自ドメイン + HTTPS |
| 環境変数 | `.env.local`（Next.js ローカル起動）/ `.env.dev`（運用コマンド）/ Secret Manager（GCP） | `.env.prod`（運用コマンド）/ Secret Manager（GCP） |

> **Resend 独自ドメイン設定：** DNS への SPF / DKIM / DMARC レコード追加 → Resend ダッシュボードで検証。本番リリース前に必須。

---

## 7. データモデル詳細（Firestore）

### 7.1 `clients`（顧客）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `name` | `string` | ○ | 氏名 |
| `email` | `string` | ○ | メールアドレス |
| `phone` | `string` | ○ | 電話番号 |
| `memo` | `string` | — | 管理者メモ（任意） |
| `createdAt` | `timestamp` | ○ | 登録日時 |
| `updatedAt` | `timestamp` | ○ | 最終更新日時 |

> **Security Rules:** Firebase Auth カスタムクレーム `super_admin: true` または `operator: true` を持つユーザーのみ read / write 可。

### 7.2 `consultants`（相談員）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firebase Auth UID と一致 |
| `name` | `string` | ○ | 相談員氏名 |
| `photoUrl` | `string` | — | Firebase Storage の写真 URL |
| `bio` | `string` | — | 自己紹介・プロフィール文 |
| `specialties` | `string[]` | — | 専門分野・得意分野 |
| `displayOrder` | `number` | ○ | 一覧表示順 |
| `zoomRoomIds` | `string[]` | ○ | 担当する Zoom ブレイクアウトルーム ID の配列 |
| `isActive` | `boolean` | ○ | 有効 / 無効フラグ（論理削除） |
| `createdAt` | `timestamp` | ○ | 登録日時 |
| `updatedAt` | `timestamp` | ○ | 最終更新日時 |

### 7.3 `admins`（管理者）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firebase Auth UID と一致 |
| `name` | `string` | ○ | 管理者氏名 |
| `email` | `string` | ○ | メールアドレス |
| `role` | `string` | ○ | `super_admin` / `operator` |
| `createdAt` | `timestamp` | ○ | 登録日時 |
| `updatedAt` | `timestamp` | ○ | 最終更新日時 |

### 7.4 `slots`（予約枠）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `consultantId` | `string` | ○ | 担当相談員の ID（`consultants` への参照） |
| `startDatetime` | `timestamp` | ○ | 枠の開始日時 |
| `endDatetime` | `timestamp` | ○ | 枠の終了日時 |
| `isBooked` | `boolean` | ○ | 予約済みフラグ（`false` = 空き） |
| `bookingId` | `string \| null` | — | 予約時に紐づく `bookings` の ID |

### 7.5 `bookings`（予約）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `clientId` | `string` | ○ | 顧客 ID |
| `consultantId` | `string` | ○ | 相談員 ID |
| `slotId` | `string` | ○ | 予約枠 ID |
| `startDatetime` | `timestamp` | ○ | 相談開始日時（`slots` から複製） |
| `status` | `string` | ○ | `pending` / `confirmed` / `completed` / `cancelled` |
| `zoomUrl` | `string` | — | 仮決済完了後に設定される Zoom メインミーティング URL |
| `zoomRoomId` | `string` | — | 割り当てられたブレイクアウトルーム ID |
| `stripePaymentIntentId` | `string` | — | Stripe PaymentIntent ID |
| `consultantContent` | `string` | — | 顧客が入力した相談内容（任意） |
| `consultantMemo` | `string` | — | 相談員・管理者が入力する相談メモ（顧客非公開） |
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
                   （cancelDeadline 以前 or         （深夜バッチ or
                    バッチ実行前に管理者が実行）      管理者が手動実行）

pending ──── 仮決済失敗 or タイムアウト ──────────► cancelled
```

### 7.6 `payments`（決済）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | `string` | ○ | Firestore 自動生成 ドキュメント ID |
| `bookingId` | `string` | ○ | 予約 ID |
| `clientId` | `string` | ○ | 顧客 ID（集計用に非正規化） |
| `stripePaymentIntentId` | `string` | ○ | Stripe PaymentIntent ID |
| `status` | `string` | ○ | `authorized` / `captured` / `cancelled` / `failed` |
| `amountJPY` | `number` | ○ | 金額（JPY・税込み） |
| `taxAmountJPY` | `number` | ○ | 消費税額（インボイス対応用） |
| `taxRate` | `number` | ○ | 税率（例: `0.10`） |
| `captureMethod` | `string` | — | `batch` / `manual`（本決済の実行方法） |
| `authorizedAt` | `timestamp` | — | 仮決済完了日時 |
| `capturedAt` | `timestamp` | — | 本決済完了日時 |
| `cancelledAt` | `timestamp` | — | キャンセル日時 |
| `createdAt` | `timestamp` | ○ | レコード作成日時 |

---

## 8. API 設計詳細

### 8.1 認可共通ルール

- **スーパー管理者専用：** `Authorization: Bearer <Firebase ID Token>` を必須。`super_admin` クレーム検証
- **管理者共通：** `Authorization: Bearer <Firebase ID Token>` を必須。`super_admin` または `operator` クレーム検証
- **相談員専用：** `Authorization: Bearer <Firebase ID Token>` を必須。`consultant` クレーム検証
- **顧客向け：** 認証不要。rate limiting を適用（IP ベース）
- **Webhook：** `stripe-signature` ヘッダーによる署名検証のみ
- **バッチ：** Cloud Scheduler の OIDC トークンによる署名検証

### 8.2 エンドポイント一覧

> 組織スコープの API は共通で `/api/organizations/[organizationId]` をプレフィックスに持つ。

#### `GET /api/organizations/[organizationId]/consultants`

| 項目 | 内容 |
|---|---|
| 認証 | 不要 |
| レスポンス | `{ consultants: [{ consultantId, name, specialties, bio, imageUrl, rank, isActive }] }` |

#### `GET /api/organizations/[organizationId]/slots`

| 項目 | 内容 |
|---|---|
| 認証 | 不要 |
| クエリパラメータ | `consultantId`: 任意 |
| レスポンス | `{ slots }` または `{ aggregatedSlots }` |

#### `POST /api/organizations/[organizationId]/bookings`

| 項目 | 内容 |
|---|---|
| 認証 | 不要 |
| リクエスト Body | `{ slotId? , startsAt? , endsAt? , customerName, customerEmail, customerPhone, customerBirthDate, consultantContent?, selectionId }` |
| 処理フロー | ① `clients` 作成<br>② `slots.isBooked` を `true` に更新（Firestore トランザクション）<br>③ `cancelDeadline` を算出（`startDatetime - 24h`）<br>④ Stripe PaymentIntent 作成（`capture_method: manual`）<br>⑤ `bookings` 作成（`status: pending`）<br>⑥ `payments` 作成（`status: authorized`）<br>⑦ Zoom メインミーティング URL 生成<br>⑧ `bookings` を `status: confirmed`・`zoomUrl` 更新<br>⑨ Resend で顧客に確認メール送信（Zoom URL・相談員名・写真・キャンセルリンク含む）<br>⑩ Resend で相談員に予約通知メール送信 |
| レスポンス 201 | `{ bookingId, bookingActionToken, ... }` |
| レスポンス 409 | スロット競合（二重予約） |
| レスポンス 402 | Stripe 決済エラー |

#### `POST /api/organizations/[organizationId]/bookings/[bookingId]/charge`

| 項目 | 内容 |
|---|---|
| 認証 | 管理者のみ |
| 処理フロー | ① Stripe PaymentIntent を capture<br>② `payments` を `status: captured`・`capturedAt`・`captureMethod: manual` 更新<br>③ `bookings` を `status: completed` に更新<br>④ Resend でインボイス対応領収書メール送信 |
| レスポンス 200 | `{ success: true }` |
| レスポンス 400 | 既に capture 済み or キャンセル済み |

#### `POST /api/organizations/[organizationId]/bookings/[bookingId]/cancel`

| 項目 | 内容 |
|---|---|
| 認証 | 管理者（CRM）または 顧客（メールリンクのトークン検証） |
| キャンセル期限チェック | 顧客：`cancelDeadline` 超過で `403`。管理者：バッチ実行後は `403` |
| 処理フロー | ① 期限チェック<br>② Stripe PaymentIntent をキャンセル（全額返金）<br>③ `payments` を `status: cancelled`・`cancelledAt` 更新<br>④ `bookings` を `status: cancelled` に更新<br>⑤ `slots.isBooked` を `false` に戻す<br>⑥ Resend で顧客にキャンセル確認メール送信<br>⑦ Resend で相談員にキャンセル通知メール送信 |
| レスポンス 200 | `{ success: true }` |
| レスポンス 403 | キャンセル期限超過 |

#### `POST /api/organizations/[organizationId]/batch/charge`

| 項目 | 内容 |
|---|---|
| 認証 | Cloud Scheduler OIDC トークン署名検証、または管理者/オペレーター |
| 処理フロー | ① 前日の `confirmed` ステータス予約を取得<br>② 各予約の Stripe PaymentIntent を capture<br>③ `payments` を `status: captured`・`captureMethod: batch` 更新<br>④ `bookings` を `status: completed` に更新<br>⑤ Resend で顧客に領収書メール送信<br>⑥ Resend で管理者にバッチ実行完了通知メール送信 |
| レスポンス 200 | `{ chargedCount, completedCount }` |

#### `GET /api/organizations/[organizationId]/consultant/bookings`

| 項目 | 内容 |
|---|---|
| 認証 | 相談員のみ |
| クエリパラメータ | `page` / `pageSize` / `sortBy` / `sortOrder` |
| レスポンス | 自分の担当予約一覧 |

#### `PATCH /api/organizations/[organizationId]/consultant/profile`

| 項目 | 内容 |
|---|---|
| 認証 | 相談員のみ（自分のプロフィールのみ更新可） |
| リクエスト Body | `{ name, bio?, phone?, imageUrl?, specialties }` |
| レスポンス 200 | `{ success: true }` |

#### `PATCH /api/organizations/[organizationId]/consultant/bookings/[id]/memo`

| 項目 | 内容 |
|---|---|
| 認証 | 相談員のみ |
| リクエスト Body | `{ memo }` |
| レスポンス 200 | `{ success: true }` |

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
| `/api/organizations/[organizationId]/admin/dashboard` | `GET` | ダッシュボード取得 |
| `/api/organizations/[organizationId]/admin/slots` | `GET` | 空き枠一覧取得 |
| `/api/organizations/[organizationId]/admin/consultants` | `GET` | 相談員一覧取得（ページング対応） |
| `/api/organizations/[organizationId]/admin/consultants` | `POST` | 相談員新規作成 |
| `/api/organizations/[organizationId]/admin/consultants/[id]` | `PATCH` | 相談員更新（`name` / `bio` / `phone` / `specialties` / `zoomRoomIds` / `rankId`） |
| `/api/organizations/[organizationId]/admin/consultants/[id]` | `DELETE` | 相談員無効化 |
| `/api/organizations/[organizationId]/admin/settings/booking` | `GET` | 予約設定取得 |
| `/api/organizations/[organizationId]/admin/settings/booking` | `PATCH` | 予約設定更新 |
| `/api/organizations/[organizationId]/admin/settings/consultant-ranks` | `GET` | 相談員ランク設定取得 |
| `/api/organizations/[organizationId]/admin/settings/consultant-ranks` | `PATCH` | 相談員ランク設定更新 |
| `/api/organizations/[organizationId]/admin/bookings` | `GET` | 予約一覧取得（ページング対応） |
| `/api/organizations/[organizationId]/admin/payments` | `GET` | 決済一覧取得（ページング対応） |
| `/api/organizations/[organizationId]/admin/customers` | `GET` | 顧客一覧取得（ページング対応） |
| `/api/organizations/[organizationId]/admin/accounts` | `GET` | 組織アカウント一覧取得 |
| `/api/organizations/[organizationId]/admin/accounts/invite` | `POST` | 組織アカウント招待 |
| `/api/organizations/[organizationId]/admin/accounts/[uid]` | `DELETE` | 組織アカウント削除 |
| `/api/organizations/[organizationId]/admin/accounts/[uid]/role` | `PATCH` | 組織アカウントロール更新 |
| `/api/organizations/[organizationId]/admin/accounts/[uid]/display-name` | `PATCH` | 表示名更新 |
| `/api/organizations/[organizationId]/admin/accounts/[uid]/resend-invite` | `POST` | 招待メール再送 |
| `/api/organizations/[organizationId]/admin/accounts/[uid]/reset-password` | `POST` | パスワードリセットメール送信 |

---

## 9. 画面要件（全 22 画面）

### 9.1 顧客向け（5 画面）

| # | 画面名 | URL | 主要要件 |
|---|---|---|---|
| 1 | 相談員一覧 | `/booking` | カード形式（名前・写真・自己紹介・専門分野）。空き状況は非表示 |
| 2 | 空き枠選択 | `/booking/[consultantId]` | react-big-calendar 月/週ビュー。空き（青）/ 済（グレー）/ 選択中（濃青）。過去日時は選択不可 |
| 3 | 個人情報入力 | `/booking/info` | RHF + Valibot。氏名・メール・電話（必須）・相談内容（任意）。選択済み日時・相談員名・料金サマリー表示 |
| 4 | 決済 | `/booking/payment` | Stripe Payment Element 埋め込み。JPY 税込。「与信確保のみ」の注意文言。失敗時は同ページ内にエラー表示 |
| 5 | 予約完了 | `/booking/complete` | 予約番号・日時・料金・相談員名・Zoom URL メール送付済み案内。キャンセルリンク案内 |

### 9.2 相談員向け（4 画面）

| # | 画面名 | URL | 主要要件 |
|---|---|---|---|
| 6 | ログイン | `/consultant/login` | Firebase Auth。メール/PW + Google SSO |
| 7 | 担当予約一覧 | `/consultant/bookings` | 当日・今後の担当予約一覧。日時・顧客名・Zoom URL 表示 |
| 8 | 予約詳細・メモ | `/consultant/bookings/[id]` | 全情報表示。相談メモの入力・編集 |
| 9 | プロフィール編集 | `/consultant/profile` | 名前・写真・自己紹介・専門分野の編集。写真は Firebase Storage にアップロード |

### 9.3 管理者向け CRM（9 画面）

| # | 画面名 | URL | 主要要件 |
|---|---|---|---|
| 10 | ログイン | `/admin/login` | Firebase Auth。メール/PW + Google SSO。管理者ロール検証。成功後 `/admin/dashboard` へ |
| 11 | ダッシュボード | `/admin/dashboard` | KPI（本日の予約数・今週・本決済待ち）。直近 10 件の予約一覧 |
| 12 | 予約一覧 | `/admin/bookings` | react-big-calendar 週/月ビュー。相談員フィルタ。色分け：仮決済済（青）/ 完了（緑）/ キャンセル（グレー） |
| 13 | 予約詳細 | `/admin/bookings/[id]` | 全情報・相談メモ表示。本決済ボタン（緑、確認ダイアログあり）。キャンセルボタン（赤、期限チェック） |
| 14 | 顧客一覧 | `/admin/customers` | 検索・ソート・ページネーション（20 件）。行クリックで詳細へ |
| 15 | 顧客詳細 | `/admin/customers/[id]` | ※現行実装では未提供（`/admin/customers` の一覧のみ提供） |
| 16 | 相談員管理 | `/admin/consultants` | 相談員一覧 + Zoom ルーム状況パネル。追加・編集・削除 |
| 17 | 決済一覧 | `/admin/payments` | 当月サマリー（本決済合計・仮決済中・キャンセル）。バッチ実行ログ（実行日時・対象件数・エラー）。フィルタ・検索 |
| 18 | アカウント管理 | `/admin/accounts` | 組織アカウント一覧・招待・削除・ロール変更・表示名更新 |

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
| 0.2 | 2026-03-22 | メール: Resend / 顧客: 完全匿名 / カレンダー: react-big-calendar / 決済: JPY 税込 / Zoom 移動通知: なし を確定 |
| 0.3 | 2026-03-22 | 全 12 画面ワイヤーフレーム・画面要件追記。データモデル詳細化。API 設計詳細化 |
| 0.4 | 2026-03-22 | キャンセルポリシー / Resend ドメイン / Zoom 構成 / GCP 2 環境設計 / インボイス対応 を確定。未決事項 0 件 |
| 0.5 | 2026-03-22 | システム名を Arc - 未来予報 に変更。被相談者を顧客に統一。相談員ログイン追加。管理者 2 ロール制（super_admin / operator）導入。本決済を深夜バッチ自動化。相談員プロフィール公開・顧客による相談員選択を追加。Firebase Storage・Cloud Scheduler を技術スタックに追加。全 22 画面に拡張 |