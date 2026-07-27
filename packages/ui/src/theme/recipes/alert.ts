import { defineSlotRecipe } from "@pandacss/dev";

/**
 * 通知/警告バナー。colorPalette と variant で見た目を変える。
 * デフォルトは colorPalette="amber" variant="surface"（警告用）。
 * slots: root, icon, title, description
 */
export const alert = defineSlotRecipe({
  className: "alert",
  slots: ["root", "icon", "title", "description"],
  base: {
    root: {
      display: "flex",
      alignItems: "flex-start",
      gap: "3",
      p: "4",
      borderRadius: "l3",
      borderWidth: "1px",
    },
    icon: {
      flexShrink: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      mt: "0.5",
      _icon: {
        boxSize: "5",
      },
    },
    title: {
      textStyle: "sm",
      fontWeight: "semibold",
    },
    description: {
      textStyle: "sm",
      color: "fg.muted",
      mt: "1",
    },
  },
  defaultVariants: {
    variant: "surface",
  },
  variants: {
    variant: {
      surface: {
        root: {
          bg: "colorPalette.surface.bg",
          borderColor: "colorPalette.surface.border",
          color: "colorPalette.surface.fg",
        },
        icon: {
          color: "colorPalette.surface.fg",
        },
        title: {
          color: "colorPalette.surface.fg",
        },
      },
      subtle: {
        root: {
          bg: "colorPalette.subtle.bg",
          borderColor: "transparent",
          color: "colorPalette.subtle.fg",
        },
        icon: {
          color: "colorPalette.subtle.fg",
        },
        title: {
          color: "colorPalette.subtle.fg",
        },
      },
      solid: {
        root: {
          bg: "colorPalette.solid.bg",
          borderColor: "colorPalette.solid.bg",
          color: "colorPalette.solid.fg",
        },
        icon: {
          color: "colorPalette.solid.fg",
        },
        title: {
          color: "colorPalette.solid.fg",
        },
        description: {
          color: "colorPalette.solid.fg",
          opacity: "0.85",
        },
      },
    },
  },
});
