---
name: review-architecture
description: DDD アーキテクチャのルール違反を検出する（domain 層の外部依存、集約境界の侵害、any 型）
user_invocable: true
---

# アーキテクチャレビュー

プロジェクトの DDD アーキテクチャルールへの準拠を検証してください。

## チェック項目

### 1. domain 層の外部依存チェック

`src/domain/` 配下のファイルで以下の import がないことを確認する:
- `firebase`, `firebase-admin`
- `stripe`, `@stripe/stripe-js`
- `resend`
- `next`, `react`（型定義を除く）
- その他の infrastructure 層のモジュール

```
Grep で src/domain/ 配下を検索する
```

### 2. 依存方向の検証

以下の違反がないことを確認する:
- `src/domain/` → `src/infrastructure/` への import（禁止）
- `src/domain/` → `src/application/` への import（禁止）
- `src/domain/` → `src/app/` への import（禁止）

### 3. any 型の使用チェック

`src/` 配下の全 `.ts`, `.tsx` ファイルで `: any`, `as any`, `<any>` の使用がないことを確認する。

### 4. 集約境界の侵害チェック

- 各集約の内部メンバー（private プロパティ）が外部から直接アクセスされていないか確認
- 集約をまたぐ操作が UseCase を経由しているか確認

### 5. 命名規則チェック

- ファイル名が kebab-case であること
- Repository Interface のファイル名が `i-` プレフィックスを持つこと

## 出力形式

レビュー結果を以下の形式で報告する:

- **違反あり**: 違反箇所とその修正案を具体的に提示
- **違反なし**: 「アーキテクチャルール違反は検出されませんでした」と報告

重要度順（高→低）:
1. domain 層の外部依存（最も重要）
2. 依存方向の違反
3. any 型の使用
4. 集約境界の侵害
5. 命名規則
