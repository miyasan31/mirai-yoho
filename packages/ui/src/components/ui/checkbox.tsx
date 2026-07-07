"use client";
import { Checkbox } from "@ark-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createStyleContext } from "styled-system/jsx";
import { checkbox } from "styled-system/recipes";

const { withProvider, withContext } = createStyleContext(checkbox);

export type RootProps = ComponentProps<typeof Root>;
export const Root = withProvider(Checkbox.Root, "root");
export const Control = withContext(Checkbox.Control, "control");
export const Indicator = withContext(Checkbox.Indicator, "indicator", {
  defaultProps: { children: <CheckIcon /> },
});
export const Label = withContext(Checkbox.Label, "label");
export const Group = withContext(Checkbox.Group, "group");
export const HiddenInput = Checkbox.HiddenInput;

export {
  type CheckboxCheckedChangeDetails as CheckedChangeDetails,
  type CheckboxCheckedState as CheckedState,
  CheckboxContext as Context,
} from "@ark-ui/react/checkbox";
