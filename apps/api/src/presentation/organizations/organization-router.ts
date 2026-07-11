import { Hono } from "hono";
import { adminAccountRoutes } from "./admin-account-routes";
import { adminConsultantRoutes } from "./admin-consultant-routes";
import { adminListingRoutes } from "./admin-listing-routes";
import { adminRoleRoutes } from "./admin-role-routes";
import { adminSettingsRoutes } from "./admin-settings-routes";
import { batchRoutes } from "./batch-routes";
import { bookingRoutes } from "./booking-routes";
import { consultantBookingRoutes } from "./consultant-booking-routes";
import { consultantPricePlanRoutes } from "./consultant-price-plan-routes";
import { consultantProfileRoutes } from "./consultant-profile-routes";
import { customerBookingRoutes } from "./customer-bookings";
import { publicRoutes } from "./public-routes";
import { slotRoutes } from "./slot-routes";

// /api/organizations 配下のルーター。app.ts から
// app.route("/api/organizations", createOrganizationRoutes()) でマウントする
export function createOrganizationRoutes(): Hono {
  const routes = new Hono();

  routes.route("/:organizationId", publicRoutes);
  routes.route("/:organizationId", customerBookingRoutes);
  routes.route("/:organizationId", bookingRoutes);
  routes.route("/:organizationId", slotRoutes);
  routes.route("/:organizationId", batchRoutes);
  routes.route("/:organizationId", consultantBookingRoutes);
  routes.route("/:organizationId", consultantPricePlanRoutes);
  routes.route("/:organizationId", consultantProfileRoutes);
  routes.route("/:organizationId", adminListingRoutes);
  routes.route("/:organizationId", adminConsultantRoutes);
  routes.route("/:organizationId", adminSettingsRoutes);
  routes.route("/:organizationId", adminAccountRoutes);
  routes.route("/:organizationId", adminRoleRoutes);

  return routes;
}
