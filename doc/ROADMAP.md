# Arc - みらい予報 開発ロードマップ

> Version 1.0 | 2026-03-22 | PRD v0.5 + DDD設計 v1.0 対応

> **注記（2026-07-12）**: Phase 1〜3 は策定当時（Next.js + API Route 構成）の実施記録であり、その後 API サーバーは Hono + Cloud Run へ移行し、決済用語も「本決済/capture」から「課金/charge」へ、認可方式も Firebase カスタムクレームから Firestore `accounts` 参照へ変更されている（詳細は `doc/DDD_DESIGN.md` §2, `doc/system-setup-and-organization.md`）。チェックボックスは当時完了した作業の記録として残し、現行仕様と異なる箇所は個別に注記する。

---

## 凡例

| 表記 | 意味 |
|---|---|
| `Claude Code` | ターミナルの Claude Code で実施を推奨するタスク |
| `[ ]` | チェックボックス（完了時にチェック） |

---

## Phase 1 — プロジェクト起動

> まず動く土台を作る

| | タスク | ツール |
|---|---|---|
| `[x]` | Next.js プロジェクト作成（`create-next-app`） | |
| `[x]` | `DDD_DESIGN.md` を `CLAUDE.md` としてプロジェクトルートに配置 | |
| `[x]` | 生成済みスケルトンを `src/` に配置（`domain` / `application` / `infrastructure`） | |
| `[x]` | `tsconfig.json` にパスエイリアス追加（`@/domain/*` 等） | `Claude Code` |
| `[x]` | `tsc --noEmit` で型エラーを全解消 | `Claude Code` |
| `[x]` | 必要パッケージのインストール（`firebase-admin` / `stripe` / `resend` 等） | `Claude Code` |
| `[x]` | Firebase / Stripe / Resend / Zoom の環境変数を `.env.local` に設定 | |
| `[x]` | Biome の設定（`biome.json`） | `Claude Code` |
| `[x]` | Vitest の設定（`vitest.config.ts`） | `Claude Code` |

---

## Phase 2 — コアフロー実装

> 予約 → 仮決済 → Zoom URL の一本道を通す

| | タスク | ツール |
|---|---|---|
| `[x]` | Firestore Security Rules（`clients` / `bookings` / `slots` / `payments`） | |
| `[x]` | `POST /api/bookings` — `CreateBookingUseCase` を API Route に繋ぐ | `Claude Code` |
| `[x]` | `GET /api/consultants` — 相談員一覧エンドポイント | `Claude Code` |
| `[x]` | `GET /api/slots` — 空き枠一覧エンドポイント | `Claude Code` |
| `[x]` | 顧客向け 5 画面 UI 実装（相談員一覧 → 予約完了） | `Claude Code` |
| `[x]` | Stripe Payment Element の組み込み（`/booking/payment`） | |
| `[x]` | Stripe Webhook（`/api/webhooks/stripe`）署名検証・ステータス更新 | `Claude Code` |
| `[x]` | `POST /api/bookings/[id]/cancel` — `CancelBookingUseCase` | `Claude Code` |
| `[x]` | キャンセルリンクのトークン生成・検証（確認メール内リンク） | |
| `[x]` | Vitest — ドメイン層ユニットテスト（`CancelDeadline` / `Booking` / `Slot` / `Money`） | `Claude Code` |

---

## Phase 3 — 管理系・相談員画面

> 内部オペレーションを整える

| | タスク | ツール |
|---|---|---|
| `[x]` | Firebase Auth カスタムクレーム設定（`super_admin` / `operator` / `consultant`） | ※現在は Firestore `accounts` 参照方式に置き換え済み（上部注記参照） |
| `[x]` | 相談員向け 4 画面（ログイン・予約一覧・メモ入力・プロフィール編集） | `Claude Code` |
| `[x]` | 管理者 CRM 9 画面（ダッシュボード〜権限管理） | `Claude Code` |
| `[x]` | `POST /api/bookings/[id]/capture` — 手動本決済 API | `Claude Code` |
| `[x]` | `POST /api/batch/capture` — Cloud Scheduler 深夜 0 時バッチ + OIDC 認証 | `Claude Code` |
| `[x]` | Firestore Security Rules 更新（`consultant` / `admin` ロール対応） | |
| `[x]` | Vitest — Component テスト（予約フォーム・カレンダー等） | `Claude Code` |

