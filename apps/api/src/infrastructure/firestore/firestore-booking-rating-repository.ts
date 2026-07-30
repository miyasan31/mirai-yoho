import { DomainError } from "@mirai-yoho/shared/domain-error";
import type { Timestamp } from "firebase-admin/firestore";
import { BookingRating } from "@/domain/booking-rating/booking-rating";
import {
  type IBookingRatingRepository,
  RATING_ALREADY_SUBMITTED,
} from "@/domain/booking-rating/booking-rating-repository";
import { RatingComment } from "@/domain/booking-rating/rating-comment";
import { RatingScore } from "@/domain/booking-rating/rating-score";
import { db } from "@/infrastructure/firestore/firestore-client";
import { FIRESTORE_COLLECTIONS } from "@/infrastructure/firestore/firestore-collections";

const COLLECTION = FIRESTORE_COLLECTIONS.bookingRatings;

// getAll は 1 回のレスポンスが大きくなりすぎないよう分割する
const GET_ALL_CHUNK_SIZE = 300;

interface BookingRatingDoc {
  organizationId: string;
  bookingId: string;
  consultantId: string;
  customerId: string;
  score: number;
  comment: string;
  consultedAt: Timestamp;
  ratedAt: Timestamp;
}

function toDomain(doc: BookingRatingDoc): BookingRating {
  return BookingRating.reconstruct({
    organizationId: doc.organizationId,
    bookingId: doc.bookingId,
    consultantId: doc.consultantId,
    customerId: doc.customerId,
    score: RatingScore.reconstruct(doc.score),
    comment: RatingComment.reconstruct(doc.comment ?? ""),
    consultedAt: doc.consultedAt.toDate(),
    ratedAt: doc.ratedAt.toDate(),
  });
}

function toFirestore(rating: BookingRating): Record<string, unknown> {
  return {
    organizationId: rating.getOrganizationId(),
    bookingId: rating.getBookingId(),
    consultantId: rating.getConsultantId(),
    customerId: rating.getCustomerId(),
    score: rating.getScore().getValue(),
    comment: rating.getComment().getValue(),
    consultedAt: rating.getConsultedAt(),
    ratedAt: rating.getRatedAt(),
  };
}

/**
 * Firestore の ALREADY_EXISTS（gRPC code 6）判定。
 * route-handler.ts の isFirestoreFailedPrecondition（code 9）と同じ書き方に揃えている。
 */
function isFirestoreAlreadyExists(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as { code?: unknown; message?: unknown };
  const code = candidate.code;
  const message =
    typeof candidate.message === "string" ? candidate.message : "";

  return (
    code === 6 ||
    code === "6" ||
    code === "already-exists" ||
    code === "ALREADY_EXISTS" ||
    message.includes("ALREADY_EXISTS")
  );
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

/**
 * Doc ID = bookingId。1 予約 1 評価を Firestore が構造的に保証する。
 */
export class FirestoreBookingRatingRepository
  implements IBookingRatingRepository
{
  async findByBookingId(
    organizationId: string,
    bookingId: string,
  ): Promise<BookingRating | null> {
    const doc = await db.collection(COLLECTION).doc(bookingId).get();
    if (!doc.exists) return null;
    const rating = toDomain(doc.data() as BookingRatingDoc);
    return rating.getOrganizationId() === organizationId ? rating : null;
  }

  async findByBookingIds(bookingIds: string[]): Promise<BookingRating[]> {
    const uniqueIds = [...new Set(bookingIds)];
    if (uniqueIds.length === 0) return [];

    // Doc ID = bookingId なので getAll で引ける。
    // `where documentId() in [...]` は 30 件制限があるためクエリを使わない。
    const results = await Promise.all(
      chunk(uniqueIds, GET_ALL_CHUNK_SIZE).map((ids) =>
        db.getAll(...ids.map((id) => db.collection(COLLECTION).doc(id))),
      ),
    );

    return results
      .flat()
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => toDomain(snapshot.data() as BookingRatingDoc));
  }

  async findByConsultantId(
    organizationId: string,
    consultantId: string,
  ): Promise<BookingRating[]> {
    // orderBy を付けると複合インデックスが必要になるため、ソートはメモリ内で行う
    const snapshot = await db
      .collection(COLLECTION)
      .where("organizationId", "==", organizationId)
      .where("consultantId", "==", consultantId)
      .get();

    return snapshot.docs
      .map((doc) => toDomain(doc.data() as BookingRatingDoc))
      .sort((a, b) => b.getRatedAt().getTime() - a.getRatedAt().getTime());
  }

  async create(rating: BookingRating): Promise<void> {
    try {
      // set() ではなく create() を使う。既存 doc があれば ALREADY_EXISTS で失敗するため、
      // 二重送信（レース）でも上書きされず「提出後は編集不可」が保たれる。
      await db
        .collection(COLLECTION)
        .doc(rating.getBookingId())
        .create(toFirestore(rating));
    } catch (error) {
      if (isFirestoreAlreadyExists(error)) {
        throw new DomainError(
          RATING_ALREADY_SUBMITTED,
          "Rating has already been submitted for this booking",
        );
      }
      throw error;
    }
  }
}
