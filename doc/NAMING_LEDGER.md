# 命名台帳 — Firestore / Domain / API

> Version 2.0 | 2026-06-26（2026-07-12 追記: §6.5 更新 / **2026-07-14 改訂: `organization-` プレフィックス全廃。§6.3-B の混在許容方針を撤回。詳細は §0** / **2026-07-15 改訂: Firebase Auth uid の正準名を `authUid` に統一。§3.5 の `uid` 維持合意を撤回。詳細は §0.1** / **2026-07-15 改訂: `accounts.role` → `accounts.roleId` にリネームし `consultant` ロールを廃止。詳細は §3.5** / **2026-07-15 改訂: `accounts.authUid` → `accounts.accountId` にリネーム。accounts 集約主識別子命名を他集約 (consultantId / roleId / userId) に揃える。§0.1 の accounts 側 authUid 採用を撤回。詳細は §0.2**）  
> 対象: 策定時点の全11コレクション + 横断命名ルール（その後 `organization-roles`（現 `roles`）/`users`/`user-zoom-credentials`/`user-coupons`/`coupons`/`policy-revisions`/`policy-agreements` が追加され現行17コレクション。詳細は §6.5・§3.12）  
> 目的: 永続化・ドメイン・API の名称を整理し、今後の実装・リネームの基準とする

> **呼称について（2026-07-28）**: 日本語の職種呼称は PR #137 で「相談員」→「**占い師**」に変更された。英語・コード上の識別子（`Consultant` / `consultantId` / `consultantMemo` など）は**変更しない**方針のため、本台帳の識別子は現行のままで正しい。日付入りの改訂記録（§0 系・§3.5 など）に残る「相談員」は当時の表記としてそのまま残す。

---

## 0. 改訂: `organization-` プレフィックス全廃（2026-07-14）

**決定**: `organization-accounts` / `organization-roles` / `organization-settings` の `organization-` プレフィックスを全廃し、コレクション名・ドメインエンティティ名を単体名へ統一する。これに伴い §6.3-B の「意図的な混在を許容」方針（2026-06-26 合意）を **撤回** する。

| 旧（〜2026-07-13） | 新（2026-07-14〜） | ドメインエンティティ |
|---|---|---|
| `organization-accounts` | **`accounts`** | `OrganizationAccount` → **`Account`** |
| `organization-roles` | **`roles`** | `OrganizationRole` → **`Role`** |
| `organization-settings` | **`settings`** | `OrganizationSettings` → **`Settings`** |

**理由**: 全コレクションは既に `organizationId`（複合キー or フィールド）でテナント分離されており、`organization-` は所有関係を示す冗長な修飾でしかない。業務エンティティ（`bookings`, `consultants` 等）が単体名である以上、設定・所属だけ prefix を持つ必然性は薄く、命名の一貫性（prefix なしへの統一）を優先する。

**適用範囲**:
- Firestore コレクション（`FIRESTORE_COLLECTIONS` のキー・値）
- ドメイン層のクラス／型／ディレクトリ、infrastructure / presentation の識別子・ファイル名
- 組織スコープ認可ヘルパー: `requireOrganizationRole → requireRole`、`requireOrganizationPermission → requirePermission`、`hasOrganizationPermission → hasPermission`、認証コンテキスト版 `getOrganizationAccount → getAccount`、`firestore.rules` の `hasOrganizationRole → hasRole`（未使用の重複 `require-role.ts` は削除）
- OpenAPI スキーマ名 `OrganizationRole* → Role*`（`RoleInput` / `RoleUpdateInput` 含む。`pnpm generate` でクライアント再生成。生成物は gitignore、パス `/console/roles` 等は元から prefix なし）

**対象外（据え置き）**:
- `organizations` コレクション本体（エンティティ名そのもの）／ OpenAPI の `OrganizationIdParam`（組織 ID パラメータ）
- `user-*` プレフィックス（`user-zoom-credentials` / `user-coupons`）… **意図的に維持**（2026-07-14 判断）。`organization-` と違い冗長ではない:
  - `UserCoupon` は「ユーザーが受け取ったクーポン**インスタンス**」で、`userCouponId`（インスタンス ID）と `couponId`（**マスタークーポン参照**）を併せ持つ集約。`user-coupons → coupons` / `UserCoupon → Coupon` / `userCouponId → couponId` は **既存の `couponId` と衝突し意味も誤る**ため不可。`user-` はインスタンス vs マスターを分ける意味を持つ。
  - `user-zoom-credentials` は user-scoped（doc ID = `userId`）で、org-scoped の `zoom-sessions` と対になる。スコープ区別のため `user-` を残す。

**データ移行**: `apps/api/scripts/migrate-drop-organization-prefix.ts`（doc ID を保持してコピー → 新コードをデプロイ → `--delete-source` で旧コレクション削除）。`firestore.rules` の変更は terraform apply が必要（§4.4）。

---

## 0.2 改訂: `accounts.authUid` → `accounts.accountId`（2026-07-15）

**決定**: `accounts` コレクションの Firebase Auth uid 参照フィールドを **`accountId`** にリネームする。§0.1 の「`accounts` は `authUid` に統一」を **撤回** し、accounts 集約の主識別子を「集約名 + Id」の慣習（`consultantId`, `roleId`, `userId`）に揃える。値は Firebase Auth uid のまま変わらない。Doc ID の形式 `{organizationId}_{accountId}` も同じ物理 ID（値が同じため）。

**理由**: §0.1 は「users と語彙を揃える」目的で `authUid` を採用したが、`users.authUid` は「外部参照フィールド」（`users.userId` とは別値）、`accounts.authUid` は「集約主識別子」（Doc ID の後半 = 値の同一物）で意味が異なる。同じ名前で違う概念を指していた。他集約（`consultants.consultantId`, `roles.roleId`）は主識別子を「集約名 + Id」で表現しており、accounts だけ慣習から外れていた。集約主識別子は集約名を冠する方針に統一する。

**適用範囲**:
- Firestore: `accounts.authUid` → **`accountId`**（値は同じ、Doc ID の形式・値も不変）
- Domain: 新規 `Account` エンティティ + `IAccountRepository`（§3.5 の Repository 化 TODO を同時に解消）
- 認証コンテキスト: `AuthUser.authUid` は **維持**（これは「認証セッションの Firebase Auth uid」で、accounts 集約のフィールドではないため）。ただし内部変数・関数引数のうち accounts 集約に紐づく `targetAuthUid` などは `targetAccountId` にリネーム
- API: `ConsoleAccount.authUid` → **`accountId`**、`AuthUidParam` → **`AccountIdParam`**、path `/console/accounts/{authUid}/*` → **`/console/accounts/{accountId}/*`**、招待レスポンス `{ authUid }` → **`{ accountId }`**（`pnpm generate` でクライアント再生成）
- 併せて `ConsoleAccount.status` の enum を `pending`/`registered` から Firestore と揃えた **`active`/`invited`/`disabled`** に変更（§3.5 の合意を実装に反映）

**触らないもの**:
- `users.authUid`（別集約の外部参照フィールド）
- `AuthUser.authUid`（認証セッションの Firebase Auth uid）
- firebase-admin SDK 由来のプロパティ参照（`decoded.uid`, `userRecord.uid`）

**データ移行**: `apps/api/scripts/migrate-accounts-account-id.ts`
- `--dry-run`（対象件数のみ確認）
- デフォルト: `authUid` を持つ doc に `accountId` を複製（冪等、`authUid` は温存）
- `--delete-source`: 新コードデプロイ後、旧 `authUid` フィールドを削除

`firestore.rules` の accounts ルールは自ドキュメント読み取りの判定に主識別子を参照するため、`resource.data.accountId == request.auth.uid` へ追随が必要（**terraform apply 必須**）。§0.1 の「rules 影響なし」は誤りで、2026-07-28 に修正済み。

---

## 0.1 改訂: Firebase Auth uid の正準名を `authUid` に統一（2026-07-15）

**決定**: Firebase Auth の uid を指すフィールド・識別子の正準名を **`authUid`** に統一する。`accounts` の `uid` フィールドを `authUid` にリネームし、§3.5 の「`uid` 維持」合意（2026-06-26）を **撤回** する。

**理由**: 後発の `users` コレクションはドメイン ID（`userId` = 独自 UUID）と Firebase Auth uid（`authUid`）を分離して保持しており、同一概念が `accounts` では `uid`、`users` では `authUid` と別名になっていた（§1.1「同一概念に複数の別名を持たせない」違反）。素の `uid` は `users.userId` と紛らわしく、user 系の認証コード（`verify-customer-auth.ts` / `zoom-oauth-state.ts` 等）は既に `authUid` を採用済み。`users` 側を正として `accounts` を追随させる。

