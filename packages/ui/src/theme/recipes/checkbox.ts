import { checkboxAnatomy } from "@ark-ui/react/anatomy";
import { defineSlotRecipe } from "@pandacss/dev";

export const checkbox = defineSlotRecipe({
  className: "checkbox",
  slots: checkboxAnatomy.keys(),
  base: {
    root: {
      alignItems: "center",
      cursor: "pointer",
      display: "inline-flex",
      gap: "2",
      _disabled: {
        cursor: "not-allowed",
        layerStyle: "disabled",
      },
    },
    control: {
      alignItems: "center",
      bg: "gray.surface.bg",
      borderColor: "gray.outline.border",
      borderRadius: "l1",
      borderWidth: "1px",
      boxSize: "5",
      display: "inline-flex",
      justifyContent: "center",
      transition: "colors",
      _checked: {
        bg: "blue.9",
        borderColor: "blue.9",
      },
      _invalid: {
        borderColor: "error",
      },
    },
    indicator: {
      color: "white",
      _icon: {
        boxSize: "3.5",
      },
    },
    label: {
      color: "fg.default",
      textStyle: "sm",
      userSelect: "none",
    },
  },
});
