import { Hono } from "hono";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createCreateSlotUseCase,
  createDeleteSlotUseCase,
} from "@/infrastructure/container";
import { deleteRoute, jsonError, postRoute } from "./route-handler";

export const slotRoutes = new Hono();

slotRoutes.post(
  "/slots",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    const account = authUser.accounts.find(
      (candidate) =>
        candidate.organizationId === organizationId &&
        candidate.status === "active",
    );
    if (!account) {
      throw new AuthError(
        403,
        "FORBIDDEN",
        `User does not belong to organization '${organizationId}'`,
      );
    }
    if (!account.isConsultant) {
      requirePermission(authUser, organizationId, "admin.slots.manage");
    }

    const body = await request.json();
    const { consultantId, startsAt, endsAt } = body;
    if (!consultantId || !startsAt || !endsAt) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "consultantId, startsAt, and endsAt are required",
      );
    }

    if (account.isConsultant && authUser.authUid !== consultantId) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Consultants can only create their own slots",
      );
    }

    const result = await createCreateSlotUseCase().execute({
      organizationId,
      consultantId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    });
    return Response.json(result, { status: 201 });
  }),
);

slotRoutes.delete(
  "/slots/:slotId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    const account = authUser.accounts.find(
      (candidate) =>
        candidate.organizationId === organizationId &&
        candidate.status === "active",
    );
    if (!account) {
      throw new AuthError(
        403,
        "FORBIDDEN",
        `User does not belong to organization '${organizationId}'`,
      );
    }
    if (!account.isConsultant) {
      requirePermission(authUser, organizationId, "admin.slots.manage");
    }
    await createDeleteSlotUseCase().execute({
      organizationId,
      slotId: param("slotId"),
      requesterConsultantId: account.isConsultant
        ? authUser.authUid
        : undefined,
    });
    return Response.json({ success: true });
  }),
);
