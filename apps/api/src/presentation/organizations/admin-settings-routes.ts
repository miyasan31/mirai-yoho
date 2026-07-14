import { Hono } from "hono";
import type { ConsultantStatusProps } from "@/domain/settings/consultant-status";
import { Settings } from "@/domain/settings/settings";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createSettingsRepository,
  createUpdateBookingSettingsUseCase,
  createUpdateConsultantStatusesUseCase,
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
    requirePermission(authUser, organizationId, "admin.settings.read");
    const settings =
      await createSettingsRepository().findByOrganizationId(organizationId);
    const resolvedSettings = settings ?? Settings.createDefault(organizationId);
    return noStoreJson(toBookingSettingsResponse(resolvedSettings));
  }),
);

adminSettingsRoutes.get(
  "/admin/settings/consultant-statuses",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.settings.read");
    const settings =
      await createSettingsRepository().findByOrganizationId(organizationId);
    const resolvedSettings = settings ?? Settings.createDefault(organizationId);
    return noStoreJson(toConsultantStatusesResponse(resolvedSettings));
  }),
);

adminSettingsRoutes.patch(
  "/admin/settings/consultant-statuses",
  patchRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requirePermission(
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
    const settings = await createUpdateConsultantStatusesUseCase().execute({
      organizationId,
      statuses: parsed.statuses,
      defaultStatusId: parsed.defaultStatusId,
    });
    return Response.json(toConsultantStatusesResponse(settings));
  }),
);

adminSettingsRoutes.patch(
  "/admin/settings/booking",
  patchRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requirePermission(authUser, organizationId, "admin.settings.manage");
    const body = await request.json();
    if (typeof body.consultantSelectionEnabled !== "boolean") {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "consultantSelectionEnabled must be a boolean",
      );
    }
    const settings = await createUpdateBookingSettingsUseCase().execute({
      organizationId,
      consultantSelectionEnabled: body.consultantSelectionEnabled,
      businessHours: body.businessHours,
      pricePlanRange: body.pricePlanRange,
    });
    return Response.json(toBookingSettingsResponse(settings));
  }),
);
