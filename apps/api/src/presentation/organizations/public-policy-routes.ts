import { Hono } from "hono";
import * as v from "valibot";
import { createGetLatestPublishedPolicyUseCase } from "@/infrastructure/container";
import { getRoute, jsonError, noStoreJson } from "./route-handler";

const policyTypeSchema = v.picklist(["terms", "cancellation_policy"]);

export const publicPolicyRoutes = new Hono();

publicPolicyRoutes.get(
  "/policies/:type/latest",
  getRoute(async ({ organizationId, param }) => {
    const typeParsed = v.safeParse(policyTypeSchema, param("type"));
    if (!typeParsed.success) {
      return jsonError(400, "INVALID_POLICY_TYPE", "Unknown policy type");
    }
    const revision = await createGetLatestPublishedPolicyUseCase().execute({
      organizationId,
      type: typeParsed.output,
    });
    return noStoreJson(revision);
  }),
);
