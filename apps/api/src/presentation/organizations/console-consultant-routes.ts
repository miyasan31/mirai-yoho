import crypto from "node:crypto";
import { Hono } from "hono";
import { AppError } from "@/application/shared/app-error";
import { Settings } from "@/domain/settings/settings";
import {
  requirePermission,
  requireSystemAdminRole,
} from "@/infrastructure/auth/require-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createConsultantRepository,
  createCreateConsultantUseCase,
  createDeactivateConsultantUseCase,
  createSettingsRepository,
  createUpdateConsultantUseCase,
} from "@/infrastructure/container";
import {
  createUser,
  generatePasswordResetLink,
  getUser,
  getUserByEmail,
  getUsersByUids,
} from "@/infrastructure/firebase/firebase-auth-admin";
import { ResendEmailService } from "@/infrastructure/resend/resend-email-service";
import {
  resolveConsultantStatus,
  toConsultantStatusResponse,
} from "./consultant-status";
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

export const consoleConsultantRoutes = new Hono();

consoleConsultantRoutes.get(
  "/console/consultants",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.consultants.read");
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }
    const repo = createConsultantRepository();
    const [consultants, settings] = await Promise.all([
      repo.findAllActive(organizationId),
      createSettingsRepository().findByOrganizationId(organizationId),
    ]);
    const resolvedSettings = settings ?? Settings.createDefault(organizationId);
    const userByAuthUid = await getUsersByUids(
      consultants.map((consultant) => consultant.getConsultantId()),
    );

    const consultantsWithEmail = consultants.map((c) => {
      const userRecord = userByAuthUid.get(c.getConsultantId()) ?? null;
      return {
        consultantId: c.getConsultantId(),
        email: userRecord?.email ?? "",
        name: c.getProfile().getDisplayName(),
        bio: c.getProfile().getBio(),
        phone: c.getProfile().getPhone(),
        imageUrl: c.getProfile().getImageUrl(),
        specialties: [...c.getProfile().getSpecialties()],
        status: toConsultantStatusResponse(
          resolveConsultantStatus(resolvedSettings, c.getStatusId()),
        ),
        isActive: c.getIsActive(),
        createdAt: c.getCreatedAt().toISOString(),
        updatedAt: c.getUpdatedAt().toISOString(),
      };
    });
    const sortedConsultants = sortByTimestampDesc(
      consultantsWithEmail,
      listQueryParams.sortBy,
    );
    const { items, pagination } = paginateArray(
      sortedConsultants,
      listQueryParams,
    );

    return noStoreJson({ consultants: items, pagination });
  }),
);

consoleConsultantRoutes.post(
  "/console/consultants/invite",
  postRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    const actorAccount = requireSystemAdminRole(authUser, organizationId);
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== "string") {
      return jsonError(400, "VALIDATION_ERROR", "email is required");
    }
    if (!name || typeof name !== "string") {
      return jsonError(400, "VALIDATION_ERROR", "name is required");
    }
    const normalizedDisplayName = name.trim();
    if (!normalizedDisplayName) {
      return jsonError(400, "VALIDATION_ERROR", "name must not be empty");
    }

    const consultantRepository = createConsultantRepository();
    let consultantId: string;
    const userRecord = await getUserByEmail(email).catch(() => null);

    if (userRecord) {
      consultantId = userRecord.uid;
      const existingConsultant = await consultantRepository.findById(
        organizationId,
        consultantId,
      );
      if (existingConsultant) {
        throw new AppError(
          409,
          "CONSULTANT_ALREADY_EXISTS",
          "このメールアドレスは既にこの組織の相談員として登録されています",
        );
      }
    } else {
      consultantId = await createUser(email, crypto.randomUUID());
      await getUser(consultantId);
    }

    await createCreateConsultantUseCase().execute({
      organizationId,
      consultantId,
      name: normalizedDisplayName,
    });

    const passwordResetLink = await generatePasswordResetLink(email);
    await new ResendEmailService().sendInvitation({
      email,
      roleName: "相談員",
      isConsultant: true,
      passwordResetLink,
    });

    console.info("Consultant invited", {
      category: "security-audit",
      endpoint: `POST ${requestUrl.pathname}`,
      organizationId,
      actorAuthUid: authUser.authUid,
      actorRoleId: actorAccount.roleId,
      targetEmail: email,
      invitedAt: new Date().toISOString(),
    });

    return Response.json({ consultantId }, { status: 201 });
  }),
);

consoleConsultantRoutes.post(
  "/console/consultants",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.consultants.manage");
    const body = await request.json();
    const { consultantId, name, bio, specialties, phone } = body;
    if (!consultantId || !name) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "consultantId and name are required",
      );
    }
    if (body.statusId !== undefined) {
      requirePermission(
        authUser,
        organizationId,
        "console.consultants.status.manage",
      );
    }

    const result = await createCreateConsultantUseCase().execute({
      organizationId,
      consultantId,
      name,
      bio,
      specialties,
      phone,
      statusId: body.statusId,
    });
    return Response.json(result, { status: 201 });
  }),
);

consoleConsultantRoutes.patch(
  "/console/consultants/:consultantId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.consultants.manage");
    const body = await request.json();
    if (body.statusId !== undefined) {
      requirePermission(
        authUser,
        organizationId,
        "console.consultants.status.manage",
      );
    }
    await createUpdateConsultantUseCase().execute({
      organizationId,
      consultantId: param("consultantId"),
      name: body.name,
      bio: body.bio,
      specialties: body.specialties,
      phone: body.phone,
      statusId: body.statusId,
    });
    return Response.json({ success: true });
  }),
);

consoleConsultantRoutes.delete(
  "/console/consultants/:consultantId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "console.consultants.manage");
    await createDeactivateConsultantUseCase().execute({
      organizationId,
      consultantId: param("consultantId"),
    });
    return Response.json({ success: true });
  }),
);
