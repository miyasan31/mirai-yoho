# 環境変数の取得・生成方法

`.env.example` に列挙されている環境変数のうち、値の入手方法が自明でないものの手順をまとめる。
本番環境への設定は [secret-manager.md](./secret-manager.md) の手順（Cloud Secret Manager 経由）に従うこと。

## 自分で生成するシークレット

外部サービスの発行物ではなく、ランダム値を生成して設定するもの。ローカル / 本番で別の値を生成する。

| 環境変数 | 生成コマンド | 用途 |
| --- | --- | --- |
| `CANCEL_TOKEN_SECRET` | `openssl rand -hex 32` | 予約キャンセルトークンの HMAC-SHA256 署名鍵（`src/infrastructure/token/cancel-token-service.ts`） |
| `ZOOM_OAUTH_STATE_SECRET` | `openssl rand -hex 32` | Zoom User OAuth の state パラメータの HMAC 署名鍵 |
| `ZOOM_CREDENTIAL_ENCRYPTION_KEY` | `openssl rand -base64 32` | ユーザーの Zoom トークンを AES-256-GCM で暗号化する鍵（`src/infrastructure/crypto/aes-gcm-token-cipher.ts`） |
| `COUPON_WEBHOOK_SECRET` | `openssl rand -hex 32` | クーポン付与 Webhook `POST /api/customer/coupons/receive` の認証用共有シークレット |

### 注意事項

- **`ZOOM_CREDENTIAL_ENCRYPTION_KEY` は「32 バイトの base64」形式が必須**。`openssl rand -base64 32`（44 文字の出力）をそのまま使う。hex 等で生成すると復号時に鍵長エラーになる
- **ローテーションの影響範囲**
  - `CANCEL_TOKEN_SECRET`: 変更すると発行済みのキャンセルトークン（メール送信済みのキャンセルリンク）がすべて無効になる
  - `ZOOM_CREDENTIAL_ENCRYPTION_KEY`: 変更すると保存済みの Zoom トークンが復号できなくなり、全ユーザーが Zoom 再連携になる
- `COUPON_WEBHOOK_SECRET` は Webhook の呼び出し元（外部システム）にも同じ値を設定する。リクエストの `X-Coupon-Webhook-Secret` ヘッダーと単純比較される

## Zoom

アプリタイプが異なるため、**2 つの Zoom アプリが必要**。1 つのアプリで両方のフローは兼ねられない。

### Server-to-Server OAuth アプリ（組織側のミーティング作成用）

アプリ名: `Mirai Yoho Server`（開発: `Mirai Yoho Server Dev`）

1. [Zoom App Marketplace](https://marketplace.zoom.us/) → Develop → Build App → **Server-to-Server OAuth**
2. App Credentials から以下を取得
   - `ZOOM_ACCOUNT_ID`
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`
3. `ZOOM_HOST_USER_ID` はミーティングのホストにする Zoom ユーザーの ID

### General App / User-managed（エンドユーザーの Zoom 連携用）

アプリ名: `Mirai Yoho`（開発: `Mirai Yoho Dev`）。ユーザーの同意画面に表示されるため、本番はサービス名そのままにする。

1. [Zoom App Marketplace](https://marketplace.zoom.us/) → Develop → Build App → **General App**（管理タイプは **User-managed**）
2. Basic Information → OAuth Redirect URL にコールバック URL を登録（OAuth Allow Lists にも同じ URL を追加）
   - ローカル: `http://127.0.0.1:3000/api/auth/zoom/callback`
     - Zoom は HTTPS 必須。ローカルテストの例外は `http://127.0.0.1` / `http://[::1]` のみで、`http://localhost` は登録できない
     - このため `.env.local` の `ZOOM_USER_OAUTH_REDIRECT_URI` も `127.0.0.1` で設定する（`API_URL` は `localhost` のままでよい。コールバック後は SPA（`USER_APP_URL` など）にリダイレクトで戻る）
   - 本番: `https://<本番ドメイン>/api/auth/zoom/callback`
3. Scopes に `user:read` を追加
4. App Credentials から以下を取得
   - `ZOOM_USER_OAUTH_CLIENT_ID`
   - `ZOOM_USER_OAUTH_CLIENT_SECRET`

`ZOOM_USER_OAUTH_REDIRECT_URI` は任意。未設定なら `API_URL + /api/auth/zoom/callback` が使われる（ローカルは `API_URL` が `localhost` のため、上記の理由で明示設定が必要）。いずれの場合も Zoom アプリ側に登録した Redirect URL と完全一致していないと認可エラー（4700: 無効なリダイレクト）になる。

## その他の外部サービス

| 環境変数 | 取得元 |
| --- | --- |
| `STRIPE_SECRET_KEY`（API）/ `VITE_STRIPE_PUBLISHABLE_KEY`（apps/user のビルド時に注入） | [Stripe Dashboard](https://dashboard.stripe.com/) → 開発者 → API キー |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhook エンドポイント作成時に発行（ローカルは `stripe listen` の出力） |
| `RESEND_API_KEY` | [Resend](https://resend.com/) → API Keys |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Console → プロジェクトの設定 → サービスアカウント → 新しい秘密鍵の生成（JSON 内の値） |
| `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID`（console / consultant SPA のビルド時に注入） | Firebase Console → プロジェクトの設定 → 全般 → ウェブアプリの構成 |
| `LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL` | LINE WORKS の受信 Webhook（Incoming Webhook）作成時に発行される URL |
