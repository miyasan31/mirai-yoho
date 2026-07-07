"use client";
import { Portal } from "@ark-ui/react/portal";
import {
  Toaster as ArkToaster,
  type CreateToasterReturn,
  createToaster as createToasterFromArk,
  Toast,
  type ToastOptions,
  type ToastStoreProps,
  type ToastType,
  useToastContext,
} from "@ark-ui/react/toast";
import {
  CheckCircleIcon,
  CircleAlertIcon,
  CircleXIcon,
  InfoIcon,
} from "lucide-react";
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
  info: InfoIcon,
  warning: CircleAlertIcon,
  success: CheckCircleIcon,
  error: CircleXIcon,
};

const Indicator = forwardRef<SVGSVGElement, IconProps>((props, ref) => {
  const toast = useToastContext();
  const normalizedType = toast.type === "warn" ? "warning" : toast.type;

  const StatusIcon = iconMap[normalizedType];
  if (!StatusIcon) return null;

  return (
    <Icon ref={ref} data-type={normalizedType} {...props}>
      <StatusIcon />
    </Icon>
  );
});

/** Zag の Type に warning が含まれず IDE 補完されないため、利用する型だけ明示する */
export type AppToastType = "success" | "error" | "loading" | "info" | "warning";

type AppToastCreateOptions = Omit<ToastOptions, "type"> & {
  type?: AppToastType | undefined;
};

type AppToastUpdateOptions = Partial<Omit<ToastOptions, "type">> & {
  type?: AppToastType | undefined;
};

export type AppToaster = Omit<CreateToasterReturn, "create" | "update"> & {
  create: (data: AppToastCreateOptions) => string;
  update: (id: string, data: AppToastUpdateOptions) => string;
};

/** Ark の `createToaster` をラップし、`type` に `warning` を含む補完可能な union を付与する */
export function createToaster(props: ToastStoreProps): AppToaster {
  return createToasterFromArk(props) as AppToaster;
}

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
      <StyledToaster
        toaster={toaster as CreateToasterReturn}
        insetInline={{ mdDown: "4" }}
      >
        {(toast) => (
          <Root data-type={toast.type as ToastType}>
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
