import { Hono } from "hono";
import * as v from "valibot";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { verifyAccountAuth } from "@/infrastructure/auth/verify-auth";
import {
  createCreatePolicyRevisionDraftUseCase,
  createGetPolicyDiffUseCase,
  createGetPolicyRevisionUseCase,
  createListPolicyRevisionsUseCase,
  createPublishPolicyRevisionUseCase,
  createUpdatePolicyRevisionDraftUseCase,
} from "@/infrastructure/container";
import {
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

const policyTypeSchema = v.picklist([
  "user_terms",
  "user_cancellation_policy",
  "user_privacy_policy",
  "consultant_terms",
  "consultant_privacy_policy",
]);

const createDraftBodySchema = v.object({
  version: v.pipe(v.string(), v.minLength(1), v.maxLength(40)),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(120)),
  body: v.pipe(v.string(), v.maxLength(200_000)),
});

const updateDraftBodySchema = v.object({
  version: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(40))),
  title: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(120))),
  body: v.optional(v.pipe(v.string(), v.maxLength(200_000))),
});

const publishBodySchema = v.object({
  effectiveFrom: v.pipe(v.string(), v.isoTimestamp()),
});

function parsePolicyType(raw: string) {
  return v.safeParse(policyTypeSchema, raw);
}

export const consolePolicyRoutes = new Hono();

consolePolicyRoutes.get(
  "/console/policies/:type",
  getRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.policies.read");
    const typeParsed = parsePolicyType(param("type"));
    if (!typeParsed.success) {
      return jsonError(400, "INVALID_POLICY_TYPE", "Unknown policy type");
    }
    const revisions = await createListPolicyRevisionsUseCase().execute({
      organizationId,
      type: typeParsed.output,
    });
    return noStoreJson({ revisions });
  }),
);

consolePolicyRoutes.get(
  "/console/policies/:type/diff",
  getRoute(async ({ organizationId, request, param, requestUrl }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.policies.read");
    const typeParsed = parsePolicyType(param("type"));
    if (!typeParsed.success) {
      return jsonError(400, "INVALID_POLICY_TYPE", "Unknown policy type");
    }
    const toRevisionId = requestUrl.searchParams.get("to");
    const fromRevisionId = requestUrl.searchParams.get("from");
    if (!toRevisionId) {
      return jsonError(400, "VALIDATION_ERROR", "`to` query is required");
    }
    const diff = await createGetPolicyDiffUseCase().execute({
      organizationId,
      fromRevisionId,
      toRevisionId,
    });
    return noStoreJson(diff);
  }),
);

consolePolicyRoutes.get(
  "/console/policies/:type/:revisionId",
  getRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.policies.read");
    const revision = await createGetPolicyRevisionUseCase().execute({
      organizationId,
      revisionId: param("revisionId"),
    });
    return noStoreJson(revision);
  }),
);

consolePolicyRoutes.post(
  "/console/policies/:type/drafts",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.policies.manage");
    const typeParsed = parsePolicyType(param("type"));
    if (!typeParsed.success) {
      return jsonError(400, "INVALID_POLICY_TYPE", "Unknown policy type");
    }
    const body = await request.json();
    const parsed = v.safeParse(createDraftBodySchema, body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid policy draft payload");
    }
    const revision = await createCreatePolicyRevisionDraftUseCase().execute({
      organizationId,
      type: typeParsed.output,
      version: parsed.output.version,
      title: parsed.output.title,
      body: parsed.output.body,
      createdBy: authUser.authUid,
    });
    return Response.json(revision, { status: 201 });
  }),
);

consolePolicyRoutes.patch(
  "/console/policies/:type/:revisionId",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.policies.manage");
    const body = await request.json();
    const parsed = v.safeParse(updateDraftBodySchema, body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid policy draft payload");
    }
    const revision = await createUpdatePolicyRevisionDraftUseCase().execute({
      organizationId,
      revisionId: param("revisionId"),
      version: parsed.output.version,
      title: parsed.output.title,
      body: parsed.output.body,
    });
    return Response.json(revision);
  }),
);

consolePolicyRoutes.post(
  "/console/policies/:type/:revisionId/publish",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.policies.manage");
    const body = await request.json();
    const parsed = v.safeParse(publishBodySchema, body);
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Invalid publish payload");
    }
    const revision = await createPublishPolicyRevisionUseCase().execute({
      organizationId,
      revisionId: param("revisionId"),
      effectiveFrom: new Date(parsed.output.effectiveFrom),
    });
    return Response.json(revision);
  }),
);
