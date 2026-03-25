"use client";

import { CircleX, Users } from "lucide-react";
import Link from "next/link";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useGetConsultants } from "@/hooks/use-consultants";

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

export default function ConsultantsPage() {
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
        message="相談員情報の取得に失敗しました"
        hint="しばらくしてからもう一度お試しください"
      />
    );
  }

  const consultants = data?.data?.consultants ?? [];

  return (
    <styled.div maxW="4xl" mx="auto" p="8">
      <styled.div mb="8">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          相談員一覧
        </Text>
        <Text textStyle="sm" color="fg.muted">
          未来予報の相談員を選んで予約できます
        </Text>
      </styled.div>

      {consultants.length === 0 ? (
        <EmptyState
          icon={Users}
          message="現在利用可能な相談員はいません"
          hint="新しい相談員が登録されるとここに表示されます"
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
                <Link href={`/consultants/${consultant.consultantId}/slots`}>
                  空き枠を見る
                </Link>
              </Button>
            </styled.div>
          ))}
        </styled.div>
      )}
    </styled.div>
  );
}
