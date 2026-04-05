import { type NextRequest, NextResponse } from "next/server";
import { DomainError } from "@/domain/shared/domain-error";
import { Slot } from "@/domain/slot/slot";
import { isValidSlotRange } from "@/domain/slot/slot-availability";
import { TimeRange } from "@/domain/slot/time-range";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createSlotRepository } from "@/infrastructure/container";

export async function GET(request: NextRequest) {
  try {
    const consultantId = request.nextUrl.searchParams.get("consultantId");
    const repository = createSlotRepository();

    if (consultantId) {
      const availableSlots =
        await repository.findAvailableByConsultantId(consultantId);

      return NextResponse.json({
        slots: availableSlots.map((s) => ({
          slotId: s.getSlotId(),
          consultantId: s.getConsultantId(),
          startDatetime: s.getTimeRange().getStartAt().toISOString(),
          endDatetime: s.getTimeRange().getEndAt().toISOString(),
          isAvailable: !s.getIsReserved(),
        })),
      });
    }

    const aggregatedSlots = await repository.findAllAvailable();
    const groupedSlots = new Map<
      string,
      { startDatetime: string; endDatetime: string }
    >();

    for (const slot of aggregatedSlots) {
      const startDatetime = slot.getTimeRange().getStartAt().toISOString();
      const endDatetime = slot.getTimeRange().getEndAt().toISOString();
      const key = `${startDatetime}_${endDatetime}`;
      if (!groupedSlots.has(key)) {
        groupedSlots.set(key, {
          startDatetime,
          endDatetime,
        });
      }
    }

    return NextResponse.json({
      aggregatedSlots: [...groupedSlots.values()].map((slot) => ({
        startDatetime: slot.startDatetime,
        endDatetime: slot.endDatetime,
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

    if (authUser.role === "consultant" && authUser.uid !== consultantId) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "Consultants can only create their own slots",
        },
        { status: 403 },
      );
    }

    const slotId = crypto.randomUUID();
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);

    if (!isValidSlotRange(start, end)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message:
            "Slots must be exactly 30 minutes and aligned to 30-minute boundaries",
        },
        { status: 400 },
      );
    }

    const repo = createSlotRepository();
    const existingSlots = await repo.findByConsultantId(consultantId);
    const newTimeRange = TimeRange.create(start, end);

    const hasOverlap = existingSlots.some((existingSlot) =>
      existingSlot.getTimeRange().overlaps(newTimeRange),
    );
    if (hasOverlap) {
      return NextResponse.json(
        {
          code: "SLOT_CONFLICT",
          message: "The selected slot overlaps an existing slot",
        },
        { status: 400 },
      );
    }

    const timeRange = newTimeRange;
    const slot = Slot.create({ slotId, consultantId, timeRange });

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
