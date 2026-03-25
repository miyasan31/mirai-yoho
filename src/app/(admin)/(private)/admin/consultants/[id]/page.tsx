"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminConsultants,
  useDeleteAdminConsultant,
  useUpdateAdminConsultant,
} from "@/hooks/use-admin-consultants";

export default function AdminConsultantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consultantId = params.id as string;
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useAdminConsultants();
  const updateConsultant = useUpdateAdminConsultant();
  const deleteConsultant = useDeleteAdminConsultant();

  useEffect(() => {
    const consultants = data?.data?.consultants ?? [];
    const c = consultants.find(
      (c: { consultantId: string }) => c.consultantId === consultantId,
    );
    if (c) {
      setDisplayName(c.displayName ?? "");
      setBio(c.bio ?? "");
      setSpecialties((c.specialties ?? []).join(", "));
    }
  }, [data, consultantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await updateConsultant.mutateAsync({
        id: consultantId,
        data: {
          displayName,
          bio,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      router.push("/admin/consultants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("この相談員を無効にしますか？")) return;
    try {
      await deleteConsultant.mutateAsync({ id: consultantId });
      router.push("/admin/consultants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無効化に失敗しました");
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <styled.div maxW="600px">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        相談員編集
      </Text>
      <styled.form
        onSubmit={handleSubmit}
        display="flex"
        flexDir="column"
        gap="4"
      >
        <Field.Root>
          <Field.Label>表示名</Field.Label>
          <Input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>自己紹介</Field.Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label>専門分野（カンマ区切り）</Field.Label>
          <Input
            id="specialties"
            type="text"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
          />
        </Field.Root>
        {error && <Text color="fg.error">{error}</Text>}
        <styled.div display="flex" gap="2">
          <Button
            type="submit"
            loading={updateConsultant.isPending}
            loadingText="保存中..."
          >
            保存
          </Button>
          <Button
            type="button"
            variant="outline"
            colorPalette="red"
            onClick={handleDeactivate}
          >
            無効化
          </Button>
        </styled.div>
      </styled.form>
    </styled.div>
  );
}
