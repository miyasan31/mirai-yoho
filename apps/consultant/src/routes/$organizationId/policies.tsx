import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsultantPoliciesPage from "@/pages/policies/page";

export const Route = createFileRoute("/$organizationId/policies")({
  head: () => pageHead("利用規約・ポリシー"),
  component: ConsultantPoliciesPage,
});
