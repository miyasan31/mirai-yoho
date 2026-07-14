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
    const accountUids = accounts.map((account) => account.uid);
    const [userByUid, roles] = await Promise.all([
      getUsersByUids(accountUids),
      createRoleRepository().findByOrganizationId(organizationId),
    ]);
    const roleNameById = new Map(
      roles.map((role) => [role.getRoleId(), role.getName()] as const),
    );

    const accountResponses = accounts.map((account) => {
      const userRecord = userByUid.get(account.uid) ?? null;
      const name = account.name ?? "";
      const createdAtDate = account.createdAt?.toDate() ?? new Date(0);
      const updatedAtDate = account.updatedAt?.toDate() ?? createdAtDate;

      return {
        uid: account.uid,
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

    let uid: string;
    let userRecord = await getUserByEmail(email).catch(() => null);

    if (userRecord) {
      uid = userRecord.uid;
      // 同一組織に既にアカウントがある場合は招待失敗。
      // 別組織にのみ存在する場合はこの組織への所属を追加する（後続の set で作成）
      const existingAccount = await getAccount(organizationId, uid);
      if (existingAccount) {
        return jsonError(
          409,
          "ACCOUNT_ALREADY_EXISTS",
          "このメールアドレスは既にこの組織に登録されています",
        );
      }
    } else {
      uid = await createUser(email, crypto.randomUUID());
      userRecord = await getUser(uid);
    }

    const accountId = getAccountDocId(organizationId, uid);
    await db
      .collection(ACCOUNT_COLLECTION)
      .doc(accountId)
      .set(
        {
          uid,
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
      const existing = await repo.findById(organizationId, uid);
      if (!existing) {
        const settings =
          (await createSettingsRepository().findByOrganizationId(
            organizationId,
          )) ?? Settings.createDefault(organizationId);
        await repo.save(
          Consultant.create({
            organizationId,
            consultantId: uid,
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
      actorUid: authUser.uid,
      actorRoleId: actorAccount.roleId,
      targetEmail: email,
      targetRoleId: normalizedRoleId,
      targetIsConsultant: shouldCreateConsultant,
      invitedAt: new Date().toISOString(),
    });

    return Response.json({ uid }, { status: 201 });
  }),
);

adminAccountRoutes.post(
  "/admin/accounts/:uid/resend-invite",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.accounts.invite.resend");
    const uid = param("uid");
    const userRecord = await getUser(uid);
    const account = await getAccount(organizationId, uid);
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
      (await createConsultantRepository().findById(organizationId, uid)) !==
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
  "/admin/accounts/:uid/reset-password",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(
      authUser,
      organizationId,
      "admin.accounts.password-reset",
    );
    const uid = param("uid");
    const account = await getAccount(organizationId, uid);
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const userRecord = await getUser(uid);
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
  "/admin/accounts/:uid/display-name",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    const actorAccount = requirePermission(
      authUser,
      organizationId,
      "admin.accounts.display-name.manage",
    );
    const uid = param("uid");
    const body = await request.json();
    const account = await getAccount(organizationId, uid);

    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    if (!canUpdateDisplayNameTarget(actorAccount.roleId, authUser.uid, uid)) {
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

    await setUserDisplayName(organizationId, uid, normalizedDisplayName);
    return Response.json({ success: true });
  }),
);

adminAccountRoutes.patch(
  "/admin/accounts/:uid/role",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireSystemAdminRole(authUser, organizationId);
    const uid = param("uid");
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
    const account = await getAccount(organizationId, uid);
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const activeAdminCount = (await listAccounts(organizationId)).filter(
      (account) => account.roleId === "admin" && account.status === "active",
    ).length;

    if (
      isLastAdminSelfDemotion({
        actorUid: authUser.uid,
        targetUid: uid,
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

    const accountId = getAccountDocId(organizationId, uid);
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
  "/admin/accounts/:uid",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.accounts.delete");
    const uid = param("uid");
    const accountId = getAccountDocId(organizationId, uid);
    const account = await getAccount(organizationId, uid);
    if (!account) {
      return jsonError(404, "NOT_FOUND", "Account not found");
    }
    const deletionTargetValidation = validateAdminUserDeletionTarget(
      authUser.uid,
      uid,
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
      uid,
      accountData,
      countAccountsByUid: async (targetUid) => {
        const accounts = await db
          .collection(ACCOUNT_COLLECTION)
          .where("uid", "==", targetUid)
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
