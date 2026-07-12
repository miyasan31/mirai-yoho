import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import { Hono } from "hono";
import type { ConsultantStatusProps } from "@/domain/organization-settings/consultant-status";
import { OrganizationSettings } from "@/domain/organization-settings/organization-settings";
import { requireOrganizationPermission } from "@/infrastructure/auth/require-organization-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createConsultantRepository,
  createOrganizationSettingsRepository,
  createSlotRepository,
} from "@/infrastructure/container";
import { toConsultantStatusesResponse } from "./consultant-status";
import { getRoute, jsonError, noStoreJson, patchRoute } from "./route-handler";
import { toBookingSettingsResponse } from "./settings-response";

function parseConsultantStatusesBody(
  body: unknown,
): { statuses: ConsultantStatusProps[]; defaultStatusId: string } | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as {
    consultantStatuses?: unknown;
    defaultConsultantStatusId?: unknown;
  };
  if (
    !Array.isArray(payload.consultantStatuses) ||
    typeof payload.defaultConsultantStatusId !== "string"
  ) {
    return null;
  }
  const statuses = payload.consultantStatuses.map((status) => {
    if (!status || typeof status !== "object") {
      return { statusId: "", name: "" };
    }
    const source = status as { statusId?: unknown; name?: unknown };
    return {
      statusId: typeof source.statusId === "string" ? source.statusId : "",
      name: typeof source.name === "string" ? source.name : "",
    };
  });
  return {
    statuses,
    defaultStatusId: payload.defaultConsultantStatusId,
  };
}

export const adminSettingsRoutes = new Hono();

adminSettingsRoutes.get(
  "/admin/settings/booking",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireOrganizationPermission(
      authUser,
      organizationId,
      "admin.settings.read",
    );
    const settings =
      await createOrganizationSettingsRepository().findByOrganizationId(
        organizationId,
      );
    const resolvedSettings =
      settings ?? OrganizationSettings.createDefault(organizationId);
    return noStoreJson(toBookingSettingsResponse(resolvedSettings));
  }),
);

adminSettingsRoutes.get(
  "/admin/settings/consultant-statuses",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireOrganizationPermission(
      authUser,
      organizationId,
      "admin.settings.read",
    );
    const settings =
      await createOrganizationSettingsRepository().findByOrganizationId(
        organizationId,
      );
    const resolvedSettings =
      settings ?? OrganizationSettings.createDefault(organizationId);
    return noStoreJson(toConsultantStatusesResponse(resolvedSettings));
  }),
);

adminSettingsRoutes.patch(
  "/admin/settings/consultant-statuses",
  patchRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireOrganizationPermission(
      authUser,
      organizationId,
      "admin.consultants.status.manage",
    );
    const body = await request.json();
    const parsed = parseConsultantStatusesBody(body);
    if (!parsed) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "consultantStatuses and defaultConsultantStatusId are required",
      );
    }

    const settingsRepository = createOrganizationSettingsRepository();
    const settings =
      (await settingsRepository.findByOrganizationId(organizationId)) ??
      OrganizationSettings.createDefault(organizationId);
    settings.updateConsultantStatuses(parsed.statuses, parsed.defaultStatusId);
    await settingsRepository.save(settings);

    const statusIds = new Set(
      settings.getConsultantStatuses().map((status) => status.statusId),
    );
    const consultantRepository = createConsultantRepository();
    const consultants = await consultantRepository.findAll(organizationId);
    await Promise.all(
      consultants
        .filter((consultant) => !statusIds.has(consultant.getStatusId()))
        .map((consultant) => {
          consultant.changeStatus(settings.getDefaultConsultantStatusId());
          return consultantRepository.save(consultant);
        }),
    );

    return Response.json(toConsultantStatusesResponse(settings));
  }),
);

adminSettingsRoutes.patch(
  "/admin/settings/booking",
  patchRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireOrganizationPermission(
      authUser,
      organizationId,
      "admin.settings.manage",
    );
    const body = await request.json();
    if (typeof body.consultantSelectionEnabled !== "boolean") {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "consultantSelectionEnabled must be a boolean",
      );
    }

    const repository = createOrganizationSettingsRepository();
    const settings =
      (await repository.findByOrganizationId(organizationId)) ??
      OrganizationSettings.createDefault(organizationId);
    const nextBusinessHours = BusinessHours.create(
      (body.businessHours ??
        settings.getBusinessHours().toJSON()) as ReturnType<
        BusinessHours["toJSON"]
      >,
    );
    const nextPricePlanRange =
      body.pricePlanRange ?? settings.getPricePlanRange().toJSON();
    settings.updateConsultantSelectionEnabled(body.consultantSelectionEnabled);
    settings.updateBusinessHours(nextBusinessHours.toJSON());
    settings.updatePricePlanRange(nextPricePlanRange);
    await repository.save(settings);

    const slotRepository = createSlotRepository();
    const now = new Date();
    const allSlots = await slotRepository.findByOrganizationId(organizationId);
    const removableSlotIds = allSlots
      .filter((slot) => {
        if (slot.getIsAvailable()) return false;
        if (slot.getTimeRange().getStartsAt() <= now) return false;
        return !nextBusinessHours.containsRange(
          slot.getTimeRange().getStartsAt(),
          slot.getTimeRange().getEndsAt(),
        );
      })
      .map((slot) => slot.getSlotId());
    await Promise.all(
      removableSlotIds.map((slotId) =>
        slotRepository.delete(organizationId, slotId),
      ),
    );

    return Response.json(toBookingSettingsResponse(settings));
  }),
);
