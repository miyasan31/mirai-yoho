const DEFAULT_EMAIL_DELIVERY_MODE = "resend";

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
  get cancelTokenSecret(): string {
    return requireServerEnv("CANCEL_TOKEN_SECRET");
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
  hasFirebaseServiceAccountCredentials(): boolean {
    return Boolean(
      process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY,
    );
  },
};
