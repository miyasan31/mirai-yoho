/**
 * 互換運用向けの最小カスタムクレーム設定スクリプト
 *
 * Usage:
 *   npx tsx scripts/set-custom-claims.ts <uid> <role>
 *
 * Example:
 *   npx tsx scripts/set-custom-claims.ts abc123 admin
 *
 * Note:
 *   組織ロールは Firestore の organization-memberships で管理します。
 *   このスクリプトは role claim 互換が必要な場合だけ利用してください。
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const VALID_ROLES = ["admin", "operator", "consultant"] as const;

async function main() {
  const [uid, role] = process.argv.slice(2);

  if (!uid || !role) {
    console.error("Usage: npx tsx scripts/set-custom-claims.ts <uid> <role>");
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    console.error(
      `Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(", ")}`,
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

  const auth = getAuth(app);
  await auth.setCustomUserClaims(uid, { role });

  console.log(`Custom claims set for user ${uid}: role=${role}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
