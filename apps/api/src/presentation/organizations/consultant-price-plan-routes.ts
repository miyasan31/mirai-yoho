import { Hono } from "hono";
import { toConsultantPricePlanOutput } from "@/application/consultant-price-plan/create-consultant-price-plan-use-case";
import { Settings } from "@/domain/settings/settings";
import { requireRole } from "@/infrastructure/auth/require-role";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createConsultantPricePlanRepository,
  createCreateConsultantPricePlanUseCase,
  createSettingsRepository,
  createUpdateConsultantPricePlanUseCase,
} from "@/infrastructure/container";
import {
  deleteRoute,
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

export const consultantPricePlanRoutes = new Hono();

consultantPricePlanRoutes.get(
  "/consultant/price-plans",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const settings =
      (await createSettingsRepository().findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);
    const pricePlanRange = settings.getPricePlanRange();
    const pricePlans =
      await createConsultantPricePlanRepository().findByConsultantId(
        organizationId,
        authUser.uid,
      );

    return noStoreJson({
      pricePlans: pricePlans.map((pricePlan) =>
        toConsultantPricePlanOutput({
          pricePlan,
          isWithinCurrentRange: pricePlanRange.contains(
            pricePlan.getTotalJPY(),
          ),
        }),
      ),
      pricePlanRange: pricePlanRange.toJSON(),
    });
  }),
);

consultantPricePlanRoutes.post(
  "/consultant/price-plans",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const body = await request.json();
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "name is required");
    }
    if (!Number.isInteger(body.totalJPY)) {
      return jsonError(400, "VALIDATION_ERROR", "totalJPY must be an integer");
    }

    const result = await createCreateConsultantPricePlanUseCase().execute({
      organizationId,
      consultantId: authUser.uid,
      name: body.name,
      totalJPY: body.totalJPY,
    });

    return Response.json(result, { status: 201 });
  }),
);

consultantPricePlanRoutes.patch(
  "/consultant/price-plans/:pricePlanId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const body = await request.json();
    if (
      body.name !== undefined &&
      (typeof body.name !== "string" || body.name.trim().length === 0)
    ) {
      return jsonError(400, "VALIDATION_ERROR", "name is required");
    }
    if (body.restore !== undefined && typeof body.restore !== "boolean") {
      return jsonError(400, "VALIDATION_ERROR", "restore must be a boolean");
    }

    await createUpdateConsultantPricePlanUseCase().execute({
      organizationId,
      consultantId: authUser.uid,
      pricePlanId: param("pricePlanId"),
      name: body.name,
      restore: body.restore,
    });

    return Response.json({ success: true });
  }),
);

consultantPricePlanRoutes.delete(
  "/consultant/price-plans/:pricePlanId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const pricePlan = await createConsultantPricePlanRepository().findById(
      organizationId,
      param("pricePlanId"),
    );
    if (!pricePlan || pricePlan.getConsultantId() !== authUser.uid) {
      return jsonError(404, "PRICE_PLAN_NOT_FOUND", "Plan not found");
    }
    pricePlan.delete();
    await createConsultantPricePlanRepository().save(pricePlan);
    return Response.json({ success: true });
  }),
);
