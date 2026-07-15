import crypto from "node:crypto";
import { Hono } from "hono";
import { Account } from "@/domain/account/account";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { Settings } from "@/domain/settings/settings";
import {
  requirePermission,
  requireSystemAdminRole,
} from "@/infrastructure/auth/require-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createAccountRepository,
  createConsultantRepository,
  createRoleRepository,
  createSettingsRepository,
} from "@/infrastructure/container";
import {
  createUser,
  deleteUser,
  generatePasswordResetLink,
  getUser,
  getUserByEmail,
  getUsersByUids,
} from "@/infrastructure/firebase/firebase-auth-admin";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";
import { deleteConsoleUserWithAuthCleanup } from "./console-user-deletion";
import {
  canUpdateDisplayNameTarget,
  isLastAdminSelfDemotion,
  validateConsoleUserDeletionTarget,
} from "./console-user-policy";
import {
  INVALID_LIST_QUERY_MESSAGE,
  paginateArray,
  parseListQueryParams,
  sortByTimestampDesc,
} from "./list-query";
import {
  deleteRoute,
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

export const consoleAccountRoutes = new Hono();

consoleAccountRoutes.get(
  "/console/accounts",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.accounts.read");
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }
    const accountRepository = createAccountRepository();
    const accounts =
      await accountRepository.findByOrganizationId(organizationId);
    const accountIds = accounts.map((account) => account.getAccountId());
    const [userByAccountId, roles] = await Promise.all([
      getUsersByUids(accountIds),
      createRoleRepository().findByOrganizationId(organizationId),
    ]);
    const roleNameById = new Map(
      roles.map((role) => [role.getRoleId(), role.getName()] as const),
    );

    const accountResponses = accounts.map((account) => {
      const userRecord = userByAccountId.get(account.getAccountId()) ?? null;
      const name = account.getName() ?? "";

      return {
        accountId: account.getAccountId(),
        email: userRecord?.email ?? "",
        name: name || userRecord?.email || "",
        roleId: account.getRoleId(),
        roleName: roleNameById.get(account.getRoleId()) ?? account.getRoleId(),
        status: account.getStatus(),
        createdAt: account.getCreatedAt().toISOString(),
        updatedAt: account.getUpdatedAt().toISOString(),
      };
    });
    const sortedAccounts = sortByTimestampDesc(
      accountResponses,
      listQueryParams.sortBy,
    );
    const { items, pagination } = paginateArray(
      sortedAccounts,
      listQueryParams,
    );

    return noStoreJson({ accounts: items, pagination });
  }),
);

consoleAccountRoutes.post(
  "/console/accounts/invite",
  postRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    const actorAccount = requireSystemAdminRole(authUser, organizationId);
    const body = await request.json();
    const { email, roleId, name, isConsultant } = body;

    if (!email || typeof email !== "string") {
      return jsonError(400, "VALIDATION_ERROR", "email is required");
    }
    if (typeof roleId !== "string" || roleId.trim().length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "roleId is required");
    }
    const normalizedRoleId = roleId.trim();
    const roleEntity = await createRoleRepository().findById(
      organizationId,
      normalizedRoleId,
    );
    if (!roleEntity) {
      return jsonError(400, "VALIDATION_ERROR", "roleId is invalid");
    }
    if (!name || typeof name !== "string") {
      return jsonError(400, "VALIDATION_ERROR", "name is required");
    }
    const normalizedDisplayName = name.trim();
    if (!normalizedDisplayName) {
      return jsonError(400, "VALIDATION_ERROR", "name must not be empty");
    }
    const shouldCreateConsultant = isConsultant === true;

    const accountRepository = createAccountRepository();
    let accountId: string;
    let userRecord = await getUserByEmail(email).catch(() => null);

    if (userRecord) {
      accountId = userRecord.uid;
      // 同一組織に既にアカウントがある場合は招待失敗。
      // 別組織にのみ存在する場合はこの組織への所属を追加する（後続の save で作成）
      const existingAccount = await accountRepository.findById(
        organizationId,
        accountId,
      );
      if (existingAccount) {
        return jsonError(
          409,
          "ACCOUNT_ALREADY_EXISTS",
          "このメールアドレスは既にこの組織に登録されています",
        );
      }
    } else {
      accountId = await createUser(email, crypto.randomUUID());
      userRecord = await getUser(accountId);
    }

    const account = Account.invite({
      organizationId,
      accountId,
      roleId: normalizedRoleId,
      name: normalizedDisplayName,
    });
    if (userRecord.metadata.lastSignInTime) {
      account.activate();
    }
    await accountRepository.save(account);

    if (shouldCreateConsultant) {
      const repo = createConsultantRepository();
      const existing = await repo.findById(organizationId, accountId);
      if (!existing) {
        const settings =
          (await createSettingsRepository().findByOrganizationId(
            organizationId,
          )) ?? Settings.createDefault(organizationId);
        await repo.save(
          Consultant.create({
            organizationId,
            consultantId: accountId,
            profile: ConsultantProfile.create(normalizedDisplayName, "", []),
            statusId: settings.getDefaultConsultantStatusId(),
          }),
        );
      }
    }

    const passwordResetLink = await generatePasswordResetLink(email);
    await new ResendEmailService().sendInvitation({
      email,
      roleName: roleEntity.getName(),
      isConsultant: shouldCreateConsultant,
      passwordResetLink,
    });

    console.info("Admin account invited", {
      category: "security-audit",
      endpoint: `POST ${requestUrl.pathname}`,
      organizationId,
      actorAuthUid: authUser.authUid,
      actorRoleId: actorAccount.roleId,
      targetEmail: email,
      targetRoleId: normalizedRoleId,
      targetIsConsultant: shouldCreateConsultant,
      invitedAt: new Date().toISOString(),
    });

    return Response.json({ accountId }, { status: 201 });
  }),
);

