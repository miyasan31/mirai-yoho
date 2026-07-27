import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { createStyleContext } from "styled-system/jsx";
import { alert } from "styled-system/recipes";

const { withProvider, withContext } = createStyleContext(alert);

const AlertRoot = withProvider(ark.div, "root");
const AlertIcon = withContext(ark.div, "icon");
const AlertTitle = withContext(ark.h3, "title");
const AlertDescription = withContext(ark.p, "description");

export type AlertRootProps = ComponentProps<typeof AlertRoot>;
export type AlertIconProps = ComponentProps<typeof AlertIcon>;
export type AlertTitleProps = ComponentProps<typeof AlertTitle>;
export type AlertDescriptionProps = ComponentProps<typeof AlertDescription>;

export const Alert = {
  Root: AlertRoot,
  Icon: AlertIcon,
  Title: AlertTitle,
  Description: AlertDescription,
};
