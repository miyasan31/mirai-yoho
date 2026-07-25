import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleSettingsPage from "@/pages/settings/page";

export const Route = createFileRoute("/$organizationId/settings")({
  head: () => pageHead("設定"),
  component: ConsoleSettingsPage,
});
