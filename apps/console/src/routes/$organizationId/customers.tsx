import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleCustomersPage from "@/pages/customers/page";

export const Route = createFileRoute("/$organizationId/customers")({
  head: () => pageHead("顧客管理"),
  component: ConsoleCustomersPage,
});
