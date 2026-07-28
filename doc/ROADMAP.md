# あなたのみらい予報 開発ロードマップ

> Version 1.0 | 2026-03-22 | PRD v0.5 + DDD設計 v1.0 対応

> **注記（2026-07-28）**: サービス名は「あなたのみらい予報」（運営: 一般社団法人JKK）、職種呼称は「占い師」に変更済み（PR #157 / #137）。Phase 1〜5 の本文は当時の表記のまま残す。Phase 5 以降に追加された機能は **Phase 6** にまとめた。

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
| `[x]` | 15分単位の連続予約・バッファ機能（`PricePlan.durationMinutes`（30/60/90/120分）、予約後 15分バッファを空き枠から自動除外、`@mirai-yoho/shared/slot-availability`） | PR #120 |
| `[x]` | 相談員指名予約フラグを廃止し「相談員 → プラン → 枠 → 情報」フローに一本化（`consultantSelectionEnabled` 設定・相談員横断探索ロジックを削除） | PR #131 |
| `[x]` | Zoom 連携のローカル stub モード追加（`ZOOM_INTEGRATION_MODE=stub` で OAuth・会議作成をフェイク化） | PR #123 |

---

## Phase 6 — 顧客の会員化・ポリシー整備・運用ツール（2026-07）

> Phase 5 策定後に main へマージされた機能。ドメインルールを含むものは `doc/DDD_DESIGN.md` に反映済み。

| | タスク | 備考 |
|---|---|---|
| `[x]` | 顧客の会員化（Firebase 匿名認証 + Google 連携、`/register` とマイページ 7 画面、`User` 集約） | PR #114, #115, #118, #130 |
| `[x]` | 予約に会員登録と Zoom 連携を必須化（`CUSTOMER_NOT_SIGNED_UP` / `ZOOM_NOT_CONNECTED`） | `DDD_DESIGN.md` §2.1 |
| `[x]` | PayPay 即時決済（`paymentMethodType: 'card' \| 'paypay'`、`Payment.createImmediate()`） | `DDD_DESIGN.md` §8.4 |
| `[x]` | 占い師スケジュールカレンダー（予約 + 15分バッファ表示）、予約一覧に日時レンジと料金プランを表示 | PR #133, #134 |
| `[x]` | 表示名を「相談員」→「占い師」に変更 | PR #137 |
| `[x]` | 予約動線 ↔ マイページの回遊、クーポン取得導線 | PR #139, #141 |
| `[x]` | N+1 クエリの一括プリロード化 | PR #140 |
| `[x]` | **営業日 5:00 起点**の導入（日跨ぎ営業時間・24時間営業を許可。`packages/shared/src/business-hours.ts`） | PR #155 |
| `[x]` | マイページ予約一覧の時刻表示と終了済み予約の Zoom 参加制御 | PR #156 |
| `[x]` | ブランド名を「あなたのみらい予報 / 一般社団法人JKK」に統一 | PR #157 |
| `[x]` | 予約時の利用規約同意証跡（`agreedTermsVersion` + `agreedAt`）を永続化 | PR #158 |
| `[x]` | **18歳未満は親権者同意で受け入れるフロー**（`GUARDIAN_CONSENT_REQUIRED`） | PR #160 |
| `[x]` | TanStack Query キャッシュ戦略 4 フェーズ（基盤 / invalidate + loader / optimistic update / ETag）と suspense query 移行 | PR #161〜#168 |
| `[x]` | 利用規約・キャンセルポリシー・プライバシーポリシーのバージョン管理と再同意ゲート（`PolicyRevision` / `PolicyAgreement`） | PR #163, #170, #171, #174 / `DDD_DESIGN.md` §2.2 |
| `[x]` | Playwright による操作マニュアル PDF 生成ツール（consultant / console / user） | PR #169, #172, #177, #178 |
| `[x]` | マイページで電話番号を保存し予約フォームに初期表示 | PR #173 |
| `[x]` | 組織の切り替えを URL の組織 ID 基準に統一 | PR #175 |
| `[x]` | ブレイクアウトルームを予約単位に分割し、割当状況の確認画面を追加 | PR #179, #180 |
| `[x]` | ドキュメント全体監査で見つかったバグ 4 件を修正（キャンセルメール / `firestore.rules` / settings 監査フィールド / キャンセルリンク） | PR #201 |

---

## 実装メモ

### Claude Code への引き渡し方

ルートの `CLAUDE.md` が `AGENTS.md` を読み込み、Claude Code がセッション開始時に開発ルールを取得する。設計の詳細は `doc/DDD_DESIGN.md`、命名は `doc/NAMING_LEDGER.md` を参照させる。

`.agents/skills/` に scaffold 用のスキルが揃っているので、新規実装は基本そちらを使う（`new-api-endpoint` / `new-usecase` / `new-aggregate` / `new-page` など）。

### 必要な環境変数一覧

環境変数は二重管理を避けるため、本書には列挙しない。以下を正とする。

| 情報 | 参照先 |
|---|---|
| 必要な変数の一覧（API） | `apps/api/.env.example` |
| 必要な変数の一覧（SPA） | `apps/user/.env.example` / `apps/console/.env.example` / `apps/consultant/.env.example` |
| 値の取得・生成方法 | [環境変数の取得・生成方法](environment-variables.md) |
| 本番への登録手順 | [Secret Manager 運用手順](secret-manager.md) |
| Cloud Run / batch worker が参照するシークレット | `infra/terraform/gcp/common/firebase/main.tf` の `runtime_secret_ids` |

> 旧版（v1.0）はここに 9 変数の表を持っていたが、実際に必要な変数は約 25 個あり、`CANCEL_TOKEN_SECRET` / `ZOOM_OAUTH_STATE_SECRET` / `ZOOM_CREDENTIAL_ENCRYPTION_KEY` / `FIREBASE_*` / `CORS_ALLOWED_ORIGINS` / `*_APP_URL` などが漏れていたため、参照に置き換えた（2026-07-28）。
