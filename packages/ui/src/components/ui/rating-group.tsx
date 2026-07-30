"use client";
import { RatingGroup } from "@ark-ui/react/rating-group";
import type { ComponentProps } from "react";
import { createStyleContext } from "styled-system/jsx";
import { ratingGroup } from "styled-system/recipes";

const { withProvider, withContext } = createStyleContext(ratingGroup);

export type RootProps = ComponentProps<typeof Root>;
export const Root = withProvider(RatingGroup.Root, "root");
export const Label = withContext(RatingGroup.Label, "label");
export const Control = withContext(RatingGroup.Control, "control");
export const Item = withContext(RatingGroup.Item, "item");
export const HiddenInput = RatingGroup.HiddenInput;

export {
  RatingGroupContext as Context,
  RatingGroupItemContext as ItemContext,
  type RatingGroupValueChangeDetails as ValueChangeDetails,
} from "@ark-ui/react/rating-group";
