import { createFileRoute, Outlet } from "@tanstack/react-router";
import AdminLayout from "@/pages/admin/layout";

function AdminLayoutRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

export const Route = createFileRoute("/$organizationId/admin")({
  component: AdminLayoutRoute,
});
