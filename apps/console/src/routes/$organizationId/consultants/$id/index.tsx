import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleConsultantDetailPage from "@/pages/consultants/detail-page";

export const Route = createFileRoute("/$organizationId/consultants/$id/")({
  head: () => pageHead("占い師詳細"),
  component: ConsoleConsultantDetailPage,
});
