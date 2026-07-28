import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { CustomerAppraisalReportResult } from "@/application/appraisal-report/list-customer-appraisal-reports-use-case";
import { AppError } from "@/application/shared/app-error";
import { AuthError } from "@/infrastructure/auth/verify-auth";
import { verifyCustomerAuth } from "@/infrastructure/auth/verify-customer-auth";
import {
  createListCustomerAppraisalReportsUseCase,
  createUserRepository,
} from "@/infrastructure/container";
import { withNoStore } from "../cache-control";

function jsonError(statusCode: number, code: string, message: string) {
  return withNoStore(Response.json({ code, message }, { status: statusCode }));
}

function handleError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.statusCode, error.code, error.message);
  }
  if (error instanceof AppError) {
    return jsonError(error.statusCode, error.code, error.message);
  }
  if (error instanceof DomainError) {
    return jsonError(400, error.code, error.message);
  }
  return jsonError(500, "INTERNAL_ERROR", "Internal server error");
}

async function resolveUserId(request: Request): Promise<string> {
  const { authUid } = await verifyCustomerAuth(request);
  const user = await createUserRepository().findByAuthUid(authUid);
  if (!user) {
    throw new AppError(
      404,
      "CUSTOMER_NOT_SIGNED_UP",
      "Customer has not signed up yet",
    );
  }
  return user.getUserId();
}

function toSummaryDto({
  report,
  consultantName,
  organizationName,
}: CustomerAppraisalReportResult) {
  const content = report.getContent();
  return {
    reportId: report.getReportId(),
    organizationId: report.getOrganizationId(),
    organizationName,
    bookingId: report.getBookingId(),
    consultantName,
    title: content.getTitle(),
    appraisalDate: content.getAppraisalDate(),
    publishedAt: report.getPublishedAt()?.toISOString() ?? null,
  };
}

function toDetailDto(result: CustomerAppraisalReportResult) {
  const content = result.report.getContent();
  return {
    ...toSummaryDto(result),
    customerName: content.getCustomerName(),
    birthDate: content.getBirthDate(),
    theme: content.getTheme(),
    currentSituation: content.getCurrentSituation(),
    result: content.getResult(),
    luckyAction: content.getLuckyAction(),
    summary: content.getSummary(),
  };
}

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request);
    const results = await createListCustomerAppraisalReportsUseCase().execute({
      userId,
    });
    const reports = results
      .slice()
      .sort(
        (a, b) =>
          (b.report.getPublishedAt()?.getTime() ?? 0) -
          (a.report.getPublishedAt()?.getTime() ?? 0),
      )
      .map(toSummaryDto);
    return withNoStore(Response.json({ reports }));
  } catch (error) {
    return handleError(error);
  }
}

export async function GET_BY_ID(request: Request, reportId: string) {
  try {
    const userId = await resolveUserId(request);
    const results = await createListCustomerAppraisalReportsUseCase().execute({
      userId,
    });
    // 発行済みかつ本人宛のものしか results に含まれないため、ここで見つからなければ 404
    const owned = results.find(
      ({ report }) => report.getReportId() === reportId,
    );
    if (!owned) {
      return jsonError(
        404,
        "APPRAISAL_REPORT_NOT_FOUND",
        "Appraisal report not found",
      );
    }
    return withNoStore(Response.json(toDetailDto(owned)));
  } catch (error) {
    return handleError(error);
  }
}
