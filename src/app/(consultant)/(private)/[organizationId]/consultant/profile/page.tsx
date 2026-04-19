"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "./profile-form-schema";

export default function ConsultantProfilePage() {
  const { organizationId } = useOrganizationRouting();
  const { data, isLoading } = useConsultantProfile();
  const updateProfile = useUpdateConsultantProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: valibotResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      specialties: "",
    },
  });

  useEffect(() => {
    if (data?.data) {
      reset({
        displayName: data.data.displayName ?? "",
        bio: data.data.bio ?? "",
        specialties: (data.data.specialties ?? []).join(", "),
      });
    }
  }, [data, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({
        organizationId: organizationId ?? "",
        data: {
          displayName: values.displayName,
          bio: values.bio?.trim() ?? "",
          specialties: (values.specialties ?? "")
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
        <styled.div mb="4">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            プロフィール編集
          </Text>
          <Text textStyle="sm" color="fg.muted">
            利用者に表示される相談員プロフィールを編集・保存する画面です。
          </Text>
        </styled.div>
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
      <styled.div mb="4">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          プロフィール編集
        </Text>
        <Text textStyle="sm" color="fg.muted">
          利用者に表示される相談員プロフィールを編集・保存する画面です。
        </Text>
      </styled.div>
      <styled.div shadow="xs" rounded="l2" p="6">
        <styled.form
          onSubmit={handleSubmit(onSubmit)}
          display="flex"
          flexDir="column"
          gap="4"
        >
          <Field.Root required invalid={!!errors.displayName}>
            <Field.Label>
              表示名
              <Field.RequiredIndicator />
            </Field.Label>
            <Input id="displayName" type="text" {...register("displayName")} />
            {errors.displayName && (
              <Field.ErrorText>{errors.displayName.message}</Field.ErrorText>
            )}
          </Field.Root>
          <Field.Root>
            <Field.Label>自己紹介</Field.Label>
            <Textarea id="bio" {...register("bio")} rows={4} />
          </Field.Root>
          <Field.Root>
            <Field.Label>専門分野</Field.Label>
            <Input id="specialties" type="text" {...register("specialties")} />
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
