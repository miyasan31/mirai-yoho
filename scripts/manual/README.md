# manual

Playwright で SPA を自動巡回してスクショ + 注釈 + 説明つきの PDF マニュアルを生成するツールです。

対象アプリごとに `apps/<appId>.ts` を追加すれば `consultant` / `console` / `user` の任意の SPA に対応できます。デザイン・文言・セクション構造は `src/template.ts` に集約しており、アプリをまたいで一貫した見た目になります。

## 使い方

初回のみ Playwright の Chromium をインストール:

```bash
pnpm --filter manual exec playwright install chromium
```

対象 SPA を起動（例: consultant）:

```bash
pnpm dev:consultant
```

1. **手動ログイン**（初回のみ）

   ```bash
   pnpm --filter manual login consultant
   ```

   ブラウザが開くので手動でログイン。ログイン検知に成功すると `state.json` に組織 ID などが保存され、ブラウザプロファイルは `.work/consultant/profile/` に永続化されます。

2. **キャプチャ**

   ```bash
   pnpm --filter manual capture consultant
   ```

   `apps/consultant.ts` の `sections` に沿って各画面を巡回・撮影し、注釈用のバウンディングボックスを取得します。結果は `.work/consultant/output/capture.json`。

3. **PDF レンダリング**

   ```bash
   pnpm --filter manual render consultant
   ```

   `doc/manual/consultant-manual.pdf` に出力されます。

キャプチャ + レンダリングをまとめて実行:

```bash
pnpm --filter manual build consultant
```

## 新しいアプリを追加する

`apps/<appId>.ts` を作成し `AppConfig` を default export してください。`create-manual` スキル（`.claude/skills/create-manual/`）に文言・注釈設計の指針があります。
