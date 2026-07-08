import { defineSemanticTokens } from "@pandacss/dev";

export const blue = defineSemanticTokens.colors({
  "1": { value: { _light: "#f7fafe", _dark: "#101b33" } },
  "2": { value: { _light: "#f0f7fe", _dark: "#14213e" } },
  "3": { value: { _light: "#ddedfc", _dark: "#1a2c51" } },
  "4": { value: { _light: "#c2e0fb", _dark: "#1f3763" } },
  "5": { value: { _light: "#98cdf8", _dark: "#234585" } },
  "6": { value: { _light: "#67b2f3", _dark: "#2550a8" } },
  "7": { value: { _light: "#4493ed", _dark: "#2661cf" } },
  "8": { value: { _light: "#2b74e1", _dark: "#2b74e1" } },
  "9": { value: { _light: "#2661cf", _dark: "#2661cf" } },
  "10": { value: { _light: "#2658bc", _dark: "#2b74e1" } },
  "11": { value: { _light: "#2550a8", _dark: "#98cdf8" } },
  "12": { value: { _light: "#1a2c51", _dark: "#ddedfc" } },
  a1: { value: { _light: "#0060df08", _dark: "#101b33" } },
  a2: { value: { _light: "#0077ee0f", _dark: "#14213e" } },
  a3: { value: { _light: "#0078e922", _dark: "#1a2c51" } },
  a4: { value: { _light: "#007dee3d", _dark: "#1f3763" } },
  a5: { value: { _light: "#0083ee67", _dark: "#234585" } },
  a6: { value: { _light: "#007eeb98", _dark: "#2550a8" } },
  a7: { value: { _light: "#006ce6bb", _dark: "#2661cf" } },
  a8: { value: { _light: "#0058dbd4", _dark: "#2b74e1" } },
  a9: { value: { _light: "#2661cf", _dark: "#2661cf" } },
  a10: { value: { _light: "#2658bc", _dark: "#2b74e1" } },
  a11: { value: { _light: "#2550a8", _dark: "#98cdf8" } },
  a12: { value: { _light: "#1a2c51", _dark: "#ddedfc" } },
  solid: {
    bg: {
      DEFAULT: {
        value: { _light: "{colors.blue.9}", _dark: "{colors.blue.9}" },
      },
      hover: {
        value: { _light: "{colors.blue.10}", _dark: "{colors.blue.10}" },
      },
    },
    fg: { DEFAULT: { value: { _light: "white", _dark: "white" } } },
  },
  subtle: {
    bg: {
      DEFAULT: {
        value: { _light: "{colors.blue.a3}", _dark: "{colors.blue.a3}" },
      },
      hover: {
        value: { _light: "{colors.blue.a4}", _dark: "{colors.blue.a4}" },
      },
      active: {
        value: { _light: "{colors.blue.a5}", _dark: "{colors.blue.a5}" },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: "{colors.blue.a11}", _dark: "{colors.blue.a11}" },
      },
    },
  },
  surface: {
    bg: {
      DEFAULT: {
        value: { _light: "{colors.blue.a2}", _dark: "{colors.blue.a2}" },
      },
      active: {
        value: { _light: "{colors.blue.a3}", _dark: "{colors.blue.a3}" },
      },
    },
    border: {
      DEFAULT: {
        value: { _light: "{colors.blue.a6}", _dark: "{colors.blue.a6}" },
      },
      hover: {
        value: { _light: "{colors.blue.a7}", _dark: "{colors.blue.a7}" },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: "{colors.blue.a11}", _dark: "{colors.blue.a11}" },
      },
    },
  },
  outline: {
    bg: {
      hover: {
        value: { _light: "{colors.blue.a2}", _dark: "{colors.blue.a2}" },
      },
      active: {
        value: { _light: "{colors.blue.a3}", _dark: "{colors.blue.a3}" },
      },
    },
    border: {
      DEFAULT: {
        value: { _light: "{colors.blue.a7}", _dark: "{colors.blue.a7}" },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: "{colors.blue.a11}", _dark: "{colors.blue.a11}" },
      },
    },
  },
  plain: {
    bg: {
      hover: {
        value: { _light: "{colors.blue.a3}", _dark: "{colors.blue.a3}" },
      },
      active: {
        value: { _light: "{colors.blue.a4}", _dark: "{colors.blue.a4}" },
      },
    },
    fg: {
      DEFAULT: {
        value: { _light: "{colors.blue.a11}", _dark: "{colors.blue.a11}" },
      },
    },
  },
});
