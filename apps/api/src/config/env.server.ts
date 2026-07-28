const DEFAULT_EMAIL_DELIVERY_MODE = "resend";
const DEFAULT_ZOOM_INTEGRATION_MODE = "live";

function requireServerEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
}

export const envServer = {
  get nodeEnv(): string | undefined {
    return process.env.NODE_ENV;
  },
  get stripeSecretKey(): string {
    return requireServerEnv("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret(): string {
    return requireServerEnv("STRIPE_WEBHOOK_SECRET");
  },
  get zoomAccountId(): string {
    return requireServerEnv("ZOOM_ACCOUNT_ID");
  },
  get zoomClientId(): string {
    return requireServerEnv("ZOOM_CLIENT_ID");
  },
  get zoomClientSecret(): string {
    return requireServerEnv("ZOOM_CLIENT_SECRET");
  },
  get zoomHostUserId(): string {
    return requireServerEnv("ZOOM_HOST_USER_ID");
  },
  get resendApiKey(): string {
    return requireServerEnv("RESEND_API_KEY");
  },
  get resendFromEmail(): string {
    return requireServerEnv("RESEND_FROM_EMAIL");
  },
  get emailDeliveryMode(): string {
    return process.env.EMAIL_DELIVERY_MODE ?? DEFAULT_EMAIL_DELIVERY_MODE;
  },
  get zoomIntegrationMode(): "live" | "stub" {
    return (
      (process.env.ZOOM_INTEGRATION_MODE as "live" | "stub" | undefined) ??
      DEFAULT_ZOOM_INTEGRATION_MODE
    );
  },
  get cancelTokenSecret(): string {
    return requireServerEnv("CANCEL_TOKEN_SECRET");
  },
  get lineWorksLateArrivalWebhookUrl(): string {
    return requireServerEnv("LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL");
  },
  get apiUrl(): string {
    return requireServerEnv("API_URL");
  },
  get consoleAppUrl(): string {
    return requireServerEnv("CONSOLE_APP_URL");
  },
  get userAppUrl(): string {
    return requireServerEnv("USER_APP_URL");
  },
  get corsAllowedOrigins(): string[] {
    return (process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter((origin) => origin.length > 0);
  },
  get zoomUserOAuthClientId(): string {
    return requireServerEnv("ZOOM_USER_OAUTH_CLIENT_ID");
  },
  get zoomUserOAuthClientSecret(): string {
    return requireServerEnv("ZOOM_USER_OAUTH_CLIENT_SECRET");
  },
  get zoomUserOAuthRedirectUri(): string {
    return (
      process.env.ZOOM_USER_OAUTH_REDIRECT_URI ??
      `${requireServerEnv("API_URL")}/api/auth/zoom/callback`
    );
  },
  get zoomOAuthStateSecret(): string {
    return requireServerEnv("ZOOM_OAUTH_STATE_SECRET");
  },
  get zoomCredentialEncryptionKey(): string {
    return requireServerEnv("ZOOM_CREDENTIAL_ENCRYPTION_KEY");
  },
  get firebaseProjectId(): string | undefined {
    return process.env.FIREBASE_PROJECT_ID;
  },
  get firebaseClientEmail(): string | undefined {
    return process.env.FIREBASE_CLIENT_EMAIL;
  },
  get firebasePrivateKey(): string | undefined {
    return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  },
  get firebaseStorageBucket(): string {
    return requireServerEnv("FIREBASE_STORAGE_BUCKET");
  },
  hasFirebaseServiceAccountCredentials(): boolean {
    return Boolean(
      process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY,
    );
  },
};
