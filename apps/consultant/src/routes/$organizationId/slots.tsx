import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsultantSlotsPage from "@/pages/slots/page";

export const Route = createFileRoute("/$organizationId/slots")({
  head: () => pageHead("スケジュール管理"),
  component: ConsultantSlotsPage,
});
