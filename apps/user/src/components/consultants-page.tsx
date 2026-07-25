import { getGetPricePlansQueryOptions } from "@mirai-yoho/api-client/api/booking/booking";
import { prefetchOnHover } from "@mirai-yoho/console-core/query/prefetch";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Skeleton, SkeletonText } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleX, Users } from "lucide-react";
import { styled } from "styled-system/jsx";
import { useGetConsultants } from "@/hooks/use-consultants";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

function ConsultantCardSkeleton() {
  return (
    <styled.div
      shadow="sm"
      border="1px solid"
      borderColor="border"
      rounded="l2"
      p="6"
      display="flex"
      flexDirection="column"
      gap="4"
    >
      <Skeleton height="6" width="40%" />
      <SkeletonText noOfLines={2} />
      <styled.div display="flex" gap="2">
        <Skeleton height="5" width="16" />
        <Skeleton height="5" width="20" />
        <Skeleton height="5" width="14" />
      </styled.div>
      <Skeleton height="10" width="full" mt="auto" />
    </styled.div>
  );
}

export function ConsultantsPage() {
  const { organizationId } = useOrganizationRouting();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useGetConsultants();

  if (isLoading) {
    return (
      <styled.div maxW="4xl" mx="auto" p="8">
        <Skeleton height="8" width="40%" mb="2" />
        <Skeleton height="4" width="60%" mb="8" />
        <styled.div
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
          gap="6"
        >
          <ConsultantCardSkeleton />
          <ConsultantCardSkeleton />
          <ConsultantCardSkeleton />
          <ConsultantCardSkeleton />
        </styled.div>
      </styled.div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={CircleX}
        message="占い師情報の取得に失敗しました"
        hint="しばらくしてからもう一度お試しください"
      />
    );
  }

  const consultants = data?.data?.consultants ?? [];

  return (
    <styled.div maxW="4xl" mx="auto" p="8">
      <styled.div mb="8">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          占い師一覧
        </Text>
        <Text textStyle="sm" color="fg.muted">
          あなたのみらい予報の占い師を選んで予約できます
        </Text>
      </styled.div>

      {consultants.length === 0 ? (
        <EmptyState
          icon={Users}
          message="現在利用可能な占い師はいません"
          hint="新しい占い師が登録されるとここに表示されます"
        />
      ) : (
        <styled.div
          display="grid"
          gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
          gap="6"
        >
          {consultants.map((consultant) => (
            <styled.div
              key={consultant.consultantId}
              shadow="sm"
              border="1px solid"
              borderColor="border"
              rounded="l2"
              p="6"
              display="flex"
              flexDirection="column"
              gap="4"
              transition="all"
              transitionDuration="normal"
              _hover={{ shadow: "md" }}
            >
              <Text as="h2" textStyle="lg" fontWeight="semibold">
                {consultant.name}
              </Text>
              <styled.div>
                <Badge variant="subtle" size="sm">
                  {consultant.status?.name ?? ""}
                </Badge>
              </styled.div>
              {consultant.imageUrl ? (
                <styled.div
                  width="16"
                  height="16"
                  position="relative"
                  overflow="hidden"
                  rounded="full"
                >
                  {/* biome-ignore lint/performance/noImgElement: Vite SPA のため next/image は使用しない */}
                  <styled.img
                    src={consultant.imageUrl}
                    alt={`${consultant.name} のアバター画像`}
                    width="full"
                    height="full"
                    objectFit="cover"
                  />
                </styled.div>
              ) : (
                <styled.div
                  width="16"
                  height="16"
                  position="relative"
                  overflow="hidden"
                  rounded="full"
                >
                  {/* biome-ignore lint/performance/noImgElement: Vite SPA のため next/image は使用しない */}
                  <styled.img
                    src="/default-avatar.png"
                    alt="デフォルトアバター画像"
                    width="full"
                    height="full"
                    objectFit="cover"
                  />
                </styled.div>
              )}

              {consultant.bio && (
                <Text textStyle="sm" color="fg.muted">
                  {consultant.bio}
                </Text>
              )}

              <styled.div display="flex" flexWrap="wrap" gap="2">
                {consultant.specialties.map((specialty) => (
                  <Badge key={specialty} variant="outline" size="sm">
                    {specialty}
                  </Badge>
                ))}
              </styled.div>

              <Button asChild mt="auto">
                <Link
                  to="/$organizationId/consultants/$id/plans"
                  params={{
                    organizationId: organizationId ?? "",
                    id: consultant.consultantId,
                  }}
                  onMouseEnter={
                    organizationId
                      ? prefetchOnHover(
                          queryClient,
                          getGetPricePlansQueryOptions(organizationId, {
                            consultantId: consultant.consultantId,
                          }),
                        )
                      : undefined
                  }
                >
                  プランを選択
                </Link>
              </Button>
            </styled.div>
          ))}
        </styled.div>
      )}
    </styled.div>
  );
}
