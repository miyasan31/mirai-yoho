import { type NextRequest, NextResponse } from "next/server";
import { BlockedTime } from "@/domain/blocked-time/blocked-time";
import { DomainError } from "@/domain/shared/domain-error";
import { TimeRange } from "@/domain/slot/time-range";
import { requireRole } from "@/infrastructure/auth/require-role";
import { AuthError, verifyAuth } from "@/infrastructure/auth/verify-auth";
import { createBlockedTimeRepository } from "@/infrastructure/container";

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "consultant");

    const repo = createBlockedTimeRepository();
    const blockedTimes = await repo.findByConsultantId(authUser.uid);

    return NextResponse.json({
      blockedTimes: blockedTimes.map((bt) => ({
        blockedTimeId: bt.getBlockedTimeId(),
        startDatetime: bt.getTimeRange().getStartAt().toISOString(),
        endDatetime: bt.getTimeRange().getEndAt().toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/consultant/blocked-times] Error:", error);
    if (error instanceof AuthError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    requireRole(authUser, "consultant");

    const body = await request.json();
    const { startDatetime, endDatetime } = body;

    if (!startDatetime || !endDatetime) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "startDatetime and endDatetime are required",
        },
        { status: 400 },
      );
    }

    const blockedTimeId = crypto.randomUUID();
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);

    if (start >= end) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "startDatetime must be before endDatetime",
        },
        { status: 400 },
      );
    }

    const timeRange = TimeRange.reconstruct(start, end);
    const blockedTime = BlockedTime.create({
      blockedTimeId,
      consultantId: authUser.uid,
      timeRange,
    });

    const repo = createBlockedTimeRepository();
    await repo.save(blockedTime);

    return NextResponse.json({ blockedTimeId }, { status: 201 });
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
