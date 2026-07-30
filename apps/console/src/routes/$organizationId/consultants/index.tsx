import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleConsultantsPage from "@/pages/consultants/page";

export const Route = createFileRoute("/$organizationId/consultants/")({
  head: () => pageHead("占い師管理"),
  component: ConsoleConsultantsPage,
});
