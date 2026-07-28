# manual

Playwright で SPA を自動巡回してスクショ + 注釈 + 説明つきの PDF マニュアルを生成するツールです。

対象アプリごとに `apps/<appId>.ts` を追加すれば `consultant` / `console` / `user` の任意の SPA に対応できます。デザイン・文言・セクション構造は `src/template.ts` に集約しており、アプリをまたいで一貫した見た目になります。

## 使い方

初回のみ Playwright の Chromium をインストール:

```bash
pnpm --filter manual exec playwright install chromium
```

すべてのサブコマンドは `<appId> [env]` を受けます。`env` を省略すると `apps/<appId>.ts` の `defaultEnv`（通常は `local`）が使われます。

### local 環境（開発サーバー）

対象 SPA を起動しておく:

```bash
pnpm dev:consultant
```

1. **手動ログイン**（初回のみ、または env 別に一度）

   ```bash
   pnpm --filter manual login consultant
   ```

   ブラウザが開くので手動でログイン。組織 ID は URL から自動検知し `.work/consultant/local/state.json` に保存されます。ブラウザプロファイルは `.work/consultant/local/profile/` に永続化。

2. **キャプチャ + PDF**

   ```bash
   pnpm --filter manual build consultant
   ```

   `doc/manual/consultant-manual.pdf` に出力されます。

### dev / prod 環境

第 2 引数で環境を切り替えられます。`.work/consultant/dev/` のように env ごとに独立した作業ディレクトリを使うので、local と dev のセッションが混在しません。

```bash
# dev consultant にログイン
pnpm --filter manual login consultant dev

# dev consultant のマニュアル生成
pnpm --filter manual build consultant dev
# → doc/manual/consultant-manual-dev.pdf
```

### 組織 ID の指定

優先順位（高い順）:

1. `MANUAL_ORG_ID` 環境変数
2. `state.json` の `organizationId`（ログイン時に自動保存）
3. `apps/<appId>.ts` の `environments[env].defaultOrgId`（未設定なら null）

例:

```bash
MANUAL_ORG_ID=abc123 pnpm --filter manual capture consultant dev
```

`defaultOrgId` を config に `process.env.CONSULTANT_DEV_ORG_ID` として書いてあるので、恒常的に使う値なら shell の rc やチームで共有する環境変数管理に入れると便利です。

## サブコマンド

- `login <appId> [env]` … 手動ログイン用 headed ブラウザを起動、セッションを永続化
- `capture <appId> [env]` … 各画面を巡回してスクショと注釈座標を取得
- `render <appId> [env]` … capture 結果から HTML → PDF を生成
- `build <appId> [env]` … capture → render をまとめて実行
- `preview <appId>` … スクショ無しでレイアウトだけ検査する。ログインも SPA の起動も不要

`preview` は config の文言をプレースホルダ画像に載せて HTML を組み、A4 1 ページ（265mm）に
収まらない画面があれば id と実高さを出して異常終了します。config を編集したら実行してください。

```bash
pnpm --filter manual preview console
```

## ブラウザチャネルの切り替え

Playwright 同梱の Chromium は Google の OAuth 画面で「安全でないブラウザ」として弾かれることがあります。その場合は `MANUAL_BROWSER_CHANNEL` にインストール済みブラウザのチャネルを指定します。`login` と `capture` で同じ値を使ってください（プロファイルを共有するため）。

```bash
MANUAL_BROWSER_CHANNEL=chrome pnpm --filter manual login user dev
MANUAL_BROWSER_CHANNEL=chrome pnpm --filter manual build user dev
```

## user（予約サイト）固有の注意

エンドユーザー向けの `user` は他の 2 アプリと前提が違います。

**組織 ID が必須** … ログイン後の遷移先が `/mypage` で組織 ID を含まないため、URL からの自動抽出ができません。`MANUAL_ORG_ID` か `USER_LOCAL_ORG_ID` / `USER_DEV_ORG_ID` / `USER_PROD_ORG_ID` で必ず指定してください。未指定だと組織配下の画面がすべてスキップされます。

**撮影用アカウントの事前準備** … 予約フォームは会員情報の登録と Zoom 連携が済んでいないと表示されません。またプロフィールに登録した氏名・メール・電話番号は予約フォームに初期表示され PDF に写るため、実在の個人情報ではなくダミー値を登録したアカウントを使ってください。

**ダミー予約の作成** … お支払い画面は実在の予約がないと描画できないため、`capture` は予約フォームを実際に送信して予約を 1 件作成します。Zoom ミーティングの生成と確認メール送信を伴う実操作です。

- local / dev … 既定で作成する。`MANUAL_CREATE_BOOKING=0` で無効化できる
- prod … 既定では作成しない。`MANUAL_CREATE_BOOKING=1` を明示したときだけ作成する
- 作成をスキップした場合、お支払い画面だけが撮影対象から外れる（予約完了・キャンセル画面はダミー ID で描画される）
- 予約フォームに流し込む値は `MANUAL_BOOKING_NAME` / `MANUAL_BOOKING_EMAIL` / `MANUAL_BOOKING_PHONE` / `MANUAL_BOOKING_BIRTH_DATE` で上書きできる
- 作成した予約は撮影後に運営コンソールから片付ける

```bash
pnpm dev:user
MANUAL_ORG_ID=<組織ID> pnpm --filter manual login user
MANUAL_ORG_ID=<組織ID> pnpm --filter manual build user
# → doc/manual/user-manual.pdf
```

## サービス間の関連性

各画面には「その操作が下流サービスのどこに届くか」を `relations` として書けます。PDF では注釈欄の下に
「関連する動き」として出力されます。`AppConfig.serviceMap` を定義すると、目次の直後に
「サービス連携の全体像」ページが 1 枚挿入されます。

書ける向きは `console → consultant` / `console → user` / `consultant → user` の一方向だけです。
下流から上流を指す記述と、予約サイト（`user`）の config での他サービスへの言及は
`src/validate-config.ts` が `capture` / `render` の起動時にエラーで止めます。

## モーダルの撮影

ダイアログでしか開けない機能は、`PageDef` に `setup`（スクショ前の操作）と
`captureMode: "viewport"` を指定して独立した画面として撮ります。`setup` が失敗した画面は
警告を出してスキップされるので、データ依存でトリガーが出ない場合も他の画面には影響しません。

## 新しいアプリを追加する

`apps/<appId>.ts` を作成し `AppConfig` を default export してください。`create-manual` スキル（`.agents/skills/create-manual/`。`.claude/skills` はここへの symlink）に文言・注釈設計の指針があります。
