declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "test" | "production";

    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;

    ZOOM_ACCOUNT_ID?: string;
    ZOOM_CLIENT_ID?: string;
    ZOOM_CLIENT_SECRET?: string;
    ZOOM_HOST_USER_ID?: string;

    ZOOM_USER_OAUTH_CLIENT_ID?: string;
    ZOOM_USER_OAUTH_CLIENT_SECRET?: string;
    ZOOM_USER_OAUTH_REDIRECT_URI?: string;
    ZOOM_OAUTH_STATE_SECRET?: string;
    ZOOM_CREDENTIAL_ENCRYPTION_KEY?: string;

    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    EMAIL_DELIVERY_MODE?: "resend" | "log";

    FIREBASE_PROJECT_ID?: string;
    FIREBASE_CLIENT_EMAIL?: string;
    FIREBASE_PRIVATE_KEY?: string;
    FIREBASE_STORAGE_BUCKET?: string;

    API_URL?: string;
    ADMIN_APP_URL?: string;
    USER_APP_URL?: string;
    CONSULTANT_APP_URL?: string;
    CORS_ALLOWED_ORIGINS?: string;

    INVOICE_REGISTRATION_NUMBER?: string;
    CANCEL_TOKEN_SECRET?: string;
    COUPON_WEBHOOK_SECRET?: string;
    LINE_WORKS_LATE_ARRIVAL_WEBHOOK_URL?: string;
  }
}

export {};
