import { ratingGroupAnatomy } from "@ark-ui/react/anatomy";
import { defineSlotRecipe } from "@pandacss/dev";

export const ratingGroup = defineSlotRecipe({
  className: "rating-group",
  slots: ratingGroupAnatomy.keys(),
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "1.5",
    },
    label: {
      color: "fg.default",
      textStyle: "sm",
      fontWeight: "medium",
    },
    control: {
      alignItems: "center",
      display: "inline-flex",
      gap: "1",
    },
    item: {
      color: "gray.outline.border",
      cursor: "pointer",
      display: "inline-flex",
      transition: "colors",
      transitionDuration: "fast",
      _highlighted: {
        color: "amber.9",
      },
      // zag は部分点灯の item に data-half を付ける
      "&[data-half]": {
        color: "amber.9",
      },
      "&[data-readonly]": {
        cursor: "default",
      },
      _disabled: {
        cursor: "not-allowed",
        layerStyle: "disabled",
      },
      "&:focus-visible": {
        borderRadius: "l1",
        outline: "2px solid",
        outlineColor: "blue.9",
        outlineOffset: "2px",
      },
    },
  },
  variants: {
    size: {
      sm: { item: { "& svg": { boxSize: "4" } } },
      md: { item: { "& svg": { boxSize: "5" } } },
      lg: { item: { "& svg": { boxSize: "8" } } },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
