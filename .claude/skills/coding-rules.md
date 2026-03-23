---
name: coding-rules
description: コーディングルールガイド — 関数の書き方、SOLID 原則、関数型パターンなどアーキテクチャ原則に基づいてコードを書く・レビューする
user_invocable: true
args: "[check]"
---

# コーディングルールガイド

このプロジェクトのコーディングルールに従ってコードを書く、またはレビューしてください。
引数に `check` が指定された場合は、既存コードのルール違反を検出・報告する。

## 1. 関数の書き方

### 関数宣言

```typescript
// 名前付き関数（export する場合）
export function calculateTotal(items: CartItem[]): Money {
  // ...
}

// アロー関数（コールバック、短い処理）
const isExpired = (deadline: Date): boolean => deadline < new Date();

// コンポーネント（function 宣言）
export function BookingCard({ booking }: BookingCardProps) {
  return <div>...</div>;
}
```

- export する関数・コンポーネントは `function` 宣言を使う
- コールバックや短い処理はアロー関数を使う
- `forwardRef` の第2引数には名前付き関数を使う: `forwardRef(function Name(props, ref) { })`

### 引数

```typescript
// 引数が3つ以上ならオブジェクトにまとめる
// NG
function createBooking(clientId: string, slotId: string, content: string, memo: string) {}

// OK
function createBooking(params: CreateBookingParams) {}
```

### 戻り値

```typescript
// 複雑な戻り値は型を明示する
function parseDate(input: string): Result<Date, ParseError> {}

// 単純な場合は推論に任せる
function getName() {
  return this.name;
}
```

## 2. SOLID 原則の適用

### S — 単一責任

```typescript
// NG: UseCase がメール送信の詳細まで知っている
class CreateBookingUseCase {
  async execute(input) {
    // ...booking 作成ロジック
    // ...メールテンプレートの組み立て ← 責務外
    // ...SMTP 送信 ← 責務外
  }
}

// OK: メール送信は IEmailService に委譲
class CreateBookingUseCase {
  constructor(private readonly emailService: IEmailService) {}
  async execute(input) {
    // ...booking 作成ロジック
    await this.emailService.sendBookingConfirmation(params);
  }
}
```

### O — 開放閉鎖

- 新しい支払い方法を追加するとき、既存の UseCase を変更せず新しい Service を追加する
- バリアント追加はレシピの `variants` に追加するだけ

### L — リスコフの置換

- Repository Interface を implements する具体クラスは、インターフェースの契約を完全に満たす
- `Firestore<Name>Repository` は `I<Name>Repository` と完全に互換

### I — インターフェース分離

```typescript
// OK: 用途ごとにインターフェースを分ける
interface IEmailService {
  sendBookingConfirmation(params: ...): Promise<void>;
  sendBookingCancellation(params: ...): Promise<void>;
}
interface IStripeService {
  createPaymentIntent(params: ...): Promise<...>;
  capturePaymentIntent(id: string): Promise<void>;
}
```

### D — 依存性逆転

```typescript
// domain 層: インターフェースを定義
// src/domain/booking/booking-repository.ts
export interface IBookingRepository { ... }

// infrastructure 層: 具体実装
// src/infrastructure/firestore/firestoreBookingRepository.ts
export class FirestoreBookingRepository implements IBookingRepository { ... }

// application 層: インターフェースに依存（具体実装を知らない）
export class CreateBookingUseCase {
  constructor(private readonly bookingRepository: IBookingRepository) {}
}
```

## 3. 関数型パターン

### 不変性を優先する

```typescript
// NG: 配列を直接変更
items.push(newItem);

// OK: 新しい配列を返す
const updatedItems = [...items, newItem];

// 値オブジェクトは不変
class Money {
  private constructor(private readonly amount: number) {}
  add(other: Money): Money {
    return new Money(this.amount + other.amount); // 新しいインスタンスを返す
  }
}
```

### 純粋関数を好む

```typescript
// NG: 外部状態に依存
function getDiscount() {
  return globalConfig.discountRate * price;
}

// OK: 引数から計算
function getDiscount(price: number, rate: number): number {
  return rate * price;
}
```

### 副作用を端に追いやる

- 副作用（DB 操作、API 呼び出し、メール送信）は UseCase の端で行う
- domain 層のロジックは純粋に保つ（ドメインイベントで副作用を遅延させる）

## 4. TypeScript 固有のルール

```typescript
// type を使う（interface は外部公開 API やクラス実装にのみ使う）
type BookingCardProps = {
  booking: Booking;
  onCancel: () => void;
};

// any 禁止。unknown + 型ガードを使う
function parse(input: unknown): Booking {
  if (!isBookingData(input)) throw new Error("Invalid data");
  return Booking.reconstruct(input);
}

// as キャストは最小限。型ガードを優先
// NG
const booking = data as Booking;
// OK
if (data instanceof Booking) { ... }

// Enum は使わない。Union 型 + const を使う
type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
```

## 5. エラーハンドリング

```typescript
// domain 層: DomainError を使う
throw new DomainError("INVALID_STATUS_TRANSITION", "Only pending bookings can be confirmed");

// application 層: domain のエラーはそのまま伝播させる
// infrastructure 層: 外部サービスのエラーをラップする
```

## check モード

引数に `check` が指定された場合:

1. `src/` 配下の全 `.ts` / `.tsx` ファイルをスキャンする
2. 上記ルールへの違反を検出する
3. 違反箇所をファイル名・行番号付きで報告する
4. 修正案を提示する
