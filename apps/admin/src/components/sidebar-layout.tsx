import { Splitter, useSplitterContext } from "@ark-ui/react/splitter";
import type { AppPath } from "@mirai-yoho/console-core/lib/app-path";
import * as Menu from "@mirai-yoho/ui/components/ui/menu";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  ChevronsUpDown,
  LogOut,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useState } from "react";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";

export interface NavItem {
  href: AppPath;
  label: string;
  icon: LucideIcon;
}

export interface OrganizationSwitcher {
  items: Array<{ label: string; value: string }>;
  value: string | null;
  onChange: (organizationId: string) => void;
}

export interface SidebarLayoutProps {
  title: string;
  navItems: NavItem[];
  children: ReactNode;
  onSignOut: () => void;
  currentDisplayName?: string | null;
  organizationSwitcher?: OrganizationSwitcher;
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

/** メニュー項目の value に付与する組織切り替え用プレフィックス */
const ORG_ITEM_PREFIX = "org:";
/** ログアウト用メニュー項目の value */
const SIGN_OUT_ITEM_VALUE = "sign-out";

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

/** 組織名の先頭 1 文字（サロゲートペア考慮）をアバター表示用に取得する */
function getOrganizationInitial(label: string): string {
  return [...label][0] ?? "?";
}

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

  const label = collapsed ? "メニューを開く" : "メニューを閉じる";

  const button = (
    <styled.button
      type="button"
      onClick={handleToggle}
      display="flex"
      alignItems="center"
      justifyContent={collapsed ? "center" : undefined}
      gap="2"
      w="full"
      px="3"
      py="2"
      rounded="l2"
      textStyle="sm"
      transition="all"
      transitionDuration="normal"
      cursor="pointer"
      whiteSpace="nowrap"
      overflow="hidden"
      color="fg.muted"
      bg="transparent"
      _hover={{ bg: "colorPalette.subtle" }}
    >
      <styled.span flexShrink={0} display="flex">
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </styled.span>
      {!collapsed && label}
    </styled.button>
  );

