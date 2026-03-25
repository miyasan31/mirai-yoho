"use client";

import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import {
  useConsultantProfile,
  useUpdateConsultantProfile,
} from "@/hooks/use-consultant-profile";

export default function ConsultantProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data, isLoading } = useConsultantProfile();
  const updateProfile = useUpdateConsultantProfile();

  useEffect(() => {
    if (data?.data) {
      setDisplayName(data.data.displayName ?? "");
      setBio(data.data.bio ?? "");
      setSpecialties((data.data.specialties ?? []).join(", "));
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    try {
      await updateProfile.mutateAsync({
        data: {
          displayName,
          bio,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <styled.div maxW="600px">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        プロフィール編集
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
        {success && <Text color="fg.success">保存しました</Text>}
        <Button
          type="submit"
          alignSelf="flex-start"
          loading={updateProfile.isPending}
          loadingText="保存中..."
        >
          保存
        </Button>
      </styled.form>
    </styled.div>
  );
}
