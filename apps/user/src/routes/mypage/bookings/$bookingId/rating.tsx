import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  useGetMyBookingRatingSuspense,
  useSubmitMyBookingRating,
} from "@mirai-yoho/api-client/api/customer/customer";
import type { MyBookingRatingDetail } from "@mirai-yoho/api-client/schemas";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { StarRating } from "@mirai-yoho/ui/components/star-rating";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Skeleton, SkeletonText } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Textarea } from "@mirai-yoho/ui/components/ui/textarea";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleX, Star } from "lucide-react";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { pageHead } from "@/lib/head";
import { formatDateTime, formatDateTimeRange } from "../-booking-format";
import {
  RATING_COMMENT_MAX_LENGTH,
  type RatingFormValues,
  ratingFormSchema,
} from "../-rating-form-schema";

// loader は使わない。ルート解決時に走るため、親の mypage/route.tsx が Firebase Auth の
// セッションを復元し終える前にトークンなしでリクエストしてしまい 401 になる。
// mypage 配下の他ページと同様、認証ゲートを通ったあとにコンポーネント内で取得する。
export const Route = createFileRoute("/mypage/bookings/$bookingId/rating")({
  head: () => pageHead("鑑定の評価"),
  errorComponent: RatingPageError,
  component: RatingPage,
});

function BackToBookings() {
  return (
    <Button asChild variant="outline" size="sm" alignSelf="flex-start">
      <Link to="/mypage/bookings">
        <ArrowLeft size={16} />
        予約一覧に戻る
      </Link>
    </Button>
  );
}

function RatingPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <styled.div display="flex" flexDir="column" gap="6">
      <BackToBookings />
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        鑑定の評価
      </Text>
      {children}
    </styled.div>
  );
}

function RatingSkeleton() {
  return (
    <>
      <Skeleton height="6" width="60%" />
      <SkeletonText noOfLines={3} />
      <Skeleton height="10" width="40%" />
    </>
  );
}

function RatingPageError() {
  return (
    <RatingPageLayout>
      <EmptyState
        icon={CircleX}
        message="評価ページの読み込みに失敗しました"
        hint="時間をおいて再度お試しください"
      />
    </RatingPageLayout>
  );
}

function RatingPage() {
  const { isSignedUp } = useCustomerAuth();

  return (
    <RatingPageLayout>
      {isSignedUp ? (
        <Suspense fallback={<RatingSkeleton />}>
          <RatingContent />
        </Suspense>
      ) : (
        <EmptyState
          icon={Star}
          message="対象の予約が見つかりません"
          hint="予約一覧からもう一度お試しください"
        />
      )}
    </RatingPageLayout>
  );
}

function RatingContent() {
  const { bookingId } = Route.useParams();
  const { data } = useGetMyBookingRatingSuspense(bookingId);
  const detail = data.data;

  return (
    <>
      <BookingSummary detail={detail} />
      {detail.ratable ? (
        <RatingForm bookingId={bookingId} detail={detail} />
      ) : (
        <RatingUnavailable detail={detail} />
      )}
    </>
  );
}

function BookingSummary({ detail }: { detail: MyBookingRatingDetail }) {
  const { booking } = detail;
  return (
    <styled.div
      border="1px solid"
      borderColor="border"
      display="flex"
      flexDir="column"
      gap="1"
      p="4"
      rounded="l2"
    >
      <Text fontWeight="semibold" textStyle="md">
        {formatDateTimeRange(booking.startsAt, booking.endsAt)}
      </Text>
      {booking.consultantName && (
        <Text color="fg.muted" textStyle="sm">
          担当: {booking.consultantName}
        </Text>
      )}
      {booking.organizationName && (
        <Text color="fg.muted" textStyle="sm">
          店舗: {booking.organizationName}
        </Text>
      )}
      {booking.pricePlanName && (
        <Text color="fg.muted" textStyle="sm">
          {booking.pricePlanName}
        </Text>
      )}
    </styled.div>
  );
}

