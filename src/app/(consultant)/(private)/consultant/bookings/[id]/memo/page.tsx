"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { toaster } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import {
  useConsultantBookings,
  useUpdateConsultantMemo,
} from "@/hooks/use-consultant-bookings";

export default function ConsultantMemoEditPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const [memo, setMemo] = useState("");

  const { data, isLoading } = useConsultantBookings();
  const updateMemo = useUpdateConsultantMemo();

  useEffect(() => {
    const bookings = data?.data?.bookings ?? [];
    const booking = bookings.find((b) => b.bookingId === bookingId);
    if (booking) {
      setMemo(booking.consultantMemo ?? "");
    }
  }, [data, bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMemo.mutateAsync({
        bookingId,
        data: { memo },
      });
      toaster.create({ type: "success", title: "メモを保存しました" });
      router.push("/consultant/bookings");
    } catch (err) {
      toaster.create({
        type: "error",
        title: "保存に失敗しました",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <styled.div maxW="600px">
        <styled.div display="flex" alignItems="center" gap="2" mb="6">
          <Skeleton height="9" width="9" rounded="l2" />
          <Skeleton height="8" width="120px" />
        </styled.div>
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
            <Link href="/consultant/bookings">
              <ArrowLeft size={18} />
            </Link>
          </IconButton>
        </Tooltip>
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          メモ編集
        </Text>
      </styled.div>
      <styled.div shadow="xs" rounded="l2" p="6">
        <styled.form
          onSubmit={handleSubmit}
          display="flex"
          flexDir="column"
          gap="4"
        >
          <Field.Root>
            <Field.Label>相談員メモ</Field.Label>
            <Textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={6}
            />
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
              onClick={() => router.push("/consultant/bookings")}
            >
              キャンセル
            </Button>
          </styled.div>
        </styled.form>
      </styled.div>
    </styled.div>
  );
}
