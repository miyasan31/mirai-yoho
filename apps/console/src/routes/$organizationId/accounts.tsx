import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleAccountsPage from "@/pages/accounts/page";

export const Route = createFileRoute("/$organizationId/accounts")({
  head: () => pageHead("アカウント管理"),
  component: ConsoleAccountsPage,
});