/** 評価済みなら提出内容を読み取り専用で見せ、それ以外はサーバーが返した理由をそのまま出す */
function RatingUnavailable({ detail }: { detail: MyBookingRatingDetail }) {
  if (detail.rating) {
    return (
      <styled.div display="flex" flexDir="column" gap="4">
        <Text color="fg.muted" textStyle="sm">
          この鑑定はすでに評価済みです。送信後の変更・取り消しはできません。
        </Text>
        <Field.Root>
          <Field.Label>鑑定の満足度</Field.Label>
          <StarRating readOnly size="lg" value={detail.rating.score} />
        </Field.Root>
        {detail.rating.comment && (
          <Field.Root>
            <Field.Label>コメント</Field.Label>
            <Text whiteSpace="pre-wrap">{detail.rating.comment}</Text>
          </Field.Root>
        )}
        <Text color="fg.subtle" textStyle="xs">
          {formatDateTime(detail.rating.ratedAt)} に送信
        </Text>
      </styled.div>
    );
  }

  return (
    <EmptyState
      icon={Star}
      message={detail.ratableReason ?? "この鑑定は評価できません"}
      hint={
        detail.ratableReasonCode === "BOOKING_NOT_FINISHED"
          ? "鑑定終了後に評価をお願いします"
          : undefined
      }
    />
  );
}

function RatingForm({
  bookingId,
  detail,
}: {
  bookingId: string;
  detail: MyBookingRatingDetail;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<RatingFormValues>({
    resolver: valibotResolver(ratingFormSchema),
    defaultValues: { score: 0, comment: "" },
  });

  const score = watch("score");
  const comment = watch("comment") ?? "";

  const submitRating = useSubmitMyBookingRating({
    mutation: {
      onSuccess: async () => {
        toaster.create({ type: "success", title: "評価を送信しました" });
        await invalidateAfter.bookingRatingSubmit(
          queryClient,
          detail.booking.organizationId,
          detail.booking.consultantId,
          bookingId,
        );
        await navigate({ to: "/mypage/bookings" });
      },
      // API エラー（409 の評価済み・期間外など）は custom-fetch の toaster が表示する
    },
  });

  return (
    <styled.form
      display="flex"
      flexDir="column"
      gap="6"
      onSubmit={handleSubmit((values) =>
        submitRating.mutate({
          bookingId,
          data: {
            score: values.score,
            comment: values.comment || undefined,
          },
        }),
      )}
    >
      <Field.Root invalid={!!errors.score} required>
        <Field.Label>鑑定の満足度</Field.Label>
        <StarRating
          ariaLabel="鑑定の満足度（5段階）"
          onValueChange={(next) =>
            setValue("score", next, { shouldValidate: true })
          }
          size="lg"
          value={score}
        />
        {errors.score && (
          <Field.ErrorText>{errors.score.message}</Field.ErrorText>
        )}
      </Field.Root>

      <Field.Root invalid={!!errors.comment}>
        <Field.Label>コメント（任意）</Field.Label>
        <Textarea
          placeholder="鑑定の感想をお聞かせください"
          rows={6}
          {...register("comment")}
        />
        <Field.HelperText>
          {comment.length} / {RATING_COMMENT_MAX_LENGTH} 文字
        </Field.HelperText>
        {errors.comment && (
          <Field.ErrorText>{errors.comment.message}</Field.ErrorText>
        )}
      </Field.Root>

      <Text color="fg.muted" textStyle="sm">
        いただいた評価は運営のサービス改善にのみ利用し、占い師には公開されません。
        送信後の内容の変更・取り消しはできません。
      </Text>

      <Button
        alignSelf="flex-start"
        loading={submitRating.isPending}
        loadingText="送信中..."
        type="submit"
      >
        評価を送信する
      </Button>
    </styled.form>
  );
}
