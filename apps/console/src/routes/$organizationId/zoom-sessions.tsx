import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleZoomSessionsPage from "@/pages/zoom-sessions/page";

export const Route = createFileRoute("/$organizationId/zoom-sessions")({
  head: () => pageHead("ブレイクアウトルーム"),
  component: ConsoleZoomSessionsPage,
});
