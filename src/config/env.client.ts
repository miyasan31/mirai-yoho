function requireClientEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
}

export const envClient = {
  get firebaseApiKey(): string {
    return requireClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      "NEXT_PUBLIC_FIREBASE_API_KEY",
    );
  },
  get firebaseAuthDomain(): string {
    return requireClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    );
  },
  get firebaseProjectId(): string {
    return requireClientEnv(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    );
  },
  get stripePublishableKey(): string {
    return requireClientEnv(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    );
  },
  get appUrl(): string {
    return requireClientEnv(
      process.env.NEXT_PUBLIC_APP_URL,
      "NEXT_PUBLIC_APP_URL",
    );
  },
};
