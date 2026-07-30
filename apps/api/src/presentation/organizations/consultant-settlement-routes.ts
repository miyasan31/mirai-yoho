import { Hono } from "hono";
import * as v from "valibot";
import { requireConsultant } from "@/infrastructure/auth/require-role";
import { verifyConsultantAuth } from "@/infrastructure/auth/verify-auth";
import { createGetConsultantSettlementStatementUseCase } from "@/infrastructure/container";
import { getRoute, jsonError, noStoreJson } from "./route-handler";

const settlementStatementQuerySchema = v.object({
  month: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}$/)),
  usesOfficeAddress: v.picklist(["true", "false"]),
});

export const consultantSettlementRoutes = new Hono();

consultantSettlementRoutes.get(
  "/consultant/settlement-statement",
  getRoute(async ({ organizationId, request, requestUrl }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);

    const parsed = v.safeParse(settlementStatementQuerySchema, {
      month: requestUrl.searchParams.get("month") ?? "",
      usesOfficeAddress:
        requestUrl.searchParams.get("uses-office-address") ?? "false",
    });
    if (!parsed.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "month (YYYY-MM) and uses-office-address (true|false) are required",
      );
    }

    const statement =
      await createGetConsultantSettlementStatementUseCase().execute({
        organizationId,
        consultantId: authUser.authUid,
        month: parsed.output.month,
        usesOfficeAddress: parsed.output.usesOfficeAddress === "true",
      });

    return noStoreJson(statement);
  }),
);
