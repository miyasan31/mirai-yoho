/**
 * 空き枠のテストデータ投入スクリプト
 *
 * Usage:
 *   pnpm seed:slots <consultantId>
 *
 * Example:
 *   pnpm seed:slots KE1A6PuKhxUaGf2OfWDU3XsSYuw2
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

async function main() {
  const [consultantId] = process.argv.slice(2);

  if (!consultantId) {
    console.error("Usage: pnpm seed:slots <consultantId>");
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

  // 今日から5日分、各日 10:00, 11:00, 14:00, 15:00, 16:00 (JST) の1時間枠を作成
  const hours = [10, 11, 14, 15, 16];
  const now = new Date();
  let count = 0;

  for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
    for (const hour of hours) {
      const startAt = new Date(now);
      startAt.setDate(startAt.getDate() + dayOffset);
      startAt.setHours(hour, 0, 0, 0);

      const endAt = new Date(startAt);
      endAt.setHours(hour + 1);

      const slotId = crypto.randomUUID();
      const ref = db.collection("slots").doc(slotId);

      batch.set(ref, {
        slotId,
        consultantId,
        startAt,
        endAt,
        bookingId: null,
        isReserved: false,
      });

      count++;
      console.log(
        `  ${slotId} | ${startAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} - ${endAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
      );
    }
  }

  await batch.commit();
  console.log(`\n✅ ${count} slots created for consultant ${consultantId}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
