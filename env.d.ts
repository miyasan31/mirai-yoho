declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "test" | "production";

    STRIPE_SECRET_KEY?: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;

    ZOOM_ACCOUNT_ID?: string;
    ZOOM_CLIENT_ID?: string;
    ZOOM_CLIENT_SECRET?: string;
    ZOOM_HOST_USER_ID?: string;

    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    EMAIL_DELIVERY_MODE?: "resend" | "log";

    FIREBASE_PROJECT_ID?: string;
    FIREBASE_CLIENT_EMAIL?: string;
    FIREBASE_PRIVATE_KEY?: string;

    NEXT_PUBLIC_FIREBASE_API_KEY?: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;

    NEXT_PUBLIC_APP_URL?: string;
    INVOICE_REGISTRATION_NUMBER?: string;
    CANCEL_TOKEN_SECRET?: string;
  }
}

export {};
