import { createFileRoute } from "@tanstack/react-router";
import ConsoleConsultantEditModalPage from "@/pages/consultants/consultant-edit-modal";

export const Route = createFileRoute("/$organizationId/consultants/$id")({
  component: ConsoleConsultantEditModalPage,
});
