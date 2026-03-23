---
name: new-aggregate
description: DDD の新しい集約（domain エンティティ、値オブジェクト、Repository Interface、Firestore 実装）を scaffold する
user_invocable: true
args: "<aggregate_name>"
---

# 新しい集約の作成

指定された名前で DDD の集約一式を scaffold してください。

## 引数

- `aggregate_name`: 集約名（例: `notification`, `review`）。kebab-case で指定される。

## 作成するファイル

以下のファイルを `src/domain/<aggregate_name>/` と `src/infrastructure/firestore/` に作成してください。

### 1. 集約ルートエンティティ: `src/domain/<name>/<name>.ts`

既存の `src/domain/booking/booking.ts` のパターンに従う:
- `AggregateRoot` を継承する
- `private constructor` + `static create()` + `static reconstruct()` パターン
- ビジネスロジックメソッド
- getter メソッド

### 2. Repository Interface: `src/domain/<name>/i<Name>Repository.ts`

既存の `src/domain/booking/iBookingRepository.ts` のパターンに従う:
- `findById` と `save` メソッドを持つ interface

### 3. Firestore Repository 実装: `src/infrastructure/firestore/firestore<Name>Repository.ts`

既存の `src/infrastructure/firestore/firestoreBookingRepository.ts` のパターンに従う:
- Repository Interface を implements する
- メソッドは `throw new Error("Not implemented")` でスタブにする

## ルール

- ファイル名は kebab-case（例: `notification.ts`, `i-notification-repository.ts`）
- Repository Interface のファイル名は先頭に `i-` を付ける（例: `i-notification-repository.ts`）
- Repository Interface の export 名は先頭に `I` を付ける（例: `INotificationRepository`）
- domain 層には firebase-admin や stripe などの外部依存を import しない
- import パスは `@/domain/...` のエイリアスを使用する
- 集約ルートは必ず `@/domain/shared/aggregateRoot` の `AggregateRoot` を継承する
- ユーザーにどのような値オブジェクトやビジネスルールが必要か確認してから作成する
