import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = mocks.verifyIdToken;
  },
}));

vi.mock("@/config/env.server", () => ({
  envServer: {
    get apiUrl() {
      return "https://app.example.com";
    },
    get firebaseProjectId() {
      return "project-1";
    },
  },
}));

import { verifyCloudSchedulerAuth } from "./verify-cloud-scheduler-auth";

function createRequest(token?: string): Request {
  return new Request("https://app.example.com/api/batch", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

describe("verifyCloudSchedulerAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts a verified token from the configured Scheduler service account", async () => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "batch-scheduler@project-1.iam.gserviceaccount.com",
        email_verified: true,
      }),
    });

    await expect(
      verifyCloudSchedulerAuth(createRequest("token")),
    ).resolves.toEqual({
      serviceAccountEmail: "batch-scheduler@project-1.iam.gserviceaccount.com",
    });
    expect(mocks.verifyIdToken).toHaveBeenCalledWith({
      idToken: "token",
      audience: "https://app.example.com",
    });
  });

  it.each([
    [
      "a different service account",
      "other@project-1.iam.gserviceaccount.com",
      true,
    ],
    [
      "an unverified email",
      "batch-scheduler@project-1.iam.gserviceaccount.com",
      false,
    ],
  ])("rejects %s", async (_description, email, emailVerified) => {
    mocks.verifyIdToken.mockResolvedValue({
      getPayload: () => ({ email, email_verified: emailVerified }),
    });

    await expect(
      verifyCloudSchedulerAuth(createRequest("token")),
    ).resolves.toBeNull();
  });

  it("rejects an invalid signature or audience", async () => {
    mocks.verifyIdToken.mockRejectedValue(new Error("invalid token"));

    await expect(
      verifyCloudSchedulerAuth(createRequest("token")),
    ).resolves.toBeNull();
  });

  it("rejects a request without a Bearer token", async () => {
    await expect(verifyCloudSchedulerAuth(createRequest())).resolves.toBeNull();
    expect(mocks.verifyIdToken).not.toHaveBeenCalled();
  });
});
