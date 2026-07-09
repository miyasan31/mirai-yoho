import { createFileRoute, Outlet } from "@tanstack/react-router";
import ConsultantLayout from "@/pages/layout";

function ConsultantLayoutRoute() {
  return (
    <ConsultantLayout>
      <Outlet />
    </ConsultantLayout>
  );
}

export const Route = createFileRoute("/$organizationId")({
  component: ConsultantLayoutRoute,
});
