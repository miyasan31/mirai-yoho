/**
 * 空き枠のテストデータ投入スクリプト
 *
 * Usage:
 *   pnpm dlx tsx --env-file=.env.local scripts/seed-slots.ts <organizationId> <consultantId>
 *
 * Example:
 *   pnpm dlx tsx --env-file=.env.local scripts/seed-slots.ts org-1 KE1A6PuKhxUaGf2OfWDU3XsSYuw2
 */

import crypto from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

async function main() {
  const [organizationId, consultantId] = process.argv.slice(2);

  if (!organizationId || !consultantId) {
    console.error(
      "Usage: pnpm dlx tsx --env-file=.env.local scripts/seed-slots.ts <organizationId> <consultantId>",
    );
    process.exit(1);
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
        });

  const db = getFirestore(app);
  const batch = db.batch();

  // 今日から5日分、各日 10:00-17:00 の 15 分枠を作成
  const now = new Date();
  let count = 0;

  for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
    for (let hour = 10; hour < 17; hour++) {
      for (const minute of [0, 15, 30, 45]) {
        const startsAt = new Date(now);
        startsAt.setDate(startsAt.getDate() + dayOffset);
        startsAt.setHours(hour, minute, 0, 0);

        const endsAt = new Date(startsAt);
        endsAt.setMinutes(endsAt.getMinutes() + 15);

        const slotId = crypto.randomUUID();
        const ref = db.collection(FIRESTORE_COLLECTIONS.slots).doc(slotId);

        batch.set(ref, {
          organizationId,
          slotId,
          consultantId,
          startsAt,
          endsAt,
          bookingId: null,
          isAvailable: true,
        });

        count++;
        console.log(
          `  ${slotId} | ${startsAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} - ${endsAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
        );
      }
    }
  }

  await batch.commit();
  console.log(
    `\n✅ ${count} slots created for consultant ${consultantId} in ${organizationId}`,
  );
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
