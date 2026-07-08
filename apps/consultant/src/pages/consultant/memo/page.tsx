import { valibotResolver } from "@hookform/resolvers/valibot";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Textarea } from "@mirai-yoho/ui/components/ui/textarea";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import {
  useConsultantBookings,
  useUpdateConsultantMemo,
} from "@/hooks/use-consultant-bookings";
import { type MemoFormValues, memoFormSchema } from "./memo-form-schema";

export default function ConsultantMemoEditPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const { buildPath, organizationId } = useOrganizationRouting();
  const bookingId = params.id ?? "";
  const { data, isLoading } = useConsultantBookings({
    page: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const updateMemo = useUpdateConsultantMemo();
  const { register, handleSubmit, reset } = useForm<MemoFormValues>({
    resolver: valibotResolver(memoFormSchema),
    defaultValues: {
      customerName: "",
      birthDate: "",
      appraisalDate: "",
      freeMemo: "",
    },
  });
  const bookings = data?.data?.bookings ?? [];
  const booking = bookings.find((item) => item.bookingId === bookingId);

  useEffect(() => {
    if (booking) {
      reset({
        customerName: booking.memoCustomerName ?? "",
        birthDate: booking.memoBirthDate ?? "",
        appraisalDate: booking.memoAppraisalDate ?? "",
        freeMemo: booking.consultantMemo ?? "",
      });
    }
  }, [booking, reset]);

  useEffect(() => {
    if (!isLoading && data && !booking) {
      void navigate({ href: "/404", replace: true });
    }
  }, [booking, data, isLoading, navigate]);

  const onSubmit = async (values: MemoFormValues) => {
    try {
      await updateMemo.mutateAsync({
        organizationId: organizationId ?? "",
        id: bookingId,
        data: {
          customerName: values.customerName?.trim() ?? "",
          birthDate: values.birthDate ?? "",
          appraisalDate: values.appraisalDate ?? "",
          freeMemo: values.freeMemo?.trim() ?? "",
        },
      });
      toaster.create({ type: "success", title: "鑑定メモを保存しました" });
      void navigate({ to: buildPath("/consultant/bookings") });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  if (isLoading) {
    return (
      <styled.div maxW="600px">
        <styled.div display="flex" alignItems="center" gap="2" mb="6">
          <Skeleton height="9" width="9" rounded="l2" />
          <Text as="h1" textStyle="2xl" fontWeight="bold">
            鑑定メモ編集
          </Text>
        </styled.div>
        <Text textStyle="sm" color="fg.muted" mb="4">
          お名前・生年月日・鑑定日・フリーメモなど、予約ごとの鑑定記録を保存する画面です。
        </Text>
        <styled.div
          display="flex"
          flexDir="column"
          gap="4"
          shadow="xs"
          rounded="l2"
          p="6"
        >
          <Skeleton height="4" width="80px" />
          <Skeleton height="32" />
          <styled.div display="flex" gap="2">
            <Skeleton height="10" width="80px" />
            <Skeleton height="10" width="100px" />
          </styled.div>
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.div maxW="600px">
      <styled.div display="flex" alignItems="center" gap="2" mb="6">
        <Tooltip content="予約一覧に戻る" showArrow>
          <IconButton variant="subtle" size="sm" asChild>
            <Link to={buildPath("/consultant/bookings")}>
              <ArrowLeft size={18} />
            </Link>
          </IconButton>
        </Tooltip>
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          鑑定メモ編集
        </Text>
      </styled.div>
      <Text textStyle="sm" color="fg.muted" mb="4">
        お名前・生年月日・鑑定日・フリーメモなど、予約ごとの鑑定記録を保存する画面です。
      </Text>
      <styled.div shadow="xs" rounded="l2" p="6">
        <styled.form
          onSubmit={handleSubmit(onSubmit)}
          display="flex"
          flexDir="column"
          gap="4"
        >
          <Field.Root>
            <Field.Label>お名前</Field.Label>
            <Input id="customerName" {...register("customerName")} />
            <Field.HelperText>鑑定対象の方のお名前</Field.HelperText>
          </Field.Root>
          <Field.Root>
            <Field.Label>生年月日</Field.Label>
            <Input id="birthDate" type="date" {...register("birthDate")} />
          </Field.Root>
          <Field.Root>
            <Field.Label>鑑定日</Field.Label>
            <Input
              id="appraisalDate"
              type="date"
              {...register("appraisalDate")}
            />
          </Field.Root>
          <Field.Root>
            <Field.Label>フリーメモ</Field.Label>
            <Textarea id="freeMemo" {...register("freeMemo")} rows={6} />
            <Field.HelperText>
              相談内容やフォローアップ事項をメモできます
            </Field.HelperText>
          </Field.Root>
          <styled.div display="flex" gap="2">
            <Button
              type="submit"
              loading={updateMemo.isPending}
              loadingText="保存中..."
            >
              保存
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void navigate({ to: buildPath("/consultant/bookings") })
              }
            >
              キャンセル
            </Button>
          </styled.div>
        </styled.form>
      </styled.div>
    </styled.div>
  );
}
