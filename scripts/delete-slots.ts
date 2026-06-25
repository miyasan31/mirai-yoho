/**
 * slots コレクション全削除スクリプト
 *
 * Usage:
 *   pnpm delete:slots
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

const BATCH_SIZE = 400;

async function main() {
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
  const collection = db.collection(FIRESTORE_COLLECTIONS.slots);

  let deletedCount = 0;

  while (true) {
    const snapshot = await collection.limit(BATCH_SIZE + 1).get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }

    await batch.commit();
    deletedCount += snapshot.docs.length;
    console.log(
      `Deleted ${snapshot.docs.length} slots... total=${deletedCount}`,
    );
  }

  console.log(`\n✅ Deleted ${deletedCount} slots`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
