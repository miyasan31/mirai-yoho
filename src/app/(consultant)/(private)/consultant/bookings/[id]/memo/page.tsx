"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import {
  useConsultantBookings,
  useUpdateConsultantMemo,
} from "@/hooks/use-consultant-bookings";

export default function ConsultantMemoEditPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

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
    setError("");
    try {
      await updateMemo.mutateAsync({
        bookingId,
        data: { memo },
      });
      router.push("/consultant/bookings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <styled.div maxW="600px">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        メモ編集
      </Text>
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
        </Field.Root>
        {error && <Text color="fg.error">{error}</Text>}
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
  );
}
