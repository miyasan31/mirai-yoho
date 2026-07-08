import { createFileRoute } from "@tanstack/react-router";
import ConsultantSlotsPage from "@/pages/consultant/slots/page";

export const Route = createFileRoute("/$organizationId/consultant/slots")({
  component: ConsultantSlotsPage,
});
