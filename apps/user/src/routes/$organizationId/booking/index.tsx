import { valibotResolver } from "@hookform/resolvers/valibot";
import { useGetCustomerCoupons } from "@mirai-yoho/api-client/api/customer/customer";
import {
  getBookingCutoffMinutes,
  isBeforeBookingDeadline,
  SUPPORTED_DURATION_MINUTES,
  type SupportedDurationMinutes,
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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useCreateBooking } from "@/hooks/use-booking";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useBookingPricePlans } from "@/hooks/use-price-plans";
import { BookingAuthGate } from "./-booking-auth-gate";
import {
  type BookingFormValues,
  bookingFormSchema,
} from "./-booking-form-schema";

interface BookingSearch {
  consultantId?: string;
  startsAt?: string;
  durationMinutes?: number;
}

export const Route = createFileRoute("/$organizationId/booking/")({
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
  const { consultantId, startsAt } = Route.useSearch();
  const { organizationId } = Route.useParams();
  const navigate = useNavigate();
  const selectedStartAt =
    typeof startsAt === "string" ? new Date(startsAt) : null;
  const hasValidSelectedStartAt =
    selectedStartAt !== null && !Number.isNaN(selectedStartAt.getTime());
  const bookingCutoffExceeded =
    hasValidSelectedStartAt && !isBeforeBookingDeadline(selectedStartAt);
  const [durationMinutes, setDurationMinutes] =
    useState<SupportedDurationMinutes>(30);
  const [selectionId, setPricePlanSelectionId] = useState("");
  const [selectedUserCouponId, setSelectedUserCouponId] = useState<string>("");
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
  const pricePlansQuery = useBookingPricePlans(
    {
      startsAt: startsAt ?? "",
      consultantId: consultantId ?? undefined,
    },
    Boolean(startsAt),
  );
  const allPricePlans = pricePlansQuery.data?.data?.pricePlans ?? [];
  const availableDurations = useMemo(() => {
    const availableSet = new Set<number>();
    for (const plan of allPricePlans) {
      if (plan.isAvailableAtStart) availableSet.add(plan.durationMinutes);
    }
    return availableSet;
  }, [allPricePlans]);
  const pricePlansForDuration = useMemo(
    () =>
      allPricePlans.filter(
        (plan) =>
          plan.durationMinutes === durationMinutes && plan.isAvailableAtStart,
      ),
    [allPricePlans, durationMinutes],
  );
  const selectedPricePlan =
    pricePlansForDuration.find((p) => p.selectionId === selectionId) ?? null;
  const discountedTotalJPY =
    selectedPricePlan && selectedCoupon
      ? Math.max(0, selectedPricePlan.totalJPY - selectedCoupon.amountJPY)
      : (selectedPricePlan?.totalJPY ?? null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: valibotResolver(bookingFormSchema),
    defaultValues: {
      customerName: profile?.displayName ?? "",
      customerEmail: profile?.primaryEmail ?? "",
      customerPhone: "",
      customerBirthDate: profile?.birthDate ?? "",
      consultantContent: "",
      agreedToTerms: false,
    },
  });

  const createBooking = useCreateBooking();

  useEffect(() => {
    if (availableDurations.size === 0) return;
    if (!availableDurations.has(durationMinutes)) {
      const first = SUPPORTED_DURATION_MINUTES.find((d) =>
        availableDurations.has(d),
      );
      if (first) setDurationMinutes(first);
    }
  }, [availableDurations, durationMinutes]);

  useEffect(() => {
    if (selectionId) {
      const stillValid = pricePlansForDuration.some(
        (p) => p.selectionId === selectionId,
      );
      if (stillValid) return;
    }
    const first = pricePlansForDuration[0];
    if (first) {
      setPricePlanSelectionId(first.selectionId);
    } else if (selectionId) {
      setPricePlanSelectionId("");
    }
  }, [selectionId, pricePlansForDuration]);

  if (!startsAt) {
    return (
      <styled.div py="16" px="8">
        <EmptyState
          icon={CalendarX}
          message="予約する枠が選択されていません"
          hint="予約可能な日時から希望の枠を選択してください"
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

  const onSubmit = async (values: BookingFormValues) => {
    if (!organizationId) return;
    if (!selectionId) {
      toaster.create({
        type: "error",
        title: "料金プランを選択してください",
      });
      return;
    }
    try {
      const result = await createBooking.mutateAsync({
        organizationId,
        data: {
          consultantId: consultantId ?? undefined,
          startsAt,
          durationMinutes,
          customerName: values.customerName,
          customerEmail: values.customerEmail,
          customerPhone: values.customerPhone,
          customerBirthDate: values.customerBirthDate,
          consultantContent: values.consultantContent?.trim() || undefined,
          selectionId,
          selectedUserCouponId: selectedUserCouponId || undefined,
        },
      });

      const responseData = result.data;
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
            <Link to="/$organizationId/consultants" params={{ organizationId }}>
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
        {consultantId
          ? "相談時間を選び、必要事項を入力して予約を確定してください"
          : "相談時間を選ぶと、相談員を自動で割り当てて予約を確定します"}
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
          <Field.Root>
            <Field.Label>
              相談時間
              <Field.RequiredIndicator />
            </Field.Label>
            <styled.div
              display="grid"
              gridTemplateColumns={{
                base: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              }}
              gap="2"
            >
              {SUPPORTED_DURATION_MINUTES.map((duration) => {
                const isAvailable = availableDurations.has(duration);
                const isSelected = duration === durationMinutes;
                return (
                  <styled.button
                    key={duration}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setDurationMinutes(duration)}
                    px="3"
                    py="3"
                    rounded="l2"
                    border="1px solid"
                    borderColor={isSelected ? "colorPalette.default" : "border"}
                    bg={isSelected ? "colorPalette.subtle" : "bg.default"}
                    cursor={isAvailable ? "pointer" : "not-allowed"}
                    opacity={isAvailable ? 1 : 0.4}
                    textAlign="center"
                  >
                    <Text fontWeight={isSelected ? "bold" : "medium"}>
                      {duration}分
                    </Text>
                  </styled.button>
                );
              })}
            </styled.div>
            <Field.HelperText>
              予約直後の 15 分はバッファ時間として確保されます
            </Field.HelperText>
          </Field.Root>

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
            <Field.Label>
              料金プラン
              <Field.RequiredIndicator />
            </Field.Label>
            {pricePlansForDuration.length === 0 ? (
              <Text textStyle="sm" color="fg.muted">
                現在選択できる料金プランがありません
              </Text>
            ) : (
              <RadioGroup.Root
                name="selectionId"
                value={selectionId}
                onValueChange={(details) =>
                  setPricePlanSelectionId(details.value ?? "")
                }
              >
                {pricePlansForDuration.map((pricePlan) => (
                  <RadioGroup.Item
                    key={pricePlan.selectionId}
                    value={pricePlan.selectionId}
                  >
                    <RadioGroup.ItemHiddenInput />
                    <RadioGroup.ItemControl>
                      <RadioGroup.Indicator />
                    </RadioGroup.ItemControl>
                    <RadioGroup.ItemText asChild>
                      <styled.div>
                        <Text fontWeight="medium">{pricePlan.name}</Text>
                        <Text textStyle="sm" color="fg.muted" mt="1">
                          ¥{pricePlan.totalJPY.toLocaleString()}
                        </Text>
                      </styled.div>
                    </RadioGroup.ItemText>
                  </RadioGroup.Item>
                ))}
              </RadioGroup.Root>
            )}
          </Field.Root>

          <Field.Root>
            <styled.div
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              gap="2"
            >
              <Field.Label>クーポン（任意 / 1枚まで）</Field.Label>
              <Link to="/$organizationId/coupons" params={{ organizationId }}>
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

          {selectedPricePlan && (
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
                  ¥{selectedPricePlan.totalJPY.toLocaleString()}
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
                      to="/terms"
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
            disabled={
              pricePlansQuery.isLoading || pricePlansForDuration.length === 0
            }
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
