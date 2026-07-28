import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsolePoliciesPage from "@/pages/policies/page";

export const Route = createFileRoute("/$organizationId/policies")({
  head: () => pageHead("文書管理"),
  component: ConsolePoliciesPage,
});
