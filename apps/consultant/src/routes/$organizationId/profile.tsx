import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsultantProfilePage from "@/pages/profile/page";

export const Route = createFileRoute("/$organizationId/profile")({
  head: () => pageHead("プロフィール編集"),
  component: ConsultantProfilePage,
});
