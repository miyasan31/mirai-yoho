import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsultantDocumentsPage from "@/pages/documents/page";

export const Route = createFileRoute("/$organizationId/documents")({
  head: () => pageHead("文書管理"),
  component: ConsultantDocumentsPage,
});
