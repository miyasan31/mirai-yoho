import { createFileRoute, Outlet } from "@tanstack/react-router";
import AdminLayout from "@/pages/layout";

function AdminLayoutRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

export const Route = createFileRoute("/$organizationId")({
  component: AdminLayoutRoute,
});
