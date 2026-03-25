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
    throw error;
  }

  const data = await response.json();
  return {
    data,
    status: response.status,
    headers: response.headers,
  } as T;
};

export default customFetch;
