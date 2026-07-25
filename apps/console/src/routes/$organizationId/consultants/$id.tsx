import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleConsultantEditModalPage from "@/pages/consultants/consultant-edit-modal";

export const Route = createFileRoute("/$organizationId/consultants/$id")({
  head: () => pageHead("占い師編集"),
  component: ConsoleConsultantEditModalPage,
});
