export const AUTHORIZATION_PERMISSIONS = [
  "console.dashboard.read",
  "console.bookings.read",
  "console.bookings.cancel",
  "console.payments.read",
  "console.payments.charge",
  "console.customers.read",
  "console.consultants.read",
  "console.consultants.manage",
  "console.consultants.status.manage",
  "console.slots.read",
  "console.slots.manage",
  "console.settings.read",
  "console.settings.manage",
  "console.accounts.read",
  "console.accounts.invite",
  "console.accounts.display-name.manage",
  "console.accounts.role.manage",
  "console.accounts.delete",
  "console.accounts.invite.resend",
  "console.accounts.password-reset",
  "console.roles.read",
  "console.roles.manage",
] as const;

export type AuthorizationPermission =
  (typeof AUTHORIZATION_PERMISSIONS)[number];

export const AUTHORIZATION_PERMISSION_LABELS: Record<
  AuthorizationPermission,
  string
> = {
  "console.dashboard.read": "ダッシュボード閲覧",
  "console.bookings.read": "予約閲覧",
  "console.bookings.cancel": "予約キャンセル",
  "console.payments.read": "決済閲覧",
  "console.payments.charge": "手動決済",
  "console.customers.read": "顧客閲覧",
  "console.consultants.read": "相談員閲覧",
  "console.consultants.manage": "相談員管理",
  "console.consultants.status.manage": "相談員ステータス管理",
  "console.slots.read": "予約枠閲覧",
  "console.slots.manage": "予約枠管理",
  "console.settings.read": "設定閲覧",
  "console.settings.manage": "設定編集",
  "console.accounts.read": "アカウント閲覧",
  "console.accounts.invite": "アカウント招待",
  "console.accounts.display-name.manage": "表示名変更",
  "console.accounts.role.manage": "ロール割当",
  "console.accounts.delete": "アカウント削除",
  "console.accounts.invite.resend": "招待メール再送",
  "console.accounts.password-reset": "パスワードリセット",
  "console.roles.read": "ロール閲覧",
  "console.roles.manage": "ロール管理",
};

export const PERMISSION_DEPENDENCIES: Partial<
  Record<AuthorizationPermission, AuthorizationPermission[]>
> = {
  "console.dashboard.read": [
    "console.bookings.read",
    "console.payments.read",
    "console.customers.read",
    "console.consultants.read",
  ],
  "console.bookings.cancel": ["console.bookings.read"],
  "console.payments.charge": ["console.payments.read"],
  "console.consultants.manage": ["console.consultants.read"],
  "console.consultants.status.manage": [
    "console.consultants.read",
    "console.settings.read",
  ],
  "console.slots.manage": ["console.slots.read"],
  "console.settings.manage": ["console.settings.read"],
  "console.accounts.invite": ["console.accounts.read"],
  "console.accounts.display-name.manage": ["console.accounts.read"],
  "console.accounts.role.manage": [
    "console.accounts.read",
    "console.roles.read",
  ],
  "console.accounts.delete": ["console.accounts.read"],
  "console.accounts.invite.resend": ["console.accounts.read"],
  "console.accounts.password-reset": ["console.accounts.read"],
  "console.roles.manage": ["console.roles.read"],
};

export const SYSTEM_ADMIN_ONLY_PERMISSIONS = [
  "console.accounts.invite",
  "console.accounts.role.manage",
  "console.roles.manage",
] as const satisfies readonly AuthorizationPermission[];
export const SYSTEM_ADMIN_ONLY_PERMISSION_SET: ReadonlySet<AuthorizationPermission> =
  new Set(SYSTEM_ADMIN_ONLY_PERMISSIONS);

const PERMISSION_SET = new Set<string>(AUTHORIZATION_PERMISSIONS);

export function isAuthorizationPermission(
  value: unknown,
): value is AuthorizationPermission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

export function normalizePermissions(
  permissions: readonly AuthorizationPermission[],
): AuthorizationPermission[] {
  const normalized = new Set<AuthorizationPermission>();
  const visit = (permission: AuthorizationPermission) => {
    if (normalized.has(permission)) return;
    normalized.add(permission);
    for (const dependency of PERMISSION_DEPENDENCIES[permission] ?? []) {
      visit(dependency);
    }
  };

  for (const permission of permissions) {
    visit(permission);
  }

  return AUTHORIZATION_PERMISSIONS.filter((permission) =>
    normalized.has(permission),
  );
}

export function parsePermissions(
  values: unknown,
): AuthorizationPermission[] | null {
  if (!Array.isArray(values)) return null;

  const permissions: AuthorizationPermission[] = [];
  for (const value of values) {
    if (!isAuthorizationPermission(value)) return null;
    permissions.push(value);
  }

  return normalizePermissions(permissions);
}
