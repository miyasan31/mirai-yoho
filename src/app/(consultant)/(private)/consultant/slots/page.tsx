"use client";

import { addDays, format, parseISO, setHours, setMinutes } from "date-fns";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";
import { useCreateSlot, useGetSlots } from "@/hooks/use-slots";

const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";
const DISPLAY_FORMAT = "yyyy/MM/dd HH:mm";

function defaultStart(): string {
  const tomorrow = setMinutes(setHours(addDays(new Date(), 1), 10), 0);
  return format(tomorrow, DATETIME_LOCAL_FORMAT);
}

function defaultEnd(): string {
  const tomorrow = setMinutes(setHours(addDays(new Date(), 1), 11), 0);
  return format(tomorrow, DATETIME_LOCAL_FORMAT);
}

export default function ConsultantSlotsPage() {
  const { user } = useAuth();
  const consultantId = user?.uid ?? "";

  const { data, isLoading, refetch } = useGetSlots(
    { consultantId },
    { query: { enabled: !!consultantId } },
  );
  const createSlot = useCreateSlot();

  const [startDatetime, setStartDatetime] = useState(defaultStart);
  const [endDatetime, setEndDatetime] = useState(defaultEnd);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      await createSlot.mutateAsync({
        data: {
          consultantId,
          startDatetime: new Date(startDatetime).toISOString(),
          endDatetime: new Date(endDatetime).toISOString(),
        },
      });
      setSuccess(true);
      refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "空き枠の作成に失敗しました",
      );
    }
  };

  const slots = data?.data?.slots ?? [];

  const formatDatetime = (iso: string) => format(parseISO(iso), DISPLAY_FORMAT);

  return (
    <styled.div maxW="800px">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="6">
        空き枠管理
      </Text>

      <styled.form
        onSubmit={handleSubmit}
        display="flex"
        flexDir="column"
        gap="4"
        mb="8"
        p="4"
        border="1px solid"
        borderColor="border"
        borderRadius="md"
      >
        <Text as="h2" textStyle="lg" fontWeight="bold">
          新規空き枠作成
        </Text>
        <styled.div display="flex" gap="4" flexWrap="wrap">
          <Field.Root flex="1" minW="200px">
            <Field.Label>開始日時</Field.Label>
            <Input
              type="datetime-local"
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
              required
            />
          </Field.Root>
          <Field.Root flex="1" minW="200px">
            <Field.Label>終了日時</Field.Label>
            <Input
              type="datetime-local"
              value={endDatetime}
              onChange={(e) => setEndDatetime(e.target.value)}
              required
            />
          </Field.Root>
        </styled.div>
        {error && <Text color="fg.error">{error}</Text>}
        {success && <Text color="fg.success">空き枠を作成しました</Text>}
        <Button
          type="submit"
          alignSelf="flex-start"
          loading={createSlot.isPending}
          loadingText="作成中..."
        >
          作成
        </Button>
      </styled.form>

      <Text as="h2" textStyle="lg" fontWeight="bold" mb="4">
        空き枠一覧
      </Text>

      {isLoading ? (
        <Spinner />
      ) : slots.length === 0 ? (
        <Text color="fg.muted">空き枠がありません</Text>
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>開始日時</Table.Header>
              <Table.Header>終了日時</Table.Header>
              <Table.Header>状態</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {slots.map((slot) => (
              <Table.Row key={slot.slotId}>
                <Table.Cell>{formatDatetime(slot.startDatetime)}</Table.Cell>
                <Table.Cell>{formatDatetime(slot.endDatetime)}</Table.Cell>
                <Table.Cell>
                  {slot.isAvailable ? "予約可能" : "予約済み"}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </styled.div>
  );
}
