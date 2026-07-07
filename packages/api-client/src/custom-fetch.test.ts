import {
  type ApiResponseError,
  configureApiClient,
  customFetch,
} from "./custom-fetch";

const onUnauthorized = vi.fn();
const onForbiddenOrNotFound = vi.fn();
const onError = vi.fn();
const getToken = vi.fn(async (): Promise<string | null> => "token-123");

describe("customFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getToken.mockResolvedValue("token-123");
    configureApiClient({
      baseUrl: "https://api.example.com",
      getToken,
      onUnauthorized,
      onForbiddenOrNotFound,
      onError,
    });
  });

  it("calls onUnauthorized when response status is 401", async () => {
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

    expect(onError).not.toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("https://api.example.com/api/test", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token-123",
      },
    });
  });

  it("calls onForbiddenOrNotFound when response status is 403", async () => {
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

    expect(onError).not.toHaveBeenCalled();
    expect(onForbiddenOrNotFound).toHaveBeenCalledWith(403);
  });

  it("calls onForbiddenOrNotFound when response status is 404", async () => {
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

    expect(onError).not.toHaveBeenCalled();
    expect(onForbiddenOrNotFound).toHaveBeenCalledWith(404);
  });

  it("calls onError and throws normalized error for 500", async () => {
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

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, message: "server error" }),
    );
  });

  it("resolves with data for non-GET success responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    await expect(
      customFetch("/test", { method: "POST" }),
    ).resolves.toMatchObject({
      data: { ok: true },
      status: 200,
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it("falls back to no Authorization header when getToken returns null", async () => {
    getToken.mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    await expect(
      customFetch("/test", { method: "GET" }),
    ).resolves.toMatchObject({
      data: { ok: true },
      status: 200,
    });

    expect(fetch).toHaveBeenCalledWith("https://api.example.com/api/test", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
