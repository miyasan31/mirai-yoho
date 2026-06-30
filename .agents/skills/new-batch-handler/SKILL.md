---
name: new-batch-handler
description: batch worker（src/worker/batch-worker.ts）に新しいコマンドハンドラを追加する。UseCase ファクトリ、コマンド enum、switch case、テストまで一式編集する
user_invocable: true
args: "<command_name> <usecase_name>"
---

# Batch Worker ハンドラの追加

`src/worker/batch-worker.ts` のディスパッチに新しいコマンドを追加してください。Cloud Run / Cloud Scheduler から `node dist/worker/main.js <command> --organization-id <id>` の形で呼ばれる定期実行ジョブ用の口です。

## 引数

- `command_name`: kebab-case のコマンド名（例: `expire-bookings`, `dispatch-invoices`）。CLI で渡される文字列にそのまま使う
- `usecase_name`: 対応する UseCase クラス名（例: `ExpireBookingsUseCase`）。先に `/new-usecase` で雛形を作っておくこと

## 編集するファイル

### 1. `src/infrastructure/container.ts`

UseCase ファクトリを追加する。既存の `createBatchChargeUseCase` / `createSendConsultationReminderUseCase` / `createNotifyLateConsultantArrivalUseCase` に倣う。

```typescript
import { <UsecaseName> } from "@/application/<aggregate>/<usecase-name>";

export function create<UsecaseName>() {
  return new <UsecaseName>(
    // 必要な Repository / Service を new で渡す
  );
}
```

### 2. `src/worker/batch-worker.ts`

3 か所を編集する。

**(a) `batchWorkerCommands` に追加:**

```typescript
export const batchWorkerCommands = [
  "charge",
  "consultation-reminders",
  "late-arrival-alerts",
  "<command-name>", // ← 追加
] as const;
```

**(b) `BatchWorkerDependencies` 型と `defaultDependencies` に追加:**

```typescript
type BatchWorkerDependencies = {
  // 既存...
  create<UsecaseName>: () => {
    execute: (organizationId: string) => Promise<unknown>;
    // もし `now: Date` も渡すなら:
    // execute: (input: { organizationId: string; now: Date }) => Promise<unknown>;
  };
};

const defaultDependencies: BatchWorkerDependencies = {
  // 既存...
  create<UsecaseName>,
};
```

`@/infrastructure/container` の import 行にも `create<UsecaseName>` を足す。

**(c) `executeBatchWorker` の switch に case を追加:**

```typescript
switch (input.command) {
  // 既存...
  case "<command-name>":
    return dependencies.create<UsecaseName>().execute(input.organizationId);
}
```

引数に現在時刻が必要なときは `late-arrival-alerts` ケースと同じ形にする:

```typescript
case "<command-name>":
  return dependencies.create<UsecaseName>().execute({
    organizationId: input.organizationId,
    now, // executeBatchWorker の第 3 引数で受け取っている
  });
```

### 3. `src/worker/batch-worker.test.ts`

3 つのテストを追加する。

**(a) `createDependencies` に新しいモックを追加:**

```typescript
function createDependencies() {
  return {
    // 既存...
    create<UsecaseName>: vi.fn(() => ({
      execute: vi.fn().mockResolvedValue({}),
    })),
  };
}
```

**(b) `runBatchWorker` テストに正常系を追加:**

```typescript
it("runs <command-name> use case once", async () => {
  const dependencies = createDependencies();
  await runBatchWorker(
    ["<command-name>", "--organization-id", "org-1"],
    dependencies,
  );
  const useCase = dependencies.create<UsecaseName>.mock.results[0].value;
  expect(useCase.execute).toHaveBeenCalledWith("org-1");
});
```

### 4. Cloud Scheduler / Terraform（必要に応じて）

このコマンドを定期実行したいなら `infra/terraform/` 配下の Cloud Scheduler 定義も更新する。`doc/cloud-scheduler.md` を参照。スキルでは触らず、ユーザーに「定期実行する？」と確認するだけにする。

## ルール

- コマンド名は kebab-case、英語、動詞起点（`expire-bookings`, `dispatch-invoices`）
- UseCase の `execute()` シグネチャは「`organizationId: string` を受ける」もしくは「`{ organizationId, now }` を受ける」のどちらかに揃える。任意の input を増やしたいときは事前にユーザーに相談する
- worker は domain / application を通すだけのシンプルな口に保つ。ロジックは UseCase 側に書く
- `runBatchWorker` の `now = new Date()` を活かしたいときは `execute({ organizationId, now })` 形を選ぶ（テスト時間固定のため）
- container のファクトリは `new` で依存を組むだけ。ロジックを足さない
- 追加後、必ず `pnpm test src/worker` を案内する
- ユーザーに「Cloud Scheduler 登録するか」「now を渡す必要があるか」を確認する
