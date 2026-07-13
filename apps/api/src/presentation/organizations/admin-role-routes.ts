import {
  type AuthorizationPermission,
  parsePermissions,
  SYSTEM_ADMIN_ONLY_PERMISSION_SET,
} from "@mirai-yoho/shared/authorization-permission";
import { Hono } from "hono";
import {
  isSystemRoleId,
  Role,
  SYSTEM_ADMIN_ROLE_ID,
} from "@/domain/authorization/role";
import {
  requirePermission,
  requireSystemAdminRole,
} from "@/infrastructure/auth/require-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createRoleRepository } from "@/infrastructure/container";
import { listAccounts } from "./accounts";
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

function isValidCustomRoleId(roleId: string): boolean {
  return /^[a-z][a-z0-9-]{1,62}$/.test(roleId);
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

export const adminRoleRoutes = new Hono();

adminRoleRoutes.get(
  "/admin/roles",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.roles.read");
    const [roles, accounts] = await Promise.all([
      createRoleRepository().findByOrganizationId(organizationId),
      listAccounts(organizationId),
    ]);
    const assignedCountByRole = new Map<string, number>();
    for (const account of accounts) {
      if (account.role === "consultant") continue;
      assignedCountByRole.set(
        account.role,
        (assignedCountByRole.get(account.role) ?? 0) + 1,
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

adminRoleRoutes.post(
  "/admin/roles",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    const body = await request.json();
    const parsed = parseRoleBody(body);
    if (!parsed?.roleId || !isValidCustomRoleId(parsed.roleId)) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "roleId must be kebab-case and 2-63 characters",
      );
    }
    if (parsed.roleId === "consultant" || isSystemRoleId(parsed.roleId)) {
      return jsonError(400, "VALIDATION_ERROR", "roleId is reserved");
    }
    const repository = createRoleRepository();
    const existing = await repository.findById(organizationId, parsed.roleId);
    if (existing) {
      return jsonError(409, "ROLE_ALREADY_EXISTS", "Role already exists");
    }
    const role = Role.create({
      organizationId,
      roleId: parsed.roleId,
      name: parsed.name,
      description: parsed.description,
      permissions: parsed.permissions,
      isSystem: false,
    });
    await repository.save(role);
    return Response.json(toRoleResponse(role), {
      status: 201,
    });
  }),
);

adminRoleRoutes.patch(
  "/admin/roles/:roleId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    const roleId = param("roleId");
    const body = await request.json();
    const parsed = parseRoleBody(body);
    if (!parsed) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid role payload");
    }
    const repository = createRoleRepository();
    const role = await repository.findById(organizationId, roleId);
    if (!role) {
      return jsonError(404, "NOT_FOUND", "Role not found");
    }
    if (role.getIsSystem()) {
      return jsonError(
        400,
        "SYSTEM_ROLE_IMMUTABLE",
        "System role cannot be edited",
      );
    }
    role.update({
      name: parsed.name,
      description: parsed.description,
      permissions: parsed.permissions,
    });
    await repository.save(role);
    return Response.json(toRoleResponse(role));
  }),
);

adminRoleRoutes.delete(
  "/admin/roles/:roleId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    const roleId = param("roleId");
    const repository = createRoleRepository();
    const role = await repository.findById(organizationId, roleId);
    if (!role) {
      return jsonError(404, "NOT_FOUND", "Role not found");
    }
    if (role.getIsSystem()) {
      return jsonError(
        400,
        "SYSTEM_ROLE_IMMUTABLE",
        "System role cannot be deleted",
      );
    }
    const assignedAccounts = (await listAccounts(organizationId)).filter(
      (account) => account.role === roleId,
    );
    if (assignedAccounts.length > 0) {
      return jsonError(
        409,
        "ROLE_IN_USE",
        "このロールはアカウントに割り当てられているため削除できません",
      );
    }
    await repository.delete(organizationId, roleId);
    return Response.json({ success: true });
  }),
);
