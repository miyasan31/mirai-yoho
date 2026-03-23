doc/ROADMAP.md のチェックボックスを、プロジェクトの現在の状態に基づいて更新してください。

## 手順

1. `doc/ROADMAP.md` を読む
2. 各タスクについて、以下の方法で完了しているか判定する:
   - ファイルやディレクトリの存在確認（`ls`, `glob`）
   - 設定ファイルの内容確認（`read`）
   - コマンド実行による確認（`tsc --noEmit`, `pnpm generate` 等）
3. 完了しているタスクは `[x]`、未完了は `[ ]` に更新する
4. 変更があった場合のみファイルを編集する
5. 変更内容のサマリーを出力する

## 判定基準の例

- 「Next.js プロジェクト作成」→ `package.json` に `next` があるか
- 「tsconfig.json にパスエイリアス追加」→ `paths` に `@/*` があるか
- 「tsc --noEmit で型エラーを全解消」→ `tsc --noEmit` がエラー 0 で終了するか
- 「Biome の設定」→ `biome.json` が存在するか
- 「Vitest の設定」→ `vitest.config.ts` が存在するか
- 「環境変数を .env.local に設定」→ `.env.local` が存在し、必要な変数が設定されているか
- API Route 系 → `src/app/api/` 配下に対応する `route.ts` が存在するか
- UI 実装系 → 対応するページコンポーネントが存在するか
