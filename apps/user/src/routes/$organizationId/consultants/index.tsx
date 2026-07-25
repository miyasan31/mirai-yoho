import { createFileRoute } from "@tanstack/react-router";
import { ConsultantsPage } from "@/components/consultants-page";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/$organizationId/consultants/")({
  head: () => pageHead("占い師一覧"),
  component: ConsultantsPage,
});
