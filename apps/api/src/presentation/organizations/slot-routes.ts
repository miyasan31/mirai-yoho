import crypto from "node:crypto";
import { isValidSlotRange } from "@mirai-yoho/shared/slot-availability";
import { Hono } from "hono";
import { Settings } from "@/domain/settings/settings";
import { Slot } from "@/domain/slot/slot";
import { TimeRange } from "@/domain/slot/time-range";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createSettingsRepository,
  createSlotRepository,
} from "@/infrastructure/container";
import { deleteRoute, jsonError, postRoute } from "./route-handler";

export const slotRoutes = new Hono();

slotRoutes.post(
  "/slots",
  postRoute(async ({ organizationId, request }) => {
    const authUser = await verifyAuth(request);
    const account = authUser.accounts.find(
      (candidate) =>
        candidate.organizationId === organizationId &&
        candidate.status === "active",
    );
    if (!account) {
      throw new AuthError(
        403,
        "FORBIDDEN",
        `User does not belong to organization '${organizationId}'`,
      );
    }
    if (!account.isConsultant) {
      requirePermission(authUser, organizationId, "console.slots.manage");
    }

    const body = await request.json();
    const { consultantId, startsAt, endsAt } = body;
    if (!consultantId || !startsAt || !endsAt) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "consultantId, startsAt, and endsAt are required",
      );
    }

    if (account.isConsultant && authUser.authUid !== consultantId) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Consultants can only create their own slots",
      );
    }

    const slotId = crypto.randomUUID();
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const repo = createSlotRepository();
    const existingSlots = await repo.findByConsultantId(
      organizationId,
      consultantId,
    );
    const settings =
      (await createSettingsRepository().findByOrganizationId(organizationId)) ??
      Settings.createDefault(organizationId);

    if (!isValidSlotRange(start, end)) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Slots must be exactly 30 minutes and aligned to 30-minute boundaries",
      );
    }

    const newTimeRange = TimeRange.create(start, end);
    if (!settings.getBusinessHours().containsRange(start, end)) {
      return jsonError(
        400,
        "SLOT_OUTSIDE_BUSINESS_HOURS",
        "The selected slot is outside business hours",
      );
    }
    const hasOverlap = existingSlots.some((existingSlot) =>
      existingSlot.getTimeRange().overlaps(newTimeRange),
    );
    if (hasOverlap) {
      return jsonError(
        400,
        "SLOT_CONFLICT",
        "The selected slot overlaps an existing slot",
      );
    }

    const slot = Slot.create({
      organizationId,
      slotId,
      consultantId,
      timeRange: newTimeRange,
    });
    await repo.save(slot);
    return Response.json({ slotId }, { status: 201 });
  }),
);

slotRoutes.delete(
  "/slots/:slotId",
  deleteRoute(async ({ organizationId, request, param }) => {
    const authUser = await verifyAuth(request);
    const account = authUser.accounts.find(
      (candidate) =>
        candidate.organizationId === organizationId &&
        candidate.status === "active",
    );
    if (!account) {
      throw new AuthError(
        403,
        "FORBIDDEN",
        `User does not belong to organization '${organizationId}'`,
      );
    }
    if (!account.isConsultant) {
      requirePermission(authUser, organizationId, "console.slots.manage");
    }
    const slotId = param("slotId");
    const repo = createSlotRepository();
    const slot = await repo.findById(organizationId, slotId);
    if (!slot) {
      return jsonError(404, "NOT_FOUND", "Slot not found");
    }
    if (account.isConsultant && slot.getConsultantId() !== authUser.authUid) {
      return jsonError(
        403,
        "FORBIDDEN",
        "Consultants can only delete their own slots",
      );
    }
    await repo.delete(organizationId, slotId);
    return Response.json({ success: true });
  }),
);