  return collapsed ? (
    <Tooltip content={label} showArrow positioning={{ placement: "right" }}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}

/**
 * Notion 風の組織スイッチャー。
 * サイドバー上部のヘッダーとして現在の組織名を表示し、
 * クリックするとログイン可能な組織一覧・表示名・ログアウトを含むドロップダウンを開く。
 */
function SidebarOrganizationMenu({
  collapsed,
  subtitle,
  organizationSwitcher,
  currentDisplayName,
  onSignOut,
}: {
  collapsed: boolean;
  subtitle: string;
  organizationSwitcher: OrganizationSwitcher;
  currentDisplayName?: string | null;
  onSignOut: () => void;
}) {
  const currentOrganization = organizationSwitcher.items.find(
    (item) => item.value === organizationSwitcher.value,
  );
  const currentLabel = currentOrganization?.label ?? subtitle;
  const currentInitial = getOrganizationInitial(currentLabel);

  const handleSelect = useCallback(
    (details: { value: string }) => {
      if (details.value === SIGN_OUT_ITEM_VALUE) {
        onSignOut();
        return;
      }
      if (details.value.startsWith(ORG_ITEM_PREFIX)) {
        const nextOrganizationId = details.value.slice(ORG_ITEM_PREFIX.length);
        if (nextOrganizationId !== organizationSwitcher.value) {
          organizationSwitcher.onChange(nextOrganizationId);
        }
      }
    },
    [onSignOut, organizationSwitcher],
  );

  return (
    <Menu.Root
      positioning={{
        placement: collapsed ? "right-start" : "bottom-start",
        gutter: 4,
      }}
      onSelect={handleSelect}
    >
      <Menu.Trigger asChild>
        <styled.button
          type="button"
          display="flex"
          alignItems="center"
          gap="2"
          flex={collapsed ? undefined : "1"}
          minW="0"
          maxW="full"
          px={collapsed ? "0" : "2"}
          py="1.5"
          rounded="l2"
          cursor="pointer"
          textAlign="start"
          bg="transparent"
          transition="background"
          transitionDuration="fast"
          _hover={{ bg: "colorPalette.subtle" }}
        >
          <styled.span
            flexShrink={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxSize="7"
            rounded="l2"
            bg="colorPalette.subtle"
            color="colorPalette.default"
            fontWeight="bold"
            textStyle="sm"
          >
            {currentInitial}
          </styled.span>
          {!collapsed && (
            <>
              <styled.span
                display="flex"
                flexDir="column"
                minW="0"
                flex="1"
                overflow="hidden"
              >
                <Text
                  textStyle="sm"
                  fontWeight="bold"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {currentLabel}
                </Text>
                <Text
                  textStyle="xs"
                  color="fg.muted"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {subtitle}
                </Text>
              </styled.span>
              <styled.span flexShrink={0} color="fg.muted" display="flex">
                <ChevronsUpDown size={16} />
              </styled.span>
            </>
          )}
        </styled.button>
      </Menu.Trigger>

      <Menu.Positioner>
        <Menu.Content minW="60" maxW="80">
          {currentDisplayName && (
            <>
              <styled.div
                px="2"
                py="1.5"
                display="flex"
                flexDir="column"
                gap="0.5"
              >
                <Text textStyle="xs" color="fg.muted">
                  表示名
                </Text>
                <Text
                  textStyle="sm"
                  fontWeight="medium"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  title={currentDisplayName}
                >
                  {currentDisplayName}
                </Text>
              </styled.div>
              <Menu.Separator />
            </>
          )}

          <Menu.ItemGroup>
            <Menu.ItemGroupLabel>組織を切り替え</Menu.ItemGroupLabel>
            {organizationSwitcher.items.map((item) => {
              const isCurrent = item.value === organizationSwitcher.value;
              return (
                <Menu.Item
                  key={item.value}
                  value={`${ORG_ITEM_PREFIX}${item.value}`}
                >
                  <styled.span
                    flexShrink={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    boxSize="6"
                    rounded="l2"
                    bg="colorPalette.subtle"
                    color="colorPalette.default"
                    fontWeight="bold"
                    textStyle="xs"
                  >
                    {getOrganizationInitial(item.label)}
                  </styled.span>
                  <Menu.ItemText
                    flex="1"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    {item.label}
                  </Menu.ItemText>
                  {isCurrent && (
                    <styled.span
                      flexShrink={0}
                      color="colorPalette.default"
                      display="flex"
                    >
                      <Check size={16} />
                    </styled.span>
                  )}
                </Menu.Item>
              );
            })}
          </Menu.ItemGroup>

          <Menu.Separator />

          <Menu.Item
            value={SIGN_OUT_ITEM_VALUE}
            color="fg.muted"
            _hover={{ bg: "red.subtle" }}
          >
            <LogOut size={16} />
            <Menu.ItemText>ログアウト</Menu.ItemText>
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}

export function SidebarLayout({
  title,
  navItems,
  children,
  onSignOut,
  currentDisplayName,
  organizationSwitcher,
}: SidebarLayoutProps) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarSizePercent, setSidebarSizePercent] =
    useState(SIDEBAR_DEFAULT_SIZE);

  const hasOrganizationSwitcher =
    organizationSwitcher != null && organizationSwitcher.items.length > 0;

  const handleResize = useCallback(({ size }: { size: number[] }) => {
    const sidebarSize = size[0];
    if (sidebarSize == null) return;
    setSidebarSizePercent(sidebarSize);
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
        if (panelId === SIDEBAR_PANEL_ID) {
          setCollapsed(true);
          setSidebarSizePercent(SIDEBAR_COLLAPSED_SIZE);
        }
      }}
      onExpand={({ panelId }) => {
        if (panelId === SIDEBAR_PANEL_ID) {
          setCollapsed(false);
          setSidebarSizePercent(SIDEBAR_MIN_SIZE);
        }
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
            justifyContent={collapsed ? "center" : undefined}
            mb="6"
          >
            {hasOrganizationSwitcher ? (
              <SidebarOrganizationMenu
                collapsed={collapsed}
                subtitle={title}
                organizationSwitcher={organizationSwitcher}
                currentDisplayName={currentDisplayName}
                onSignOut={onSignOut}
              />
            ) : (
              !collapsed && (
                <Text
                  as="h2"
                  textStyle="lg"
                  fontWeight="bold"
                  whiteSpace="nowrap"
                >
                  {title}
                </Text>
              )
            )}
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
                  <Link to={item.href} style={{ textDecoration: "none" }}>
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

          <styled.div mt="auto" pt="2">
            <SidebarToggleButton collapsed={collapsed} />
          </styled.div>
        </styled.aside>
      </Splitter.Panel>

      <Splitter.ResizeTrigger
        id="sidebar:main"
        className={resizeTriggerStyle}
      />

      <Splitter.Panel id="main">
        <styled.main
          h="full"
          p="6"
          overflow="auto"
          style={
            {
              "--sidebar-size": `${sidebarSizePercent}%`,
            } as CSSProperties
          }
        >
          {children}
        </styled.main>
      </Splitter.Panel>
    </Splitter.Root>
  );
}
