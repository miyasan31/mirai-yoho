import { Hono } from "hono";
import { createPricePlanSelectionId } from "@/domain/consultant-price-plan/consultant-price-plan";
import { Settings } from "@/domain/settings/settings";
import {
  createConsultantPricePlanRepository,
  createConsultantRepository,
  createSettingsRepository,
  createSlotRepository,
} from "@/infrastructure/container";
import { withNoStore, withPublicShortCache } from "../cache-control";
import {
  resolveConsultantStatus,
  toConsultantStatusResponse,
} from "./consultant-status";
import { getRoute, jsonError } from "./route-handler";
import { toBookingSettingsResponse } from "./settings-response";

function toPublicPricePlanResponse(params: { name: string; totalJPY: number }) {
  return {
    selectionId: createPricePlanSelectionId(params),
    name: params.name,
    totalJPY: params.totalJPY,
  };
}

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
  getRoute(async ({ organizationId, requestUrl, errorContext }) => {
    const consultantId = requestUrl.searchParams.get("consultantId");
    errorContext.endpoint = "GET /organizations/:organizationId/slots";
    errorContext.consultantId = consultantId;
    const repository = createSlotRepository();
    const settings =
      (await createSettingsRepository().findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);
    const businessHours = settings.getBusinessHours();

    if (consultantId) {
      const availableSlots = await repository.findAvailableByConsultantId(
        organizationId,
        consultantId,
      );
      const filteredSlots = availableSlots.filter((slot) =>
        businessHours.containsRange(
          slot.getTimeRange().getStartsAt(),
          slot.getTimeRange().getEndsAt(),
        ),
      );

      return withPublicShortCache(
        Response.json({
          slots: filteredSlots.map((s) => ({
            slotId: s.getSlotId(),
            consultantId: s.getConsultantId(),
            startsAt: s.getTimeRange().getStartsAt().toISOString(),
            endsAt: s.getTimeRange().getEndsAt().toISOString(),
            isAvailable: !s.getIsAvailable(),
          })),
        }),
        "slots",
      );
    }

    const aggregatedSlots = await repository.findAllAvailable(organizationId);
    const groupedSlots = new Map<
      string,
      { startsAt: string; endsAt: string }
    >();

    for (const slot of aggregatedSlots) {
      if (
        !businessHours.containsRange(
          slot.getTimeRange().getStartsAt(),
          slot.getTimeRange().getEndsAt(),
        )
      ) {
        continue;
      }
      const startsAt = slot.getTimeRange().getStartsAt().toISOString();
      const endsAt = slot.getTimeRange().getEndsAt().toISOString();
      const key = `${startsAt}_${endsAt}`;
      if (!groupedSlots.has(key)) {
        groupedSlots.set(key, { startsAt, endsAt });
      }
    }

    return withPublicShortCache(
      Response.json({
        aggregatedSlots: [...groupedSlots.values()],
      }),
      "slots",
    );
  }),
);

publicRoutes.get(
  "/settings/public",
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
  "/booking/price-plans",
  getRoute(async ({ organizationId, requestUrl }) => {
    const slotId = requestUrl.searchParams.get("slotId");
    const startsAt = requestUrl.searchParams.get("startsAt");
    const endsAt = requestUrl.searchParams.get("endsAt");
    const settings =
      (await createSettingsRepository().findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);
    const pricePlanRange = settings.getPricePlanRange();
    const pricePlanRepository = createConsultantPricePlanRepository();

    if (slotId) {
      const slot = await createSlotRepository().findById(
        organizationId,
        slotId,
      );
      if (!slot) {
        return withPublicShortCache(
          Response.json({ pricePlans: [] }),
          "booking-price-plans",
        );
      }
      const pricePlans = (
        await pricePlanRepository.findActiveByConsultantId(
          organizationId,
          slot.getConsultantId(),
        )
      )
        .filter((pricePlan) => pricePlanRange.contains(pricePlan.getTotalJPY()))
        .map((pricePlan) =>
          toPublicPricePlanResponse({
            name: pricePlan.getName(),
            totalJPY: pricePlan.getTotalJPY(),
          }),
        );

      return withPublicShortCache(
        Response.json({ pricePlans }),
        "booking-price-plans",
      );
    }

    if (!startsAt || !endsAt) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "slotId or startsAt/endsAt is required",
      );
    }

    const slots = await createSlotRepository().findAvailableByTimeRange(
      organizationId,
      new Date(startsAt),
      new Date(endsAt),
    );
    const consultantIds = [
      ...new Set(slots.map((slot) => slot.getConsultantId())),
    ];
    const plansByConsultant = await Promise.all(
      consultantIds.map((consultantId) =>
        pricePlanRepository.findActiveByConsultantId(
          organizationId,
          consultantId,
        ),
      ),
    );
    const uniquePlans = new Map<string, { name: string; totalJPY: number }>();
    for (const plans of plansByConsultant) {
      for (const pricePlan of plans) {
        if (!pricePlanRange.contains(pricePlan.getTotalJPY())) continue;
        uniquePlans.set(pricePlan.getSelectionId(), {
          name: pricePlan.getName(),
          totalJPY: pricePlan.getTotalJPY(),
        });
      }
    }

    return withPublicShortCache(
      Response.json({
        pricePlans: [...uniquePlans.values()].map(toPublicPricePlanResponse),
      }),
      "booking-price-plans",
    );
  }),
);
