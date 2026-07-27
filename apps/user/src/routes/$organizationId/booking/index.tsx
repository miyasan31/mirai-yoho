import { valibotResolver } from "@hookform/resolvers/valibot";
import { useGetCustomerCoupons } from "@mirai-yoho/api-client/api/customer/customer";
import { useGetLatestPublishedPolicy } from "@mirai-yoho/api-client/api/public/public";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import {
  getBookingCutoffMinutes,
  isBeforeBookingDeadline,
  isSupportedDuration,
} from "@mirai-yoho/shared/slot-availability";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Checkbox from "@mirai-yoho/ui/components/ui/checkbox";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import * as RadioGroup from "@mirai-yoho/ui/components/ui/radio-group";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Textarea } from "@mirai-yoho/ui/components/ui/textarea";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarX } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useCreateBooking } from "@/hooks/use-booking";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { usePricePlanOptions } from "@/hooks/use-price-plans";
import { pageHead } from "@/lib/head";
import { BookingAuthGate } from "./-booking-auth-gate";
import {
  type BookingFormValues,
  bookingFormSchema,
} from "./-booking-form-schema";

interface BookingSearch {
  consultantId?: string;
  startsAt?: string;
  selectionId?: string;
  durationMinutes?: number;
}

export const Route = createFileRoute("/$organizationId/booking/")({
  head: () => pageHead("予約情報入力"),
  validateSearch: (search: Record<string, unknown>): BookingSearch => {
    const durationRaw = search.durationMinutes;
    const duration =
      typeof durationRaw === "number"
        ? durationRaw
        : typeof durationRaw === "string"
          ? Number(durationRaw)
          : undefined;
    return {
      consultantId:
        typeof search.consultantId === "string"
          ? search.consultantId
          : undefined,
      startsAt:
        typeof search.startsAt === "string" ? search.startsAt : undefined,
      selectionId:
        typeof search.selectionId === "string" ? search.selectionId : undefined,
      durationMinutes:
        typeof duration === "number" && Number.isFinite(duration)
          ? duration
          : undefined,
    };
  },
  component: BookingPage,
});

export function BookingPage() {
  return (
    <BookingAuthGate>
      <BookingPageInner />
    </BookingAuthGate>
  );
}

