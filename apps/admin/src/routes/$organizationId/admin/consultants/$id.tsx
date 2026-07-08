import { createFileRoute } from "@tanstack/react-router";
import AdminConsultantEditModalPage from "@/pages/admin/consultants/consultant-edit-modal";

export const Route = createFileRoute("/$organizationId/admin/consultants/$id")({
  component: AdminConsultantEditModalPage,
});
