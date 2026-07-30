import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";
import { styled } from "styled-system/jsx";
import { ConsultantEditForm } from "./consultant-edit-form";

export default function ConsoleConsultantEditPage() {
  const { buildPath } = useOrganizationRouting();
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const consultantId = params.id ?? "";
  const organizationId = params.organizationId ?? "";

  const backToDetail = useCallback(() => {
    void navigate({
      to: "/$organizationId/consultants/$id",
      params: { organizationId, id: consultantId },
    });
  }, [navigate, organizationId, consultantId]);

  return (
    <styled.div display="flex" flexDir="column" gap="6">
      <Button asChild variant="outline" size="sm" alignSelf="flex-start">
        <Link to={buildPath(`/consultants/${consultantId}`)}>
          <ArrowLeft size={16} />
          占い師詳細に戻る
        </Link>
      </Button>

      <styled.div>
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          占い師編集
        </Text>
        <Text textStyle="sm" color="fg.muted">
          占い師の表示名・自己紹介・専門分野を更新し、必要に応じて無効化を行います。
        </Text>
      </styled.div>

      <styled.div
        border="1px solid"
        borderColor="border"
        maxW="2xl"
        p="6"
        rounded="l2"
      >
        <ConsultantEditForm
          consultantId={consultantId}
          onCompleted={backToDetail}
          onNotFound={backToDetail}
        />
      </styled.div>
    </styled.div>
  );
}
