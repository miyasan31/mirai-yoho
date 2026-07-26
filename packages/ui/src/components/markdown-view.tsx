import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { styled } from "styled-system/jsx";

interface MarkdownViewProps {
  body: string;
}

/**
 * 利用規約・キャンセルポリシー等の markdown 本文を、Panda CSS のトークンに
 * 揃えたスタイルで表示する。react-markdown を Panda styled 要素にマップする。
 */
export function MarkdownView({ body }: MarkdownViewProps) {
  return (
    <styled.div
      color="fg.default"
      css={{
        "& h1": {
          textStyle: "2xl",
          fontWeight: "bold",
          mt: "6",
          mb: "3",
        },
        "& h2": {
          textStyle: "xl",
          fontWeight: "bold",
          mt: "5",
          mb: "2",
        },
        "& h3": {
          textStyle: "lg",
          fontWeight: "semibold",
          mt: "4",
          mb: "2",
        },
        "& p": {
          textStyle: "sm",
          lineHeight: "1.7",
          my: "2",
        },
        "& ul": {
          listStyle: "disc",
          pl: "6",
          my: "2",
        },
        "& ol": {
          listStyle: "decimal",
          pl: "6",
          my: "2",
        },
        "& li": {
          textStyle: "sm",
          lineHeight: "1.7",
          my: "1",
        },
        "& a": {
          color: "colorPalette.plain.fg",
          textDecoration: "underline",
        },
        "& blockquote": {
          borderLeftWidth: "3px",
          borderLeftColor: "border",
          pl: "3",
          color: "fg.muted",
          my: "3",
        },
        "& code": {
          bg: "bg.muted",
          rounded: "l1",
          px: "1",
          fontFamily: "mono",
          fontSize: "sm",
        },
        "& pre": {
          bg: "bg.muted",
          rounded: "l2",
          p: "3",
          overflow: "auto",
          my: "3",
        },
        "& pre code": {
          bg: "transparent",
          p: "0",
        },
        "& hr": {
          borderColor: "border",
          my: "5",
        },
        "& table": {
          borderCollapse: "collapse",
          my: "3",
        },
        "& th, & td": {
          border: "1px solid",
          borderColor: "border",
          px: "2",
          py: "1",
          textStyle: "sm",
        },
        "& th": {
          bg: "bg.muted",
          fontWeight: "semibold",
        },
      }}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
    </styled.div>
  );
}
