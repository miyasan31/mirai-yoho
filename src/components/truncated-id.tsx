import { styled } from "styled-system/jsx";
import { Tooltip } from "@/components/ui/tooltip";

export function TruncatedId({ id }: { id: string }) {
  return (
    <Tooltip content={id}>
      <styled.span cursor="default" textStyle="sm" fontFamily="mono">
        {id.slice(0, 8)}…
      </styled.span>
    </Tooltip>
  );
}
