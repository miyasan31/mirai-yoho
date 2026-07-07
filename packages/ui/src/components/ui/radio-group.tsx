"use client";
import { RadioGroup } from "@ark-ui/react/radio-group";
import type { ComponentProps } from "react";
import { createStyleContext } from "styled-system/jsx";
import { radioGroup } from "styled-system/recipes";

const { withProvider, withContext } = createStyleContext(radioGroup);

export type RootProps = ComponentProps<typeof Root>;
export const Root = withProvider(RadioGroup.Root, "root");
export const Label = withContext(RadioGroup.Label, "label");
export const Item = withContext(RadioGroup.Item, "item");
export const ItemText = withContext(RadioGroup.ItemText, "itemText");
export const ItemControl = withContext(RadioGroup.ItemControl, "itemControl");
export const Indicator = withContext(RadioGroup.Indicator, "indicator");
export const ItemHiddenInput = RadioGroup.ItemHiddenInput;

export {
  RadioGroupContext as Context,
  RadioGroupItemContext as ItemContext,
  type RadioGroupValueChangeDetails as ValueChangeDetails,
} from "@ark-ui/react/radio-group";
