# Arc - 未来予報 開発ロードマップ

> Version 1.0 | 2026-03-22 | PRD v0.5 + DDD設計 v1.0 対応

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
| `[ ]` | Next.js プロジェクト作成（`create-next-app`） | |
| `[ ]` | `DDD_DESIGN.md` を `CLAUDE.md` としてプロジェクトルートに配置 | |
| `[ ]` | 生成済みスケルトンを `src/` に配置（`domain` / `application` / `infrastructure`） | |
| `[ ]` | `tsconfig.json` にパスエイリアス追加（`@/domain/*` 等） | `Claude Code` |
| `[ ]` | `tsc --noEmit` で型エラーを全解消 | `Claude Code` |
| `[ ]` | 必要パッケージのインストール（`firebase-admin` / `stripe` / `resend` 等） | `Claude Code` |
| `[ ]` | Firebase / Stripe / Resend / Zoom の環境変数を `.env.local` に設定 | |
| `[ ]` | Biome の設定（`biome.json`） | `Claude Code` |
| `[ ]` | Vitest の設定（`vitest.config.ts`） | `Claude Code` |

---

## Phase 2 — コアフロー実装

> 予約 → 仮決済 → Zoom URL の一本道を通す

| | タスク | ツール |
|---|---|---|
| `[ ]` | Firestore Security Rules（`clients` / `bookings` / `slots` / `payments`） | |
| `[ ]` | `POST /api/bookings` — `CreateBookingUseCase` を API Route に繋ぐ | `Claude Code` |
| `[ ]` | `GET /api/consultants` — 相談員一覧エンドポイント | `Claude Code` |
| `[ ]` | `GET /api/slots` — 空き枠一覧エンドポイント | `Claude Code` |
| `[ ]` | クライアント向け 5 画面 UI 実装（相談員一覧 → 予約完了） | `Claude Code` |
| `[ ]` | Stripe Payment Element の組み込み（`/booking/payment`） | |
| `[ ]` | Stripe Webhook（`/api/webhooks/stripe`）署名検証・ステータス更新 | `Claude Code` |
| `[ ]` | `POST /api/bookings/[id]/cancel` — `CancelBookingUseCase` | `Claude Code` |
| `[ ]` | キャンセルリンクのトークン生成・検証（確認メール内リンク） | |
| `[ ]` | Vitest — ドメイン層ユニットテスト（`CancelDeadline` / `Booking` / `Slot` / `Money`） | `Claude Code` |

---

## Phase 3 — 管理系・相談員画面

> 内部オペレーションを整える

| | タスク | ツール |
|---|---|---|
| `[ ]` | Firebase Auth カスタムクレーム設定（`super_admin` / `operator` / `consultant`） | |
| `[ ]` | 相談員向け 4 画面（ログイン・予約一覧・メモ入力・プロフィール編集） | `Claude Code` |
| `[ ]` | 管理者 CRM 9 画面（ダッシュボード〜権限管理） | `Claude Code` |
| `[ ]` | `POST /api/bookings/[id]/capture` — 手動本決済 API | `Claude Code` |
| `[ ]` | `POST /api/batch/capture` — Cloud Scheduler 深夜 0 時バッチ + OIDC 認証 | `Claude Code` |
| `[ ]` | Firestore Security Rules 更新（`consultant` / `admin` ロール対応） | |
| `[ ]` | Vitest — Component テスト（予約フォーム・カレンダー等） | `Claude Code` |

---

## Phase 4 — 本番リリース準備

| | タスク | ツール |
|---|---|---|
| `[ ]` | Resend 独自ドメイン設定（SPF / DKIM / DMARC レコード追加・検証） | |
| `[ ]` | GCP prod 環境構築（Cloud Run + Secret Manager） | |
| `[ ]` | dev / prod 環境変数の分離確認 | |
| `[ ]` | GitHub Actions CI パイプライン（Lint・Format・Unit・Component・Build） | `Claude Code` |
| `[ ]` | Cloud Scheduler 有効化（prod 環境のみ） | |
| `[ ]` | Stripe 本番モード切り替え（`sk_live_...`） | |
| `[ ]` | インボイス登録番号を環境変数に設定 | |
| `[ ]` | 独自ドメイン + HTTPS 設定（Cloud Run） | |
| `[ ]` | 本番環境での動作確認（予約〜本決済の全フロー） | |

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
| `NEXT_PUBLIC_APP_URL` | アプリの公開 URL（キャンセルリンク生成用） |