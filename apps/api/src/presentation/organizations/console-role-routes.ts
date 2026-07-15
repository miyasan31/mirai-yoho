import {
  type AuthorizationPermission,
  parsePermissions,
  SYSTEM_ADMIN_ONLY_PERMISSION_SET,
} from "@mirai-yoho/shared/authorization-permission";
import { Hono } from "hono";
import { type Role, SYSTEM_ADMIN_ROLE_ID } from "@/domain/authorization/role";
import {
  requirePermission,
  requireSystemAdminRole,
} from "@/infrastructure/auth/require-permission";
import { verifyAccountAuth } from "@/infrastructure/auth/verify-auth";
import {
  createAccountRepository,
  createCreateRoleUseCase,
  createDeleteRoleUseCase,
  createRoleRepository,
  createUpdateRoleUseCase,
} from "@/infrastructure/container";
import {
  deleteRoute,
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

function toRoleResponse(role: Role, assignedCount = 0) {
  return {
    roleId: role.getRoleId(),
    name: role.getName(),
    description: role.getDescription(),
    permissions: role.getPermissions(),
    isSystem: role.getIsSystem(),
    assignedCount,
    createdAt: role.getCreatedAt().toISOString(),
    updatedAt: role.getUpdatedAt().toISOString(),
  };
}

function parseRoleBody(body: unknown): {
  roleId?: string;
  name: string;
  description: string;
  permissions: AuthorizationPermission[];
} | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as {
    roleId?: unknown;
    name?: unknown;
    description?: unknown;
    permissions?: unknown;
  };
  if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
    return null;
  }
  const permissions = parsePermissions(payload.permissions);
  if (!permissions) return null;
  if (
    permissions.some((permission) =>
      SYSTEM_ADMIN_ONLY_PERMISSION_SET.has(permission),
    )
  ) {
    return null;
  }
  return {
    roleId:
      typeof payload.roleId === "string" ? payload.roleId.trim() : undefined,
    name: payload.name.trim(),
    description:
      typeof payload.description === "string" ? payload.description.trim() : "",
    permissions,
  };
}

export const consoleRoleRoutes = new Hono();

consoleRoleRoutes.get(
  "/console/roles",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.roles.read");
    const [roles, accounts] = await Promise.all([
      createRoleRepository().findByOrganizationId(organizationId),
      createAccountRepository().findByOrganizationId(organizationId),
    ]);
    const assignedCountByRole = new Map<string, number>();
    for (const account of accounts) {
      const accountRoleId = account.getRoleId();
      assignedCountByRole.set(
        accountRoleId,
        (assignedCountByRole.get(accountRoleId) ?? 0) + 1,
      );
    }

    return noStoreJson({
      roles: roles
        .map((role) =>
          toRoleResponse(role, assignedCountByRole.get(role.getRoleId()) ?? 0),
        )
        .sort((left, right) => {
          if (left.roleId === SYSTEM_ADMIN_ROLE_ID) return -1;
          if (right.roleId === SYSTEM_ADMIN_ROLE_ID) return 1;
          return left.name.localeCompare(right.name, "ja");
        }),
    });
  }),
);

consoleRoleRoutes.post(
  "/console/roles",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAccountAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    const body = await request.json();
    const parsed = parseRoleBody(body);
    if (!parsed?.roleId) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid role payload");
    }
    const role = await createCreateRoleUseCase().execute({
      organizationId,
      roleId: parsed.roleId,
      name: parsed.name,
      description: parsed.description,
      permissions: parsed.permissions,
    });
    return Response.json(toRoleResponse(role), { status: 201 });
  }),
);

consoleRoleRoutes.patch(
  "/console/roles/:roleId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    const body = await request.json();
    const parsed = parseRoleBody(body);
    if (!parsed) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid role payload");
    }
    const role = await createUpdateRoleUseCase().execute({
      organizationId,
      roleId: param("roleId"),
      name: parsed.name,
      description: parsed.description,
      permissions: parsed.permissions,
    });
    return Response.json(toRoleResponse(role));
  }),
);

consoleRoleRoutes.delete(
  "/console/roles/:roleId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    await createDeleteRoleUseCase().execute({
      organizationId,
      roleId: param("roleId"),
    });
    return Response.json({ success: true });
  }),
);
