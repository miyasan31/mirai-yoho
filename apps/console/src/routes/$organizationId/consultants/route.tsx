import { createFileRoute, Outlet } from "@tanstack/react-router";
import AdminConsultantsPage from "@/pages/consultants/page";

function AdminConsultantsRoute() {
  return (
    <>
      <AdminConsultantsPage />
      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/$organizationId/consultants")({
  component: AdminConsultantsRoute,
});
