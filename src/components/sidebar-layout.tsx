"use client";

import { createListCollection } from "@ark-ui/react/select";
import { Splitter, useSplitterContext } from "@ark-ui/react/splitter";
import type { LucideIcon } from "lucide-react";
import { LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";
import { IconButton } from "@/components/ui/icon-button";
import * as Select from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface SidebarLayoutProps {
  title: string;
  navItems: NavItem[];
  children: ReactNode;
  onSignOut: () => void;
  organizationSwitcher?: {
    items: Array<{ label: string; value: string }>;
    value: string | null;
    onChange: (organizationId: string) => void;
  };
}

/** サイドバーの初期幅 (%) */
const SIDEBAR_DEFAULT_SIZE = 15;
/** サイドバーの最大幅 (%) */
const SIDEBAR_MAX_SIZE = 35;
/** サイドバーの最小幅 (%) — これ以下にドラッグすると自動で折り畳まれる */
const SIDEBAR_MIN_SIZE = 10;
/** 折り畳み時のサイドバー幅 (%) */
const SIDEBAR_COLLAPSED_SIZE = 3.5;
/** 折り畳み判定のしきい値 (px) — これ以下でアイコンのみ表示 */
const COLLAPSE_THRESHOLD_PX = 120;

const SIDEBAR_PANEL_ID = "sidebar";

const splitterRootStyle = css({
  display: "flex",
  minH: "100vh",
});

const resizeTriggerStyle = css({
  w: "1px",
  bg: "border",
  transition: "background 0.15s",
  _hover: { bg: "colorPalette.default" },
  _active: { bg: "colorPalette.default" },
  cursor: "col-resize",
});

export function SidebarLayoutSkeleton({
  navItemCount = 3,
}: {
  navItemCount?: number;
}) {
  return (
    <styled.div display="flex" minH="100vh">
      <styled.aside
        w="240px"
        p="4"
        bg="bg.subtle"
        borderRight="1px solid"
        borderColor="border"
      >
        <Skeleton height="6" width="140px" mb="6" />
        <styled.div display="flex" flexDir="column" gap="1">
          {[...Array(navItemCount)].map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <Skeleton key={i} height="9" rounded="l2" />
          ))}
        </styled.div>
      </styled.aside>
      <styled.main flex="1" p="6">
        <Skeleton height="8" width="200px" mb="6" />
        <Skeleton height="300px" rounded="l2" />
      </styled.main>
    </styled.div>
  );
}

/** トグルボタン — Splitter.Root 内でのみ使用（useSplitterContext 依存） */
function SidebarToggleButton({ collapsed }: { collapsed: boolean }) {
  const splitter = useSplitterContext();

  const handleToggle = useCallback(() => {
    if (collapsed) {
      splitter.expandPanel(SIDEBAR_PANEL_ID, SIDEBAR_MIN_SIZE);
    } else {
      splitter.collapsePanel(SIDEBAR_PANEL_ID);
    }
  }, [collapsed, splitter]);

  return (
    <Tooltip
      content={collapsed ? "メニューを開く" : "メニューを閉じる"}
      showArrow
      positioning={{ placement: "right" }}
    >
      <IconButton variant="subtle" size="sm" onClick={handleToggle}>
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </IconButton>
    </Tooltip>
  );
}

