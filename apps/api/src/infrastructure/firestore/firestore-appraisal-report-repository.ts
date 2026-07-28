import type { Timestamp } from "firebase-admin/firestore";
import type { AppraisalReport } from "@/domain/appraisal-report/appraisal-report";
import { AppraisalReport as AppraisalReportEntity } from "@/domain/appraisal-report/appraisal-report";
import { AppraisalReportContent } from "@/domain/appraisal-report/appraisal-report-content";
import type { IAppraisalReportRepository } from "@/domain/appraisal-report/appraisal-report-repository";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.appraisalReports;

interface AppraisalReportDoc {
  reportId: string;
  organizationId: string;
  bookingId: string;
  consultantId: string;
  customerId: string;
  title?: string;
  customerName?: string;
  birthDate?: string;
  appraisalDate?: string;
  theme?: string;
  currentSituation?: string;
  result?: string;
  luckyAction?: string;
  summary?: string;
  status: string;
  publishedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function toDomain(doc: AppraisalReportDoc): AppraisalReport {
  const createdAt = doc.createdAt?.toDate() ?? new Date(0);
  return AppraisalReportEntity.reconstruct({
    reportId: doc.reportId,
    organizationId: doc.organizationId,
    bookingId: doc.bookingId,
    consultantId: doc.consultantId,
    customerId: doc.customerId,
    content: AppraisalReportContent.reconstruct({
      title: doc.title ?? "",
      customerName: doc.customerName ?? "",
      birthDate: doc.birthDate ?? "",
      appraisalDate: doc.appraisalDate ?? "",
      theme: doc.theme ?? "",
      currentSituation: doc.currentSituation ?? "",
      result: doc.result ?? "",
      luckyAction: doc.luckyAction ?? "",
      summary: doc.summary ?? "",
    }),
    status: doc.status,
    publishedAt: doc.publishedAt?.toDate() ?? null,
    createdAt,
    updatedAt: doc.updatedAt?.toDate() ?? createdAt,
  });
}

function toFirestore(report: AppraisalReport): Record<string, unknown> {
  const content = report.getContent();
  return {
    reportId: report.getReportId(),
    organizationId: report.getOrganizationId(),
    bookingId: report.getBookingId(),
    consultantId: report.getConsultantId(),
    customerId: report.getCustomerId(),
    title: content.getTitle(),
    customerName: content.getCustomerName(),
    birthDate: content.getBirthDate(),
    appraisalDate: content.getAppraisalDate(),
    theme: content.getTheme(),
    currentSituation: content.getCurrentSituation(),
    result: content.getResult(),
    luckyAction: content.getLuckyAction(),
    summary: content.getSummary(),
    status: report.getStatus(),
    publishedAt: report.getPublishedAt() ?? null,
    createdAt: report.getCreatedAt(),
    updatedAt: report.getUpdatedAt(),
  };
}

export class FirestoreAppraisalReportRepository
  implements IAppraisalReportRepository
{
  async findById(
    organizationId: string,
    reportId: string,
  ): Promise<AppraisalReport | null> {
    const doc = await db.collection(COLLECTION).doc(reportId).get();
    if (!doc.exists) return null;
    const report = toDomain(doc.data() as AppraisalReportDoc);
    return report.getOrganizationId() === organizationId ? report : null;
  }

  async findByBookingId(
    organizationId: string,
    bookingId: string,
  ): Promise<AppraisalReport | null> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("bookingId", "==", bookingId)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    if (!doc) return null;
    return toDomain(doc.data() as AppraisalReportDoc);
  }

  async findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<AppraisalReport[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("consultantId", "==", consultantId)
      .get();
    return snapshot.docs.map((doc) =>
      toDomain(doc.data() as AppraisalReportDoc),
    );
  }

  async findPublishedByCustomerIds(
    customerIds: string[],
  ): Promise<AppraisalReport[]> {
    const uniqueIds = [...new Set(customerIds)];
    if (uniqueIds.length === 0) return [];
    const CHUNK_SIZE = 30;
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      chunks.push(uniqueIds.slice(i, i + CHUNK_SIZE));
    }
    const snapshots = await Promise.all(
      chunks.map((chunk) =>
        db
          .collection(COLLECTION)
          .where("customerId", "in", chunk)
          .where("status", "==", "published")
          .get(),
      ),
    );
    return snapshots.flatMap((snapshot) =>
      snapshot.docs.map((doc) => toDomain(doc.data() as AppraisalReportDoc)),
    );
  }

  async save(report: AppraisalReport): Promise<void> {
    await db
      .collection(COLLECTION)
      .doc(report.getReportId())
      .set(toFirestore(report));
  }
}
