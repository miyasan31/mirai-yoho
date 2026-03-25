"use client";

import { CircleX, Users } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useGetConsultants } from "@/hooks/use-consultants";

function ConsultantCardSkeleton() {
  return (
    <div
      className={css({
        shadow: "xs",
        border: "1px solid",
        borderColor: "border.default",
        rounded: "l2",
        p: "6",
        display: "flex",
        flexDirection: "column",
        gap: "4",
      })}
    >
      <Skeleton height="6" width="40%" />
      <SkeletonText noOfLines={2} />
      <div className={css({ display: "flex", gap: "2" })}>
        <Skeleton height="5" width="16" />
        <Skeleton height="5" width="20" />
        <Skeleton height="5" width="14" />
      </div>
      <Skeleton height="10" width="full" mt="auto" />
    </div>
  );
}

export default function ConsultantsPage() {
  const { data, isLoading, error } = useGetConsultants();

  if (isLoading) {
    return (
      <div className={css({ maxW: "4xl", mx: "auto", p: "8" })}>
        <Skeleton height="8" width="40%" mb="2" />
        <Skeleton height="4" width="60%" mb="8" />
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
            gap: "6",
          })}
        >
          <ConsultantCardSkeleton />
          <ConsultantCardSkeleton />
          <ConsultantCardSkeleton />
          <ConsultantCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          alignItems: "center",
          gap: "3",
          py: "16",
          px: "8",
        })}
      >
        <CircleX size={48} className={css({ color: "fg.subtle" })} />
        <Text fontWeight="medium" color="fg.muted">
          相談員情報の取得に失敗しました
        </Text>
        <Text textStyle="sm" color="fg.subtle">
          しばらくしてからもう一度お試しください
        </Text>
      </div>
    );
  }

  const consultants = data?.data?.consultants ?? [];

  return (
    <div className={css({ maxW: "4xl", mx: "auto", p: "8" })}>
      <div className={css({ mb: "8" })}>
        <Text
          as="h1"
          className={css({ textStyle: "2xl", fontWeight: "bold", mb: "1" })}
        >
          相談員一覧
        </Text>
        <Text textStyle="sm" color="fg.muted">
          未来予報の相談員を選んで予約できます
        </Text>
      </div>

      {consultants.length === 0 ? (
        <div
          className={css({
            display: "flex",
            flexDir: "column",
            alignItems: "center",
            gap: "3",
            py: "16",
          })}
        >
          <Users size={48} className={css({ color: "fg.subtle" })} />
          <Text fontWeight="medium" color="fg.muted">
            現在利用可能な相談員はいません
          </Text>
          <Text textStyle="sm" color="fg.subtle">
            新しい相談員が登録されるとここに表示されます
          </Text>
        </div>
      ) : (
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
            gap: "6",
          })}
        >
          {consultants.map((consultant) => (
            <div
              key={consultant.consultantId}
              className={css({
                shadow: "xs",
                border: "1px solid",
                borderColor: "border.default",
                rounded: "l2",
                p: "6",
                display: "flex",
                flexDirection: "column",
                gap: "4",
                transition: "all",
                transitionDuration: "normal",
                _hover: { shadow: "sm" },
              })}
            >
              <Text
                as="h2"
                className={css({ textStyle: "lg", fontWeight: "semibold" })}
              >
                {consultant.name}
              </Text>

              {consultant.bio && (
                <Text textStyle="sm" color="fg.muted">
                  {consultant.bio}
                </Text>
              )}

              <div
                className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}
              >
                {consultant.specialties.map((specialty) => (
                  <Badge key={specialty} variant="outline" size="sm">
                    {specialty}
                  </Badge>
                ))}
              </div>

              <Button asChild className={css({ mt: "auto" })}>
                <Link href={`/consultants/${consultant.consultantId}/slots`}>
                  空き枠を見る
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
