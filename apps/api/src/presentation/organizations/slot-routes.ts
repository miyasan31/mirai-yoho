import { Hono } from "hono";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { getConsultant } from "@/infrastructure/auth/require-role";
import { verifyEitherAuth } from "@/infrastructure/auth/verify-auth";
import {
  createCreateSlotUseCase,
  createDeleteSlotUseCase,
  createGetPolicyAgreementStatusUseCase,
} from "@/infrastructure/container";
import { deleteRoute, jsonError, postRoute } from "./route-handler";

export const slotRoutes = new Hono();

slotRoutes.post(
  "/slots",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyEitherAuth(request);
    const consultant = getConsultant(authUser, organizationId);
    if (!consultant) {
      requirePermission(authUser, organizationId, "console.slots.manage");
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

    if (consultant && authUser.authUid !== consultantId) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Consultants can only create their own slots",
      );
    }

    // 相談員本人が枠を追加する場合、最新ポリシーへの同意が済んでいることを要求する
    if (consultant) {
      const status = await createGetPolicyAgreementStatusUseCase().execute({
        organizationId,
        subjectType: "consultant",
        subjectId: authUser.authUid,
      });
      if (status.needsReagreement) {
        return jsonError(
          403,
          "POLICY_REAGREEMENT_REQUIRED",
          "最新の利用規約・ポリシーに同意するまで、新しい予約枠を追加できません",
        );
      }
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
    const authUser = await verifyEitherAuth(request);
    const consultant = getConsultant(authUser, organizationId);
    if (!consultant) {
      requirePermission(authUser, organizationId, "console.slots.manage");
    }
    await createDeleteSlotUseCase().execute({
      organizationId,
      slotId: param("slotId"),
      requesterConsultantId: consultant ? authUser.authUid : undefined,
    });
    return Response.json({ success: true });
  }),
);
