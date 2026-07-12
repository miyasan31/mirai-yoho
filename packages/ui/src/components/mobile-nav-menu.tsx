"use client";
import type { LucideIcon } from "lucide-react";
import { Menu as MenuIcon } from "lucide-react";
import type { ReactNode } from "react";
import { styled } from "styled-system/jsx";
import { IconButton } from "./ui/icon-button";
import * as Menu from "./ui/menu";
import { Text } from "./ui/text";

export interface MobileNavMenuItem {
  /** 一意なキー（Menu.Item の value に利用） */
  key: string;
  label: string;
  icon: LucideIcon;
  /** 現在のページかどうか。true でハイライト表示する */
  active?: boolean;
  /** 破壊的な操作（ログアウト等）は赤系で表示する */
  danger?: boolean;
  onSelect: () => void;
}

export interface MobileNavMenuProps {
  /** ハンバーガーの右に表示するタイトル。スクロールに追従せず流れていく */
  title?: ReactNode;
  /** ナビゲーション項目 */
  items: MobileNavMenuItem[];
  /** セパレータの下に表示する項目（ログアウト等） */
  footerItems?: MobileNavMenuItem[];
}

/**
 * スマホ幅（〜md）専用のナビゲーションメニュー。
 * - ハンバーガーアイコンは画面左上に固定され、スクロールしても追従する
 * - タイトルなどヘッダー部分は通常フローに置かれ、スクロールで流れていく
 * - md 以上では非表示（PC はサイドバーを利用する想定）
 */
export function MobileNavMenu({
  title,
  items,
  footerItems,
}: MobileNavMenuProps) {
  const renderItem = (item: MobileNavMenuItem) => {
    const ItemIcon = item.icon;
    return (
      <Menu.Item
        key={item.key}
        value={item.key}
        onClick={item.onSelect}
        color={item.danger ? "red.default" : undefined}
        fontWeight={item.active ? "bold" : undefined}
        bg={item.active ? "colorPalette.subtle" : undefined}
      >
        <styled.span display="flex" alignItems="center" gap="2">
          <ItemIcon size={18} />
          {item.label}
        </styled.span>
      </Menu.Item>
    );
  };

  return (
    <styled.div display={{ base: "block", md: "none" }}>
      <Menu.Root>
        <Menu.Trigger asChild>
          <IconButton
            variant="subtle"
            aria-label="メニューを開く"
            position="fixed"
            top="3"
            left="3"
            zIndex="sticky"
            bg="bg.default"
            borderWidth="1px"
            borderColor="border"
            shadow="sm"
          >
            <MenuIcon size={20} />
          </IconButton>
        </Menu.Trigger>
        <Menu.Positioner>
          <Menu.Content minW="52">
            {items.map(renderItem)}
            {footerItems && footerItems.length > 0 && (
              <>
                <Menu.Separator />
                {footerItems.map(renderItem)}
              </>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Menu.Root>

      {title != null && (
        <styled.header
          display="flex"
          alignItems="center"
          minH="10"
          pl="12"
          mb="4"
        >
          <Text as="h1" textStyle="lg" fontWeight="bold">
            {title}
          </Text>
        </styled.header>
      )}
    </styled.div>
  );
}
