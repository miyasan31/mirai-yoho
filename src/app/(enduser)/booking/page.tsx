"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { CalendarX } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { css } from "styled-system/css";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
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
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          alignItems: "center",
          gap: "3",
          py: "16",
          px: "8",
        })}
      >
        <CalendarX size={48} className={css({ color: "fg.subtle" })} />
        <Text fontWeight="medium" color="fg.muted">
          枠が選択されていません
        </Text>
        <Text textStyle="sm" color="fg.subtle">
          相談員一覧から枠を選択してください
        </Text>
        <Button asChild variant="outline" className={css({ mt: "2" })}>
          <Link href="/consultants">相談員一覧へ</Link>
        </Button>
      </div>
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
    <div className={css({ maxW: "lg", mx: "auto", p: "8" })}>
      <div className={css({ mb: "8" })}>
        <Text
          as="h1"
          className={css({ textStyle: "2xl", fontWeight: "bold", mb: "1" })}
        >
          予約情報入力
        </Text>
        <Text textStyle="sm" color="fg.muted">
          以下の情報を入力して予約を確定してください
        </Text>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className={css({ display: "flex", flexDirection: "column", gap: "6" })}
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
      </form>
    </div>
  );
}
