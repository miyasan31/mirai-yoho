import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  getBookingCutoffMinutes,
  isBeforeBookingDeadline,
} from "@mirai-yoho/shared/slot-availability";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Button } from "@mirai-yoho/ui/components/ui/button";
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
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useCreateBooking } from "@/hooks/use-booking";
import { useBookingPricePlans } from "@/hooks/use-price-plans";
import {
  type BookingFormValues,
  bookingFormSchema,
} from "./-booking-form-schema";

interface BookingSearch {
  slotId?: string;
  consultantId?: string;
  startsAt?: string;
  endsAt?: string;
}

export const Route = createFileRoute("/$organizationId/booking/")({
  validateSearch: (search: Record<string, unknown>): BookingSearch => ({
    slotId: typeof search.slotId === "string" ? search.slotId : undefined,
    consultantId:
      typeof search.consultantId === "string" ? search.consultantId : undefined,
    startsAt: typeof search.startsAt === "string" ? search.startsAt : undefined,
    endsAt: typeof search.endsAt === "string" ? search.endsAt : undefined,
  }),
  component: BookingPage,
});

export function BookingPage() {
  const { slotId, startsAt, endsAt } = Route.useSearch();
  const { organizationId } = Route.useParams();
  const navigate = useNavigate();
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
