"use client";

import { HoverCard as ArkHoverCard } from "@ark-ui/react/hover-card";
import { Portal } from "@ark-ui/react/portal";
import { type ComponentProps, forwardRef } from "react";
import { createStyleContext } from "styled-system/jsx";
import { tooltip } from "styled-system/recipes";

const { withRootProvider, withContext } = createStyleContext(tooltip);

type RootProps = ComponentProps<typeof Root>;
type ContentProps = ComponentProps<typeof Content>;
const Root = withRootProvider(ArkHoverCard.Root, {
  defaultProps: { unmountOnExit: true, lazyMount: true },
});
const Arrow = withContext(ArkHoverCard.Arrow, "arrow");
const ArrowTip = withContext(ArkHoverCard.ArrowTip, "arrowTip");
const Content = withContext(ArkHoverCard.Content, "content");
const Positioner = withContext(ArkHoverCard.Positioner, "positioner");
const Trigger = withContext(ArkHoverCard.Trigger, "trigger");

export { HoverCardContext as Context } from "@ark-ui/react/hover-card";

export interface HoverCardProps extends RootProps {
  showArrow?: boolean;
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode | undefined;
  content: React.ReactNode | string;
  contentProps?: ContentProps;
  disabled?: boolean;
}

export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(
  function HoverCard(props, ref) {
    const {
      showArrow,
      children,
      disabled,
      portalled = true,
      content,
      contentProps,
      portalRef,
      ...rootProps
    } = props;

    if (disabled) return children;

    return (
      <Root {...rootProps}>
        <Trigger asChild>{children}</Trigger>
        <Portal disabled={!portalled} container={portalRef}>
          <Positioner>
            <Content ref={ref} {...contentProps}>
              {showArrow && (
                <Arrow>
                  <ArrowTip />
                </Arrow>
              )}
              {content}
            </Content>
          </Positioner>
        </Portal>
      </Root>
    );
  },
);
