import { definePreset } from "@pandacss/dev";
import { animationStyles } from "./src/theme/animation-styles";
import { amber } from "./src/theme/colors/amber";
import { blue } from "./src/theme/colors/blue";
import { green } from "./src/theme/colors/green";
import { red } from "./src/theme/colors/red";
import { slate } from "./src/theme/colors/slate";
import { conditions } from "./src/theme/conditions";
import { globalCss } from "./src/theme/global-css";
import { keyframes } from "./src/theme/keyframes";
import { layerStyles } from "./src/theme/layer-styles";
import { recipes, slotRecipes } from "./src/theme/recipes";
import { textStyles } from "./src/theme/text-styles";
import { colors } from "./src/theme/tokens/colors";
import { durations } from "./src/theme/tokens/durations";
import { shadows } from "./src/theme/tokens/shadows";
import { zIndex } from "./src/theme/tokens/z-index";

export const miraiYohoPreset = definePreset({
  name: "@mirai-yoho/ui",
  theme: {
    extend: {
      animationStyles: animationStyles,
      recipes: recipes,
      slotRecipes: slotRecipes,
      keyframes: keyframes,
      layerStyles: layerStyles,
      textStyles: textStyles,
      tokens: {
        colors: colors,
        durations: durations,
        zIndex: zIndex,
      },
      semanticTokens: {
        colors: {
          canvas: {
            value: {
              _light: "{colors.gray.1}",
              _dark: "{colors.gray.1}",
            },
          },
          bg: {
            default: {
              value: {
                _light: "{colors.white}",
                _dark: "{colors.gray.2}",
              },
            },
            subtle: {
              value: {
                _light: "{colors.gray.2}",
                _dark: "{colors.gray.2}",
              },
            },
            muted: {
              value: {
                _light: "{colors.gray.3}",
                _dark: "{colors.gray.3}",
              },
            },
            emphasized: {
              value: {
                _light: "{colors.gray.4}",
                _dark: "{colors.gray.4}",
              },
            },
            disabled: {
              value: {
                _light: "{colors.gray.5}",
                _dark: "{colors.gray.5}",
              },
            },
          },
          fg: {
            default: {
              value: {
                _light: "{colors.gray.12}",
                _dark: "{colors.gray.12}",
              },
            },
            muted: {
              value: {
                _light: "{colors.gray.11}",
                _dark: "{colors.gray.11}",
              },
            },
            subtle: {
              value: {
                _light: "{colors.gray.10}",
                _dark: "{colors.gray.10}",
              },
            },
          },
          border: {
            value: {
              _light: "{colors.gray.4}",
              _dark: "{colors.gray.4}",
            },
          },
          error: {
            value: {
              _light: "{colors.red.9}",
              _dark: "{colors.red.9}",
            },
          },
          blue: blue,
          amber: amber,
          gray: slate,
          red: red,
          green: green,
        },
        shadows: shadows,
        radii: {
          l1: {
            value: "{radii.xs}",
          },
          l2: {
            value: "{radii.sm}",
          },
          l3: {
            value: "{radii.md}",
          },
        },
      },
    },
  },
  globalCss: globalCss,
  conditions: conditions,
});

export default miraiYohoPreset;
