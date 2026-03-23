---
name: new-usecase
description: application 層に新しい UseCase を scaffold する
user_invocable: true
args: "<usecase_name> <aggregate_name>"
---

# 新しい UseCase の作成

指定された名前で application 層に UseCase を scaffold してください。

## 引数

- `usecase_name`: UseCase 名（例: `cancelBooking`, `createNotification`）
- `aggregate_name`: 所属する集約名（例: `booking`, `notification`）

## 作成するファイル

### `src/application/<aggregate_name>/<usecase_name>UseCase.ts`

既存の `src/application/booking/create-booking-use-case.ts` のパターンに従う:

```typescript
interface <UseCaseName>Input {
  // ユーザーに確認して決定
}

interface <UseCaseName>Output {
  // ユーザーに確認して決定
}

export class <UseCaseName>UseCase {
  constructor(
    // 必要な Repository や Service を DI
  ) {}

  async execute(input: <UseCaseName>Input): Promise<<UseCaseName>Output> {
    // ユースケースのロジック
    throw new Error("Not implemented");
  }
}
```

## ルール

- ファイル名は kebab-case（例: `cancel-booking-use-case.ts`）
- クラス名は PascalCase + `UseCase` サフィックス
- Repository や Service は constructor で DI する（interface 型を使用）
- domain 層のエンティティや値オブジェクトを使ってビジネスロジックを組み立てる
- 集約をまたぐ処理は UseCase が責任を持つ
- Input / Output の型を interface で定義する
- ユーザーにどのような処理フローが必要か確認してから作成する
