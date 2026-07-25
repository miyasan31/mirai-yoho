import { Hono } from "hono";
import { batchRoutes } from "./batch-routes";
import { bookingRoutes } from "./booking-routes";
import { consoleAccountRoutes } from "./console-account-routes";
import { consoleConsultantRoutes } from "./console-consultant-routes";
import { consoleCouponRoutes } from "./console-coupon-routes";
import { consoleListingRoutes } from "./console-listing-routes";
import { consolePolicyRoutes } from "./console-policy-routes";
import { consoleRoleRoutes } from "./console-role-routes";
import { consoleSettingsRoutes } from "./console-settings-routes";
import { consultantBookingRoutes } from "./consultant-booking-routes";
import { consultantProfileRoutes } from "./consultant-profile-routes";
import { customerBookingRoutes } from "./customer-bookings";
import { customerCouponRoutes } from "./customer-coupon-routes";
import { customerPolicyRoutes } from "./customer-policy-routes";
import { pricePlanRoutes } from "./price-plan-routes";
import { publicPolicyRoutes } from "./public-policy-routes";
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
  routes.route("/:organizationId", pricePlanRoutes);
  routes.route("/:organizationId", consultantProfileRoutes);
  routes.route("/:organizationId", consoleListingRoutes);
  routes.route("/:organizationId", consoleConsultantRoutes);
  routes.route("/:organizationId", consoleSettingsRoutes);
  routes.route("/:organizationId", consoleAccountRoutes);
  routes.route("/:organizationId", consoleRoleRoutes);
  routes.route("/:organizationId", consoleCouponRoutes);
  routes.route("/:organizationId", customerCouponRoutes);
  routes.route("/:organizationId", publicPolicyRoutes);
  routes.route("/:organizationId", consolePolicyRoutes);
  routes.route("/:organizationId", customerPolicyRoutes);

  return routes;
}
