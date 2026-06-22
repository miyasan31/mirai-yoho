import { describe, expect, it, vi } from "vitest";
import { parseBatchWorkerInput, runBatchWorker } from "./batch-worker";

function createDependencies() {
  return {
    createBatchChargeUseCase: vi.fn(() => ({
      execute: vi.fn().mockResolvedValue({}),
    })),
    createNotifyLateConsultantArrivalUseCase: vi.fn(() => ({
      execute: vi.fn().mockResolvedValue({}),
    })),
    createSendConsultationReminderUseCase: vi.fn(() => ({
      execute: vi.fn().mockResolvedValue({}),
    })),
  };
}

describe("parseBatchWorkerInput", () => {
  it("parses a supported command and organization ID", () => {
    expect(
      parseBatchWorkerInput(["charge", "--organization-id", "org-1"]),
    ).toEqual({ command: "charge", organizationId: "org-1" });
  });

  it("rejects an unsupported command", () => {
    expect(() => parseBatchWorkerInput(["unknown"])).toThrow(
      "Unknown batch command",
    );
  });

  it("rejects a missing organization ID", () => {
    expect(() => parseBatchWorkerInput(["charge"])).toThrow("Usage:");
  });
});

describe("runBatchWorker", () => {
  it("runs the selected use case once", async () => {
    const dependencies = createDependencies();

    await runBatchWorker(
      ["consultation-reminders", "--organization-id", "org-1"],
      dependencies,
    );

    const useCase =
      dependencies.createSendConsultationReminderUseCase.mock.results[0].value;
    expect(useCase.execute).toHaveBeenCalledWith("org-1");
    expect(dependencies.createBatchChargeUseCase).not.toHaveBeenCalled();
  });

  it("passes the current time to the late-arrival use case", async () => {
    const dependencies = createDependencies();

    await runBatchWorker(
      ["late-arrival-alerts", "--organization-id", "org-1"],
      dependencies,
    );

    const useCase =
      dependencies.createNotifyLateConsultantArrivalUseCase.mock.results[0]
        .value;
    expect(useCase.execute).toHaveBeenCalledWith({
      organizationId: "org-1",
      now: expect.any(Date),
    });
  });

  it("propagates a use case failure", async () => {
    const dependencies = createDependencies();
    dependencies.createBatchChargeUseCase.mockReturnValue({
      execute: vi.fn().mockRejectedValue(new Error("Stripe failed")),
    });

    await expect(
      runBatchWorker(["charge", "--organization-id", "org-1"], dependencies),
    ).rejects.toThrow("Stripe failed");
  });
});
