import {
  createBatchChargeUseCase,
  createNotifyLateConsultantArrivalUseCase,
  createSendConsultationReminderUseCase,
} from "@/infrastructure/container";

export const batchWorkerCommands = [
  "charge",
  "consultation-reminders",
  "late-arrival-alerts",
] as const;

export type BatchWorkerCommand = (typeof batchWorkerCommands)[number];

type BatchWorkerInput = {
  command: BatchWorkerCommand;
  organizationId: string;
};

type BatchWorkerDependencies = {
  createBatchChargeUseCase: () => {
    execute: (organizationId: string) => Promise<unknown>;
  };
  createNotifyLateConsultantArrivalUseCase: () => {
    execute: (input: { organizationId: string; now: Date }) => Promise<unknown>;
  };
  createSendConsultationReminderUseCase: () => {
    execute: (organizationId: string) => Promise<unknown>;
  };
};

const defaultDependencies: BatchWorkerDependencies = {
  createBatchChargeUseCase,
  createNotifyLateConsultantArrivalUseCase,
  createSendConsultationReminderUseCase,
};

function isBatchWorkerCommand(value: string): value is BatchWorkerCommand {
  return batchWorkerCommands.includes(value as BatchWorkerCommand);
}

export function parseBatchWorkerInput(args: string[]): BatchWorkerInput {
  const [command, ...options] = args;
  if (!command || !isBatchWorkerCommand(command)) {
    throw new Error(
      `Unknown batch command: ${command ?? "(missing)"}. Expected one of: ${batchWorkerCommands.join(", ")}`,
    );
  }

  if (
    options.length !== 2 ||
    options[0] !== "--organization-id" ||
    !options[1]
  ) {
    throw new Error("Usage: <command> --organization-id <organization-id>");
  }

  return { command, organizationId: options[1] };
}

export async function runBatchWorker(
  args: string[],
  dependencies: BatchWorkerDependencies = defaultDependencies,
): Promise<void> {
  const input = parseBatchWorkerInput(args);
  const startedAt = new Date();

  const result = await executeBatchWorker(input, dependencies, startedAt);
  console.info("Batch worker completed", {
    batchType: input.command,
    organizationId: input.organizationId,
    startedAt: startedAt.toISOString(),
    result,
  });
}

async function executeBatchWorker(
  input: BatchWorkerInput,
  dependencies: BatchWorkerDependencies,
  now: Date,
) {
  switch (input.command) {
    case "charge":
      return dependencies
        .createBatchChargeUseCase()
        .execute(input.organizationId);
    case "consultation-reminders":
      return dependencies
        .createSendConsultationReminderUseCase()
        .execute(input.organizationId);
    case "late-arrival-alerts":
      return dependencies.createNotifyLateConsultantArrivalUseCase().execute({
        organizationId: input.organizationId,
        now,
      });
  }
}