export function SidebarLayout({
  title,
  navItems,
  children,
  onSignOut,
  organizationSwitcher,
}: SidebarLayoutProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const organizationCollection = createListCollection({
    items: organizationSwitcher?.items ?? [],
  });

  const handleResize = useCallback(({ size }: { size: number[] }) => {
    const sidebarSize = size[0];
    if (sidebarSize == null) return;
    const sidebarPx = (sidebarSize / 100) * window.innerWidth;
    setCollapsed(sidebarPx < COLLAPSE_THRESHOLD_PX);
  }, []);

  return (
    <Splitter.Root
      className={splitterRootStyle}
      defaultSize={[SIDEBAR_DEFAULT_SIZE, 100 - SIDEBAR_DEFAULT_SIZE]}
      panels={[
        {
          id: SIDEBAR_PANEL_ID,
          minSize: SIDEBAR_MIN_SIZE,
          maxSize: SIDEBAR_MAX_SIZE,
          collapsible: true,
          collapsedSize: SIDEBAR_COLLAPSED_SIZE,
        },
        { id: "main" },
      ]}
      onCollapse={({ panelId }) => {
        if (panelId === SIDEBAR_PANEL_ID) setCollapsed(true);
      }}
      onExpand={({ panelId }) => {
        if (panelId === SIDEBAR_PANEL_ID) setCollapsed(false);
      }}
      onResize={handleResize}
    >
      <Splitter.Panel id={SIDEBAR_PANEL_ID}>
        <styled.aside
          h="full"
          p={collapsed ? "2" : "4"}
          bg="bg.subtle"
          display="flex"
          flexDir="column"
          overflow="hidden"
          transition="padding"
          transitionDuration="fast"
        >
          <styled.div
            display="flex"
            alignItems="center"
            justifyContent={collapsed ? "center" : "space-between"}
            mb="6"
          >
            {!collapsed && (
              <Text
                as="h2"
                textStyle="lg"
                fontWeight="bold"
                whiteSpace="nowrap"
              >
                {title}
              </Text>
            )}
            <SidebarToggleButton collapsed={collapsed} />
          </styled.div>

          <styled.nav display="flex" flexDir="column" gap="1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              const linkContent = (
                <styled.span
                  display="flex"
                  alignItems="center"
                  justifyContent={collapsed ? "center" : undefined}
                  gap="2"
                  px="3"
                  py="2"
                  rounded="l2"
                  textStyle="sm"
                  transition="all"
                  transitionDuration="normal"
                  cursor="pointer"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  bg={isActive ? "colorPalette.subtle" : undefined}
                  fontWeight={isActive ? "bold" : "normal"}
                  color={isActive ? "colorPalette.default" : "fg.muted"}
                  _hover={{ bg: "colorPalette.subtle" }}
                >
                  <styled.span flexShrink={0}>
                    <Icon size={18} />
                  </styled.span>
                  {!collapsed && item.label}
                </styled.span>
              );

              return (
                <styled.span key={item.href}>
                  <Link href={item.href} style={{ textDecoration: "none" }}>
                    {collapsed ? (
                      <Tooltip
                        content={item.label}
                        showArrow
                        positioning={{ placement: "right" }}
                      >
                        {linkContent}
                      </Tooltip>
                    ) : (
                      linkContent
                    )}
                  </Link>
                </styled.span>
              );
            })}
          </styled.nav>

          <styled.div mt="auto" display="flex" flexDirection="column" gap="3">
            {organizationSwitcher &&
              organizationSwitcher.items.length > 0 &&
              !collapsed && (
                <Select.Root
                  collection={organizationCollection}
                  positioning={{ placement: "top" }}
                  value={
                    organizationSwitcher.value
                      ? [organizationSwitcher.value]
                      : undefined
                  }
                  onValueChange={(details) => {
                    const nextOrganizationId = details.value[0];
                    if (nextOrganizationId) {
                      organizationSwitcher.onChange(nextOrganizationId);
                    }
                  }}
                >
                  <Select.Label>組織</Select.Label>
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="組織を選択" />
                      <Select.Indicator />
                    </Select.Trigger>
                  </Select.Control>
                  <Select.Positioner>
                    <Select.Content>
                      {organizationSwitcher.items.map((item) => (
                        <Select.Item key={item.value} item={item}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              )}
            <Tooltip
              content="ログアウト"
              showArrow
              positioning={{ placement: "right" }}
              disabled={!collapsed}
            >
              <styled.span
                display="flex"
                alignItems="center"
                justifyContent={collapsed ? "center" : undefined}
                gap="2"
                px="3"
                py="2"
                rounded="l2"
                textStyle="sm"
                cursor="pointer"
                whiteSpace="nowrap"
                overflow="hidden"
                color="fg.muted"
                transition="all"
                transitionDuration="normal"
                _hover={{ bg: "red.subtle" }}
                onClick={onSignOut}
              >
                <styled.span flexShrink={0}>
                  <LogOut size={18} />
                </styled.span>
                {!collapsed && "ログアウト"}
              </styled.span>
            </Tooltip>
          </styled.div>
        </styled.aside>
      </Splitter.Panel>

      <Splitter.ResizeTrigger
        id="sidebar:main"
        className={resizeTriggerStyle}
      />

      <Splitter.Panel id="main">
        <styled.main h="full" p="6" overflow="auto">
          {children}
        </styled.main>
      </Splitter.Panel>
    </Splitter.Root>
  );
}
