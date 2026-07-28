import { Hono } from "hono";
import { requirePermission } from "@/infrastructure/auth/require-permission";
import { verifyAccountAuth } from "@/infrastructure/auth/verify-auth";
import { createListConsultantRatingsUseCase } from "@/infrastructure/container";
import {
  INVALID_LIST_QUERY_MESSAGE,
  paginateArray,
  parseListQueryParams,
} from "./list-query";
import { getRoute, jsonError, noStoreJson } from "./route-handler";

export const consoleConsultantRatingRoutes = new Hono();

/**
 * 占い師に対する会員の評価一覧（運営のみ）。
 *
 * 認証は verifyEitherAuth ではなく verifyAccountAuth を使う。評価は占い師に見せない仕様のため、
 * 占い師トークンを requirePermission ではなく認証段階で弾く。
 *
 * 顧客の識別情報（customerId / 顧客名）は返さない。console.consultants.read しか
 * 持たないロールに顧客情報を渡さないため。どの鑑定に対する評価かは consultedAt で辿れる。
 */
consoleConsultantRatingRoutes.get(
  "/console/consultants/:consultantId/ratings",
  getRoute(async ({ organizationId, request, requestUrl, param }) => {
    const authUser = await verifyAccountAuth(request);
    requirePermission(authUser, organizationId, "console.consultants.read");

    const listQueryParams = parseListQueryParams(requestUrl.searchParams);
    if (!listQueryParams) {
      return jsonError(400, "VALIDATION_ERROR", INVALID_LIST_QUERY_MESSAGE);
    }

    const consultantId = param("consultantId");
    const result = await createListConsultantRatingsUseCase().execute({
      organizationId,
      consultantId,
    });

    // 評価は不変なので sortBy の値によらず ratedAt 降順（UseCase 側で整列済み）
    const ratingItems = result.ratings.map((rating) => ({
      bookingId: rating.getBookingId(),
      score: rating.getScore().getValue(),
      comment: rating.getComment().isEmpty()
        ? null
        : rating.getComment().getValue(),
      consultedAt: rating.getConsultedAt().toISOString(),
      ratedAt: rating.getRatedAt().toISOString(),
    }));
    const { items, pagination } = paginateArray(ratingItems, listQueryParams);

    return noStoreJson({
      consultantId,
      summary: result.summary,
      ratings: items,
      pagination,
    });
  }),
);
