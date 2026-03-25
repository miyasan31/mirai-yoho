import { type NextRequest, NextResponse } from "next/server";
import { DomainError } from "@/domain/shared/domain-error";
import { Slot } from "@/domain/slot/slot";
import { TimeRange } from "@/domain/slot/time-range";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import {
  createBlockedTimeRepository,
  createSlotRepository,
} from "@/infrastructure/container";

export async function GET(request: NextRequest) {
  try {
    const consultantId = request.nextUrl.searchParams.get("consultantId");
    if (!consultantId) {
      return NextResponse.json(
        { code: "MISSING_PARAM", message: "consultantId is required" },
        { status: 400 },
      );
    }

    const [slots, blockedTimes] = await Promise.all([
      createSlotRepository().findAvailableByConsultantId(consultantId),
      createBlockedTimeRepository().findByConsultantId(consultantId),
    ]);

    const availableSlots = slots.filter(
      (slot) =>
        !blockedTimes.some((bt) =>
          slot.getTimeRange().overlaps(bt.getTimeRange()),
        ),
    );

    return NextResponse.json({
      slots: availableSlots.map((s) => ({
        slotId: s.getSlotId(),
        consultantId: s.getConsultantId(),
        startDatetime: s.getTimeRange().getStartAt().toISOString(),
        endDatetime: s.getTimeRange().getEndAt().toISOString(),
        isAvailable: !s.getIsReserved(),
      })),
    });
  } catch (_error) {
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "super_admin", "operator", "consultant");

    const body = await request.json();
    const { consultantId, startDatetime, endDatetime } = body;

    if (!consultantId || !startDatetime || !endDatetime) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "consultantId, startDatetime, and endDatetime are required",
        },
        { status: 400 },
      );
    }

    const slotId = crypto.randomUUID();
    const timeRange = TimeRange.create(
      new Date(startDatetime),
      new Date(endDatetime),
    );
    const slot = Slot.create({ slotId, consultantId, timeRange });

    const repo = createSlotRepository();
    await repo.save(slot);

    return NextResponse.json({ slotId }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    if (error instanceof DomainError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}
