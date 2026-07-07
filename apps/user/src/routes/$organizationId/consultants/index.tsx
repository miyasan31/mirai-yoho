import { createFileRoute } from "@tanstack/react-router";
import { ConsultantsPage } from "@/components/consultants-page";

export const Route = createFileRoute("/$organizationId/consultants/")({
  component: ConsultantsPage,
});
