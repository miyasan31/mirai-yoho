import { createFileRoute } from "@tanstack/react-router";
import ConsultantProfilePage from "@/pages/consultant/profile/page";

export const Route = createFileRoute("/$organizationId/consultant/profile")({
  component: ConsultantProfilePage,
});
