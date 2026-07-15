import { radioGroupAnatomy } from "@ark-ui/react/anatomy";
import { defineSlotRecipe } from "@pandacss/dev";

export const radioGroup = defineSlotRecipe({
  className: "radio-group",
  slots: radioGroupAnatomy.keys(),
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: "3",
      width: "full",
    },
    item: {
      alignItems: "flex-start",
      borderColor: "border",
      borderRadius: "l2",
      borderWidth: "1px",
      cursor: "pointer",
      display: "flex",
      gap: "3",
      p: "4",
      transition: "all",
      transitionDuration: "normal",
      _hover: {
        borderColor: "blue.9",
        boxShadow: "sm",
      },
      _checked: {
        borderColor: "blue.9",
      },
      _disabled: {
        cursor: "not-allowed",
        layerStyle: "disabled",
      },
    },
    itemControl: {
      alignItems: "center",
      bg: "gray.surface.bg",
      borderColor: "gray.outline.border",
      borderRadius: "full",
      borderWidth: "1px",
      boxSize: "5",
      display: "inline-flex",
      flexShrink: 0,
      justifyContent: "center",
      transition: "colors",
      _checked: {
        borderColor: "blue.9",
      },
    },
    indicator: {
      bg: "blue.9",
      borderRadius: "full",
      boxSize: "2.5",
    },
    itemText: {
      flex: "1",
      minW: "0",
    },
  },
});