---

## Phase 4 — 本番リリース準備

| | タスク | ツール |
|---|---|---|
| `[ ]` | Resend 独自ドメイン設定（SPF / DKIM / DMARC レコード追加・検証） | |
| `[x]` | GCP prod 環境構築（Cloud Run + Secret Manager） | `Claude Code` |
| `[x]` | dev / prod 環境変数の分離確認 | `Claude Code` |
| `[x]` | GitHub Actions CI パイプライン（Lint・Format・Unit・Component・Build） | `Claude Code` |
| `[x]` | Cloud Scheduler 有効化（prod 環境のみ） | `Claude Code` |
| `[ ]` | Stripe 本番モード切り替え（`sk_live_...`） | |
| `[ ]` | インボイス登録番号を環境変数に設定 | |
| `[x]` | 独自ドメイン + HTTPS 設定（Cloud Run） | `Claude Code` |
| `[ ]` | 本番環境での動作確認（予約〜本決済の全フロー） | |

---

## Phase 5 — 機能拡張（Phase 4 後に main へマージ済み）

> Phase 1〜4 策定後に追加された主要機能。API サーバーは Hono + Cloud Run 構成へ移行済み（詳細は `doc/DDD_DESIGN.md` §2, `doc/api-cloud-run-migration.md`）。

| | タスク | 備考 |
|---|---|---|
| `[x]` | 認可・ロール管理システム（`Role` 集約、組織ごとのカスタムロール、`accounts.roleId` 化・`consultant` ロール廃止） | PR #81, #85, #99 |
| `[x]` | 料金プラン（`PricePlan`）集約整備（`ConsultantPricePlan` から改名、`status` → `deletedAt` 一本化） | PR #110 |
| `[x]` | クーポン機能（`Coupon` / `UserCoupon` 集約、発行・配布・予約適用の一連フロー） | PR #113 |
| `[x]` | ダッシュボード機能（`GetDashboardUseCase`） | PR #87〜#98 |
| `[x]` | `apps/admin` → `apps/console` リブランディング（`admin.*` → `console.*` ドメイン、API パス `/admin/*` → `/console/*`） | PR #100, #102, #104 |

---

## 実装メモ

### Claude Code への引き渡し方

`DDD_DESIGN.md` を `CLAUDE.md` としてプロジェクトルートに置くと、Claude Code がセッション開始時に設計ルールを自動で読み込む。

Phase 2 開始時のプロンプト例：

\`\`\`
POST /api/bookings の route.ts を実装して。
CreateBookingUseCase を使い、型エラーがないか tsc で確認後、
vitest を走らせてドメインテストが全部通ることを確認して。
\`\`\`

### 必要な環境変数一覧

| 変数名 | 説明 |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe シークレットキー（dev: `sk_test_` / prod: `sk_live_`） |
| `ZOOM_ACCOUNT_ID` | Zoom Server-to-Server OAuth アカウント ID |
| `ZOOM_CLIENT_ID` | Zoom OAuth クライアント ID |
| `ZOOM_CLIENT_SECRET` | Zoom OAuth クライアントシークレット |
| `ZOOM_HOST_USER_ID` | Zoom ホストアカウントのユーザー ID |
| `RESEND_API_KEY` | Resend API キー |
| `RESEND_FROM_EMAIL` | 送信元メールアドレス（本番: `noreply@ドメイン`） |
| `INVOICE_REGISTRATION_NUMBER` | インボイス登録番号（T から始まる 13 桁） |
| `API_URL` | API サーバーの公開 URL（Cloud Scheduler の OIDC audience 検証・リンク生成用） |