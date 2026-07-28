/**
ブレイクアウトルームを「相談員単位」から「予約単位」へ移行するスクリプト。

旧形式は 1 相談員 1 ルームに当日の顧客全員を相乗りさせていたため、予約との紐付けを
復元できない。そのため当日以降の zoom-sessions について、confirmed な bookings から
breakoutRooms を作り直す。冪等なので複数回実行してよい。

Usage:

# 変更内容の確認のみ（書き込みなし）
pnpm dlx tsx scripts/migrate-zoom-session-breakout-rooms.ts --dry-run

# Firestore を更新し、Zoom 側のミーティングにも反映する
pnpm dlx tsx scripts/migrate-zoom-session-breakout-rooms.ts

# Firestore のみ更新する（Zoom への反映は次回の予約・キャンセル時に行われる）
pnpm dlx tsx scripts/migrate-zoom-session-breakout-rooms.ts --skip-zoom
 */

import type { Timestamp } from "firebase-admin/firestore";
import { ZoomSession } from "../src/domain/zoom-session/zoom-session";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { db } from "../src/infrastructure/firestore/firestore-customer";
import { FirestoreZoomSessionRepository } from "../src/infrastructure/firestore/firestore-zoom-session-repository";
import { ZoomService } from "../src/infrastructure/zoom/zoom-service";

interface ZoomSessionDoc {
  organizationId: string;
  sessionId: string;
  sessionDate: string;
  zoomMeetingId: string;
  joinUrl: string;
  createdAt: Timestamp;
}

interface BookingDoc {
  bookingId: string;
  customerId: string;
  consultantId: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
}

const consultantNameCache = new Map<string, string | null>();
const zoomEmailCache = new Map<string, string | null>();

async function resolveConsultantName(
  organizationId: string,
  consultantId: string,
): Promise<string | null> {
  const key = `${organizationId}_${consultantId}`;
  const cached = consultantNameCache.get(key);
  if (cached !== undefined) return cached;

  const snapshot = await db
    .collection(FIRESTORE_COLLECTIONS.consultants)
    .doc(key)
    .get();
  const name = snapshot.exists
    ? ((snapshot.data()?.name as string) ?? null)
    : null;
  consultantNameCache.set(key, name);
  return name;
}

/** 予約時に使われるのは顧客の連絡先メールではなく、連携済み Zoom アカウントのメール */
async function resolveZoomEmail(customerId: string): Promise<string | null> {
  const cached = zoomEmailCache.get(customerId);
  if (cached !== undefined) return cached;

  const customer = await db
    .collection(FIRESTORE_COLLECTIONS.customers)
    .doc(customerId)
    .get();
  const userId = customer.exists
    ? ((customer.data()?.userId as string | undefined) ?? null)
    : null;

  let zoomEmail: string | null = null;
  if (userId) {
    const credential = await db
      .collection(FIRESTORE_COLLECTIONS.userZoomCredentials)
      .doc(userId)
      .get();
    zoomEmail = credential.exists
      ? ((credential.data()?.zoomEmail as string | undefined) ?? null)
      : null;
  }

  zoomEmailCache.set(customerId, zoomEmail);
  return zoomEmail;
}

async function findConfirmedBookings(
  organizationId: string,
  sessionDate: string,
): Promise<BookingDoc[]> {
  const dayStart = new Date(`${sessionDate}T00:00:00+09:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const snapshot = await db
    .collection(FIRESTORE_COLLECTIONS.bookings)
    .where("organizationId", "==", organizationId)
    .where("status", "==", "confirmed")
    .where("startsAt", ">=", dayStart)
    .where("startsAt", "<", dayEnd)
    .get();

  return snapshot.docs
    .map((doc) => doc.data() as BookingDoc)
    .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());
}

async function migrate(options: { dryRun: boolean; skipZoom: boolean }) {
  const today = ZoomSession.sessionDateFromInstant(new Date());
  const repository = new FirestoreZoomSessionRepository();
  const zoomService = options.skipZoom ? null : new ZoomService();

  const snapshot = await db
    .collection(FIRESTORE_COLLECTIONS.zoomSessions)
    .get();
  const targets = snapshot.docs
    .map((doc) => doc.data() as ZoomSessionDoc)
    .filter((doc) => doc.sessionDate >= today)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

  let migratedCount = 0;
  let roomCount = 0;
  const skipped: string[] = [];

  for (const doc of targets) {
    const bookings = await findConfirmedBookings(
      doc.organizationId,
      doc.sessionDate,
    );

    const session = ZoomSession.reconstruct({
      organizationId: doc.organizationId,
      sessionId: doc.sessionId,
      sessionDate: doc.sessionDate,
      zoomMeetingId: doc.zoomMeetingId,
      joinUrl: doc.joinUrl,
      breakoutRooms: [],
      createdAt: doc.createdAt.toDate(),
    });

    for (const booking of bookings) {
      const [consultantName, customerEmail] = await Promise.all([
        resolveConsultantName(doc.organizationId, booking.consultantId),
        resolveZoomEmail(booking.customerId),
      ]);

      if (!consultantName || !customerEmail) {
        skipped.push(
          `${doc.sessionDate} booking=${booking.bookingId} (consultantName=${consultantName ?? "none"}, zoomEmail=${customerEmail ?? "none"})`,
        );
        continue;
      }

      session.assignBooking({
        bookingId: booking.bookingId,
        consultantId: booking.consultantId,
        consultantName,
        startsAt: booking.startsAt.toDate(),
        endsAt: booking.endsAt.toDate(),
        customerEmail,
      });
    }

    const rooms = session.getBreakoutRooms();
    console.log(
      `${doc.organizationId} ${doc.sessionDate}: ${rooms.length} room(s)`,
    );
    for (const room of rooms) {
      console.log(`  ${room.getRoomName()} <- ${room.getCustomerEmail()}`);
    }

    if (!options.dryRun) {
      await repository.save(session);
      if (zoomService && doc.zoomMeetingId) {
        await zoomService.updateBreakoutRooms({
          meetingId: doc.zoomMeetingId,
          breakoutRooms: rooms.map((room) => ({
            name: room.getRoomName(),
            participants: [room.getCustomerEmail()],
          })),
        });
      }
    }

    migratedCount += 1;
    roomCount += rooms.length;
  }

  return { migratedCount, roomCount, skipped };
}

async function main() {
  const argv = process.argv.slice(2);
  const options = {
    dryRun: argv.includes("--dry-run"),
    skipZoom: argv.includes("--skip-zoom"),
  };

  const result = await migrate(options);

  console.log(
    `\nBreakout room migration ${options.dryRun ? "(dry run) " : ""}completed. sessions=${result.migratedCount}, rooms=${result.roomCount}, skipped=${result.skipped.length}`,
  );
  for (const entry of result.skipped) {
    console.warn(`  skipped: ${entry}`);
  }
}

main().catch((error) => {
  console.error("Failed to migrate zoom session breakout rooms", error);
  process.exit(1);
});
