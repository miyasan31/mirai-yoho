import { createFileRoute } from "@tanstack/react-router";
import AdminConsultantEditModalPage from "@/pages/consultants/consultant-edit-modal";

export const Route = createFileRoute("/$organizationId/consultants/$id")({
  component: AdminConsultantEditModalPage,
});
