import { Timestamp } from "firebase-admin/firestore";
import { db } from "../src/infrastructure/firestore/firestore-client";
import {
  FIRESTORE_BOOTSTRAP_DOC_ID,
  FIRESTORE_COLLECTION_NAMES,
} from "../src/infrastructure/firestore/firestore-collections";

async function main() {
  const now = Timestamp.now();

  await Promise.all(
    FIRESTORE_COLLECTION_NAMES.map((collectionName) =>
      db.collection(collectionName).doc(FIRESTORE_BOOTSTRAP_DOC_ID).set(
        {
          collectionName,
          system: true,
          description: "Firestore collection bootstrap marker",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true },
      ),
    ),
  );

  console.log("Firestore collections are initialized:");
  for (const collectionName of FIRESTORE_COLLECTION_NAMES) {
    console.log(`- ${collectionName}`);
  }
}

main().catch((error) => {
  console.error("Failed to initialize Firestore collections", error);
  process.exit(1);
});
