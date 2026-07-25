import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleDashboardPage from "@/pages/dashboard/page";

export const Route = createFileRoute("/$organizationId/dashboard")({
  head: () => pageHead("ダッシュボード"),
  component: ConsoleDashboardPage,
});
