export const customFetch = async <T>(
  url: string,
  options: RequestInit,
): Promise<T> => {
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  return response.json() as Promise<T>;
};

export default customFetch;
