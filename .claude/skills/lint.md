---
name: lint
description: Biome で lint + format を実行し、エラーがあれば自動修正する
user_invocable: true
---

# Lint & Format

Biome を使ってコードの lint と format を実行してください。

## 手順

1. まず `pnpm lint` を実行して lint エラーを確認する
2. エラーがあれば `pnpm format` を実行して自動修正する
3. 自動修正できないエラーがあれば、内容を報告してユーザーに対処方法を提案する
4. 修正後、再度 `pnpm lint` を実行して問題が解消されたことを確認する

## 注意事項

- `biome.json` の設定に従うこと
- organize imports も含まれている
- 修正した内容を簡潔に報告すること
