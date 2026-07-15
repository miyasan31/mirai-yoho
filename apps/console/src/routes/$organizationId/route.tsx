import { createFileRoute, Outlet } from "@tanstack/react-router";
import ConsoleLayout from "@/pages/layout";

function ConsoleLayoutRoute() {
  return (
    <ConsoleLayout>
      <Outlet />
    </ConsoleLayout>
  );
}

export const Route = createFileRoute("/$organizationId")({
  component: ConsoleLayoutRoute,
});
