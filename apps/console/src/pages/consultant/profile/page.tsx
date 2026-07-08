/* biome-ignore-all lint: requested temporary file-level suppression */
import { FileUpload } from "@ark-ui/react/file-upload";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { ApiResponseError } from "@mirai-yoho/api-client/custom-fetch";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Textarea } from "@mirai-yoho/ui/components/ui/textarea";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import {
  useConsultantProfile,
  useCreateConsultantAvatarUploadUrl,
  usePublishConsultantAvatar,
  useUpdateConsultantProfile,
} from "@/hooks/use-consultant-profile";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "./profile-form-schema";

const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getConsultantProfileQueryKey(organizationId: string) {
  return [`/organizations/${organizationId}/consultant/profile`] as const;
}

function getConsultantsQueryKey(organizationId: string) {
  return [`/organizations/${organizationId}/consultants`] as const;
}

async function isSquareImage(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image.width === image.height);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };
    image.src = objectUrl;
  });
}

export default function ConsultantProfilePage() {
  const { organizationId } = useOrganizationRouting();
  const queryCustomer = useQueryClient();
  const { data, isLoading } = useConsultantProfile();
  const updateProfile = useUpdateConsultantProfile();
  const createAvatarUploadUrl = useCreateConsultantAvatarUploadUrl();
  const publishAvatar = usePublishConsultantAvatar();
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>(
    undefined,
  );
  const [avatarWarning, setAvatarWarning] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: valibotResolver(profileFormSchema),
    defaultValues: {
      name: "",
      bio: "",
      phone: "",
      imageUrl: undefined,
      specialties: "",
    },
  });
  const avatarImageUrl = watch("imageUrl");

  useEffect(() => {
    if (data?.data) {
      reset({
        name: data.data.name ?? "",
        bio: data.data.bio ?? "",
        phone: data.data.phone ?? "",
        imageUrl: data.data.imageUrl,
        specialties: (data.data.specialties ?? []).join(", "),
      });
    }
  }, [data, reset]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const uploadAvatarFile = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toaster.create({
        type: "error",
        title: "画像は JPG / PNG / WebP のみアップロードできます",
      });
      return;
    }
    if (file.size > AVATAR_MAX_FILE_SIZE) {
      toaster.create({
        type: "error",
        title: "画像サイズは 5MB 以下にしてください",
      });
      return;
    }

    setAvatarWarning("");
    setIsUploadingAvatar(true);
    try {
      const isSquare = await isSquareImage(file);
      if (!isSquare) {
        setAvatarWarning(
          "正方形画像を推奨しています（表示がトリミングされます）",
        );
      }

      const uploadMeta = await createAvatarUploadUrl.mutateAsync({
        organizationId: organizationId ?? "",
        data: {
          contentType: file.type,
          fileSize: file.size,
        },
      });

      const uploadResponse = await fetch(uploadMeta.data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("upload failed");
      }

      const previewObjectUrl = URL.createObjectURL(file);
      setAvatarPreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return previewObjectUrl;
      });
      const publishResponse = await publishAvatar.mutateAsync({
        organizationId: organizationId ?? "",
        data: {
          objectPath: uploadMeta.data.objectPath,
        },
      });

      setValue("imageUrl", publishResponse.data.imageUrl, {
        shouldDirty: true,
      });
    } catch (error) {
      // API エラーは custom-fetch の toaster で表示される
      if (!(error instanceof ApiResponseError)) {
        toaster.create({
          type: "error",
          title: "アバター画像のアップロードに失敗しました",
        });
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync({
        organizationId: organizationId ?? "",
        data: {
          name: values.name,
          bio: values.bio?.trim() ?? "",
          phone: values.phone?.trim() ?? "",
          imageUrl: values.imageUrl,
          specialties: (values.specialties ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      if (organizationId) {
        await Promise.all([
          queryCustomer.invalidateQueries({
            queryKey: getConsultantProfileQueryKey(organizationId),
          }),
          queryCustomer.invalidateQueries({
            queryKey: getConsultantsQueryKey(organizationId),
          }),
        ]);
      }
      toaster.create({ type: "success", title: "プロフィールを保存しました" });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
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
          <Field.Root>
            <Field.Label>ステータス</Field.Label>
            <Input
              value={data?.data.status?.name ?? ""}
              readOnly
              aria-label="現在のステータス"
            />
          </Field.Root>
          <Field.Root required invalid={!!errors.name}>
            <Field.Label>
              表示名
              <Field.RequiredIndicator />
            </Field.Label>
            <Input id="name" type="text" {...register("name")} />
            {errors.name && (
              <Field.ErrorText>{errors.name.message}</Field.ErrorText>
            )}
          </Field.Root>
          <Field.Root>
            <Field.Label>自己紹介</Field.Label>
            <Textarea id="bio" {...register("bio")} rows={4} />
          </Field.Root>
          <Field.Root invalid={!!errors.phone}>
            <Field.Label>電話番号</Field.Label>
            <Input id="phone" type="tel" {...register("phone")} />
            {errors.phone && (
              <Field.ErrorText>{errors.phone.message}</Field.ErrorText>
            )}
          </Field.Root>
          <Field.Root>
            <Field.Label>専門分野</Field.Label>
            <Input id="specialties" type="text" {...register("specialties")} />
            <Field.HelperText>
              カンマ区切りで入力してください（例: キャリア, メンタルヘルス）
            </Field.HelperText>
          </Field.Root>
          <Field.Root>
            <Field.Label>アバター画像</Field.Label>
            <FileUpload.Root
              accept={ACCEPTED_IMAGE_TYPES}
              maxFiles={1}
              onFileChange={(details) => {
                const targetFile = details.acceptedFiles[0];
                if (targetFile) {
                  void uploadAvatarFile(targetFile);
                }
              }}
            >
              <FileUpload.Dropzone>
                <styled.div
                  border="1px dashed"
                  borderColor="border"
                  rounded="l2"
                  p="4"
                  display="flex"
                  flexDir="column"
                  gap="3"
                  alignItems="flex-start"
                >
                  <Text textStyle="sm" color="fg.muted">
                    画像をドラッグ&ドロップ、またはファイルを選択
                  </Text>
                  <FileUpload.HiddenInput />
                  <FileUpload.Trigger asChild>
                    <Button type="button" variant="outline">
                      画像を選択
                    </Button>
                  </FileUpload.Trigger>
                </styled.div>
              </FileUpload.Dropzone>
            </FileUpload.Root>
            {avatarPreviewUrl ? (
              <styled.img
                src={avatarPreviewUrl}
                alt="選択中のアバター画像プレビュー"
                width="96"
                height="96"
                borderRadius="full"
                objectFit="cover"
                mt="3"
              />
            ) : avatarImageUrl ? (
              <styled.img
                src={avatarImageUrl}
                alt="現在のアバター画像"
                width="96"
                height="96"
                borderRadius="full"
                objectFit="cover"
                mt="3"
              />
            ) : null}
            {avatarPreviewUrl || avatarImageUrl ? null : (
              <styled.img
                src="/default-avatar.png"
                alt="デフォルトアバター画像"
                width="96"
                height="96"
                borderRadius="full"
                objectFit="cover"
                mt="3"
              />
            )}
            {avatarWarning ? (
              <Field.HelperText>{avatarWarning}</Field.HelperText>
            ) : null}
            {isUploadingAvatar ? (
              <Field.HelperText>アバター画像を保存中...</Field.HelperText>
            ) : null}
          </Field.Root>
          <Button
            type="submit"
            alignSelf="flex-start"
            disabled={isUploadingAvatar}
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
