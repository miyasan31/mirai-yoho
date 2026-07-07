import { createFileRoute, Outlet } from "@tanstack/react-router";
import ConsultantLayout from "@/pages/consultant/layout";

function ConsultantLayoutRoute() {
  return (
    <ConsultantLayout>
      <Outlet />
    </ConsultantLayout>
  );
}

export const Route = createFileRoute("/$organizationId/consultant")({
  component: ConsultantLayoutRoute,
});
