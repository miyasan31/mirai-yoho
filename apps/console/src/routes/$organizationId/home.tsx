import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleHomePage from "@/pages/home/page";

export const Route = createFileRoute("/$organizationId/home")({
  head: () => pageHead("ホーム"),
  component: ConsoleHomePage,
});
