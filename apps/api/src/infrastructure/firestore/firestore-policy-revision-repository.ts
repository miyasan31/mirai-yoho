import { Timestamp } from "firebase-admin/firestore";
import {
  PolicyRevision,
  type PolicyRevisionStatus,
} from "@/domain/policy/policy-revision";
import type { IPolicyRevisionRepository } from "@/domain/policy/policy-revision-repository";
import type { PolicyType } from "@/domain/policy/policy-type";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.policyRevisions;

interface PolicyRevisionDoc {
  revisionId: string;
  organizationId: string;
  type: PolicyType;
  version: string;
  title: string;
  body: string;
  status: PolicyRevisionStatus;
  effectiveFrom: Timestamp | Date | null;
  publishedAt: Timestamp | Date | null;
  archivedAt: Timestamp | Date | null;
  createdBy: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

function toDateOrNull(value?: Timestamp | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return value.toDate();
}

function toRequiredDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate();
}

function toDomain(doc: PolicyRevisionDoc): PolicyRevision {
  return PolicyRevision.reconstruct({
    revisionId: doc.revisionId,
    organizationId: doc.organizationId,
    type: doc.type,
    version: doc.version,
    title: doc.title,
    body: doc.body,
    status: doc.status,
    effectiveFrom: toDateOrNull(doc.effectiveFrom),
    publishedAt: toDateOrNull(doc.publishedAt),
    archivedAt: toDateOrNull(doc.archivedAt),
    createdBy: doc.createdBy,
    createdAt: toRequiredDate(doc.createdAt),
    updatedAt: toRequiredDate(doc.updatedAt),
  });
}

function toFirestore(revision: PolicyRevision): PolicyRevisionDoc {
  return {
    revisionId: revision.getRevisionId(),
    organizationId: revision.getOrganizationId(),
    type: revision.getType(),
    version: revision.getVersion(),
    title: revision.getTitle(),
    body: revision.getBody(),
    status: revision.getStatus(),
    effectiveFrom: revision.getEffectiveFrom(),
    publishedAt: revision.getPublishedAt(),
    archivedAt: revision.getArchivedAt(),
    createdBy: revision.getCreatedBy(),
    createdAt: revision.getCreatedAt(),
    updatedAt: revision.getUpdatedAt(),
  };
}

export class FirestorePolicyRevisionRepository
  implements IPolicyRevisionRepository
{
  async findById(revisionId: string): Promise<PolicyRevision | null> {
    const doc = await db.collection(COLLECTION).doc(revisionId).get();
    if (!doc.exists) return null;
    return toDomain(doc.data() as PolicyRevisionDoc);
  }

  async listByOrganizationAndType(
    organizationId: string,
    type: PolicyType,
  ): Promise<PolicyRevision[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("type", "==", type)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as PolicyRevisionDoc))
      .sort((a, b) => b.getCreatedAt().getTime() - a.getCreatedAt().getTime());
  }

  async findLatestPublished(
    organizationId: string,
    type: PolicyType,
    at: Date,
  ): Promise<PolicyRevision | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("type", "==", type)
      .where("status", "==", "published")
      .where("effectiveFrom", "<=", Timestamp.fromDate(at))
      .orderBy("effectiveFrom", "desc")
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as PolicyRevisionDoc);
  }

  async save(revision: PolicyRevision): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(revision.getRevisionId())
      .set(toFirestore(revision));
  }
}
