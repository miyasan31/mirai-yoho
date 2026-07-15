import { createFileRoute } from "@tanstack/react-router";
import ConsoleCouponsPage from "@/pages/coupons/page";

export const Route = createFileRoute("/$organizationId/coupons")({
  component: ConsoleCouponsPage,
});
