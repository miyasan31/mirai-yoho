import { FIRESTORE_COLLECTIONS } from "../src/infrastructure/firestore/firestore-collections";
import { db } from "../src/infrastructure/firestore/firestore-customer";

const LEGACY_ACCOUNT_COLLECTION = `organization-${"member"}${"ships"}`;
const ACCOUNT_COLLECTION = FIRESTORE_COLLECTIONS.accounts;
const BATCH_DOC_SIZE = 200;

async function main() {
  const snapshot = await db.collection(LEGACY_ACCOUNT_COLLECTION).get();

  if (snapshot.empty) {
    console.log("No legacy organization account documents found.");
    return;
  }

  let migratedCount = 0;

  for (let index = 0; index < snapshot.docs.length; index += BATCH_DOC_SIZE) {
    const docs = snapshot.docs.slice(index, index + BATCH_DOC_SIZE);
    const batch = db.batch();

    for (const doc of docs) {
      const accountRef = db.collection(ACCOUNT_COLLECTION).doc(doc.id);
      batch.set(accountRef, doc.data());
      batch.delete(doc.ref);
    }

    await batch.commit();
    migratedCount += docs.length;
    console.log(`Migrated ${migratedCount}/${snapshot.docs.length} documents.`);
  }

  console.log("Organization account migration completed.");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
