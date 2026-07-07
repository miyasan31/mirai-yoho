function requireClientEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
}

export const envClient = {
  get apiUrl(): string {
    return requireClientEnv(import.meta.env.VITE_API_URL, "VITE_API_URL");
  },
  get stripePublishableKey(): string {
    return requireClientEnv(
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
      "VITE_STRIPE_PUBLISHABLE_KEY",
    );
  },
  get consoleAppUrl(): string {
    return requireClientEnv(
      import.meta.env.VITE_CONSOLE_APP_URL,
      "VITE_CONSOLE_APP_URL",
    );
  },
};
