interface NormalizedError {
  status: number;
  code: string;
  message: string;
}

export class ApiResponseError extends Error {
  status: number;
  code: string;

  constructor({ status, code, message }: NormalizedError) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
    this.code = code;
  }
}

export interface ApiClientConfig {
  /** API サーバーのオリジン（例: https://api.miraiyohou.com）。パスは `/api` が自動で付与される。 */
  baseUrl: string;
  /** リクエストに付与する認証トークンを返す。未認証なら null。 */
  getToken: () => Promise<string | null>;
  /** 401 を受け取ったときに呼ばれる（セッション切れ処理）。 */
  onUnauthorized?: () => void;
  /** 403 / 404 を受け取ったときに呼ばれる（エラーページ遷移）。 */
  onForbiddenOrNotFound?: (status: number) => void;
  /** 上記以外のエラー時に呼ばれる（トースト表示など）。 */
  onError?: (error: ApiResponseError) => void;
}

let apiClientConfig: ApiClientConfig | null = null;

export function configureApiClient(config: ApiClientConfig): void {
  apiClientConfig = config;
}

function requireConfig(): ApiClientConfig {
  if (!apiClientConfig) {
    throw new Error(
      "API client is not configured. Call configureApiClient() at app startup.",
    );
  }
  return apiClientConfig;
}

function normalizeErrorPayload(
  status: number,
  payload: unknown,
  fallbackMessage: string,
): NormalizedError {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return {
      status,
      code:
        "code" in payload && typeof payload.code === "string"
          ? payload.code
          : "API_ERROR",
      message: payload.message,
    };
  }

  if (typeof payload === "string" && payload.length > 0) {
    return {
      status,
      code: "API_ERROR",
      message: payload,
    };
  }

  return {
    status,
    code: "API_ERROR",
    message: fallbackMessage,
  };
}

// 204 No Content など本文を持たないレスポンスは JSON パースできないため undefined を返す。
// （例: POST /customer/me/bookings/{bookingId}/cancel は 204 を返す）
async function parseSuccessPayload(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }
  const text = await response.text();
  if (text.length === 0) {
    return undefined;
  }
  return JSON.parse(text);
}

async function parseErrorPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const config = requireConfig();
  const token = await config.getToken();
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    const normalizedError = normalizeErrorPayload(
      response.status,
      payload,
      "予期しないエラーが発生しました",
    );

    if (response.status === 401) {
      config.onUnauthorized?.();
    } else if (response.status === 403 || response.status === 404) {
      config.onForbiddenOrNotFound?.(response.status);
    } else {
      config.onError?.(new ApiResponseError(normalizedError));
    }

    throw new ApiResponseError(normalizedError);
  }

  const data = await parseSuccessPayload(response);

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as T;
};

export default customFetch;
