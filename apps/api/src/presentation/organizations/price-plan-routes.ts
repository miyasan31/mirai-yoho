import { Hono } from "hono";
import { toPricePlanOutput } from "@/application/price-plan/create-price-plan-use-case";
import { Settings } from "@/domain/settings/settings";
import { requireConsultant } from "@/infrastructure/auth/require-role";
import { verifyConsultantAuth } from "@/infrastructure/auth/verify-auth";
import {
  createArchivePricePlanUseCase,
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
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);
    const settings =
      (await createSettingsRepository().findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);
    const pricePlanRange = settings.getPricePlanRange();
    const pricePlans = await createPricePlanRepository().findByConsultantId(
      organizationId,
      authUser.authUid,
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
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);
    const body = await request.json();
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return jsonError(400, "VALIDATION_ERROR", "name is required");
    }
    if (!Number.isInteger(body.totalJPY)) {
      return jsonError(400, "VALIDATION_ERROR", "totalJPY must be an integer");
    }

    const result = await createCreatePricePlanUseCase().execute({
      organizationId,
      consultantId: authUser.authUid,
      name: body.name,
      totalJPY: body.totalJPY,
    });

    return Response.json(result, { status: 201 });
  }),
);

pricePlanRoutes.patch(
  "/consultant/price-plans/:pricePlanId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);
    const body = await request.json();
    if (
      body.name !== undefined &&
      (typeof body.name !== "string" || body.name.trim().length === 0)
    ) {
      return jsonError(400, "VALIDATION_ERROR", "name is required");
    }
    if (body.unarchive !== undefined && typeof body.unarchive !== "boolean") {
      return jsonError(400, "VALIDATION_ERROR", "unarchive must be a boolean");
    }

    await createUpdatePricePlanUseCase().execute({
      organizationId,
      consultantId: authUser.authUid,
      pricePlanId: param("pricePlanId"),
      name: body.name,
      unarchive: body.unarchive,
    });

    return Response.json({ success: true });
  }),
);

pricePlanRoutes.delete(
  "/consultant/price-plans/:pricePlanId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);
    await createArchivePricePlanUseCase().execute({
      organizationId,
      consultantId: authUser.authUid,
      pricePlanId: param("pricePlanId"),
    });
    return Response.json({ success: true });
  }),
);
