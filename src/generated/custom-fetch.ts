import { toaster } from "@/components/ui/toast";
import { getAuthToken } from "@/lib/auth-token";

export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const token = getAuthToken();
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    toaster.error({
      title: "エラー",
      description: error.message ?? "予期しないエラーが発生しました",
    });
    throw error;
  }

  const data = await response.json();

  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    toaster.success({
      title: "成功",
      description: "処理が完了しました",
    });
  }

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as T;
};

export default customFetch;
