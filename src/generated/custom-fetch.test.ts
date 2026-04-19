// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toasterError, toasterSuccess, getAuthToken } = vi.hoisted(() => ({
  toasterError: vi.fn(),
  toasterSuccess: vi.fn(),
  getAuthToken: vi.fn(() => null),
}));

vi.mock("@/components/ui/toast", () => ({
  toaster: {
    error: toasterError,
    success: toasterSuccess,
  },
}));

vi.mock("@/lib/auth-token", () => ({
  getAuthToken,
}));

import { type ApiResponseError, customFetch } from "./custom-fetch";

describe("customFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthToken.mockReturnValue(null);
  });

  it("redirects to / when response status is 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ code: "UNAUTHORIZED", message: "auth required" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );
    await expect(customFetch("/test", { method: "GET" })).rejects.toMatchObject(
      {
        name: "ApiResponseError",
        status: 401,
        code: "UNAUTHORIZED",
        message: "auth required",
      } satisfies Partial<ApiResponseError>,
    );

    expect(toasterError).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith("/api/test", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("redirects to /404 when response status is 403", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ code: "FORBIDDEN", message: "forbidden" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );
    await expect(customFetch("/test", { method: "GET" })).rejects.toThrow(
      "forbidden",
    );

    expect(toasterError).not.toHaveBeenCalled();
  });

  it("redirects to /404 when response status is 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ code: "NOT_FOUND", message: "missing" }),
            {
              status: 404,
              headers: { "Content-Type": "application/json" },
            },
          ),
      ),
    );
    await expect(customFetch("/test", { method: "GET" })).rejects.toThrow(
      "missing",
    );

    expect(toasterError).not.toHaveBeenCalled();
  });

  it("shows toaster error and throws normalized error for 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    await expect(customFetch("/test", { method: "GET" })).rejects.toMatchObject(
      {
        name: "ApiResponseError",
        status: 500,
        code: "API_ERROR",
        message: "server error",
      } satisfies Partial<ApiResponseError>,
    );

    expect(toasterError).toHaveBeenCalledWith({
      title: "エラー",
      description: "server error",
    });
  });

  it("handles non-JSON error responses safely", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("plain text error", {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          }),
      ),
    );

    await expect(customFetch("/test", { method: "GET" })).rejects.toMatchObject(
      {
        name: "ApiResponseError",
        status: 500,
        code: "API_ERROR",
        message: "plain text error",
      } satisfies Partial<ApiResponseError>,
    );
  });
});
