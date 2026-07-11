import { Hono } from "hono";
import { Consultant } from "@/domain/consultant/consultant";
import { ConsultantProfile } from "@/domain/consultant/consultant-profile";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import { requireOrganizationPermission } from "@/infrastructure/auth/require-organization-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createConsultantRepository,
  createOrganizationSettingsRepository,
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
    requireOrganizationPermission(
      authUser,
      organizationId,
      "admin.consultants.read",
    );
    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }
    const repo = createConsultantRepository();
    const [consultants, settings] = await Promise.all([
      repo.findAllActive(organizationId),
      createOrganizationSettingsRepository().findByOrganizationId(
        organizationId,
      ),
    ]);
    const resolvedSettings =
      settings ?? OrganizationSettings.createDefault(organizationId);
    const userByUid = await getUsersByUids(
      consultants.map((consultant) => consultant.getConsultantId()),
    );

    const consultantsWithEmail = consultants.map((c) => {
      const userRecord = userByUid.get(c.getConsultantId()) ?? null;
      return {
        consultantId: c.getConsultantId(),
        email: userRecord?.email ?? "",
        name: c.getProfile().getDisplayName(),
        bio: c.getProfile().getBio(),
        phone: c.getProfile().getPhone(),
        imageUrl: c.getProfile().getImageUrl(),
        specialties: [...c.getProfile().getSpecialties()],
        zoomRoomIds: c.getZoomRoomIds(),
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
    requireOrganizationPermission(
      authUser,
      organizationId,
      "admin.consultants.manage",
    );
    const body = await request.json();
    const { consultantId, name, bio, specialties, phone, zoomRoomIds } = body;
    if (!consultantId || !name) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "consultantId and name are required",
      );
    }
    if (body.statusId !== undefined) {
      requireOrganizationPermission(
        authUser,
        organizationId,
        "admin.consultants.status.manage",
      );
    }

    const settings =
      (await createOrganizationSettingsRepository().findByOrganizationId(
        organizationId,
      )) ?? OrganizationSettings.createDefault(organizationId);
    const statusId = body.statusId ?? settings.getDefaultConsultantStatusId();
    if (
      typeof statusId !== "string" ||
      !settings.findConsultantStatus(statusId)
    ) {
      return jsonError(400, "VALIDATION_ERROR", "statusId is invalid");
    }

    const consultant = Consultant.create({
      organizationId,
      consultantId,
      profile: ConsultantProfile.create(
        name,
        bio ?? "",
        specialties ?? [],
        phone ?? "",
      ),
      zoomRoomIds: zoomRoomIds ?? [],
      statusId,
    });

    await createConsultantRepository().save(consultant);
    return Response.json({ consultantId }, { status: 201 });
  }),
);

adminConsultantRoutes.patch(
  "/admin/consultants/:consultantId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireOrganizationPermission(
      authUser,
      organizationId,
      "admin.consultants.manage",
    );
    const consultantId = param("consultantId");
    const body = await request.json();
    const repo = createConsultantRepository();
    const consultant = await repo.findById(organizationId, consultantId);
    if (!consultant) {
      return jsonError(404, "NOT_FOUND", "Consultant not found");
    }

    if (body.name) {
      consultant.updateProfile(
        ConsultantProfile.create(
          body.name,
          body.bio ?? consultant.getProfile().getBio(),
          body.specialties ?? [...consultant.getProfile().getSpecialties()],
          body.phone ?? consultant.getProfile().getPhone(),
          consultant.getProfile().getImageUrl(),
        ),
      );
    }

    if (body.zoomRoomIds) {
      consultant.assignZoomRooms(body.zoomRoomIds);
    }

    if (body.statusId !== undefined) {
      requireOrganizationPermission(
        authUser,
        organizationId,
        "admin.consultants.status.manage",
      );
      const settings =
        (await createOrganizationSettingsRepository().findByOrganizationId(
          organizationId,
        )) ?? OrganizationSettings.createDefault(organizationId);
      if (
        typeof body.statusId !== "string" ||
        !settings.findConsultantStatus(body.statusId)
      ) {
        return jsonError(400, "VALIDATION_ERROR", "statusId is invalid");
      }
      consultant.changeStatus(body.statusId);
    }

    await repo.save(consultant);
    return Response.json({ success: true });
  }),
);

adminConsultantRoutes.delete(
  "/admin/consultants/:consultantId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireOrganizationPermission(
      authUser,
      organizationId,
      "admin.consultants.manage",
    );
    const repo = createConsultantRepository();
    const consultant = await repo.findById(
      organizationId,
      param("consultantId"),
    );
    if (!consultant) {
      return jsonError(404, "NOT_FOUND", "Consultant not found");
    }
    consultant.deactivate();
    await repo.save(consultant);
    return Response.json({ success: true });
  }),
);
