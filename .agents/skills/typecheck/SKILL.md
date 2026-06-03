---
name: typecheck
description: TypeScript の型チェックを実行する
user_invocable: true
---

# TypeScript 型チェック

TypeScript の型チェックを実行してください。

## 手順

1. `pnpm exec tsc --noEmit` を実行する
2. エラーがあれば内容を分析し、修正案を提示する
3. ユーザーが修正を希望した場合は修正を行い、再度型チェックを実行して確認する

## 注意事項

- `tsconfig.json` の設定に従うこと
- パスエイリアス `@/*` → `./src/*` が設定されている
- `any` 型の使用はプロジェクトルールで禁止されている