function BookingPageInner() {
  const { profile } = useCustomerAuth();
  const { consultantId, startsAt, selectionId, durationMinutes } =
    Route.useSearch();
  const { organizationId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedStartAt =
    typeof startsAt === "string" ? new Date(startsAt) : null;
  const hasValidSelectedStartAt =
    selectedStartAt !== null && !Number.isNaN(selectedStartAt.getTime());
  const bookingCutoffExceeded =
    hasValidSelectedStartAt && !isBeforeBookingDeadline(selectedStartAt);
  const hasValidDuration =
    typeof durationMinutes === "number" && isSupportedDuration(durationMinutes);
  const hasSelection =
    typeof selectionId === "string" && selectionId.length > 0;
  const hasConsultant =
    typeof consultantId === "string" && consultantId.length > 0;

  const [selectedUserCouponId, setSelectedUserCouponId] = useState<string>("");

  const termsQuery = useGetLatestPublishedPolicy(organizationId, "terms", {
    query: { enabled: Boolean(organizationId) },
  });
  const cancellationPolicyQuery = useGetLatestPublishedPolicy(
    organizationId,
    "cancellation_policy",
    { query: { enabled: Boolean(organizationId) } },
  );
  const termsRevision = termsQuery.data?.data ?? null;
  const cancellationPolicyRevision = cancellationPolicyQuery.data?.data ?? null;

  const couponsQuery = useGetCustomerCoupons({
    query: { enabled: Boolean(profile) },
  });
  const availableCoupons = (couponsQuery.data?.data?.coupons ?? []).filter(
    (c) =>
      c.organizationId === organizationId && c.isRedeemable && !c.redeemedAt,
  );
  const couponGroups = Object.values(
    availableCoupons.reduce<
      Record<
        string,
        {
          representativeUserCouponId: string;
          couponId: string;
          couponName: string;
          amountJPY: number;
          expiresAt: string | null;
          remainingCount: number;
        }
      >
    >((acc, c) => {
      const existing = acc[c.couponId];
      if (existing) {
        existing.remainingCount += 1;
        if (
          c.expiresAt &&
          (!existing.expiresAt || c.expiresAt < existing.expiresAt)
        ) {
          existing.expiresAt = c.expiresAt;
          existing.representativeUserCouponId = c.userCouponId;
        }
      } else {
        acc[c.couponId] = {
          representativeUserCouponId: c.userCouponId,
          couponId: c.couponId,
          couponName: c.couponName,
          amountJPY: c.amountJPY,
          expiresAt: c.expiresAt,
          remainingCount: 1,
        };
      }
      return acc;
    }, {}),
  );
  const selectedCoupon =
    availableCoupons.find((c) => c.userCouponId === selectedUserCouponId) ??
    null;
  const pricePlansQuery = usePricePlanOptions({
    consultantId: consultantId ?? "",
  });
  const selectedPlan =
    pricePlansQuery.data?.data?.pricePlans.find(
      (plan) => plan.selectionId === selectionId,
    ) ?? null;
  const discountedTotalJPY =
    selectedPlan && selectedCoupon
      ? Math.max(0, selectedPlan.totalJPY - selectedCoupon.amountJPY)
      : (selectedPlan?.totalJPY ?? null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: valibotResolver(bookingFormSchema),
    defaultValues: {
      customerName: profile?.displayName ?? "",
      customerEmail: profile?.primaryEmail ?? "",
      customerPhone: "",
      customerBirthDate: profile?.birthDate ?? "",
      consultantContent: "",
      guardianName: "",
      guardianConsent: false,
      agreedToTerms: false,
    },
  });

  const watchedBirthDate = watch("customerBirthDate");
  const isMinorCustomer = (() => {
    if (!watchedBirthDate || !/^\d{4}-\d{2}-\d{2}$/.test(watchedBirthDate)) {
      return false;
    }
    const [year, month, day] = watchedBirthDate.split("-").map(Number);
    const ref = new Date();
    let age = ref.getUTCFullYear() - year;
    const monthDiff = ref.getUTCMonth() + 1 - month;
    if (monthDiff < 0 || (monthDiff === 0 && ref.getUTCDate() < day)) {
      age -= 1;
    }
    return age < 18;
  })();

  const createBooking = useCreateBooking();

  if (!startsAt || !hasSelection || !hasValidDuration || !hasConsultant) {
    return (
      <styled.div py="16" px="8">
        <EmptyState
          icon={CalendarX}
          message="予約に必要な情報が不足しています"
          hint="占い師・料金プラン・予約枠を選択してください"
        />
        <styled.div display="flex" justifyContent="center" mt="4">
          <Button asChild variant="outline">
            <Link to="/$organizationId/consultants" params={{ organizationId }}>
              予約フローを最初から
            </Link>
          </Button>
        </styled.div>
      </styled.div>
    );
  }

  if (bookingCutoffExceeded) {
    return (
      <styled.div py="16" px="8">
        <EmptyState
          icon={CalendarX}
          message="この予約枠の受付は終了しました"
          hint={`予約は開始時刻の${getBookingCutoffMinutes()}分前まで受け付けています`}
        />
        <styled.div display="flex" justifyContent="center" mt="4">
          <Button asChild variant="outline">
            <Link to="/$organizationId/consultants" params={{ organizationId }}>
              予約可能日時へ
            </Link>
          </Button>
        </styled.div>
      </styled.div>
    );
  }

  const backLink = {
    to: "/$organizationId/consultants/$id/slots" as const,
    params: { organizationId, id: consultantId },
    search: { selectionId, durationMinutes },
  };

  const onSubmit = async (values: BookingFormValues) => {
    if (!organizationId) return;
    if (!selectionId || !hasValidDuration) {
      toaster.create({
        type: "error",
        title: "料金プランが選択されていません",
      });
      return;
    }
    if (!termsRevision || !cancellationPolicyRevision) {
      toaster.create({
        type: "error",
        title: "利用規約またはキャンセルポリシーが未公開です",
        description:
          "この組織ではまだポリシーが公開されていないため予約できません。運営者にお問い合わせください。",
      });
      return;
    }
    try {
      const result = await createBooking.mutateAsync({
        organizationId,
        data: {
          consultantId,
          startsAt,
          durationMinutes,
          customerName: values.customerName,
          customerEmail: values.customerEmail,
          customerPhone: values.customerPhone,
          customerBirthDate: values.customerBirthDate,
          consultantContent: values.consultantContent?.trim() || undefined,
          selectionId,
          selectedUserCouponId: selectedUserCouponId || undefined,
          agreedTermsRevisionId: termsRevision.revisionId,
          agreedCancellationPolicyRevisionId:
            cancellationPolicyRevision.revisionId,
          agreedAt: new Date().toISOString(),
          ...(isMinorCustomer && values.guardianName
            ? {
                guardianName: values.guardianName,
                guardianConsentedAt: new Date().toISOString(),
              }
            : {}),
        },
      });

      const responseData = result.data;
      await invalidateAfter.bookingCreate(queryClient, organizationId);
      if ("bookingId" in responseData && "bookingActionToken" in responseData) {
        navigate({
          to: "/$organizationId/booking/payment",
          params: { organizationId },
          search: {
            bookingId: responseData.bookingId,
            bookingActionToken: responseData.bookingActionToken,
          },
        });
      }
    } catch {
      // customFetch already displays a toast; prevent unhandled promise rejection here.
    }
  };

  return (
    <styled.div maxW="lg" mx="auto" p="8">
      <styled.div display="flex" alignItems="center" gap="2" mb="4">
        <Tooltip content="空き枠選択に戻る" showArrow>
          <IconButton variant="subtle" size="sm" asChild>
            <Link {...backLink}>
              <ArrowLeft size={18} />
            </Link>
          </IconButton>
        </Tooltip>
        <Text textStyle="sm" color="fg.muted">
          空き枠選択に戻る
        </Text>
      </styled.div>

      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
        予約情報入力
      </Text>
      <Text textStyle="sm" color="fg.muted" mb="6">
        必要事項を入力して予約を確定してください
      </Text>

      <styled.div
        shadow="sm"
        rounded="l2"
        border="1px solid"
        borderColor="border"
        p="6"
      >
        <styled.form
          onSubmit={handleSubmit(onSubmit)}
          display="flex"
          flexDirection="column"
          gap="5"
        >
          {selectedPlan && (
            <styled.div
              rounded="l2"
              bg="bg.subtle"
              p="3"
              display="flex"
              flexDirection="column"
              gap="1"
            >
              <Text textStyle="sm" color="fg.muted">
                選択中のプラン
              </Text>
              <styled.div
                display="flex"
                justifyContent="space-between"
                alignItems="baseline"
                gap="3"
              >
                <Text fontWeight="medium">
                  {selectedPlan.name}（{selectedPlan.durationMinutes}分）
                </Text>
                <Text fontWeight="bold" color="colorPalette.default">
                  ¥{selectedPlan.totalJPY.toLocaleString()}
                </Text>
              </styled.div>
            </styled.div>
          )}

          <Field.Root invalid={!!errors.customerName}>
            <Field.Label>
              お名前
              <Field.RequiredIndicator />
            </Field.Label>
            <Input {...register("customerName")} placeholder="山田 太郎" />
            {errors.customerName && (
              <Field.ErrorText>{errors.customerName.message}</Field.ErrorText>
            )}
          </Field.Root>

          <Field.Root invalid={!!errors.customerEmail}>
            <Field.Label>
              メールアドレス
              <Field.RequiredIndicator />
            </Field.Label>
            <Input
              {...register("customerEmail")}
              type="email"
              placeholder="example@email.com"
            />
            <Field.HelperText>予約確認メールをお送りします</Field.HelperText>
            {errors.customerEmail && (
              <Field.ErrorText>{errors.customerEmail.message}</Field.ErrorText>
            )}
          </Field.Root>

          <Field.Root invalid={!!errors.customerPhone}>
            <Field.Label>
              電話番号
              <Field.RequiredIndicator />
            </Field.Label>
            <Input
              {...register("customerPhone")}
              type="tel"
              placeholder="090-1234-5678"
            />
            <Field.HelperText>
              緊急連絡用（ハイフンあり・なし可）
            </Field.HelperText>
            {errors.customerPhone && (
              <Field.ErrorText>{errors.customerPhone.message}</Field.ErrorText>
            )}
          </Field.Root>

          <Field.Root invalid={!!errors.customerBirthDate}>
            <Field.Label>
              生年月日
              <Field.RequiredIndicator />
            </Field.Label>
            <Input {...register("customerBirthDate")} type="date" />
            {errors.customerBirthDate && (
              <Field.ErrorText>
                {errors.customerBirthDate.message}
              </Field.ErrorText>
            )}
          </Field.Root>

          {isMinorCustomer && (
            <styled.div
              display="flex"
              flexDir="column"
              gap="3"
              p="4"
              borderWidth="1"
              borderColor="border"
              borderRadius="md"
              bg="bg.subtle"
            >
              <Text textStyle="sm" fontWeight="medium">
                親権者同意（利用規約 第8条）
              </Text>
              <Text textStyle="xs" color="fg.muted">
                18歳未満の方が本サービスを利用する場合、親権者その他法定代理人の同意が必要です。
              </Text>
              <Field.Root invalid={!!errors.guardianName}>
                <Field.Label>
                  親権者氏名
                  <Field.RequiredIndicator />
                </Field.Label>
                <Input {...register("guardianName")} placeholder="山田 花子" />
                {errors.guardianName && (
                  <Field.ErrorText>
                    {errors.guardianName.message}
                  </Field.ErrorText>
                )}
              </Field.Root>
              <Field.Root invalid={!!errors.guardianConsent}>
                <Controller
                  control={control}
                  name="guardianConsent"
                  render={({ field }) => (
                    <Checkbox.Root
                      checked={field.value === true}
                      onCheckedChange={(details) =>
                        field.onChange(details.checked === true)
                      }
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Label>
                        親権者として本サービスの利用に同意します
                      </Checkbox.Label>
                    </Checkbox.Root>
                  )}
                />
                {errors.guardianConsent && (
                  <Field.ErrorText>
                    {errors.guardianConsent.message}
                  </Field.ErrorText>
                )}
              </Field.Root>
            </styled.div>
          )}

          <Field.Root>
            <Field.Label>ご相談内容（任意）</Field.Label>
            <Textarea
              {...register("consultantContent")}
              placeholder="ご相談内容をお書きください"
              rows={4}
            />
            <Field.HelperText>
              相談したい内容を事前にお知らせいただけると、より充実した相談が可能です
            </Field.HelperText>
          </Field.Root>

          <Field.Root>
            <styled.div
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap="2"
            >
              <Field.Label>クーポン（任意 / 1枚まで）</Field.Label>
              <Link
                to="/$organizationId/coupons"
                params={{ organizationId }}
                search={{
                  returnTo: "booking",
                  consultantId,
                  startsAt,
                  selectionId,
                  durationMinutes,
                }}
              >
                <styled.span
                  color="colorPalette.default"
                  textDecoration="underline"
                  textStyle="sm"
                >
                  取得画面へ →
                </styled.span>
              </Link>
            </styled.div>
            {couponGroups.length === 0 ? (
              <Text textStyle="sm" color="fg.muted">
                利用可能なクーポンはありません。取得画面から受け取れます。
              </Text>
            ) : (
              <RadioGroup.Root
                name="selectedUserCouponId"
                value={selectedUserCouponId || "none"}
                onValueChange={(details) =>
                  setSelectedUserCouponId(
                    details.value === "none" ? "" : (details.value ?? ""),
                  )
                }
              >
                <RadioGroup.Item value="none">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemControl>
                    <RadioGroup.Indicator />
                  </RadioGroup.ItemControl>
                  <RadioGroup.ItemText>使用しない</RadioGroup.ItemText>
                </RadioGroup.Item>
                {couponGroups.map((group) => (
                  <RadioGroup.Item
                    key={group.couponId}
                    value={group.representativeUserCouponId}
                  >
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl>
                      <RadioGroup.Indicator />
                    </RadioGroup.ItemControl>
                    <RadioGroup.ItemText asChild>
                      <styled.div>
                        <Text fontWeight="medium">
                          {group.couponName}（¥
                          {group.amountJPY.toLocaleString()} 割引 / あと{" "}
                          {group.remainingCount} 回利用可能）
                        </Text>
                        {group.expiresAt && (
                          <Text textStyle="sm" color="fg.muted" mt="1">
                            有効期限:{" "}
                            {new Date(group.expiresAt).toLocaleDateString(
                              "ja-JP",
                            )}
                          </Text>
                        )}
                      </styled.div>
                    </RadioGroup.ItemText>
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>
            )}
          </Field.Root>

          {selectedPlan && (
            <styled.div
              rounded="l2"
              bg="bg.subtle"
              p="3"
              display="flex"
              flexDir="column"
              gap="1"
            >
              <styled.div display="flex" justifyContent="space-between">
                <Text textStyle="sm">プラン料金</Text>
                <Text textStyle="sm">
                  ¥{selectedPlan.totalJPY.toLocaleString()}
                </Text>
              </styled.div>
              {selectedCoupon && (
                <styled.div
                  display="flex"
                  justifyContent="space-between"
                  color="fg.success"
                >
                  <Text textStyle="sm">クーポン割引</Text>
                  <Text textStyle="sm">
                    -¥{selectedCoupon.amountJPY.toLocaleString()}
                  </Text>
                </styled.div>
              )}
              <styled.div
                display="flex"
                justifyContent="space-between"
                borderTopWidth="1"
                borderColor="border"
                pt="1"
                fontWeight="bold"
              >
                <Text>お支払い金額</Text>
                <Text>¥{(discountedTotalJPY ?? 0).toLocaleString()}</Text>
              </styled.div>
            </styled.div>
          )}

          <Field.Root invalid={!!errors.agreedToTerms}>
            <Controller
              control={control}
              name="agreedToTerms"
              render={({ field }) => (
                <Checkbox.Root
                  checked={field.value}
                  onCheckedChange={(details) =>
                    field.onChange(details.checked === true)
                  }
                >
                  <Checkbox.HiddenInput
                    name={field.name}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>
                    <Link
                      to="/$organizationId/terms"
                      params={{ organizationId }}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <styled.span
                        color="colorPalette.default"
                        textDecoration="underline"
                      >
                        利用規約
                      </styled.span>
                    </Link>
                    および
                    <Link
                      to="/$organizationId/cancellation-policy"
                      params={{ organizationId }}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <styled.span
                        color="colorPalette.default"
                        textDecoration="underline"
                      >
                        キャンセルポリシー
                      </styled.span>
                    </Link>
                    に同意する
                  </Checkbox.Label>
                </Checkbox.Root>
              )}
            />
            {errors.agreedToTerms && (
              <Field.ErrorText>{errors.agreedToTerms.message}</Field.ErrorText>
            )}
          </Field.Root>

          <Button
            type="submit"
            disabled={pricePlansQuery.isLoading || !selectedPlan}
            loading={createBooking.isPending}
            loadingText="予約を作成中..."
          >
            お支払いへ進む
          </Button>
        </styled.form>
      </styled.div>
    </styled.div>
  );
}
