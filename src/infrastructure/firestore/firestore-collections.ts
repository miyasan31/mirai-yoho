export const FIRESTORE_COLLECTIONS = {
  bookings: "bookings",
  clients: "clients",
  consultantPricePlans: "consultant-price-plans",
  consultants: "consultants",
  organizationMemberships: "organization-memberships",
  organizationSettings: "organization-settings",
  organizations: "organizations",
  payments: "payments",
  slots: "slots",
  userPreferences: "user-preferences",
  zoomDailySessions: "zoom-daily-sessions",
} as const;

export const FIRESTORE_COLLECTION_NAMES = Object.values(FIRESTORE_COLLECTIONS);

export const FIRESTORE_BOOTSTRAP_DOC_ID = "_bootstrap";
