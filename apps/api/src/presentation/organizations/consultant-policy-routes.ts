import { Hono } from "hono";
import * as v from "valibot";
import { requireConsultant } from "@/infrastructure/auth/require-role";
import { verifyConsultantAuth } from "@/infrastructure/auth/verify-auth";
import {
  createGetPolicyAgreementStatusUseCase,
  createRecordPolicyAgreementUseCase,
} from "@/infrastructure/container";
import { getRoute, jsonError, noStoreJson, postRoute } from "./route-handler";

const policyTypeSchema = v.picklist([
  "terms",
  "cancellation_policy",
  "privacy_policy",
]);

const agreeBodySchema = v.object({
  items: v.pipe(
    v.array(
      v.object({
        type: policyTypeSchema,
        revisionId: v.pipe(v.string(), v.minLength(1)),
      }),
    ),
    v.minLength(1),
  ),
  agreedVia: v.optional(
    v.picklist(["reagreement_modal", "booking", "registration"]),
  ),
});

export const consultantPolicyRoutes = new Hono();

consultantPolicyRoutes.get(
  "/consultant/policies/status",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);
    const status = await createGetPolicyAgreementStatusUseCase().execute({
      organizationId,
      subjectType: "consultant",
      subjectId: authUser.authUid,
    });
    return noStoreJson(status);
  }),
);

consultantPolicyRoutes.post(
  "/consultant/policies/agree",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);
    const body = await request.json();
    const parsed = v.safeParse(agreeBodySchema, body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid agreement payload");
    }
    const agreements = await createRecordPolicyAgreementUseCase().execute({
      organizationId,
      subjectType: "consultant",
      subjectId: authUser.authUid,
      agreedVia: parsed.output.agreedVia ?? "reagreement_modal",
      items: parsed.output.items,
    });
    return Response.json({ agreements }, { status: 201 });
  }),
);
