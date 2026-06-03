---
name: new-infrastructure
description: infrastructure 層のサービス実装（Firestore Repository / Stripe / Zoom / Resend）を scaffold する
user_invocable: true
args: "<type> <name>"
---

# Infrastructure 層の実装作成

infrastructure 層の具体実装を scaffold してください。

## 引数

- `type`: 実装の種類（`firestore` | `stripe` | `zoom` | `resend` | `custom`）
- `name`: リソース名（例: `notification`, `invoice`）

## 作成パターン

### 1. Firestore Repository: `src/infrastructure/firestore/firestore<Name>Repository.ts`

domain 層の Repository Interface を実装する。

```typescript
import type { <Name> } from "@/domain/<name>/<name>";
import type { I<Name>Repository } from "@/domain/<name>/<name>-repository";

export class Firestore<Name>Repository implements I<Name>Repository {
  async findById(<name>Id: string): Promise<<Name> | null> {
    throw new Error("Not implemented");
  }

  async save(<name>: <Name>): Promise<void> {
    throw new Error("Not implemented");
  }
}
```

- `firebase-admin` の import は infrastructure 層でのみ許可
- `<Name>.reconstruct()` を使って Firestore ドキュメントをドメインオブジェクトに変換する
- `getter` メソッドでドメインオブジェクトから Firestore ドキュメントに変換する

### 2. 外部サービス: `src/infrastructure/<service>/<name>Service.ts`

application 層の Service Interface を実装する。

```typescript
import type { I<Name>Service } from "@/application/shared/<name>-service";

export class <Impl><Name>Service implements I<Name>Service {
  async someMethod(params: SomeParams): Promise<SomeResult> {
    throw new Error("Not implemented");
  }
}
```

### 対応サービス別パターン

**Stripe（決済）:**
```typescript
import Stripe from "stripe";
import type { IStripeService } from "@/application/shared/iStripeService";

export class StripeService implements IStripeService {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // createPaymentIntent, cancelPaymentIntent, capturePaymentIntent
}
```

**Resend（メール）:**
```typescript
import { Resend } from "resend";
import type { IEmailService } from "@/application/shared/iEmailService";

export class ResendEmailService implements IEmailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY!);
  // sendBookingConfirmation, sendBookingCancellation, sendPaymentReceipt
}
```

**Zoom（ビデオ会議）:**
```typescript
import type { IZoomService } from "@/application/shared/iZoomService";

export class ZoomService implements IZoomService {
  // createMeetingUrl
}
```

## 新しい外部サービスを追加する場合

1. まず application 層にインターフェースを作成: `src/application/shared/<name>-service.ts`
2. 次に infrastructure 層に実装を作成: `src/infrastructure/<service>/<name>Service.ts`

## ルール

- domain 層のコードは絶対に変更しない
- 外部ライブラリ（firebase-admin, stripe, resend 等）は infrastructure 層でのみ import する
- application 層で定義した interface を implements する
- 環境変数は `process.env` で直接参照する
- ファイル名は kebab-case
- 新規サービスの場合はまず interface から作成する
- ユーザーに実装する具体的なメソッドを確認してから作成する
