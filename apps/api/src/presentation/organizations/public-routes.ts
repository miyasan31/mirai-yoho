import { Hono } from "hono";
import { etag } from "hono/etag";
import { Settings } from "@/domain/settings/settings";
import {
  createConsultantRepository,
  createListAvailableSlotsUseCase,
  createListPricePlanOptionsUseCase,
  createSettingsRepository,
} from "@/infrastructure/container";
import { withNoStore, withPublicShortCache } from "../cache-control";
import {
  resolveConsultantStatus,
  toConsultantStatusResponse,
} from "./consultant-status";
import { getRoute, jsonError } from "./route-handler";
import { toBookingSettingsResponse } from "./settings-response";

export const publicRoutes = new Hono();

publicRoutes.get(
  "/consultants",
  getRoute(async ({ organizationId }) => {
    const repo = createConsultantRepository();
    const [consultants, settings] = await Promise.all([
      repo.findAllActive(organizationId),
      createSettingsRepository().findByOrganizationId(organizationId),
    ]);
    const resolvedSettings = settings ?? Settings.createDefault(organizationId);

    return withNoStore(
      Response.json({
        consultants: consultants.map((c) => {
          const status = resolveConsultantStatus(
            resolvedSettings,
            c.getStatusId(),
          );
          return {
            consultantId: c.getConsultantId(),
            name: c.getProfile().getDisplayName(),
            specialties: [...c.getProfile().getSpecialties()],
            bio: c.getProfile().getBio(),
            imageUrl: c.getProfile().getImageUrl(),
            status: toConsultantStatusResponse(status),
            isActive: c.getIsActive(),
          };
        }),
      }),
    );
  }),
);

publicRoutes.get(
  "/slots",
  etag(),
  getRoute(async ({ organizationId, requestUrl, errorContext }) => {
    const consultantId = requestUrl.searchParams.get("consultantId");
    errorContext.endpoint = "GET /organizations/:organizationId/slots";
    errorContext.consultantId = consultantId;
    if (!consultantId) {
      return jsonError(400, "VALIDATION_ERROR", "consultantId is required");
    }
    const result = await createListAvailableSlotsUseCase().execute({
      organizationId,
      consultantId,
    });
    return withPublicShortCache(
      Response.json({ slots: result.slots }),
      "slots",
    );
  }),
);

publicRoutes.get(
  "/settings/public",
  etag(),
  getRoute(async ({ organizationId }) => {
    const repository = createSettingsRepository();
    const settings =
      (await repository.findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);

    return withPublicShortCache(
      Response.json(toBookingSettingsResponse(settings)),
      "settings-public",
    );
  }),
);

publicRoutes.get(
  "/price-plans",
  etag(),
  getRoute(async ({ organizationId, requestUrl }) => {
    const consultantId = requestUrl.searchParams.get("consultantId");
    if (!consultantId) {
      return jsonError(400, "VALIDATION_ERROR", "consultantId is required");
    }

    const result = await createListPricePlanOptionsUseCase().execute({
      organizationId,
      consultantId,
    });

    return withPublicShortCache(
      Response.json({ pricePlans: result.pricePlans }),
      "price-plans",
    );
  }),
);