**適用範囲**:
- Firestore: `accounts.uid` → **`authUid`**（doc ID `{organizationId}_{authUid}` の形式・値は不変）
- 認証コンテキスト: `AuthUser.uid` → **`authUid`**（`load-auth-context.ts` のクエリ・`getAccountDocId` 引数含む）
- API: `/auth/me` レスポンス・招待レスポンス・`ConsoleAccount` スキーマの `uid` → **`authUid`**、パスパラメータ `/console/accounts/{uid}` → **`{authUid}`**（`UserIdParam` → `AuthUidParam`。`pnpm generate` でクライアント再生成）
- admin UI（accounts ページ）・監査ログ等の修飾付き複合名: `actorUid` / `targetUid` / `countAccountsByUid` → **`actorAuthUid` / `targetAuthUid` / `countAccountsByAuthUid`**

**対象外（据え置き）**:
- firebase-admin / firebase クライアント SDK のプロパティ参照（`decoded.uid`, `userRecord.uid`, `user.uid`）と SDK 薄ラッパー `firebase-auth-admin.ts` 内部のパラメータ名 … SDK 語彙のまま（境界の外は `authUid`）
- `providerUid`（User 集約）… 認証プロバイダ発行の uid で **別概念**
- `consultantId`（値は Firebase Auth uid）… §3.4 の合意どおり維持

**データ移行**: `apps/api/scripts/migrate-accounts-auth-uid.ts`（`uid` → `authUid` を複製 → 新コードをデプロイ → `--delete-source` で旧フィールド削除）。Firestore インデックスへの影響はない（accounts のクエリは等価フィルタのみ）。

> **訂正（2026-07-28）**: 本項は当初「`firestore.rules` への影響なし」としていたが誤り。`firestore.rules` の `match /accounts/{accountId}` は自ドキュメント読み取りの判定で主識別子を参照しており、`uid` → `authUid` → `accountId`（§0.2）の改名に追随していなかったため、当該分岐が恒久的に false になっていた。`resource.data.accountId` へ修正済み（**反映には terraform apply が必要**）。

---

## 目次

