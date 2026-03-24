"use client";

import Link from "next/link";
import { css } from "styled-system/css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useGetConsultants } from "@/generated/api/consultant/consultant";

export default function ConsultantsPage() {
  const { data, isLoading, error } = useGetConsultants();

  if (isLoading) {
    return (
      <div
        className={css({ display: "flex", justifyContent: "center", py: "20" })}
      >
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={css({ p: "8" })}>
        <Text color="fg.error">相談員情報の取得に失敗しました</Text>
      </div>
    );
  }

  const consultants = data?.data?.consultants ?? [];

  return (
    <div className={css({ maxW: "4xl", mx: "auto", p: "8" })}>
      <Text
        as="h1"
        className={css({ fontSize: "3xl", fontWeight: "bold", mb: "8" })}
      >
        相談員一覧
      </Text>

      {consultants.length === 0 ? (
        <Text color="fg.muted">現在利用可能な相談員はいません</Text>
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
                border: "1px solid",
                borderColor: "border.default",
                borderRadius: "lg",
                p: "6",
                display: "flex",
                flexDirection: "column",
                gap: "4",
              })}
            >
              <Text
                as="h2"
                className={css({ fontSize: "xl", fontWeight: "semibold" })}
              >
                {consultant.name}
              </Text>

              {consultant.bio && (
                <Text className={css({ fontSize: "sm", color: "fg.muted" })}>
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
