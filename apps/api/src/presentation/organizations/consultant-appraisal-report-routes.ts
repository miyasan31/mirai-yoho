import { Hono } from "hono";
import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import { requireConsultant } from "@/infrastructure/auth/require-role";
import { verifyConsultantAuth } from "@/infrastructure/auth/verify-auth";
import {
  createGetAppraisalReportUseCase,
  createListConsultantAppraisalReportsUseCase,
  createPublishAppraisalReportUseCase,
  createSaveAppraisalReportDraftUseCase,
} from "@/infrastructure/container";
import {
  getRoute,
  jsonError,
  noStoreJson,
  patchRoute,
  postRoute,
} from "./route-handler";

const CONTENT_FIELDS = [
  "title",
  "customerName",
  "birthDate",
  "appraisalDate",
  "theme",
  "currentSituation",
  "result",
  "luckyAction",
  "summary",
] as const;

type ContentField = (typeof CONTENT_FIELDS)[number];
type ContentBody = Record<ContentField, string>;

function parseContentBody(body: unknown): ContentBody | null {
  if (typeof body !== "object" || body === null) return null;
  const candidate = body as Record<string, unknown>;
  for (const field of CONTENT_FIELDS) {
    if (typeof candidate[field] !== "string") return null;
  }
  return Object.fromEntries(
    CONTENT_FIELDS.map((field) => [field, candidate[field] as string]),
  ) as ContentBody;
}

function toSummaryDto(report: AppraisalReport) {
  return {
    reportId: report.getReportId(),
    bookingId: report.getBookingId(),
    status: report.getStatus(),
    publishedAt: report.getPublishedAt()?.toISOString() ?? null,
    updatedAt: report.getUpdatedAt().toISOString(),
  };
}

function toDetailDto(report: AppraisalReport) {
  const content = report.getContent();
  return {
    ...toSummaryDto(report),
    title: content.getTitle(),
    customerName: content.getCustomerName(),
    birthDate: content.getBirthDate(),
    appraisalDate: content.getAppraisalDate(),
    theme: content.getTheme(),
    currentSituation: content.getCurrentSituation(),
    result: content.getResult(),
    luckyAction: content.getLuckyAction(),
    summary: content.getSummary(),
    createdAt: report.getCreatedAt().toISOString(),
  };
}

export const consultantAppraisalReportRoutes = new Hono();

consultantAppraisalReportRoutes.get(
  "/consultant/appraisal-reports",
  getRoute(async ({ organizationId, request }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);

    const reports = await createListConsultantAppraisalReportsUseCase().execute(
      {
        organizationId,
        consultantId: authUser.authUid,
      },
    );

    return noStoreJson({ reports: reports.map(toSummaryDto) });
  }),
);

consultantAppraisalReportRoutes.get(
  "/consultant/bookings/:bookingId/appraisal-report",
  getRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);

    const { booking, report, editable } =
      await createGetAppraisalReportUseCase().execute({
        organizationId,
        bookingId: param("bookingId"),
        consultantId: authUser.authUid,
      });

    // 未作成でも 404 にしない。custom-fetch.ts が 404 を /404 リダイレクトに変換するため、
    // 編集画面の初回表示が飛ばされてしまう
    const memo = booking.getConsultantMemo();
    return noStoreJson({
      report: report ? toDetailDto(report) : null,
      editable,
      memoDefaults: {
        customerName: memo.getCustomerName(),
        birthDate: memo.getBirthDate(),
        appraisalDate: memo.getAppraisalDate(),
      },
    });
  }),
);

consultantAppraisalReportRoutes.patch(
  "/consultant/bookings/:bookingId/appraisal-report",
  patchRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);

    const content = parseContentBody(await request.json());
    if (!content) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        `${CONTENT_FIELDS.join(", ")} are required`,
      );
    }

    const report = await createSaveAppraisalReportDraftUseCase().execute({
      organizationId,
      bookingId: param("bookingId"),
      consultantId: authUser.authUid,
      ...content,
    });

    return Response.json(toDetailDto(report));
  }),
);

consultantAppraisalReportRoutes.post(
  "/consultant/bookings/:bookingId/appraisal-report/publish",
  postRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyConsultantAuth(request);
    requireConsultant(authUser, organizationId);

    const report = await createPublishAppraisalReportUseCase().execute({
      organizationId,
      bookingId: param("bookingId"),
      consultantId: authUser.authUid,
    });

    return Response.json(toDetailDto(report));
  }),
);
