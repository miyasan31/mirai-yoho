"use client";
import { Portal } from "@ark-ui/react/portal";
import {
  Toaster as ArkToaster,
  createToaster,
  Toast,
  useToastContext,
} from "@ark-ui/react/toast";
import { CheckCircleIcon, CircleAlertIcon, CircleXIcon } from "lucide-react";
import { forwardRef } from "react";
import { createStyleContext, HStack, Stack, styled } from "styled-system/jsx";
import { toast } from "styled-system/recipes";
import { CloseButton } from "./close-button";
import { Icon, type IconProps } from "./icon";
import { Spinner } from "./spinner";

const { withProvider, withContext } = createStyleContext(toast);

const Root = withProvider(Toast.Root, "root");
const Title = withContext(Toast.Title, "title");
const Description = withContext(Toast.Description, "description");
const ActionTrigger = withContext(Toast.ActionTrigger, "actionTrigger");
const CloseTrigger = withContext(Toast.CloseTrigger, "closeTrigger");
const StyledToaster = styled(ArkToaster);

const iconMap: Record<string, React.ElementType> = {
  warning: CircleAlertIcon,
  success: CheckCircleIcon,
  error: CircleXIcon,
};

const Indicator = forwardRef<SVGSVGElement, IconProps>((props, ref) => {
  const toast = useToastContext();

  const StatusIcon = iconMap[toast.type];
  if (!StatusIcon) return null;

  return (
    <Icon ref={ref} data-type={toast.type} {...props}>
      <StatusIcon />
    </Icon>
  );
});

export const toaster = createToaster({
  placement: "bottom",
  pauseOnPageIdle: true,
  overlap: true,
  duration: 3000,
  max: 5,
});

export const Toaster = () => {
  return (
    <Portal>
      <StyledToaster toaster={toaster} insetInline={{ mdDown: "4" }}>
        {(toast) => (
          <Root>
            <HStack gap="3">
              {toast.type === "loading" ? (
                <Spinner color="colorPalette.plain.fg" />
              ) : (
                <Indicator />
              )}
              <Stack gap="1" alignItems="start">
                {toast.title && <Title>{toast.title}</Title>}
                {toast.description && (
                  <Description>{toast.description}</Description>
                )}
              </Stack>
            </HStack>
            {toast.action && (
              <ActionTrigger>{toast.action.label}</ActionTrigger>
            )}
            {toast.closable && (
              <CloseTrigger asChild>
                <CloseButton size="sm" />
              </CloseTrigger>
            )}
          </Root>
        )}
      </StyledToaster>
    </Portal>
  );
};
