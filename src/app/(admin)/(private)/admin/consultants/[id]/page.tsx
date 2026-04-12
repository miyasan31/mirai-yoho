"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminConsultants,
  useDeleteAdminConsultant,
  useUpdateAdminConsultant,
} from "@/hooks/use-admin-consultants";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

export default function AdminConsultantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { buildPath, organizationId } = useOrganizationRouting();
  const consultantId = params.id as string;
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useAdminConsultants();
  const updateConsultant = useUpdateAdminConsultant();
  const deleteConsultant = useDeleteAdminConsultant();
  const consultants = data?.data?.consultants ?? [];
  const consultant = consultants.find(
    (item: { consultantId: string }) => item.consultantId === consultantId,
  );

  useEffect(() => {
    if (consultant) {
      setDisplayName(consultant.displayName ?? "");
      setBio(consultant.bio ?? "");
      setSpecialties((consultant.specialties ?? []).join(", "));
    }
  }, [consultant]);

  useEffect(() => {
    if (!isLoading && data && !consultant) {
      router.replace("/404");
    }
  }, [consultant, data, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await updateConsultant.mutateAsync({
        organizationId: organizationId ?? "",
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
      router.push(buildPath("/admin/consultants"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  const handleDeactivate = async () => {
    try {
      await deleteConsultant.mutateAsync({
        organizationId: organizationId ?? "",
        id: consultantId,
      });
      router.push(buildPath("/admin/consultants"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "無効化に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <styled.div maxW="600px">
        <styled.div display="flex" alignItems="center" gap="2" mb="4">
          <Skeleton height="5" width="5" rounded="full" />
          <Skeleton height="8" width="160px" />
        </styled.div>
        <styled.div display="flex" flexDir="column" gap="4">
          <styled.div>
            <Skeleton height="4" width="80px" mb="2" />
            <Skeleton height="10" rounded="l2" />
          </styled.div>
          <styled.div>
            <Skeleton height="4" width="80px" mb="2" />
            <Skeleton height="24" rounded="l2" />
          </styled.div>
          <styled.div>
            <Skeleton height="4" width="120px" mb="2" />
            <Skeleton height="10" rounded="l2" />
          </styled.div>
          <styled.div display="flex" gap="2">
            <Skeleton height="10" width="80px" rounded="l2" />
            <Skeleton height="10" width="80px" rounded="l2" />
          </styled.div>
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.div maxW="600px">
      <styled.div display="flex" alignItems="center" gap="2" mb="4">
        <Link
          href={buildPath("/admin/consultants")}
          style={{ textDecoration: "none" }}
        >
          <styled.span
            display="flex"
            alignItems="center"
            color="fg.muted"
            _hover={{ color: "fg.default" }}
            transition="all"
            transitionDuration="normal"
            cursor="pointer"
          >
            <ArrowLeft size={20} />
          </styled.span>
        </Link>
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          相談員編集
        </Text>
      </styled.div>
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
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <Button type="button" variant="outline" colorPalette="red">
                無効化
              </Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>相談員の無効化</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Dialog.Description>
                    この相談員を無効にしますか？この操作は取り消せます。
                  </Dialog.Description>
                </Dialog.Body>
                <Dialog.Footer>
                  <styled.div display="flex" gap="2" justifyContent="flex-end">
                    <Dialog.CloseTrigger asChild>
                      <Button variant="outline">キャンセル</Button>
                    </Dialog.CloseTrigger>
                    <Button
                      colorPalette="red"
                      onClick={handleDeactivate}
                      loading={deleteConsultant.isPending}
                      loadingText="処理中..."
                    >
                      無効化する
                    </Button>
                  </styled.div>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>
        </styled.div>
      </styled.form>
    </styled.div>
  );
}
