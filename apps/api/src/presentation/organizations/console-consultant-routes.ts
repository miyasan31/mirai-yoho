import crypto from "node:crypto";
import { Hono } from "hono";
import { AppError } from "@/application/shared/app-error";
import type { Consultant } from "@/domain/consultant/consultant";
import { Settings } from "@/domain/settings/settings";
import {
  requirePermission,
  requireSystemAdminRole,
} from "@/infrastructure/auth/require-permission";
import { verifyAccountAuth } from "@/infrastructure/auth/verify-auth";
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

function toConsultantDetailResponse(params: {
  consultant: Consultant;
  settings: Settings;
  email: string;
}) {
  const { consultant, settings, email } = params;
  const profile = consultant.getProfile();
  return {
    consultantId: consultant.getConsultantId(),
    email,
    name: profile.getDisplayName(),
    bio: profile.getBio(),
    phone: profile.getPhone(),
    imageUrl: profile.getImageUrl(),
    specialties: [...profile.getSpecialties()],
    status: toConsultantStatusResponse(
      resolveConsultantStatus(settings, consultant.getStatusId()),
    ),
    isActive: consultant.getIsActive(),
    createdAt: consultant.getCreatedAt().toISOString(),
    updatedAt: consultant.getUpdatedAt().toISOString(),
  };
}

consoleConsultantRoutes.get(
  "/console/consultants",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAccountAuth(request);
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

    const consultantsWithEmail = consultants.map((c) =>
      toConsultantDetailResponse({
        consultant: c,
        settings: resolvedSettings,
        email: userByAuthUid.get(c.getConsultantId())?.email ?? "",
      }),
    );
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

consoleConsultantRoutes.get(
  "/console/consultants/:consultantId",
  getRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.consultants.read");
    const consultantId = param("consultantId");

    const [consultant, settings] = await Promise.all([
      createConsultantRepository().findById(organizationId, consultantId),
      createSettingsRepository().findByOrganizationId(organizationId),
    ]);
    if (!consultant) {
      return jsonError(404, "CONSULTANT_NOT_FOUND", "Consultant not found");
    }

    const userByAuthUid = await getUsersByUids([consultantId]);

    return noStoreJson({
      consultant: toConsultantDetailResponse({
        consultant,
        settings: settings ?? Settings.createDefault(organizationId),
        email: userByAuthUid.get(consultantId)?.email ?? "",
      }),
    });
  }),
);

consoleConsultantRoutes.post(
  "/console/consultants/invite",
  postRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAccountAuth(request);
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
          "このメールアドレスは既にこの組織の占い師として登録されています",
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
      roleName: "占い師",
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
    const authUser = await verifyAccountAuth(request);
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
    const authUser = await verifyAccountAuth(request);
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
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.consultants.manage");
    await createDeactivateConsultantUseCase().execute({
      organizationId,
      consultantId: param("consultantId"),
    });
    return Response.json({ success: true });
  }),
);
