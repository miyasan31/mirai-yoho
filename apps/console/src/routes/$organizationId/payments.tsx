import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsolePaymentsPage from "@/pages/payments/page";

export const Route = createFileRoute("/$organizationId/payments")({
  head: () => pageHead("決済管理"),
  component: ConsolePaymentsPage,
});
