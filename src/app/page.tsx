import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function Home() {
  return (
    <div
      className={css({
        display: "flex",
        flexDir: "column",
        alignItems: "center",
        justifyContent: "center",
        minH: "100dvh",
        px: "8",
        textAlign: "center",
      })}
    >
      <Text
        as="h1"
        className={css({ textStyle: "4xl", fontWeight: "bold", mb: "3" })}
      >
        未来予報
      </Text>
      <Text
        className={css({
          textStyle: "lg",
          color: "fg.muted",
          mb: "8",
          maxW: "md",
        })}
      >
        あなたの未来を一緒に考える、オンライン相談サービス
      </Text>
      <Button asChild size="lg">
        <Link
          href="/consultants"
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "2",
          })}
        >
          相談員を探す
          <ArrowRight size={18} />
        </Link>
      </Button>
    </div>
  );
}
