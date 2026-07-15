import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { db } from "../src/infrastructure/firestore/firestore-customer";

const COLLECTION = FIRESTORE_COLLECTIONS.pricePlans;
const BATCH_DOC_SIZE = 200;

interface LegacyPricePlanDoc {
  status?: string;
  deletedAt?: Timestamp | null;
  archivedAt?: Timestamp | null;
  updatedAt?: Timestamp;
}

async function migrate(): Promise<{
  migratedCount: number;
  skippedCount: number;
}> {
  const snapshot = await db.collection(COLLECTION).get();
  let migratedCount = 0;
  let skippedCount = 0;

  for (let index = 0; index < snapshot.docs.length; index += BATCH_DOC_SIZE) {
    const docs = snapshot.docs.slice(index, index + BATCH_DOC_SIZE);
    const batch = db.batch();
    let batchHasWrites = false;

    for (const doc of docs) {
      const data = doc.data() as LegacyPricePlanDoc;
      const hasLegacyStatus = typeof data.status === "string";
      const hasLegacyDeletedAt = data.deletedAt !== undefined;
      const hasArchivedAt = data.archivedAt !== undefined;

      if (!hasLegacyStatus && !hasLegacyDeletedAt && hasArchivedAt) {
        skippedCount += 1;
        continue;
      }

      const archivedAt = hasArchivedAt
        ? data.archivedAt
        : (data.deletedAt ??
          (data.status === "deleted" ? (data.updatedAt ?? null) : null));

      const updates: Record<string, unknown> = {
        archivedAt: archivedAt ?? null,
      };
      if (hasLegacyStatus) {
        updates.status = FieldValue.delete();
      }
      if (hasLegacyDeletedAt) {
        updates.deletedAt = FieldValue.delete();
      }

      batch.set(doc.ref, updates, { merge: true });
      batchHasWrites = true;
      migratedCount += 1;
    }

    if (batchHasWrites) {
      await batch.commit();
    }
  }

  return { migratedCount, skippedCount };
}

async function main() {
  const result = await migrate();
  console.log(
    `Price plan archivedAt migration completed. migrated=${result.migratedCount}, skipped=${result.skippedCount}`,
  );
}

main().catch((error) => {
  console.error("Failed to migrate price plan archivedAt", error);
  process.exit(1);
});
