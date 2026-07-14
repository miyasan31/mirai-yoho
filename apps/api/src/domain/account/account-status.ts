export type AccountStatus = "active" | "invited" | "disabled";

const ACCOUNT_STATUSES = ["active", "invited", "disabled"] as const;

export function isAccountStatus(value: unknown): value is AccountStatus {
  return (
    typeof value === "string" &&
    (ACCOUNT_STATUSES as readonly string[]).includes(value)
  );
}
