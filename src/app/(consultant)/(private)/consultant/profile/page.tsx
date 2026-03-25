"use client";

import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { toaster } from "@/components/ui/toast";
import {
  useConsultantProfile,
  useUpdateConsultantProfile,
} from "@/hooks/use-consultant-profile";

export default function ConsultantProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");

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
      toaster.create({ type: "success", title: "プロフィールを保存しました" });
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
        <Skeleton height="8" width="200px" mb="6" />
        <styled.div
          display="flex"
          flexDir="column"
          gap="4"
          shadow="xs"
          rounded="l2"
          p="6"
        >
          <Skeleton height="4" width="60px" />
          <Skeleton height="10" />
          <Skeleton height="4" width="60px" />
          <Skeleton height="24" />
          <Skeleton height="4" width="100px" />
          <Skeleton height="10" />
          <Skeleton height="10" width="80px" />
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.div maxW="600px">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        プロフィール編集
      </Text>
      <styled.div shadow="xs" rounded="l2" p="6">
        <styled.form
          onSubmit={handleSubmit}
          display="flex"
          flexDir="column"
          gap="4"
        >
          <Field.Root required>
            <Field.Label>
              表示名
              <Field.RequiredIndicator />
            </Field.Label>
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
            <Field.Label>専門分野</Field.Label>
            <Input
              id="specialties"
              type="text"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
            />
            <Field.HelperText>
              カンマ区切りで入力してください（例: キャリア, メンタルヘルス）
            </Field.HelperText>
          </Field.Root>
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
    </styled.div>
  );
}
