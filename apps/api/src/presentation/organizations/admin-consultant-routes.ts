import { Hono } from "hono";
import { Settings } from "@/domain/settings/settings";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createConsultantRepository,
  createCreateConsultantUseCase,
  createDeactivateConsultantUseCase,
  createSettingsRepository,
  createUpdateConsultantUseCase,
} from "@/infrastructure/container";
import { getUsersByUids } from "@/infrastructure/firebase/firebase-auth-admin";
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

export const adminConsultantRoutes = new Hono();

adminConsultantRoutes.get(
  "/admin/consultants",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.consultants.read");
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

adminConsultantRoutes.post(
  "/admin/consultants",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.consultants.manage");
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
        "admin.consultants.status.manage",
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

adminConsultantRoutes.patch(
  "/admin/consultants/:consultantId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.consultants.manage");
    const body = await request.json();
    if (body.statusId !== undefined) {
      requirePermission(
        authUser,
        organizationId,
        "admin.consultants.status.manage",
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

adminConsultantRoutes.delete(
  "/admin/consultants/:consultantId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.consultants.manage");
    await createDeactivateConsultantUseCase().execute({
      organizationId,
      consultantId: param("consultantId"),
    });
    return Response.json({ success: true });
  }),
);
