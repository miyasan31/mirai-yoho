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

## 新しいアプリを追加する

`apps/<appId>.ts` を作成し `AppConfig` を default export してください。`create-manual` スキル（`.claude/skills/create-manual/`）に文言・注釈設計の指針があります。
