import { createFileRoute, Outlet } from "@tanstack/react-router";
import AdminConsultantsPage from "@/pages/admin/consultants/page";

function AdminConsultantsRoute() {
  return (
    <>
      <AdminConsultantsPage />
      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/$organizationId/admin/consultants")({
  component: AdminConsultantsRoute,
});
