---
name: test
description: Vitest でテストを実行する。引数でファイルやパターンを指定可能
user_invocable: true
args: "[file_or_pattern]"
---

# テスト実行

Vitest を使ってテストを実行してください。

## 手順

1. 引数が指定されている場合はそのファイル/パターンのテストのみ実行する
   - `pnpm exec vitest run <file_or_pattern>`
2. 引数がない場合は全テストを実行する
   - `pnpm exec vitest run`
3. テスト結果を報告する
4. 失敗したテストがあれば原因を分析し、修正案を提示する

## 注意事項

- watch モードではなく `run` で1回だけ実行すること
- domain 層のテストは外部依存なしで実行可能
- application 層のテストではモックが必要になる場合がある
