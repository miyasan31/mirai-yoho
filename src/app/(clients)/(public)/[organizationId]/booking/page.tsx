"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { ArrowLeft, CalendarX } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import * as RadioGroup from "@/components/ui/radio-group";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { toaster } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import {
  getBookingCutoffMinutes,
  isBeforeBookingDeadline,
} from "@/domain/slot/slot-availability";
import { useCreateBooking } from "@/hooks/use-booking";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { useBookingPricePlans } from "@/hooks/use-price-plans";
import {
  type BookingFormValues,
  bookingFormSchema,
} from "./booking-form-schema";

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { organizationId, buildPath } = useOrganizationRouting();
  const slotId = searchParams.get("slotId");
  const startsAt = searchParams.get("startsAt");
  const endsAt = searchParams.get("endsAt");
  const hasDateRange = Boolean(startsAt && endsAt);
  const selectedStartAt =
    typeof startsAt === "string" ? new Date(startsAt) : null;
  const hasValidSelectedStartAt =
    selectedStartAt !== null && !Number.isNaN(selectedStartAt.getTime());
  const bookingCutoffExceeded =
    hasValidSelectedStartAt && !isBeforeBookingDeadline(selectedStartAt);
  const [selectionId, setPricePlanSelectionId] = useState("");
  const pricePlansQuery = useBookingPricePlans(
    {
      slotId: slotId ?? undefined,
      startsAt: slotId ? undefined : (startsAt ?? undefined),
      endsAt: slotId ? undefined : (endsAt ?? undefined),
    },
    Boolean(slotId || hasDateRange),
  );
  const pricePlans = pricePlansQuery.data?.data?.pricePlans ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: valibotResolver(bookingFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      customerBirthDate: "",
      consultantContent: "",
    },
  });

  const createBooking = useCreateBooking();

  useEffect(() => {
    if (selectionId) return;
    const firstPricePlan = pricePlans[0];
    if (firstPricePlan) {
      setPricePlanSelectionId(firstPricePlan.selectionId);
    }
  }, [selectionId, pricePlans]);

  if (!slotId && !hasDateRange) {
    return (
      <styled.div py="16" px="8">
        <EmptyState
          icon={CalendarX}
          message="予約する枠が選択されていません"
          hint="予約可能な日時から希望の枠を選択してください"
        />
        <styled.div display="flex" justifyContent="center" mt="4">
          <Button asChild variant="outline">
            <Link href={buildPath("/consultants")}>予約可能日時へ</Link>
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
            <Link href={buildPath("/consultants")}>予約可能日時へ</Link>
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
          slotId: slotId ?? undefined,
          startsAt: startsAt ?? undefined,
          endsAt: endsAt ?? undefined,
          customerName: values.customerName,
          customerEmail: values.customerEmail,
          customerPhone: values.customerPhone,
          customerBirthDate: values.customerBirthDate,
          consultantContent: values.consultantContent?.trim() || undefined,
          selectionId,
        },
      });

      const responseData = result.data;
      if ("bookingId" in responseData && "bookingActionToken" in responseData) {
        const bookingActionToken = encodeURIComponent(
          responseData.bookingActionToken,
        );
        router.push(
          buildPath(
            `/booking/payment?bookingId=${responseData.bookingId}&bookingActionToken=${bookingActionToken}`,
          ),
        );
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
            <Link href={buildPath("/consultants")}>
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
        {slotId
          ? "以下の情報を入力して予約を確定してください"
          : "以下の情報を入力すると、相談員を自動で割り当てて予約を確定します"}
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
            {pricePlans.length === 0 ? (
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
                {pricePlans.map((pricePlan) => (
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

          <Button
            type="submit"
            disabled={pricePlansQuery.isLoading || pricePlans.length === 0}
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