1. [横断命名ルール](#1-横断命名ルール)
2. [コレクション一覧（現状 → 正準名）](#2-コレクション一覧現状--正準名)
3. [コレクション別詳細](#3-コレクション別詳細)
4. [変更影響マップ](#4-変更影響マップ)
5. [レビュー進捗](#5-レビュー進捗)

---

## 1. 横断命名ルール

### 1.1 レイヤー別の役割

| レイヤー | 命名規則 | 責務 |
|---|---|---|
| **Firestore（永続化）** | camelCase フィールド、kebab-case コレクション名 | クエリ・インデックスに最適化した保存名 |
| **Domain（集約）** | camelCase、VO でネスト可能 | ユビキタス言語に沿った内部名 |
| **API（OpenAPI / JSON）** | camelCase | 顧客向け公開名。計算値・展開オブジェクト可 |

**原則**: Domain を正とし、Firestore は Domain に合わせる。API は用途に応じて別名を許容するが、**同一概念に複数の別名を持たせない**。

### 1.2 時刻・日付フィールド（確定 — 2026-06-26 更新）

| 種類 | サフィックス | 保存形式 | 例 |
|---|---|---|---|
| **瞬間**（1点） | `*At` | `Timestamp` / ISO8601（時刻あり） | `createdAt`, `consultantJoinedAt`, `cancelDeadlineAt` |
| **区間の端点** | **`startsAt` / `endsAt`** | 同上（時刻あり） | slot の開始・終了（ペア） |
| **区間の開始のみ** | **`startsAt`** | 同上 | booking の相談開始（`endsAt` は slot 側） |
| **カレンダー日** | **`*Date`** | **`YYYY-MM-DD` 文字列** | `sessionDate`, `birthDate`, 休業 `startDate`/`endDate` |
| **壁時計**（繰り返し） | `*Time` | **`HH:mm` 文字列** | businessHours の `startTime`/`endTime` |

**決定**:
- 区間は **`startsAt` / `endsAt`** に統一（`startDatetime`/`endDatetime`/`startAt`/`endAt` は廃止）
- カレンダー日は **`*Date` + 日付文字列**。フル datetime には変換しない（TZ ずれ防止）
- 瞬間は `*At` + フル datetime
- `cancelDeadline` → **`cancelDeadlineAt`**
- `birthdate` → **`birthDate`**（`*Date` 規則に合わせる）

**Domain**: `TimeRange` の `startAt`/`endAt` → **`startsAt`/`endsAt`** に追随。

### 1.3 料金プラン識別子（確定）

| 識別子 | 正準名 | 永続化 | 用途 |
|---|---|---|---|
| プラン UUID | `pricePlanId` | ○ | マスタ参照・booking スナップショットの主キー |
| 選択用署名 | `selectionId` | ×（計算値） | 予約フローで顧客が選択する ID。`name` + `totalJPY` から生成 |
| 検索用正規化名 | `normalizedName` | ○（FS のみ） | 重複検索・署名解決用。Domain getter、API 非公開 |

**決定**:
- API の `pricePlanSelectionId` は **`selectionId` に統一**（Public / CreateBooking とも）
- booking 保存時は `pricePlanId` + `pricePlanName` + `pricePlanTotalJPY` のスナップショットを維持
- `normalizedName` は Firestore 専用派生フィールドとして維持（Domain/API には露出しない）

### 1.4 Repository 境界（確定）

| コレクション | 現状 | 方針 |
|---|---|---|
| `organizations` | route / auth で直接アクセス | **Repository 化**し `OrganizationDoc` を定義 |
| `organization-accounts` | route / auth で直接アクセス | **Repository 化**し enum 変換を集約 |
| ~~`user-preferences`~~ | 廃止 | **`lastOrganizationId` はクライアント側のみ** |

**決定**: 直接 Firestore アクセスは廃止し、`*Repository` + `*Doc` 型に集約する。

**account status**: FS / Domain / API すべて **`active` / `invited` / `disabled`** で統一（§3.5 合意）。Mapper による `registered` / `pending` 変換は廃止。

### 1.5 その他の横断規則

| 項目 | 規則 |
|---|---|
| コレクション名 | kebab-case（Firestore）、TS 定数は camelCase（`FIRESTORE_COLLECTIONS`） |
| 通貨 | `*JPY` サフィックス（例: `totalJPY`, `amountJPY`） |
| 顧客参照 | **`customer*` に統一**。API / Domain / FS すべて `client*` 禁止（§3.2, §6.3-A 合意）。**適用範囲は「サービスの顧客」を指す語のみ**（下記） |
| アカウント参照 | 管理画面文言は **`アカウント`** を使用（`ユーザー管理` ではなく `アカウント管理`） |
| ドキュメント ID | エンティティ ID 単体を原則。複合 ID は `{organizationId}_{entityId}` 形式 |
| Firebase Auth uid | **`authUid`** に統一（§0.1）。修飾時も `*AuthUid`（例: `actorAuthUid`）。SDK プロパティ参照（`decoded.uid` 等）のみ `uid` |
| null / omit | optional フィールドは Repository 層で方針統一（booking/payment: `null`、customer: omit） |
| 真偽値 | 状態は `is*` プレフィックス（例: `isActive`, `isAvailable`, `isClosed`）。意味反転の別名は持たない |

### 1.6 `client*` 禁止ルールの適用範囲（2026-07-28 明確化）

§1.5 の「`client*` 禁止」は **「サービスの顧客」を指す語だけ**が対象。SDK クライアント・OAuth クライアント・`client_secret` など、顧客と無関係な "client" は **`client` のまま**にする。

過去に一括改名の巻き込みで以下が `customer*` になっていたため、2026-07-28 に是正した。

| 是正前 | 是正後 | 実体 |
|---|---|---|
| `customerSecret`（`openapi.yaml` / `IStripeService` / `SetupPaymentUseCase`） | **`clientSecret`** | Stripe の `client_secret`。SPA 側は受け取った直後に `clientSecret` へ戻しており、§1.1「同一概念に複数の別名を持たせない」に違反していた |
| `infrastructure/firestore/firestore-customer.ts` | **`firestore-client.ts`** | Firestore の `app` / `db` 初期化。顧客リポジトリ `firestore-customer-repository.ts` と紛らわしかった |
| `envServer.firebaseCustomerEmail` | **`firebaseClientEmail`** | `FIREBASE_CLIENT_EMAIL`（サービスアカウント） |
| `envServer.zoomCustomerId` / `zoomCustomerSecret` | **`zoomClientId` / `zoomClientSecret`** | `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET`（OAuth クライアント） |
| `resendCustomer` / `getResendCustomer()` | **`resendClient` / `getResendClient()`** | Resend SDK クライアント |
| `storage.rules` の `Browser customers` | **`Browser clients`** | ブラウザクライアント |
| テストの `queryCustomer` | **`queryClient`** | TanStack `QueryClient` |

**判定の目安**: その語が「サービスを利用する人」を指すなら `customer`、「サーバに接続する側のプログラム／認証情報」を指すなら `client`。環境変数名（`FIREBASE_CLIENT_EMAIL` / `ZOOM_CLIENT_*`）は外部サービス由来なので当然 `CLIENT` のまま。

---

## 2. コレクション一覧（現状 → 正準名）

| # | Firestore（現状） | 正準コレクション名 | 変更 | Doc ID（正準） |
|---|---|---|---|---|
| 1 | `bookings` | `bookings` | 維持 | `bookingId` |
| 2 | `clients` | `customers` | **リネーム** | `customerId` |
| 3 | `consultant-price-plans` | `price-plans` | **リネーム** | `pricePlanId` |
| 4 | `consultants` | `consultants` | 維持 | `{organizationId}_{consultantId}` |
| 5 | `organization-accounts` | **`accounts`** | **リネーム（§0）** | `{organizationId}_{authUid}` |
| 6 | `organization-settings` | **`settings`** | **リネーム（§0）** | `organizationId` |
| 7 | `organizations` | `organizations` | 維持 | `organizationId` |
| 8 | `payments` | `payments` | 維持 | `paymentId` |
| 9 | `slots` | `slots` | フィールドリネーム | `slotId` |
| 10 | ~~`user-preferences`~~ | **廃止** | 削除 | — |
| 11 | `zoom-daily-sessions` | `zoom-sessions` | **リネーム** | `{organizationId}_{sessionDate}` |

---

## 3. コレクション別詳細

### 3.1 `bookings` ✅ 合意済み（2026-06-26）

**Doc ID**: `bookingId`（維持）

| プロパティ | Firestore | Domain | API | 正準名 | 判定 |
|---|---|---|---|---|---|
| 組織 ID | `organizationId` | `organizationId` | — | `organizationId` | 維持 |
| 予約 ID | `bookingId` | `bookingId` | `bookingId` | `bookingId` | 維持 |
| 顧客 ID | `clientId` | `clientId` | `clientId` → | **`customerId`** | **リネーム** |
| 顧客名（予約入力） | — | — | `clientName` → | **`customerName`** | **リネーム** |
| 顧客メール（予約入力） | — | — | `clientEmail` → | **`customerEmail`** | **リネーム** |
| 顧客電話（予約入力） | — | — | `clientPhone` → | **`customerPhone`** | **リネーム** |
| 相談員 ID | `consultantId` | `consultantId` | `consultantId` | `consultantId` | 維持 |
| 枠 ID | `slotId` | `slotId` | `slotId` | `slotId` | 維持 |
| 開始日時 | `startDatetime` | `startDatetime` | `startDatetime` → | **`startsAt`** | **リネーム** |
| ステータス | `status` | `status` | `status` | `status` | 維持 |
| キャンセル期限 | `cancelDeadline` | `cancelDeadline` | — | **`cancelDeadlineAt`** | **リネーム** |
| Zoom 参加 URL | `zoomUrl` | `zoomUrl` | `zoomUrl` → | **`joinUrl`** | **合意: joinUrl に統一** |
| 相談員入室時刻 | `consultantJoinedAt` | `consultantJoinedAt` | `consultantJoinedAt` | `consultantJoinedAt` | 維持 |
| リマインド送信時刻 | `consultationReminderEmailSentAt` | 同名 | — | 同名 | 維持（内部） |
| 遅刻アラート送信時刻 | `lateArrivalAlertSentAt` | 同名 | `lateArrivalAlertSentAt` | 同名 | 維持 |
| 相談員メモ | `consultantMemo` | `consultantMemo` | `consultantMemo` | `consultantMemo` | 維持 |
| 相談内容 | `consultationContent` | `consultationContent` | `consultationContent` | `consultationContent` | 維持 |
| 相談内容（入力） | — | — | ~~`consultantContent`~~ | **`consultationContent`** | ✅ 実装済み（2026-07-28） |
| 料金プラン ID | `pricePlanId` | `pricePlanId` | — | `pricePlanId` | 維持（スナップショット） |
| 料金プラン名 | `pricePlanName` | `pricePlanName` | — | `pricePlanName` | 維持 |
| 料金プラン金額 | `pricePlanTotalJPY` | `pricePlanTotalJPY` | — | `pricePlanTotalJPY` | 維持 |
| 作成/更新 | `createdAt`, `updatedAt` | 同名 | 同名 | 同名 | 維持 |
| 課金可否 | — | 計算 | `chargeable` | `chargeable` | API 計算値 |
| 課金不可理由 | — | 計算 | `chargeDisabledReason` | `chargeDisabledReason` | API 計算値 |

**合意サマリー**
- コレクション名 `bookings`、Doc ID `bookingId` は維持
- CreateBookingRequest の `consultantContent` → `consultationContent` に統一 ✅ 実装済み（2026-07-28）
- `zoomUrl` → **`joinUrl`** に全レイヤー統一
- `startDatetime` → **`startsAt`**、`cancelDeadline` → **`cancelDeadlineAt`**
- CreateBooking の枠指定: `startDatetime`/`endDatetime` → **`startsAt`/`endsAt`**
- `cancelDeadlineAt` / `consultationReminderEmailSentAt` は API 非公開のまま
- CreateBookingRequest: `clientName`/`clientEmail`/`clientPhone` → **`customerName`/`customerEmail`/`customerPhone`**
- ConsultantBookingDetail のネスト `client` → **`customer`**

**根拠**: `firestore-booking-repository.ts`, `domain/booking/booking.ts`, `openapi.yaml` (BookingDetail, CreateBookingRequest)

---

### 3.2 `clients` → `customers` ✅ 合意済み（2026-06-26）

**変更**: コレクション名・Doc ID・Domain 集約名・**API スキーマ名**を **Customer** に統一

#### Firestore / Domain

| プロパティ | Firestore（現状） | 正準名 | 判定 |
|---|---|---|---|
| コレクション | `clients` | **`customers`** | **リネーム** |
| Doc ID | `clientId` | **`customerId`** | **リネーム** |
| 組織 ID | `organizationId` | `organizationId` | 維持 |
| 顧客 ID | `clientId` | **`customerId`** | **リネーム** |
| 氏名 | `name` | `name` | 維持 |
| メール | `email` | `email` | 維持 |
| 電話 | `phone` | `phone` | 維持 |
| 生年月日 | `birthdate` | **`birthDate`** | **リネーム**（`*Date` / `YYYY-MM-DD` 文字列・API 非公開） |
| メモ | `memo` | **`note`** | **リネーム** ✅ 実装済み |
| 作成/更新 | `createdAt`, `updatedAt` | 同名 | 維持 |

#### API スキーマ（`client*` 完全排除）✅ 合意（2026-06-26）

| 現状 | 正準名 | 判定 |
|---|---|---|
| `ClientDetail` | **`CustomerDetail`** | **リネーム** |
| `clientId` | **`customerId`** | **リネーム** |
| `clientName`（CreateBookingRequest） | **`customerName`** | **リネーム** |
| `clientEmail`（CreateBookingRequest） | **`customerEmail`** | **リネーム** |
| `clientPhone`（CreateBookingRequest） | **`customerPhone`** | **リネーム** |
| `clientBirthdate`（CreateBookingRequest） | — | **削除**（合意済み） |
| ConsultantBookingDetail.`client` | **`customer`** | **リネーム** |

**合意サマリー**
- `Client` → `Customer`、`clients` → `customers`、`clientId` → `customerId` を全レイヤーで統一
- **API から `client*` プレフィックスを完全排除**（スキーマ名・フィールド名・ネストキーすべて）
- `birthDate` は `YYYY-MM-DD` 文字列のまま（フル datetime 化しない）
- `memo` → `note` を FS / Domain / API 全レイヤーで統一 ✅ 実装済み（API は 2026-07-28。`CustomerDetail.note` / `ConsultantBookingDetail.customer.note`）
- **注意**: DDD_DESIGN.md の「Client ≠ Customer」定義と矛盾するため、ドキュメント更新が必要

**影響**: `domain/client/` → `domain/customer/`、`firestore-client-repository.ts`、`bookings.customerId`、`openapi.yaml`、`booking-form-schema.ts`、予約フォーム、管理 UI、Orval 生成物、全テスト

**根拠**（当時のファイル名。現行は `firestore-customer-repository.ts` / `domain/customer/customer.ts`）: `firestore-client-repository.ts`, `domain/client/client.ts`, `openapi.yaml`

---

### 3.3 `consultant-price-plans` → `price-plans` ✅ 合意済み（2026-06-26）

**Doc ID**: `pricePlanId`（維持）

| プロパティ | Firestore | Domain | API | 正準名 | 判定 |
|---|---|---|---|---|---|
| コレクション | `consultant-price-plans` | — | — | **`price-plans`** | **リネーム** |
| 組織 ID | `organizationId` | `organizationId` | — | `organizationId` | 維持 |
| 相談員 ID | `consultantId` | `consultantId` | — | `consultantId` | 維持 |
| プラン ID | `pricePlanId` | `pricePlanId` | `pricePlanId` | `pricePlanId` | 維持 |
| プラン名 | `name` | `name` | `name` | `name` | 維持 |
| 正規化名 | `normalizedName` | getter のみ | — | `normalizedName` | 維持（FS 専用） |
| 金額 | `totalJPY` | `totalJPY` | `totalJPY` | `totalJPY` | 維持 |
| ステータス | `status` | `status` | `status` | `status` | 維持 |
| 選択 ID | — | 計算 | `pricePlanSelectionId` → | **`selectionId`** | **合意: API 統一** |
| 削除日時 | `deletedAt` | `deletedAt` | `deletedAt` | `deletedAt` | 維持 |
| 作成/更新 | `createdAt`, `updatedAt` | 同名 | 同名 | 同名 | 維持 |

**合意サマリー**
- コレクション名 `consultant-price-plans` → **`price-plans`**
- `pricePlanId` は Doc ID / フィールド名とも維持
- API の `pricePlanSelectionId` → **`selectionId`** に統一
- `normalizedName` は Firestore 専用のまま

**根拠**（当時のファイル名。現行は `firestore-price-plan-repository.ts` / `domain/price-plan/price-plan.ts`）: `firestore-consultant-price-plan-repository.ts`, `consultant-price-plan.ts`, `openapi.yaml`

---

### 3.4 `consultants` ✅ 合意済み（2026-06-26）

**Doc ID**: `{organizationId}_{consultantId}`（維持）

**複合 ID の理由**: `consultantId` = Firebase Auth `uid` のため、同一ユーザーが複数 org の相談員になると Doc ID が衝突する。`organization-accounts` と同様の複合キーで回避している。

| プロパティ | Firestore（現状） | 正準名 | 判定 |
|---|---|---|---|
| コレクション | `consultants` | `consultants` | 維持 |
| 相談員 ID | `consultantId` | `consultantId` | 維持 |
| 表示名 | `displayName` | **`name`** | **全レイヤー統一** |
| 自己紹介 | `bio` | `bio` | 維持 |
| 専門分野 | `specialties` | `specialties` | 維持 |
| 電話 | `phone` | `phone` | 維持 |
| 画像 URL | `imageUrl` | `imageUrl` | 維持 |
| ステータス（旧称: ランク） | `statusId` / API `status` オブジェクト | **FS/Domain は `statusId`、API は `status` 展開オブジェクト** | **「API も statusId のみ」は撤回（下記）。`rank` → `status` への改名のみ適用済み** |
| 有効フラグ | `isActive` | `isActive` | 維持 |
| 作成/更新 | `createdAt`, `updatedAt` | 同名 | 維持 |

**合意サマリー**
- コレクション名 `consultants`、複合 Doc ID は維持
- `displayName` → **`name`** に全レイヤー統一（FS / Domain / API）✅ 実装済み
- ~~API の `rank` オブジェクト展開を廃止し `rankId` のみ返す~~ → **撤回（2026-07-28）**

#### 2026-07-28 撤回: API の `status` 展開オブジェクトは維持する

**決定**: 「API も `statusId` のみ返す」という 2026-06-26 の合意を **撤回**し、`Consultant` / `ConsultantDetail` / `ConsultantProfile` は `status: { statusId, name }` を返し続ける。`rank` → `status` への改名（`rankId` ではなく `statusId`）は合意どおり適用済み。

**理由**:
- §1.1 のレイヤー表は API 層について「顧客向け公開名。**計算値・展開オブジェクト可**」と明記しており、展開オブジェクト自体は禁じていない。§3.4 の「`statusId` のみ」は §1.1 と矛盾していた
- `statusId` だけを返すと、表示名の解決に `settings.consultantStatuses` との join が必要になる。ところが **公開エンドポイント `GET /settings/public` は `businessHours` / `pricePlanRange` しか返さない**（`settings-response.ts`）ため、未認証の顧客向け占い師一覧（`apps/user/src/components/consultants-page.tsx`）で名前を解決できない
- 解決するには組織設定のステータス一覧を公開するか公開エンドポイントを新設する必要があり、内部設定の露出とリクエスト増を招く。展開オブジェクトを返す現行のほうが API として素直

**適用範囲**: なし（現行実装を正とする。ドキュメントのみ更新）

**根拠**: `firestore-consultant-repository.ts`, `consultant.ts`, `consultant-profile.ts`, `openapi.yaml`, `firestore.rules`

---

### 3.5 `organization-accounts` → `accounts` ✅ 合意済み（2026-06-26 / 2026-07-14 改訂 §0 / 2026-07-15 改訂 §0.1 / **2026-07-15 改訂: `role` → `roleId` + `consultant` ロール廃止** / **2026-07-15 改訂: `authUid` → `accountId`（§0.2）** / **2026-07-15 改訂: 相談員は accounts を持たない排他モデルに移行（§3.5.1）**）

**Doc ID**: `{organizationId}_{accountId}`（形式・値は維持。`accountId` の値 = Firebase Auth uid）

| プロパティ | Firestore（現状） | 正準名 | 判定 |
|---|---|---|---|
| コレクション | `organization-accounts` | **`accounts`** | **リネーム（§0）** |
| 主識別子 | ~~`uid`~~ / ~~`authUid`~~ | **`accountId`** | **リネーム（§0.2、値は Firebase Auth uid のまま）** |
| 組織 ID | `organizationId` | `organizationId` | 維持 |
| ロール ID | ~~`role`~~ | **`roleId`** | **リネーム（2026-07-15）** |
| ステータス | `active` / `invited` / `disabled` | **同名（API も統一）** | **合意: FS 値に API 統一（実装済み）** |
| 表示名 | `user-preferences` 参照 | **`name`（account へ移動）** | **移動 + consultants と統一** |
| 作成/更新 | `createdAt`, `updatedAt` | 同名 | 維持 |

**合意サマリー**
- コレクション名・複合 Doc ID の形式は維持（値も同じ）
- API の `registered`/`pending` を廃止し、FS と同じ **`active`/`invited`/`disabled`** に統一（§0.2 で実装済み）
- **`name`** を `user-preferences` から **account ドキュメントへ移動**（consultants と統一）
- **Repository 化 ✅ 実装済み**（`IAccountRepository` + `FirestoreAccountRepository` + `Account` 集約、§0.2）

#### 2026-07-15 追加: `role` → `roleId` + `consultant` ロール廃止

**決定**: `accounts.role` フィールドを **`accounts.roleId`** にリネームし、値は常に `roles` コレクション（および `admin` / `operator` のシステムロール）に解決される **roleId 参照** として純化する。従来の番兵値 `"consultant"` は廃止し、既存データは `roleId: "admin"` にマイグレートする。

| 従来 | 新 |
|---|---|
| `role: "admin"` / `"operator"` / `<custom>` | 同じ値を `roleId` にリネーム |
| `role: "consultant"`（番兵値、roles に不在） | **`roleId: "admin"`**（マイグレーション時に一括変換） |
| 相談員判定 = `role === "consultant"` | **相談員判定 = `consultants` コレクションに doc が存在** |

**理由**:
- カスタムロール（`roles` コレクション）の導入により、`role` フィールドは実質「roleId への参照」だったが、`"consultant"` だけが roles に不在の番兵値として混在し、命名が正しくなかった。
- `"consultant"` を実体化してもロールとしての権限を持たず、招待経路・削除経路も別動線のため、アカウント種別（相談員か否か）と権限ロールは直交させる方が正確。
- 副産物として「管理者かつ相談員」が表現可能になる（オーナー兼相談員の小規模組織で有用）。

**適用範囲**:
- Firestore accounts 全ドキュメント: `role` → `roleId` へリネーム、`"consultant"` は `"admin"` に変換
- API: `Account.role` → `Account.roleId` + `isConsultant: boolean` を追加（`consultants` から導出）。`requireRole(authUser, orgId, "consultant") → requireConsultant`、`requireRoleId` 新設、`requireSystemAdminRole` は `roleId` 参照
- ルート: 招待ペイロード `{ role }` → `{ roleId, isConsultant? }`、ロール変更ペイロード `{ role }` → `{ roleId }`、`admin-role-routes` の `roleId === "consultant"` 予約語チェック削除、`admin-account-routes` の `isAdminPanelUserRole` チェック削除
- Email: `sendInvitation({ role })` → `sendInvitation({ roleName, isConsultant })`
- OpenAPI: `ConsoleAccount.role → roleId`、`inviteAccount` / `updateAccountRole` のリクエスト schema
- SPA (console-core / admin / consultant): `useAuth().role → useAuth().roleId`、`currentRole → currentRoleId`、`isConsultant` フラグ追加。相談員 SPA ログインゲートは `currentIsConsultant` で判定
- `firestore.rules`: `hasRole → hasRoleId`（`accountData.role → .roleId`）、`isOrganizationConsultant` は `consultants` doc の `exists()` で判定（**terraform apply 必須**）

**マイグレーション**: `apps/api/scripts/migrate-account-role-to-role-id.ts`
- 全 accounts ドキュメントの `role` を削除し `roleId` を追加
- `role: "consultant"` は `roleId: "admin"` に変換（リリース前のため破壊的変更を許容）
- 冪等（`roleId` が既に入っているドキュメントはスキップ）
- 実行: `pnpm dlx tsx --env-file=.env.local apps/api/scripts/migrate-account-role-to-role-id.ts`

**連鎖影響**
- ~~`openapi.yaml` ConsoleAccount.status enum 変更（`pending` / `registered`）~~ → §0.2 で Firestore と揃えた `active` / `invited` / `disabled` に変更済み。この行は §0.2 より前の記述（2026-07-28 訂正）
- `load-auth-context.ts` の name 取得元変更、および consultants コレクションを uid で 1 クエリ引いて `isConsultant` を展開
- ConsoleAccount API の `displayName` → **`name`** にリネーム
- ~~`user-preferences`~~ 廃止（§3.10）

**根拠**: `load-auth-context.ts`, `admin-account-routes.ts`, `openapi.yaml` (ConsoleAccount), `auth-types.ts`, `firestore.rules`

#### 2026-07-15 追加（§3.5.1）: 排他モデルへ移行（相談員は accounts に doc を持たない）

**決定**: 直前の直交モデル（相談員は accounts + consultants の両方に doc を持つ）を撤回し、**排他モデル** に切り替える。

- 相談員招待 → `consultants/{organizationId}_{consultantId}` のみ作成、`accounts/{organizationId}_{accountId}` は作成しない
- 管理者・オペレーター招待 → `accounts/{organizationId}_{accountId}` のみ作成（従来どおり）
- 「管理者かつ相談員」の同居は表現しない

**理由**:
- 「相談員招待なのに accounts コレクションに書き込まれる」のが利用者の直感と噛み合わず、一覧 UI にも相談員が混在して見通しが悪かった
- 認可は Account、業務プロフィールは Consultant という責務分離を Firestore ドキュメント境界とも一致させる
- リリース前のため破壊的変更を許容

**適用範囲**:
- API: `AuthUser.consultants[]` を新設（`{ organizationId, name, isActive, createdAt }`）。`loadAuthUser` は `accounts` と `consultants` を独立に取得して両配列を返す
- Auth ヘルパ: `requireConsultant(authUser, organizationId)` は `authUser.consultants[]` を参照（Account 前提を撤廃）。`getConsultant` を新設
- `Account.isConsultant` プロパティを削除（相談員かどうかは `consultants[]` の存在で判定）
- ルート: `/organizations/{organizationId}/console/accounts/invite` から `isConsultant` フラグ削除。`/console/consultants/invite` を新設し、Firebase Auth ユーザー + Consultant のみ作成（accountRepository は呼ばない）。409 判定は同一組織内の Consultant doc 存在で行う
- ルート: `slot-routes` / `console-listing-routes` の `account.isConsultant` 参照を `getConsultant` に差し替え
- Email: `sendInvitation({ roleName, isConsultant })` は温存（本文の文言切り替え用途で残す）
- SPA (console-core / consultant): `AuthState.consultants[]` を追加、`currentIsConsultant` は `consultants[]` に組織 doc が存在するかで判定
- OpenAPI: `inviteConsultant` レスポンスを `{ consultantId }` に変更（`accountId` を返さない）
- `firestore.rules`: `isOrganizationConsultant(organizationId)` は引き続き `consultants/{organizationId}_{uid}` の存在チェックで OK（**変更不要**）

**マイグレーション**: 既存データ量が少ないため、スクリプトは用意せず手動で以下を実施:
1. 相談員として作られていた `accounts/{organizationId}_{authUid}` doc を Firestore コンソールから削除
2. 対応する Firebase Auth ユーザーはそのまま（consultants doc から参照される）

**根拠**: `apps/api/src/infrastructure/auth/auth-types.ts`, `apps/api/src/infrastructure/auth/load-auth-context.ts`, `apps/api/src/infrastructure/auth/require-role.ts`, `apps/api/src/presentation/organizations/console-consultant-routes.ts`, `apps/api/src/presentation/organizations/console-account-routes.ts`, `apps/api/src/presentation/organizations/slot-routes.ts`, `apps/api/src/presentation/organizations/console-listing-routes.ts`, `packages/console-core/src/hooks/use-auth.ts`

---

### 3.6 `organization-settings` → `settings` ✅ 合意済み（2026-06-26 / 2026-07-14 改訂 §0）

**Doc ID**: `organizationId`（維持）

| プロパティ | 正準名 | 判定 |
|---|---|---|
| コレクション | **`settings`** | **リネーム（§0）** |
| 組織 ID | `organizationId` | 維持 |
| 営業時間 | `businessHours`（ネスト維持） | 維持 |
| 相談員ステータス（旧称: ランク） | `consultantStatuses` | **`consultantRanks` → `consultantStatuses` にリネーム（マイグレーション要）** |
| デフォルトステータス ID（旧称: ランク） | `defaultConsultantStatusId` | **`defaultConsultantRankId` → `defaultConsultantStatusId` にリネーム** |
| 料金プラン範囲 | `pricePlanRange`（ネスト維持） | 維持 |
| 作成/更新 | `createdAt`, `updatedAt` | **Repository に追加 ✅ 実装済み（2026-07-28）** |

**ネスト構造（維持）**

```
businessHours
  weekly[]: { dayOfWeek, isClosed, timeWindows[]: { startTime, endTime } }
  includePublicHolidays
  exceptions[]: { startDate, endDate, isClosed, timeWindows[] }
consultantStatuses[]: { statusId, name }
pricePlanRange: { minTotalJPY, maxTotalJPY }
```

**合意サマリー**
- コレクション名・フィールド名は現状維持
- `businessHours` / `pricePlanRange` のネスト構造も維持
- `createdAt` / `updatedAt` を Repository 型・`toFirestore` に追加 ✅ 実装済み（2026-07-28）。`Settings` 集約が両フィールドを保持し、更新系メソッドが `updatedAt` を更新する。従来は `SettingsDoc` に両フィールドが無く `save()` が merge なしの `.set()` だったため、`create-organization.ts` が書いた値が初回更新で消えていた

**根拠**: `firestore-settings-repository.ts`, `apps/api/scripts/create-organization.ts`

---

### 3.7 `organizations` ✅ 合意済み（2026-06-26）

**Doc ID**: `organizationId`（維持）

| プロパティ | Firestore（現状） | 正準名 | 判定 |
|---|---|---|---|
| コレクション | `organizations` | `organizations` | 維持 |
| 組織 ID | `organizationId`（Doc ID と重複） | `organizationId` | 維持 |
| 組織名（FS） | `name` | `name` | 維持 |
| 組織名（account/API join） | `organizationName` | **`name`** | **リネーム** |
| 作成/更新 | `createdAt`, `updatedAt` | 同名 | 維持 |

**合意サマリー**
- コレクション名・Doc ID・`organizationId` フィールドは維持
- API の `organizationName` → **`name`** に統一
- **Repository 化**（`OrganizationRepository` + `OrganizationDoc`）

**連鎖影響**: `auth-types.ts` OrganizationAccount、`load-auth-context.ts`、admin/consultant layout

**根拠**: `load-auth-context.ts`, `apps/api/scripts/create-organization.ts`

---

### 3.8 `payments` ✅ 合意済み（2026-06-26）

**Doc ID**: `paymentId`（維持）

| プロパティ | Firestore（現状） | 正準名 | 判定 |
|---|---|---|---|
| コレクション | `payments` | `payments` | 維持 |
| 組織 ID | `organizationId` | `organizationId` | 維持 |
| 決済 ID | `paymentId` | `paymentId` | 維持 |
| 予約 ID | `bookingId` | `bookingId` | 維持 |
| 顧客 ID | `clientId` | **`customerId`** | **リネーム** |
| 税抜金額 | `amountJPY` | `amountJPY` | 維持 |
| 税額 | `taxAmountJPY` | `taxAmountJPY` | 維持 |
| 税率 | `taxRate` | `taxRate` | 維持（API 非公開） |
| 合計 | — | **`totalJPY`** | API 計算値のまま |
| ステータス | `status` | `status` | 維持 |
| 決済戦略 | `paymentStrategy` | 同名 | 維持 |
| Stripe 系 | `stripe*` | 同名 | 維持 |
| 課金方法 | `chargeMethod` | 同名 | 維持 |
| 作成/更新 | `createdAt`, `updatedAt` | 同名 | 維持 |

**合意サマリー**
- コレクション名・Doc ID は維持
- `clientId` → **`customerId`**（customers 統一）
- `taxRate` は内部専用、`totalJPY` は API 計算値のまま

**根拠**: `firestore-payment-repository.ts`, `domain/payment/payment.ts`, `openapi.yaml`

---

### 3.9 `slots` ✅ 合意済み（2026-06-26）

**Doc ID**: `slotId`（維持）

| プロパティ | Firestore（現状） | Domain | API（現状） | 正準名 | 判定 |
|---|---|---|---|---|---|
| コレクション | `slots` | — | — | `slots` | 維持 |
| 開始 | `startAt` | `timeRange.startAt` | `startDatetime` → | **`startsAt`** | **リネーム** |
| 終了 | `endAt` | `timeRange.endAt` | `endDatetime` → | **`endsAt`** | **リネーム** |
| 予約済み/空き | `isReserved` | `isReserved` | `isAvailable`（反転） | **`isAvailable`** | **全レイヤー統一** |
| その他 | `organizationId`, `slotId`, `consultantId`, `bookingId` | 同名 | 同名 | 同名 | 維持 |

**合意サマリー**
- `startAt`/`endAt` → **`startsAt`/`endsAt`**
- `isReserved` → **`isAvailable`** に FS/Domain/API 統一
- Domain `TimeRange` も **`startsAt`/`endsAt`** に追随

**根拠**: `firestore-slot-repository.ts`, `domain/slot/slot.ts`, `openapi.yaml`, `infra/terraform/gcp/common/firebase/main.tf`

---

### 3.10 `user-preferences` → **廃止** ✅ 合意済み（2026-06-26）

| 項目 | 現状 | 正準 | 判定 |
|---|---|---|---|
| コレクション | `user-preferences` | **廃止** | 削除 |
| `displayName` | user-preferences | **organization-accounts.name** | 移動済み（§3.5） |
| `lastOrganizationId` | user-preferences | **クライアント側のみ**（localStorage 等） | FS から削除 |

**合意サマリー**
- `user-preferences` コレクション自体を廃止
- 最後に選択した org は **サーバーに保存せず** クライアント側で保持
- `load-auth-context.ts` / `setLastOrganizationId` / `POST /api/auth/organization` を削除またはクライアント専用化

**根拠**（当時のパス。`src/app/api/**` は Next.js 時代のもので現存しない）: `load-auth-context.ts`, `apps/api/scripts/create-organization.ts`, `src/app/api/auth/organization/route.ts`

---

### 3.11 `zoom-daily-sessions` → `zoom-sessions` ✅ 合意済み（2026-06-26）

**Doc ID**: `{organizationId}_{sessionDate}`（維持）

| プロパティ | 正準名 | 判定 |
|---|---|---|
| コレクション | **`zoom-sessions`** | **リネーム** |
| 参加 URL | **`joinUrl`** | 維持（booking 側も `joinUrl` に統一） |
| その他 | `organizationId`, `sessionId`, `sessionDate`, `zoomMeetingId`, `breakoutRooms[]`, `createdAt` | 維持 |

**補足（joinUrl 統一の理由）**  
現状、予約確定時に `session.joinUrl` をそのまま `booking.zoomUrl` にコピーしており、値は同一 URL。集約は分かれるが名称は **`joinUrl`** に統一する。

**補足（`breakoutRooms[]` の要素・2026-07-28 更新）**  
ルームの粒度を相談員単位から**予約単位**に変更したことに伴い、要素のプロパティを `{ bookingId, consultantId, roomName, customerEmail }` に変更した。旧形式の `participantEmails[]`（1 相談員のルームに当日の顧客が相乗り）は廃止。`roomName` は `{相談員名} {開始}-{終了}`（JST・32 文字以内）で自動生成する。

**根拠**: `firestore-zoom-session-repository.ts`, `create-booking-use-case.ts`, `domain/booking/booking.ts`

---

### 3.12 `policy-revisions` / `policy-agreements`（2026-07-28 収録）

台帳の集約時点（2026-06-26）に存在しなかったポリシー機能のコレクション。命名は §1.2（時刻・日付）・§1.5（Doc ID・真偽値）の規則に沿っており、リネームは不要。

#### `policy-revisions`

**Doc ID**: `revisionId`（単体）

| プロパティ | Firestore | Domain | API | 判定 |
|---|---|---|---|---|
| 改訂 ID | `revisionId` | `revisionId` | `revisionId` | 維持 |
| 組織 ID | `organizationId` | 同名 | — | 維持 |
| 種別 | `type` | `PolicyType` | `type` | `terms` / `cancellation_policy` / `privacy_policy` |
| バージョン | `version` | 同名 | 同名 | 表示用の版名（例 `2026-08-01`）。`type` × `version` で一意 |
| タイトル | `title` | 同名 | 同名 | 維持 |
| 本文 | `body` | 同名 | 同名 | markdown |
| ステータス | `status` | `PolicyRevisionStatus` | 同名 | `draft` / `published` / `archived`。`published` は type ごとに最大 1 件 |
| 適用開始 | `effectiveFrom` | 同名 | 同名 | `*At` ではなく `From`。区間の開始を表す例外として許容 |
| 公開/アーカイブ日時 | `publishedAt`, `archivedAt` | 同名 | 同名 | 維持（§1.2 の `*At`） |
| 作成者 | `createdBy` | 同名 | 同名 | Firebase Auth uid または `seed` |
| 作成/更新 | `createdAt`, `updatedAt` | 同名 | 同名 | 維持 |

> `effectiveFrom` だけは §1.2 の 4 分類（`*At` / `startsAt`・`endsAt` / `*Date` / `*Time`）に当てはまらない。終了を持たない片側開区間で `endsAt` の対がないため、`effectiveAt` ではなく `effectiveFrom` を維持する。

#### `policy-agreements`

**Doc ID**: `agreementId`（単体）

| プロパティ | Firestore | Domain | API | 判定 |
|---|---|---|---|---|
| 同意 ID | `agreementId` | 同名 | — | 維持 |
| 組織 ID | `organizationId` | 同名 | — | 維持 |
| 種別 | `type` | `PolicyType` | `type` | `policy-revisions` と同じ |
| 主体種別 | `subjectType` | `PolicySubjectType` | — | `user` / `customer` / `consultant` |
| 主体 ID | `subjectId` | 同名 | — | user / customer なら `userId`、consultant なら `consultantId` |
| 改訂 ID | `revisionId` | 同名 | 同名 | `policy-revisions` への参照 |
| バージョン | `version` | 同名 | 同名 | 同意時点の版名を非正規化 |
| 同意経路 | `agreedVia` | `PolicyAgreementVia` | — | `booking` / `reagreement_modal` / `registration` |
| 予約 ID | `bookingId` | 同名 | — | 予約起因の同意のみ。それ以外は `null` |
| 同意日時 | `agreedAt` | 同名 | 同名 | 維持（§1.2 の `*At`） |

**関連**: 予約側は `bookings.agreedTermsVersion` / `agreedCancellationPolicyVersion` / `agreedAt` に版名をスナップショットする（§3.1 では未収録。`Booking` 集約のコードを参照）。

**根拠**: `firestore-policy-revision-repository.ts`, `firestore-policy-agreement-repository.ts`, `domain/policy/`, `openapi.yaml`, `firestore.rules`

---

## 4. 変更影響マップ

### 4.1 優先度: 高（命名不整合の解消）

| 変更 | 影響ファイル |
|---|---|
| `clients` → `customers`、`clientId` → `customerId` | 全 Repository / Domain / FS / bookings / payments / テスト |
| API `client*` → `customer*` 完全統一 | `ClientDetail`→`CustomerDetail`, `clientName`→`customerName`, ConsultantBookingDetail.`client`→`customer`, openapi, route, 予約フォーム, Orval |
| `consultant-price-plans` → `price-plans` | `firestore-collections.ts`, repository, Terraform index |
| `zoom-daily-sessions` → `zoom-sessions` | `firestore-collections.ts`, repository, batch |
| `slots.startAt/endAt` → `startsAt/endsAt` | `firestore-slot-repository.ts`, `domain/slot/time-range.ts`, `main.tf`, seed/delete scripts |
| `bookings.startDatetime` → `startsAt`、`cancelDeadline` → `cancelDeadlineAt` | booking domain/repository, openapi, route, batch |
| `customers.birthdate` → `birthDate` | customer repository, domain |
| `slots.isReserved` → `isAvailable` | 同上 + Domain `slot.ts` + API route |
| API クエリ `startDatetime`/`endDatetime` → `startsAt`/`endsAt` | openapi, route, 予約 UI, Orval |
| `booking.zoomUrl` → `joinUrl` | `domain/booking/`, repository, openapi, email templates |
| ~~CreateBookingRequest `consultantContent` → `consultationContent`~~ ✅ 完了（2026-07-28） | `openapi.yaml`, route, 予約フォーム, Orval |
| API `pricePlanSelectionId` → `selectionId` | `openapi.yaml`, route, 公開予約 UI, Orval |
| CreateBooking から `clientBirthdate` 削除 | `openapi.yaml`, route, 予約フォーム |
| ~~`customers.memo` → `note`~~ ✅ 完了（2026-07-28） | customer repository, openapi, 管理 UI |
| ConsoleAccount `displayName` → `name`、status enum 統一 | openapi, route, admin UI |
| `organizations.organizationName` → `name` | auth-types, layouts, load-auth-context |

### 4.2 優先度: 中（アーキテクチャ整備）

| 変更 | 影響ファイル |
|---|---|
| `organizations` Repository 化 | 新規 repository, `load-auth-context.ts`, `route.ts`, scripts |
| `organization-accounts` Repository 化 + `name` 追加 | 新規 repository, auth, route, scripts |
| **`user-preferences` 廃止** | `load-auth-context.ts`, `create-organization.ts`, `POST /api/auth/organization`, クライアント localStorage 化 |
| ~~`organization-settings` に `createdAt`/`updatedAt` 追加~~ ✅ 完了（2026-07-28） | repository, scripts |
| ~~`consultants.displayName` → `name`~~ ✅ 完了。API `rank` → `rankId` は **撤回**（§3.4） | domain, repository, openapi, route |

### 4.3 優先度: 低（将来検討）

| 変更 | 備考 |
|---|---|
| `consultants` Doc ID を `consultantId` 単体に | データ移行が必要。急ぎ不要 |
| `price-plans` / `zoom-sessions` の Security Rules 追加 | Admin SDK のみなら現状維持可 |

### 4.4 データ移行が必要な変更

| 変更 | 移行方法 |
|---|---|
| **`organization-{accounts,roles,settings}` → `{accounts,roles,settings}`（§0）** | `apps/api/scripts/migrate-drop-organization-prefix.ts` で doc ID 保持コピー → 新コードデプロイ → `--delete-source` で旧削除。`firestore.rules`（accounts / settings のパス, `hasRole`）変更は **terraform apply 必須** |
| **`accounts.uid` → `authUid`（§0.1）** | `apps/api/scripts/migrate-accounts-auth-uid.ts` で `authUid` を複製 → 新コードデプロイ → `--delete-source` で旧 `uid` フィールド削除。rules / インデックス影響なし |
| `clients` → `customers` コレクションリネーム | Firestore コレクションコピー + フィールド `clientId`→`customerId`, `memo`→`note` |
| `slots` フィールドリネーム | `startsAt`/`endsAt`/`isAvailable` + インデックス再作成 |
| `bookings` 時刻フィールド | `startsAt`, `cancelDeadlineAt` |
| `customers.birthdate` → `birthDate` | フィールドリネーム（値は `YYYY-MM-DD` のまま） |
| `isReserved` → `isAvailable` | 値反転してコピー（`isAvailable = !isReserved`） |
| `zoom-daily-sessions` → `zoom-sessions` | コレクションコピー |
| `booking.zoomUrl` → `joinUrl` | フィールドリネーム |
| `user-preferences` 削除 | ドキュメント削除（`lastOrganizationId` はクライアントへ） |

---

## 5. レビュー進捗

| # | コレクション | 現状整理 | 正準名決定 | 影響整理 | 状態 |
|---|---|---|---|---|---|
| 1 | `bookings` | ✅ | ✅ | ✅ | **合意済み** |
| 2 | `clients` → `customers` | ✅ | ✅ | ✅ | **合意済み** |
| 3 | `consultant-price-plans` → `price-plans` | ✅ | ✅ | ✅ | **合意済み** |
| 4 | `consultants` | ✅ | ✅ | ✅ | **合意済み** |
| 5 | `organization-accounts` | ✅ | ✅ | ✅ | **合意済み** |
| 6 | `organization-settings` | ✅ | ✅ | ✅ | **合意済み** |
| 7 | `organizations` | ✅ | ✅ | ✅ | **合意済み** |
| 8 | `payments` | ✅ | ✅ | ✅ | **合意済み** |
| 9 | `slots` | ✅ | ✅ | ✅ | **合意済み** |
| 10 | ~~`user-preferences`~~ 廃止 | ✅ | ✅ | ✅ | **合意済み** |
| 11 | `zoom-daily-sessions` → `zoom-sessions` | ✅ | ✅ | ✅ | **合意済み** |

**全11コレクションの命名レビュー完了（2026-06-26）**

---

## 付録: TS 定数 ↔ Firestore 実体（合意後）

> 注: 以下は「目標状態」。2026-06-26 時点の現行実装（`firestore-collections.ts`）には未反映項目を含む。反映状況は「次のアクション（実装フェーズ）」を参照。

```typescript
// src/infrastructure/firestore/firestore-collections.ts（目標状態）
export const FIRESTORE_COLLECTIONS = {
  bookings: "bookings",
  customers: "customers",           // was: clients
  pricePlans: "price-plans",        // was: consultant-price-plans
  consultants: "consultants",
  accounts: "accounts",             // was: organization-accounts（§0）
  roles: "roles",                   // was: organization-roles（§0）
  settings: "settings",             // was: organization-settings（§0）
  organizations: "organizations",
  payments: "payments",
  slots: "slots",
  zoomSessions: "zoom-sessions",    // was: zoom-daily-sessions
  // userPreferences: 廃止
} as const;
```

---

## 次のアクション（実装フェーズ）

1. **データ移行 PR**: コレクションリネーム（customers, price-plans, zoom-sessions）+ フィールド移行
2. **slots PR**: `startsAt`/`endsAt` + `isAvailable` + インデックス更新
3. **API 整合 PR**: 名称統一（`customer*`, `startsAt`/`endsAt`, `joinUrl`, `selectionId`, `consultationContent` 等）+ `pnpm generate`
4. **Repository 化 PR**: organizations / organization-accounts
5. **user-preferences 廃止 PR**: クライアント localStorage 化 + サーバー側削除
6. **DDD_DESIGN.md 更新**: Client → Customer、用語表の整合

---

## 6. 一貫性監査（2026-06-26）

### 6.1 ✅ 一貫している点

| 観点 | 状態 |
|---|---|
| 外部キー `organizationId` | 全コレクションで統一 |
| 外部キー `consultantId` | bookings / slots / price-plans でトップレベル統一（zoom-sessions は `breakoutRooms[].consultantId` で保持） |
| 外部キー `customerId` | customers / bookings / payments / API 全スキーマで統一 |
| API 顧客参照 | **`customer*` 統一**。`client*` プレフィックス禁止（§3.2 合意） |
| エンティティ ID | `{entity}Id` 形式（`bookingId`, `slotId`, `paymentId` 等） |
| 通貨 | `*JPY` サフィックス統一 |
| 監査フィールド | 原則 `createdAt` / `updatedAt` を使用（例外: `zoom-sessions` は `createdAt` のみ） |
| 表示名 | `name` に統一（organizations / consultants / accounts / customers） |
| 参加 URL | `joinUrl` に統一（bookings / zoom-sessions） |
| 区間端点 | **`startsAt` / `endsAt`** + フル datetime（bookings / slots / API） |
| カレンダー日 | **`*Date`** + `YYYY-MM-DD` 文字列（`sessionDate`, `birthDate`, 休業日） |
| 料金プラン選択 | API `selectionId`、永続化 `pricePlanId` で役割分離 |

### 6.2 ⚠️ 台帳内の矛盾（修正済み）

| 箇所 | 問題 | 対応 |
|---|---|---|
| §1.4 status 表 | §3.5 と矛盾（registered/pending） | 削除・§3.5 に合わせて更新 |
| §3.5 連鎖影響 | user-preferences「次回レビュー」の記述が §3.10 と矛盾 | 修正 |
| §1.5 null/omit | `client` のまま | `customer` に修正 |

### 6.3 ✅ 合意済み / 許容の不整合

#### A. Customer 統一（API `client*` 排除）✅ 合意済み（2026-06-26）

| 現状 | 正準名 | 状態 |
|---|---|---|
| `ClientDetail` | **`CustomerDetail`** | 合意 |
| `clientId`（BookingDetail / PaymentDetail） | **`customerId`** | 合意 |
| `clientName` / `clientEmail` / `clientPhone` | **`customerName` / `customerEmail` / `customerPhone`** | 合意 |
| ConsultantBookingDetail の `client` ネスト | **`customer`** | 合意 |

**ルール**: API / Domain / FS すべて **`client*` 禁止**。詳細は §3.2。

#### B. コレクション名の粒度 ⚠️ 撤回（2026-07-14 · §0）

> ~~2026-06-26 時点では `organization-*` プレフィックスと単体名の「意図的な混在」を許容としていた~~。**2026-07-14 に撤回**（§0）。全コレクションは `organizationId`（複合キー / フィールド）で分離済みであり、`organization-` は冗長な所有プレフィックスに過ぎないため、**単体名（prefix なし）に統一**する。

| パターン | コレクション |
|---|---|
| エンティティ単体名（統一後） | `organizations`, `accounts`, `roles`, `settings`, `bookings`, `customers`, `consultants`, `payments`, `slots`, `price-plans`, `zoom-sessions` |

**ルール**: コレクション名はドメインエンティティ名の kebab-case 複数形とし、所有者を示す `organization-` / `consultant-` 等の prefix は付けない（`organizations` はエンティティ名そのもの）。`price-plans` が `consultant-` を持たないのも同ルールに合致する。

#### C. 時刻・日付サフィックス ✅ 合意済み（§1.2 に昇格）

§1.2 の4分類（`*At` / `startsAt·endsAt` / `*Date` / `*Time`）で確定。混在は意図的な型の違いによるもの。

| 変更 | 正準名 |
|---|---|
| `birthdate` | **`birthDate`** |
| `cancelDeadline` | **`cancelDeadlineAt`** |
| `startDatetime`/`endDatetime`/`startAt`/`endAt` | **`startsAt`/`endsAt`** |
| `sessionDate`, 休業 `startDate`/`endDate` | 維持（`*Date` + 文字列） |
| businessHours `startTime`/`endTime` | 維持（`*Time` + `HH:mm`） |

#### D. Domain 集約名 vs コレクション名 ⚠️ 一部解消（2026-07-14 · §0）

> ~~2026-06-26 時点では「コレクション名は短く Domain は明示的」を許容とし、リネーム不要としていた~~。**2026-07-14 に方針変更**し、ドメイン集約名 = コレクション名（kebab 複数形）へ**アライン**。`Consultant`（スコープ修飾）/ `Daily`（粒度修飾）は冗長として削除した。

| Domain 集約 | コレクション | 状態 |
|---|---|---|
| `PricePlan`（旧 `ConsultantPricePlan`） | `price-plans` | ✅ アライン（OpenAPI スキーマ `PricePlan` / operationId `*PricePlan*` も追随・再生成） |
| `ZoomSession`（旧 `ZoomDailySession`） | `zoom-sessions` | ✅ アライン（API 非公開） |
| `UserZoomConnection` | `user-zoom-credentials` | 維持（`Connection` vs `Credentials`。`user-` は意味あり・§0 参照） |
| `Customer` ほか | `customers` ほか | 一致 |

**ルール（現行）**: ドメイン集約名の kebab-case 複数形＝コレクション名。ただし `UserZoomConnection`（User 集約の一部で名詞も異なる）のような明確な意図がある場合のみ差異を許容。

#### E. メモ系フィールド（優先度: 低・意図的分離）

| 場所 | フィールド | 理由 |
|---|---|---|
| customers | `note` | 顧客メモ |
| bookings | `consultantMemo` | 相談員の内部メモ（予約に紐づく） |

**判断**: 主体が異なるため別名は妥当。統一不要。

#### F. ~~payments テーブル漏れ~~（修正済み）

§3.8 に `organizationId` を追記済み。

### 6.4 第1回監査結論（2026-06-26）

| 区分 | 件数 |
|---|---|
| 一貫性 OK | 12 項目 |
| 台帳矛盾（修正済み） | 3 件 |
| 合意済み | Customer 統一、日付4分類 |
| 許容 | B〜E |

### 6.5 第2回監査（2026-06-26）

#### ✅ 整合性 OK（台帳内）

| 観点 | 結果 |
|---|---|
| §1.2 日付4分類 ↔ §3.x 各コレクション | 一致（`*Date`/`startsAt`/`endsAt`/`*At`/`*Time`） |
| Customer 統一 | §1.5 / §3.2 / §6.3-A / §4.1 で一貫 |
| account status | §1.4 / §3.5 一致（`active`/`invited`/`disabled`） |
| joinUrl | §3.1 / §3.11 / §6.1 一致 |
| 外部キー | `organizationId` 全コレクション、`customerId` 3コレクション、`consultantId` 4コレクション |

#### ⚠️ 軽微な論点（許容・文書化済み）

| 論点 | 内容 | 判断 |
|---|---|---|
| booking の `startsAt` | 区間ペアではなく単一時点。終了は slot の `endsAt` | §1.2 に「区間の開始のみ」行を追加して解消 |
| Domain 名 vs コレクション名 | `ConsultantPricePlan`/`ZoomDailySession` vs 短縮コレクション名 | 許容（§6.3-D） |
| `organization-*` vs 単体名混在 | コレクション粒度の意図的分離 | 許容（§6.3-B） |
| `note` vs `consultantMemo` | 主体が異なるメモ | 許容（§6.3-E） |

#### ✅ 台帳と現行コードのギャップ（2026-07-12 時点で解消済み）

第2回監査時点（2026-06-26）では下表は「想定内・未実装」だったが、その後の実装 PR で全て台帳どおりに反映された。

| 項目 | 台帳（正） | 現行コード |
|---|---|---|
| コレクション名 | `customers`, `price-plans`, `zoom-sessions` | 一致（`FIRESTORE_COLLECTIONS`） |
| 時刻フィールド | `startsAt`/`endsAt` | 一致（`domain/slot/time-range.ts` 等） |
| 顧客 | `customerId`, `CustomerDetail` | 一致（`domain/customer/` のみ、`domain/client/` は存在しない） |
| user-preferences | 廃止 | 廃止済み（コード上に参照なし） |
| `booking.zoomUrl` | `joinUrl` | 一致（`domain/booking/booking.ts`） |

**未収録の新規コレクション**（台帳の集約時点になかった機能）: `roles`（§0 リネーム前は `organization-roles`）, `users`, `user-zoom-credentials`, `user-coupons`, `coupons`（クーポンマスタ。`user-coupons` とは別集約）（`apps/api/src/infrastructure/firestore/firestore-collections.ts`）。命名は他コレクションの規則（kebab-case、camelCase キー）と整合しているため追加監査は不要だが、台帳本文（§3.x）には未反映。

> **追記（2026-07-28）**: さらに `policy-revisions` / `policy-agreements` が追加され、現行は **17 コレクション**。この 2 つは §3.12 に収録した。

#### 第2回監査結論

**台帳内の一貫性: OK**（矛盾なし）。現行コードへの反映も完了（上表参照）。
