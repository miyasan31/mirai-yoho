import { createFileRoute, Outlet } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
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
  head: () => pageHead("占い師管理"),
  component: ConsoleConsultantsRoute,
});
