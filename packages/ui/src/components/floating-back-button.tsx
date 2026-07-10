"use client";
import { ArrowLeft } from "lucide-react";
import { styled } from "styled-system/jsx";
import { IconButton } from "./ui/icon-button";

export interface FloatingBackButtonProps {
  onClick: () => void;
  /** true のとき描画しない（トップページや戻り先が無いとき） */
  hidden?: boolean;
  label?: string;
}

/**
 * スマホ幅（〜md）専用の「前の画面に戻る」フローティングボタン。
 * ZOZOTOWN アプリのように画面左下へ固定表示する。
 * md 以上ではブラウザの戻る操作が使えるため非表示。
 */
export function FloatingBackButton({
  onClick,
  hidden,
  label = "前の画面に戻る",
}: FloatingBackButtonProps) {
  if (hidden) {
    return null;
  }

  return (
    <styled.div
      display={{ base: "block", md: "none" }}
      position="fixed"
      bottom="4"
      left="4"
      zIndex="sticky"
    >
      <IconButton
        aria-label={label}
        onClick={onClick}
        rounded="full"
        w="12"
        h="12"
        shadow="lg"
      >
        <ArrowLeft size={22} />
      </IconButton>
    </styled.div>
  );
}
