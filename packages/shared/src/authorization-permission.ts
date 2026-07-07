export const AUTHORIZATION_PERMISSIONS = [
  "admin.dashboard.read",
  "admin.bookings.read",
  "admin.bookings.cancel",
  "admin.payments.read",
  "admin.payments.charge",
  "admin.customers.read",
  "admin.consultants.read",
  "admin.consultants.manage",
  "admin.consultants.status.manage",
  "admin.slots.read",
  "admin.slots.manage",
  "admin.settings.read",
  "admin.settings.manage",
  "admin.accounts.read",
  "admin.accounts.invite",
  "admin.accounts.display-name.manage",
  "admin.accounts.role.manage",
  "admin.accounts.delete",
  "admin.accounts.invite.resend",
  "admin.accounts.password-reset",
  "admin.roles.read",
  "admin.roles.manage",
] as const;

export type AuthorizationPermission =
  (typeof AUTHORIZATION_PERMISSIONS)[number];

export const AUTHORIZATION_PERMISSION_LABELS: Record<
  AuthorizationPermission,
  string
> = {
  "admin.dashboard.read": "ダッシュボード閲覧",
  "admin.bookings.read": "予約閲覧",
  "admin.bookings.cancel": "予約キャンセル",
  "admin.payments.read": "決済閲覧",
  "admin.payments.charge": "手動決済",
  "admin.customers.read": "顧客閲覧",
  "admin.consultants.read": "相談員閲覧",
  "admin.consultants.manage": "相談員管理",
  "admin.consultants.status.manage": "相談員ステータス管理",
  "admin.slots.read": "予約枠閲覧",
  "admin.slots.manage": "予約枠管理",
  "admin.settings.read": "設定閲覧",
  "admin.settings.manage": "設定編集",
  "admin.accounts.read": "アカウント閲覧",
  "admin.accounts.invite": "アカウント招待",
  "admin.accounts.display-name.manage": "表示名変更",
  "admin.accounts.role.manage": "ロール割当",
  "admin.accounts.delete": "アカウント削除",
  "admin.accounts.invite.resend": "招待メール再送",
  "admin.accounts.password-reset": "パスワードリセット",
  "admin.roles.read": "ロール閲覧",
  "admin.roles.manage": "ロール管理",
};

export const PERMISSION_DEPENDENCIES: Partial<
  Record<AuthorizationPermission, AuthorizationPermission[]>
> = {
  "admin.dashboard.read": [
    "admin.bookings.read",
    "admin.payments.read",
    "admin.customers.read",
    "admin.consultants.read",
  ],
  "admin.bookings.cancel": ["admin.bookings.read"],
  "admin.payments.charge": ["admin.payments.read"],
  "admin.consultants.manage": ["admin.consultants.read"],
  "admin.consultants.status.manage": [
    "admin.consultants.read",
    "admin.settings.read",
  ],
  "admin.slots.manage": ["admin.slots.read"],
  "admin.settings.manage": ["admin.settings.read"],
  "admin.accounts.invite": ["admin.accounts.read"],
  "admin.accounts.display-name.manage": ["admin.accounts.read"],
  "admin.accounts.role.manage": ["admin.accounts.read", "admin.roles.read"],
  "admin.accounts.delete": ["admin.accounts.read"],
  "admin.accounts.invite.resend": ["admin.accounts.read"],
  "admin.accounts.password-reset": ["admin.accounts.read"],
  "admin.roles.manage": ["admin.roles.read"],
};

export const SYSTEM_ADMIN_ONLY_PERMISSIONS = [
  "admin.accounts.invite",
  "admin.accounts.role.manage",
  "admin.roles.manage",
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
