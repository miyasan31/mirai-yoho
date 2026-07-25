import { Hono } from "hono";
import * as v from "valibot";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createGetPolicyAgreementStatusUseCase,
  createRecordPolicyAgreementUseCase,
  createUserRepository,
} from "@/infrastructure/container";
import { getRoute, jsonError, noStoreJson, postRoute } from "./route-handler";

const policyTypeSchema = v.picklist(["terms", "cancellation_policy"]);

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

export const customerPolicyRoutes = new Hono();

customerPolicyRoutes.get(
  "/customer/policies/status",
  getRoute(async ({ organizationId, request }) => {
    const { authUid } = await verifyCustomerAuth(request);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      throw new AuthError(
        403,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }
    const status = await createGetPolicyAgreementStatusUseCase().execute({
      organizationId,
      subjectType: "user",
      subjectId: user.getUserId(),
    });
    return noStoreJson(status);
  }),
);

customerPolicyRoutes.post(
  "/customer/policies/agree",
  postRoute(async ({ organizationId, request }) => {
    const { authUid } = await verifyCustomerAuth(request);
    const user = await createUserRepository().findByAuthUid(authUid);
    if (!user) {
      throw new AuthError(
        403,
        "CUSTOMER_NOT_SIGNED_UP",
        "Customer has not signed up yet",
      );
    }
    const body = await request.json();
    const parsed = v.safeParse(agreeBodySchema, body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid agreement payload");
    }
    const agreements = await createRecordPolicyAgreementUseCase().execute({
      organizationId,
      subjectType: "user",
      subjectId: user.getUserId(),
      agreedVia: parsed.output.agreedVia ?? "reagreement_modal",
      items: parsed.output.items,
    });
    return Response.json({ agreements }, { status: 201 });
  }),
);
