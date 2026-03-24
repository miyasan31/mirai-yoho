let token: string | null = null;

export const getAuthToken = (): string | null => token;

export const setAuthToken = (newToken: string | null): void => {
  token = newToken;
};
