// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";

const mockSendPasswordResetEmail = vi.fn();

type MockAuthUser = {
  isAnonymous: boolean;
  getIdTokenResult: () => Promise<{ token: string }>;
} | null;

let authStateUser: MockAuthUser = null;

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback: (user: MockAuthUser) => void) => {
    callback(authStateUser);
    return vi.fn();
  }),
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  auth: {},
}));

import { useAuthState } from "@/hooks/use-auth";

describe("useAuthState anonymous user", () => {
  afterEach(() => {
    authStateUser = null;
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("treats anonymous users as signed out without calling /api/auth/me", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    authStateUser = {
      isAnonymous: true,
      getIdTokenResult: vi.fn().mockResolvedValue({ token: "anon-token" }),
    };

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.accounts).toEqual([]);
    expect(result.current.currentOrganizationId).toBeNull();
  });
});

describe("useAuthState password reset", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends password reset email successfully", async () => {
    mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      result.current.sendPasswordResetEmail("test@example.com"),
    ).resolves.toBeUndefined();
  });

  it("treats user-not-found as success", async () => {
    mockSendPasswordResetEmail.mockRejectedValueOnce({
      code: "auth/user-not-found",
    });

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      result.current.sendPasswordResetEmail("unknown@example.com"),
    ).resolves.toBeUndefined();
  });

  it("throws retryable message for network errors", async () => {
    mockSendPasswordResetEmail.mockRejectedValueOnce({
      code: "auth/network-request-failed",
    });

    const { result } = renderHook(() => useAuthState());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(
      result.current.sendPasswordResetEmail("test@example.com"),
    ).rejects.toThrow(
      "メール送信に失敗しました。時間をおいて再度お試しください。",
    );
  });
});
