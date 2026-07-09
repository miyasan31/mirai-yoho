import { createFileRoute } from "@tanstack/react-router";
import ConsultantProfilePage from "@/pages/profile/page";

export const Route = createFileRoute("/$organizationId/profile")({
  component: ConsultantProfilePage,
});
