import { FieldValue } from "firebase-admin/firestore";
import { db } from "../src/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";

const SETTINGS_COLLECTION = FIRESTORE_COLLECTIONS.settings;
const CONSULTANT_COLLECTION = FIRESTORE_COLLECTIONS.consultants;
const BATCH_DOC_SIZE = 200;

interface LegacyConsultantStatusItem {
  rankId?: string;
  statusId?: string;
  name?: string;
}

async function migrateSettings(): Promise<{
  migratedCount: number;
  skippedCount: number;
}> {
  const snapshot = await db.collection(SETTINGS_COLLECTION).get();
  let migratedCount = 0;
  let skippedCount = 0;

  for (let index = 0; index < snapshot.docs.length; index += BATCH_DOC_SIZE) {
    const docs = snapshot.docs.slice(index, index + BATCH_DOC_SIZE);
    const batch = db.batch();
    let batchHasWrites = false;

    for (const doc of docs) {
      const data = doc.data() as {
        consultantRanks?: LegacyConsultantStatusItem[];
        consultantStatuses?: LegacyConsultantStatusItem[];
        defaultConsultantRankId?: string;
        defaultConsultantStatusId?: string;
      };

      const hasLegacyRanks = Array.isArray(data.consultantRanks);
      const hasLegacyDefault = typeof data.defaultConsultantRankId === "string";

      if (!hasLegacyRanks && !hasLegacyDefault) {
        skippedCount += 1;
        continue;
      }

      const legacyItems = hasLegacyRanks ? (data.consultantRanks ?? []) : [];
      const normalizedStatuses = legacyItems.map((item) => ({
        statusId: item.statusId ?? item.rankId ?? "",
        name: item.name ?? "",
      }));

      const updates: Record<string, unknown> = {
        consultantRanks: FieldValue.delete(),
        defaultConsultantRankId: FieldValue.delete(),
      };
      if (hasLegacyRanks) {
        updates.consultantStatuses = normalizedStatuses;
      }
      if (hasLegacyDefault) {
        updates.defaultConsultantStatusId = data.defaultConsultantRankId;
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

async function migrateConsultants(): Promise<{
  migratedCount: number;
  skippedCount: number;
}> {
  const snapshot = await db.collection(CONSULTANT_COLLECTION).get();
  let migratedCount = 0;
  let skippedCount = 0;

  for (let index = 0; index < snapshot.docs.length; index += BATCH_DOC_SIZE) {
    const docs = snapshot.docs.slice(index, index + BATCH_DOC_SIZE);
    const batch = db.batch();
    let batchHasWrites = false;

    for (const doc of docs) {
      const data = doc.data() as {
        rankId?: string;
        statusId?: string;
      };

      if (typeof data.rankId !== "string") {
        skippedCount += 1;
        continue;
      }

      batch.set(
        doc.ref,
        {
          statusId: data.statusId ?? data.rankId,
          rankId: FieldValue.delete(),
        },
        { merge: true },
      );
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
  const settingsResult = await migrateSettings();
  console.log(
    `Organization settings migrated. migrated=${settingsResult.migratedCount}, skipped=${settingsResult.skippedCount}`,
  );

  const consultantsResult = await migrateConsultants();
  console.log(
    `Consultants migrated. migrated=${consultantsResult.migratedCount}, skipped=${consultantsResult.skippedCount}`,
  );

  console.log("Consultant status field migration completed.");
}

main().catch((error) => {
  console.error("Failed to migrate consultant status fields", error);
  process.exit(1);
});
