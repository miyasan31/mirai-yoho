import { createFileRoute, Outlet } from "@tanstack/react-router";
import ConsoleConsultantsPage from "@/pages/consultants/page";

function ConsoleConsultantsRoute() {
  return (
    <>
      <ConsoleConsultantsPage />
      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/$organizationId/consultants")({
  component: ConsoleConsultantsRoute,
});