consoleAccountRoutes.post(
  "/console/accounts/:accountId/resend-invite",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(
      authUser,
      organizationId,
      "console.accounts.invite.resend",
    );
    const accountId = param("accountId");
    const userRecord = await getUser(accountId);
    const account = await createAccountRepository().findById(
      organizationId,
      accountId,
    );
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }

    if (!userRecord.email) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "アカウントにメールアドレスがありません",
      );
    }

    const roleEntity = await createRoleRepository().findById(
      organizationId,
      account.getRoleId(),
    );
    const isConsultant =
      (await createConsultantRepository().findById(
        organizationId,
        accountId,
      )) !== null;

    await new ResendEmailService().sendInvitation({
      email: userRecord.email,
      roleName: roleEntity?.getName() ?? account.getRoleId(),
      isConsultant,
      passwordResetLink: await generatePasswordResetLink(userRecord.email),
    });

    return Response.json({ success: true });
  }),
);

consoleAccountRoutes.post(
  "/console/accounts/:accountId/reset-password",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(
      authUser,
      organizationId,
      "console.accounts.password-reset",
    );
    const accountId = param("accountId");
    const account = await createAccountRepository().findById(
      organizationId,
      accountId,
    );
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const userRecord = await getUser(accountId);
    if (!userRecord.email) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "アカウントにメールアドレスがありません",
      );
    }

    await new ResendEmailService().sendPasswordReset({
      email: userRecord.email,
      passwordResetLink: await generatePasswordResetLink(userRecord.email),
    });

    return Response.json({ success: true });
  }),
);

consoleAccountRoutes.patch(
  "/console/accounts/:accountId/display-name",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    const actorAccount = requirePermission(
      authUser,
      organizationId,
      "console.accounts.display-name.manage",
    );
    const accountId = param("accountId");
    const body = await request.json();
    const accountRepository = createAccountRepository();
    const account = await accountRepository.findById(organizationId, accountId);

    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    if (
      !canUpdateDisplayNameTarget(
        actorAccount.roleId,
        authUser.authUid,
        accountId,
      )
    ) {
      return jsonError(
        403,
        "FORBIDDEN",
        "operator can only update their own display name",
      );
    }
    if (!body.name || typeof body.name !== "string") {
      return jsonError(400, "VALIDATION_ERROR", "name is required");
    }

    const normalizedDisplayName = body.name.trim();
    if (!normalizedDisplayName) {
      return jsonError(400, "VALIDATION_ERROR", "name must not be empty");
    }

    account.updateName(normalizedDisplayName);
    await accountRepository.save(account);
    return Response.json({ success: true });
  }),
);

consoleAccountRoutes.patch(
  "/console/accounts/:accountId/role",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    const accountId = param("accountId");
    const body = await request.json();
    if (typeof body.roleId !== "string" || body.roleId.trim().length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "roleId is required");
    }
    const nextRoleId = body.roleId.trim();
    const nextRoleEntity = await createRoleRepository().findById(
      organizationId,
      nextRoleId,
    );
    if (!nextRoleEntity) {
      return jsonError(400, "VALIDATION_ERROR", "roleId is invalid");
    }
    const accountRepository = createAccountRepository();
    const account = await accountRepository.findById(organizationId, accountId);
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const accountsInOrg =
      await accountRepository.findByOrganizationId(organizationId);
    const activeAdminCount = accountsInOrg.filter(
      (account) =>
        account.getRoleId() === "admin" && account.getStatus() === "active",
    ).length;

    if (
      isLastAdminSelfDemotion({
        actorAccountId: authUser.authUid,
        targetAccountId: accountId,
        nextRoleId,
        activeAdminCount,
      })
    ) {
      return jsonError(
        400,
        "LAST_ADMIN_ROLE_CHANGE_FORBIDDEN",
        "最後の管理者は自分自身を別のロールに変更できません",
      );
    }

    account.changeRole(nextRoleId);
    await accountRepository.save(account);

    return Response.json({ success: true });
  }),
);

consoleAccountRoutes.delete(
  "/console/accounts/:accountId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.accounts.delete");
    const accountId = param("accountId");
    const accountRepository = createAccountRepository();
    const account = await accountRepository.findById(organizationId, accountId);
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const deletionTargetValidation = validateConsoleUserDeletionTarget(
      authUser.authUid,
      accountId,
    );
    if (!deletionTargetValidation.isAllowed) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        deletionTargetValidation.message ?? "Invalid user delete target",
      );
    }

    await deleteConsoleUserWithAuthCleanup({
      accountId,
      account,
      countAccountsByAccountId: (targetAccountId) =>
        accountRepository.countByAccountId(targetAccountId),
      deleteAccount: () => accountRepository.delete(organizationId, accountId),
      restoreAccount: (restorableAccount) =>
        accountRepository.save(restorableAccount),
      deleteAuthUser: deleteUser,
    });

    return Response.json({ success: true });
  }),
);
