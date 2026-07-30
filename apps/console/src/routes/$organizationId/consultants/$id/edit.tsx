import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleConsultantEditPage from "@/pages/consultants/edit-page";

export const Route = createFileRoute("/$organizationId/consultants/$id/edit")({
  head: () => pageHead("占い師編集"),
  component: ConsoleConsultantEditPage,
});
