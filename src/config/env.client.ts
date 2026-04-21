function requireClientEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
}

export const envClient = {
  get firebaseApiKey(): string {
    return requireClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  },
  get firebaseAuthDomain(): string {
    return requireClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  },
  get firebaseProjectId(): string {
    return requireClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  },
  get stripePublishableKey(): string {
    return requireClientEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  },
  get appUrl(): string {
    return requireClientEnv("NEXT_PUBLIC_APP_URL");
  },
};
