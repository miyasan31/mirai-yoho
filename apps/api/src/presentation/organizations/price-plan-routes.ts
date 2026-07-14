import { Hono } from "hono";
import { toPricePlanOutput } from "@/application/price-plan/create-price-plan-use-case";
import { Settings } from "@/domain/settings/settings";
import { requireRole } from "@/infrastructure/auth/require-role";
import { verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createCreatePricePlanUseCase,
  createPricePlanRepository,
  createSettingsRepository,
  createUpdatePricePlanUseCase,
} from "@/infrastructure/container";
import {
  deleteRoute,
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

export const pricePlanRoutes = new Hono();

pricePlanRoutes.get(
  "/consultant/price-plans",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const settings =
      (await createSettingsRepository().findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);
    const pricePlanRange = settings.getPricePlanRange();
    const pricePlans = await createPricePlanRepository().findByConsultantId(
      organizationId,
      authUser.uid,
    );

    return noStoreJson({
      pricePlans: pricePlans.map((pricePlan) =>
        toPricePlanOutput({
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

pricePlanRoutes.post(
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

    const result = await createCreatePricePlanUseCase().execute({
      organizationId,
      consultantId: authUser.uid,
      name: body.name,
      totalJPY: body.totalJPY,
    });

    return Response.json(result, { status: 201 });
  }),
);

pricePlanRoutes.patch(
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

    await createUpdatePricePlanUseCase().execute({
      organizationId,
      consultantId: authUser.uid,
      pricePlanId: param("pricePlanId"),
      name: body.name,
      restore: body.restore,
    });

    return Response.json({ success: true });
  }),
);

pricePlanRoutes.delete(
  "/consultant/price-plans/:pricePlanId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    requireRole(authUser, organizationId, "consultant");
    const pricePlan = await createPricePlanRepository().findById(
      organizationId,
      param("pricePlanId"),
    );
    if (!pricePlan || pricePlan.getConsultantId() !== authUser.uid) {
      return jsonError(404, "PRICE_PLAN_NOT_FOUND", "Plan not found");
    }
    pricePlan.delete();
    await createPricePlanRepository().save(pricePlan);
    return Response.json({ success: true });
  }),
);
