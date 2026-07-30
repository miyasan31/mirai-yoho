import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$organizationId/consultants/$id/")({
  component: () => null,
});
