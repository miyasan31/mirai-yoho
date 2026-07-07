"use client";

import { Pagination, usePaginationContext } from "@ark-ui/react/pagination";
import { createListCollection } from "@ark-ui/react/select";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { styled } from "styled-system/jsx";
import { IconButton } from "./ui/icon-button";
import * as Select from "./ui/select";
import { Text } from "./ui/text";

type SortBy = "createdAt" | "updatedAt";
type PageSize = 20 | 50 | 100;

const pageSizeCollection = createListCollection({
  items: [
    { label: "20件", value: "20" },
    { label: "50件", value: "50" },
    { label: "100件", value: "100" },
  ],
});

const sortByCollection = createListCollection({
  items: [
    { label: "登録が新しい順", value: "createdAt" },
    { label: "更新が新しい順", value: "updatedAt" },
  ],
});

export interface ListControlsProps {
  page: number;
  pageSize: PageSize;
  sortBy: SortBy;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onSortByChange: (sortBy: SortBy) => void;
}

function PaginationItems({ page }: { page: number }) {
  const ctx = usePaginationContext();

  return (
    <>
      {ctx.pages.map((paginationPage, index) =>
        paginationPage.type === "ellipsis" ? (
          <IconButton
            key={`ellipsis-${index.toString()}`}
            as="span"
            variant="outline"
            size="sm"
          >
            ...
          </IconButton>
        ) : (
          <Pagination.Item
            key={paginationPage.value}
            type="page"
            value={paginationPage.value}
            asChild
          >
            <IconButton
              variant={paginationPage.value === page ? "solid" : "outline"}
              size="sm"
            >
              {paginationPage.value}
            </IconButton>
          </Pagination.Item>
        ),
      )}
    </>
  );
}

export function ListControls({
  page,
  pageSize,
  sortBy,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onSortByChange,
}: ListControlsProps) {
  return (
    <styled.div
      mt="4"
      position="fixed"
      bottom="0"
      left={{ base: "0", md: "calc(var(--sidebar-size, 0%) + 1.5rem)" }}
      right="1.5rem"
      zIndex="docked"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap="4"
      flexWrap="wrap"
      px="3"
      py="2"
      borderTopWidth="1px"
      borderColor="border"
      bg="bg.default"
      shadow="md"
      roundedTop="l2"
    >
      <styled.div display="flex" alignItems="center" gap="3">
        <Select.Root
          collection={pageSizeCollection}
          value={[String(pageSize)]}
          onValueChange={(details) =>
            onPageSizeChange(Number(details.value[0]) as PageSize)
          }
        >
          <Select.Control minW="120px">
            <Select.Trigger>
              <Select.ValueText placeholder="件数" />
              <Select.Indicator />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {pageSizeCollection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>

        <Select.Root
          collection={sortByCollection}
          value={[sortBy]}
          onValueChange={(details) =>
            onSortByChange(details.value[0] as SortBy)
          }
        >
          <Select.Control minW="180px">
            <Select.Trigger>
              <Select.ValueText placeholder="並び順" />
              <Select.Indicator />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {sortByCollection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
      </styled.div>

      <styled.div display="flex" alignItems="center" gap="2">
        <Text textStyle="sm" color="fg.muted">
          {total}件
        </Text>
        <Pagination.Root
          page={page}
          count={total}
          pageSize={pageSize}
          siblingCount={1}
          onPageChange={(details) => onPageChange(details.page)}
        >
          <styled.div display="flex" alignItems="center" gap="1">
            <Pagination.PrevTrigger asChild>
              <IconButton aria-label="前のページ" variant="outline" size="sm">
                <ChevronLeftIcon />
              </IconButton>
            </Pagination.PrevTrigger>
            <PaginationItems page={page} />
            <Pagination.NextTrigger asChild>
              <IconButton aria-label="次のページ" variant="outline" size="sm">
                <ChevronRightIcon />
              </IconButton>
            </Pagination.NextTrigger>
          </styled.div>
        </Pagination.Root>
        <Text textStyle="sm" minW="72px" textAlign="center" color="fg.muted">
          {page} / {totalPages}
        </Text>
      </styled.div>
    </styled.div>
  );
}
