"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { ArrowLeft, CalendarX } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import * as v from "valibot";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { useCreateBooking } from "@/hooks/use-booking";

const bookingSchema = v.object({
  clientName: v.pipe(v.string(), v.minLength(1, "お名前を入力してください")),
  clientEmail: v.pipe(
    v.string(),
    v.email("メールアドレスの形式が正しくありません"),
  ),
  clientPhone: v.pipe(v.string(), v.minLength(1, "電話番号を入力してください")),
  consultantContent: v.optional(v.string()),
});

type BookingFormValues = v.InferOutput<typeof bookingSchema>;

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slotId = searchParams.get("slotId");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: valibotResolver(bookingSchema),
  });

  const createBooking = useCreateBooking();

  if (!slotId) {
    return (
      <styled.div py="16" px="8">
        <EmptyState
          icon={CalendarX}
          message="枠が選択されていません"
          hint="相談員一覧から枠を選択してください"
        />
        <styled.div display="flex" justifyContent="center" mt="4">
          <Button asChild variant="outline">
            <Link href="/consultants">相談員一覧へ</Link>
          </Button>
        </styled.div>
      </styled.div>
    );
  }

  const onSubmit = async (values: BookingFormValues) => {
    const result = await createBooking.mutateAsync({
      data: {
        slotId,
        clientName: values.clientName,
        clientEmail: values.clientEmail,
        clientPhone: values.clientPhone,
        consultantContent: values.consultantContent,
      },
    });

    const responseData = result.data;
    if ("bookingId" in responseData) {
      router.push(`/booking/payment?bookingId=${responseData.bookingId}`);
    }
  };

  return (
    <styled.div maxW="lg" mx="auto" p="8">
      <styled.div display="flex" alignItems="center" gap="2" mb="4">
        <Tooltip content="空き枠選択に戻る" showArrow>
          <IconButton variant="subtle" size="sm" asChild>
            <Link href="/consultants">
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
        以下の情報を入力して予約を確定してください
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
          <Field.Root invalid={!!errors.clientName}>
            <Field.Label>
              お名前
              <Field.RequiredIndicator />
            </Field.Label>
            <Input {...register("clientName")} placeholder="山田 太郎" />
            {errors.clientName && (
              <Field.ErrorText>{errors.clientName.message}</Field.ErrorText>
            )}
          </Field.Root>

          <Field.Root invalid={!!errors.clientEmail}>
            <Field.Label>
              メールアドレス
              <Field.RequiredIndicator />
            </Field.Label>
            <Input
              {...register("clientEmail")}
              type="email"
              placeholder="example@email.com"
            />
            <Field.HelperText>予約確認メールをお送りします</Field.HelperText>
            {errors.clientEmail && (
              <Field.ErrorText>{errors.clientEmail.message}</Field.ErrorText>
            )}
          </Field.Root>

          <Field.Root invalid={!!errors.clientPhone}>
            <Field.Label>
              電話番号
              <Field.RequiredIndicator />
            </Field.Label>
            <Input
              {...register("clientPhone")}
              type="tel"
              placeholder="090-1234-5678"
            />
            <Field.HelperText>
              緊急連絡用（ハイフンあり・なし可）
            </Field.HelperText>
            {errors.clientPhone && (
              <Field.ErrorText>{errors.clientPhone.message}</Field.ErrorText>
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

          <Button
            type="submit"
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
