import { Skeleton } from "@/components/ui/skeleton";
import * as Table from "@/components/ui/table";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          {Array.from({ length: columns }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
            <Table.Header key={i}>
              <Skeleton height="4" width="80%" />
            </Table.Header>
          ))}
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
          <Table.Row key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells
              <Table.Cell key={colIndex}>
                <Skeleton height="4" width={colIndex === 0 ? "60%" : "80%"} />
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
