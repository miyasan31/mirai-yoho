---
name: new-event
description: ドメインイベントを scaffold する（イベントクラス + 集約への組み込み）
user_invocable: true
args: "<event_name> <aggregate_name>"
---

# ドメインイベントの作成

新しいドメインイベントを scaffold してください。

## 引数

- `event_name`: イベント名（例: `BookingCompleted`, `PaymentRefunded`）
- `aggregate_name`: 所属する集約名（例: `booking`, `payment`）

## 作成・更新するファイル

### 1. イベントクラス: `src/domain/<aggregate>/<aggregate>Events.ts`

既存ファイルがあれば追記、なければ新規作成する。

```typescript
import type { DomainEvent } from "@/domain/shared/domainEvent";

interface <EventName>Payload {
  <aggregateName>Id: string;
  // イベント固有のデータ
}

export class <EventName>Event implements DomainEvent {
  readonly eventName = "<EventName>";
  readonly occurredAt: Date;
  readonly payload: <EventName>Payload;

  private constructor(payload: <EventName>Payload, occurredAt: Date) {
    this.payload = payload;
    this.occurredAt = occurredAt;
  }

  static create(payload: <EventName>Payload): <EventName>Event {
    return new <EventName>Event(payload, new Date());
  }
}
```

### 2. 集約への組み込み

集約ルートの該当メソッド内で `this.addDomainEvent()` を呼び出す。

```typescript
// 集約のメソッド内
this.addDomainEvent(
  <EventName>Event.create({
    <aggregateName>Id: this.<aggregateName>Id,
    // payload
  }),
);
```

### 3. UseCase でのイベント処理

UseCase 内で `aggregate.pullDomainEvents()` してイベントを処理する。

```typescript
const events = aggregate.pullDomainEvents();
for (const event of events) {
  if (event.eventName === "<EventName>") {
    const e = event as <EventName>Event;
    // メール送信、外部連携などの副作用
  }
}
```

## ルール

- イベントクラスは `DomainEvent` インターフェースを implements する
- `private constructor` + `static create()` ファクトリパターンを使う
- `eventName` は readonly リテラル型にする
- payload は不変（readonly）にする
- domain 層に外部依存を持ち込まない
- イベントの副作用処理（メール送信等）は application 層の UseCase で行う
- ファイル名は `<aggregate>-events.ts`（複数のイベントを1ファイルにまとめる）
- ユーザーに payload のフィールドを確認してから作成する
