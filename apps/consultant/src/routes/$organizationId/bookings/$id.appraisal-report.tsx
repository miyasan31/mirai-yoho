import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsultantAppraisalReportEditPage from "@/pages/appraisal-report/page";

export const Route = createFileRoute(
  "/$organizationId/bookings/$id/appraisal-report",
)({
  head: () => pageHead("鑑定書"),
  component: ConsultantAppraisalReportEditPage,
});
