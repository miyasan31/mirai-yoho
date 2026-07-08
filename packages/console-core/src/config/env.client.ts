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
  get firebaseApiKey(): string {
    return requireClientEnv(
      import.meta.env.VITE_FIREBASE_API_KEY,
      "VITE_FIREBASE_API_KEY",
    );
  },
  get firebaseAuthDomain(): string {
    return requireClientEnv(
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      "VITE_FIREBASE_AUTH_DOMAIN",
    );
  },
  get firebaseProjectId(): string {
    return requireClientEnv(
      import.meta.env.VITE_FIREBASE_PROJECT_ID,
      "VITE_FIREBASE_PROJECT_ID",
    );
  },
};
