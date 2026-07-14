import crypto from "node:crypto";
import { Hono } from "hono";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { Settings } from "@/domain/settings/settings";
import {
  getAccountDocId,
  setUserDisplayName,
} from "@/infrastructure/auth/load-auth-context";
import {
  requirePermission,
  requireSystemAdminRole,
} from "@/infrastructure/auth/require-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
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
import { db } from "@/infrastructure/firestore/firestore-customer";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";
import { ACCOUNT_COLLECTION, getAccount, listAccounts } from "./accounts";
import { deleteAdminUserWithAuthCleanup } from "./admin-user-deletion";
import {
  canUpdateDisplayNameTarget,
  isLastAdminSelfDemotion,
  validateAdminUserDeletionTarget,
} from "./admin-user-policy";
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

export const adminAccountRoutes = new Hono();

adminAccountRoutes.get(
  "/admin/accounts",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.accounts.read");
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }
    const accounts = await listAccounts(organizationId);
    const accountAuthUids = accounts.map((account) => account.authUid);
    const [userByAuthUid, roles] = await Promise.all([
      getUsersByUids(accountAuthUids),
      createRoleRepository().findByOrganizationId(organizationId),
    ]);
    const roleNameById = new Map(
      roles.map((role) => [role.getRoleId(), role.getName()] as const),
    );

    const accountResponses = accounts.map((account) => {
      const userRecord = userByAuthUid.get(account.authUid) ?? null;
      const name = account.name ?? "";
      const createdAtDate = account.createdAt?.toDate() ?? new Date(0);
      const updatedAtDate = account.updatedAt?.toDate() ?? createdAtDate;

      return {
        authUid: account.authUid,
        email: userRecord?.email ?? "",
        name: name || userRecord?.email || "",
        roleId: account.roleId,
        roleName: roleNameById.get(account.roleId) ?? account.roleId,
        status: account.status === "active" ? "registered" : "pending",
        createdAt: createdAtDate.toISOString(),
        updatedAt: updatedAtDate.toISOString(),
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

adminAccountRoutes.post(
  "/admin/accounts/invite",
  postRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    const actorAccount = requireSystemAdminRole(authUser, organizationId);
    const body = await request.json();
    const { email, roleId, name, phone, isConsultant } = body;

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

    let authUid: string;
    let userRecord = await getUserByEmail(email).catch(() => null);

    if (userRecord) {
      authUid = userRecord.uid;
      // 同一組織に既にアカウントがある場合は招待失敗。
      // 別組織にのみ存在する場合はこの組織への所属を追加する（後続の set で作成）
      const existingAccount = await getAccount(organizationId, authUid);
      if (existingAccount) {
        return jsonError(
          409,
          "ACCOUNT_ALREADY_EXISTS",
          "このメールアドレスは既にこの組織に登録されています",
        );
      }
    } else {
      authUid = await createUser(email, crypto.randomUUID());
      userRecord = await getUser(authUid);
    }

    const accountId = getAccountDocId(organizationId, authUid);
    await db
      .collection(ACCOUNT_COLLECTION)
      .doc(accountId)
      .set(
        {
          authUid,
          organizationId,
          roleId: normalizedRoleId,
          name: normalizedDisplayName,
          status: userRecord.metadata.lastSignInTime ? "active" : "invited",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      );

    if (shouldCreateConsultant) {
      const repo = createConsultantRepository();
      const existing = await repo.findById(organizationId, authUid);
      if (!existing) {
        const settings =
          (await createSettingsRepository().findByOrganizationId(
            organizationId,
          )) ?? Settings.createDefault(organizationId);
        await repo.save(
          Consultant.create({
            organizationId,
            consultantId: authUid,
            profile: ConsultantProfile.create(
              normalizedDisplayName,
              "",
              [],
              typeof phone === "string" ? phone.trim() : "",
            ),
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

    return Response.json({ authUid }, { status: 201 });
  }),
);

adminAccountRoutes.post(
  "/admin/accounts/:authUid/resend-invite",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.accounts.invite.resend");
    const authUid = param("authUid");
    const userRecord = await getUser(authUid);
    const account = await getAccount(organizationId, authUid);
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
      account.roleId,
    );
    const isConsultant =
      (await createConsultantRepository().findById(organizationId, authUid)) !==
      null;

    await new ResendEmailService().sendInvitation({
      email: userRecord.email,
      roleName: roleEntity?.getName() ?? account.roleId,
      isConsultant,
      passwordResetLink: await generatePasswordResetLink(userRecord.email),
    });

    return Response.json({ success: true });
  }),
);

adminAccountRoutes.post(
  "/admin/accounts/:authUid/reset-password",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(
      authUser,
      organizationId,
      "admin.accounts.password-reset",
    );
    const authUid = param("authUid");
    const account = await getAccount(organizationId, authUid);
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const userRecord = await getUser(authUid);
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

adminAccountRoutes.patch(
  "/admin/accounts/:authUid/display-name",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    const actorAccount = requirePermission(
      authUser,
      organizationId,
      "admin.accounts.display-name.manage",
    );
    const authUid = param("authUid");
    const body = await request.json();
    const account = await getAccount(organizationId, authUid);

    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    if (
      !canUpdateDisplayNameTarget(
        actorAccount.roleId,
        authUser.authUid,
        authUid,
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

    await setUserDisplayName(organizationId, authUid, normalizedDisplayName);
    return Response.json({ success: true });
  }),
);

adminAccountRoutes.patch(
  "/admin/accounts/:authUid/role",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    const authUid = param("authUid");
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
    const account = await getAccount(organizationId, authUid);
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const activeAdminCount = (await listAccounts(organizationId)).filter(
      (account) => account.roleId === "admin" && account.status === "active",
    ).length;

    if (
      isLastAdminSelfDemotion({
        actorAuthUid: authUser.authUid,
        targetAuthUid: authUid,
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

    const accountId = getAccountDocId(organizationId, authUid);
    await db.collection(ACCOUNT_COLLECTION).doc(accountId).set(
      {
        roleId: nextRoleId,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return Response.json({ success: true });
  }),
);

adminAccountRoutes.delete(
  "/admin/accounts/:authUid",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.accounts.delete");
    const authUid = param("authUid");
    const accountId = getAccountDocId(organizationId, authUid);
    const account = await getAccount(organizationId, authUid);
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const deletionTargetValidation = validateAdminUserDeletionTarget(
      authUser.authUid,
      authUid,
    );
    if (!deletionTargetValidation.isAllowed) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        deletionTargetValidation.message ?? "Invalid user delete target",
      );
    }
    const accountDocRef = db.collection(ACCOUNT_COLLECTION).doc(accountId);
    const accountDoc = await accountDocRef.get();
    const accountData = accountDoc.data();
    if (!accountData) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }

    await deleteAdminUserWithAuthCleanup({
      authUid,
      accountData,
      countAccountsByAuthUid: async (targetAuthUid) => {
        const accounts = await db
          .collection(ACCOUNT_COLLECTION)
          .where("authUid", "==", targetAuthUid)
          .get();
        return accounts.size;
      },
      deleteAccount: async () => {
        await accountDocRef.delete();
      },
      restoreAccount: async (restorableAccountData) => {
        await accountDocRef.set(restorableAccountData);
      },
      deleteAuthUser: deleteUser,
    });

    return Response.json({ success: true });
  }),
);
