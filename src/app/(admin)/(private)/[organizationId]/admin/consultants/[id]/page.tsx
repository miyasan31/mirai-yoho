"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { styled } from "styled-system/jsx";
import { Text } from "@/components/ui/text";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { ConsultantEditForm } from "./consultant-edit-form";

export default function AdminConsultantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { buildPath } = useOrganizationRouting();
  const consultantId = params.id as string;

  const handleCompleted = useCallback(() => {
    router.push(buildPath("/admin/consultants"));
  }, [buildPath, router]);

  const handleNotFound = useCallback(() => {
    router.replace("/404");
  }, [router]);

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
      <Text textStyle="sm" color="fg.muted" mb="4">
        相談員の表示名・自己紹介・専門分野を更新し、必要に応じて無効化を行う画面です。
      </Text>
      <ConsultantEditForm
        consultantId={consultantId}
        onCompleted={handleCompleted}
        onNotFound={handleNotFound}
      />
    </styled.div>
  );
}
