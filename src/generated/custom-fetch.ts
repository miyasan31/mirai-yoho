import { toaster } from "@/components/ui/toast";
import { auth } from "@/lib/firebase";

const REDIRECT_BY_STATUS: Record<number, string> = {
  403: "/404",
  404: "/404",
};

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

const UNAUTHORIZED_EVENT_NAME = "auth:unauthorized";

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

function redirectByStatus(status: number): void {
  const destination = REDIRECT_BY_STATUS[status];
  if (!destination || typeof window === "undefined") {
    return;
  }
  if (window.location.pathname !== destination) {
    window.location.assign(destination);
  }
}

async function getRequestAuthToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  try {
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
}

export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const token = await getRequestAuthToken();
  const response = await fetch(`/api${url}`, {
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

    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT_NAME));
    } else if (response.status in REDIRECT_BY_STATUS) {
      redirectByStatus(response.status);
    } else {
      toaster.error({
        title: "エラー",
        description: normalizedError.message,
      });
    }

    throw new ApiResponseError(normalizedError);
  }

  const data = await response.json();

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as T;
};

export default customFetch;
