import { createFileRoute } from "@tanstack/react-router";
import ConsultantSlotsPage from "@/pages/slots/page";

export const Route = createFileRoute("/$organizationId/slots")({
  component: ConsultantSlotsPage,
});
