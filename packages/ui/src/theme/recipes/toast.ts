import { toastAnatomy } from "@ark-ui/react/anatomy";
import { defineSlotRecipe } from "@pandacss/dev";

export const toast = defineSlotRecipe({
  className: "toast",
  slots: toastAnatomy.keys(),
  jsx: ["StyledToaster"],
  base: {
    root: {
      alignItems: "start",
      background: "gray.surface.bg",
      border: "1px solid",
      borderRadius: "l3",
      boxShadow: "lg",
      display: "flex",
      gap: "3",
      height: "var(--height)",
      opacity: "var(--opacity)",
      overflowWrap: "anywhere",
      p: "4",
      position: "relative",
      scale: "var(--scale)",
      transitionDuration: "slow",
      transitionProperty: "translate, scale, opacity, height",
      transitionTimingFunction: "default",
      translate: "var(--x) var(--y) 0",
      width: { base: "90dvw", md: "600px" },
      willChange: "translate, opacity, scale",
      zIndex: "var(--z-index)",
      "&[data-type=info]": {
        background: "blue.2",
        borderColor: "blue.outline.border",
      },
      "&[data-type=success]": {
        background: "green.2",
        borderColor: "green.outline.border",
      },
      "&[data-type=error]": {
        background: "red.2",
        borderColor: "red.outline.border",
      },
      "&[data-type=warning]": {
        background: "amber.2",
        borderColor: "amber.outline.border",
      },
    },
    title: {
      color: "fg.default",
      fontWeight: "medium",
      textStyle: "sm",
    },
    description: {
      color: "fg.muted",
      textStyle: "sm",
    },
    actionTrigger: {
      color: "fg.default",
      cursor: "pointer",
      fontWeight: "semibold",
      textStyle: "sm",
    },
    closeTrigger: {
      position: "absolute",
      top: "2",
      insetEnd: "2",
    },
  },
});
