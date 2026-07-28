import type { Timestamp } from "firebase-admin/firestore";
import {
  PolicyAgreement,
  type PolicyAgreementVia,
  type PolicySubjectType,
} from "@/domain/policy/policy-agreement";
import type { IPolicyAgreementRepository } from "@/domain/policy/policy-agreement-repository";
import type { PolicyType } from "@/domain/policy/policy-type";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.policyAgreements;

interface PolicyAgreementDoc {
  agreementId: string;
  organizationId: string;
  type: PolicyType;
  subjectType: PolicySubjectType;
  subjectId: string;
  revisionId: string;
  version: string;
  agreedVia: PolicyAgreementVia;
  bookingId: string | null;
  agreedAt: Timestamp | Date;
}

function toRequiredDate(value: Timestamp | Date): Date {
  return value instanceof Date ? value : value.toDate();
}

function toDomain(doc: PolicyAgreementDoc): PolicyAgreement {
  return PolicyAgreement.reconstruct({
    agreementId: doc.agreementId,
    organizationId: doc.organizationId,
    type: doc.type,
    subjectType: doc.subjectType,
    subjectId: doc.subjectId,
    revisionId: doc.revisionId,
    version: doc.version,
    agreedVia: doc.agreedVia,
    bookingId: doc.bookingId ?? null,
    agreedAt: toRequiredDate(doc.agreedAt),
  });
}

function toFirestore(agreement: PolicyAgreement): PolicyAgreementDoc {
  return {
    agreementId: agreement.getAgreementId(),
    organizationId: agreement.getOrganizationId(),
    type: agreement.getType(),
    subjectType: agreement.getSubjectType(),
    subjectId: agreement.getSubjectId(),
    revisionId: agreement.getRevisionId(),
    version: agreement.getVersion(),
    agreedVia: agreement.getAgreedVia(),
    bookingId: agreement.getBookingId(),
    agreedAt: agreement.getAgreedAt(),
  };
}

export class FirestorePolicyAgreementRepository
  implements IPolicyAgreementRepository
{
  async save(agreement: PolicyAgreement): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(agreement.getAgreementId())
      .set(toFirestore(agreement));
  }

  async findLatestBySubject(
    organizationId: string,
    subjectType: PolicySubjectType,
    subjectId: string,
    type: PolicyType,
  ): Promise<PolicyAgreement | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("subjectType", "==", subjectType)
      .where("subjectId", "==", subjectId)
      .where("type", "==", type)
      .orderBy("agreedAt", "desc")
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return toDomain(snapshot.docs[0].data() as PolicyAgreementDoc);
  }

  async listBySubject(
    organizationId: string,
    subjectType: PolicySubjectType,
    subjectId: string,
  ): Promise<PolicyAgreement[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("subjectType", "==", subjectType)
      .where("subjectId", "==", subjectId)
      .get();
    return snapshot.docs
      .map((doc) => toDomain(doc.data() as PolicyAgreementDoc))
      .sort((a, b) => b.getAgreedAt().getTime() - a.getAgreedAt().getTime());
  }
}
